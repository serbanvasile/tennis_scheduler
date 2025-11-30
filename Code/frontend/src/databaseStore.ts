import { create } from "zustand";
import { Platform } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import type { 
  Player as PlayerType, League as LeagueType, Week as WeekType, 
  Availability as AvailabilityType, Match as MatchType, Score as ScoreType, 
  PlayerStats, FairnessMetrics, DID 
} from "./types";

// Import database based on platform
let database: any;
let seedDatabase: any;
let Player: any;
let League: any;
let Court: any;
let Week: any;
let Availability: any;
let Match: any;
let Score: any;

if (Platform.OS === 'web') {
  // Use web-specific database
  const webDb = require('./database/web-database');
  database = webDb.database;
  seedDatabase = webDb.seedDatabase;
  const models = require('./database/models');
  Player = models.Player;
  League = models.League;
  Court = models.Court;
  Week = models.Week;
  Availability = models.Availability;
  Match = models.Match;
  Score = models.Score;
} else {
  // Use regular database for React Native
  const regularDb = require('./database');
  database = regularDb.database;
  seedDatabase = regularDb.seedDatabase;
  const models = require('./database/models');
  Player = models.Player;
  League = models.League;
  Court = models.Court;
  Week = models.Week;
  Availability = models.Availability;
  Match = models.Match;
  Score = models.Score;
}

const id = () => Math.random().toString(36).substr(2, 9);

export type DatabaseState = {
  // Database status
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Cached data (for UI performance)
  roster: PlayerType[];
  league: LeagueType | null;
  weeks: WeekType[];
  
  // UI state
  selectedWeek: string | null;
  highlightPlayer: DID | null;
  mainPlayer: DID | null;
  
  // Database actions
  initializeDatabase: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Player management
  addPlayer: (player: Omit<PlayerType, 'id'>) => Promise<void>;
  updatePlayer: (playerId: DID, updates: Partial<PlayerType>) => Promise<void>;
  removePlayer: (playerId: DID) => Promise<void>;
  
  // Week management
  generateWeek: (weekIndex: number) => Promise<string>;
  
  // Availability management
  setAvailability: (weekId: string, playerId: string, state: AvailabilityType["state"]) => Promise<void>;
  
  // UI state
  setSelectedWeek: (weekId: string | null) => void;
  setHighlightPlayer: (playerId: DID | null) => void;
  setMainPlayer: (playerId: DID | null) => void;
};

// Convert WatermelonDB models to our types
const modelToPlayer = (model: Player): PlayerType => ({
  id: model.id,
  displayName: model.displayName,
  skill: model.skill,
  handed: model.handed as 'L' | 'R' | 'A',
  phone: model.phone,
  email: model.email,
  tags: model.tags,
  share: model.share
});

const modelToLeague = (model: League): LeagueType => ({
  id: model.id,
  name: model.name,
  season: {
    startISO: model.seasonStart,
    endISO: model.seasonEnd,
    weekDays: model.weekDays
  },
  courts: [], // Will be populated separately
  rules: model.rules,
  visibility: model.visibility as 'public' | 'private',
  adminDIDs: model.adminDIDs,
  createdBy: model.createdBy,
  createdAt: model.createdAt.toISOString()
});

const modelToWeek = (model: Week): WeekType => ({
  id: model.id,
  leagueId: model.leagueId,
  index: model.index,
  dateISO: model.dateISO,
  status: model.status as 'draft' | 'published' | 'completed' | 'cancelled',
  notes: model.notes
});

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isLoading: false,
  error: null,
  roster: [],
  league: null,
  weeks: [],
  selectedWeek: null,
  highlightPlayer: null,
  mainPlayer: null,

  initializeDatabase: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Seed the database if it's empty
      await seedDatabase();
      
      // Load initial data
      await get().refreshData();
      
      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('Database initialization failed:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  refreshData: async () => {
    try {
      set({ isLoading: true, error: null });

      // Load players
      const playersCollection = database.get<Player>('players');
      const playerModels = await playersCollection.query().fetch();
      const roster = playerModels.map(modelToPlayer);

      // Load league (assuming single league for now)
      const leaguesCollection = database.get<League>('leagues');
      const leagueModels = await leaguesCollection.query().fetch();
      const league = leagueModels.length > 0 ? modelToLeague(leagueModels[0]) : null;

      // Load courts if we have a league
      if (league) {
        const courtsCollection = database.get<Court>('courts');
        const courtModels = await courtsCollection.query(
          Q.where('league_id', league.id)
        ).fetch();
        
        league.courts = courtModels.map(court => ({
          id: court.id,
          label: court.label,
          location: court.location,
          timeSlots: court.timeSlots
        }));
      }

      // Load weeks
      const weeksCollection = database.get<Week>('weeks');
      const weekModels = await weeksCollection.query().fetch();
      const weeks = weekModels.map(modelToWeek);

      set({ 
        roster, 
        league, 
        weeks,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  addPlayer: async (playerData) => {
    try {
      await database.write(async () => {
        await database.get<Player>('players').create(player => {
          player.displayName = playerData.displayName;
          player.skill = playerData.skill;
          player.handed = playerData.handed;
          player.phone = playerData.phone || '';
          player.email = playerData.email || '';
          player.tags = playerData.tags || [];
          player.share = playerData.share || 0;
        });
      });

      // Refresh the roster
      await get().refreshData();
    } catch (error) {
      console.error('Failed to add player:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add player' });
    }
  },

  updatePlayer: async (playerId, updates) => {
    try {
      await database.write(async () => {
        const player = await database.get<Player>('players').find(playerId);
        await player.update(player => {
          if (updates.displayName !== undefined) player.displayName = updates.displayName;
          if (updates.skill !== undefined) player.skill = updates.skill;
          if (updates.handed !== undefined) player.handed = updates.handed;
          if (updates.phone !== undefined) player.phone = updates.phone;
          if (updates.email !== undefined) player.email = updates.email;
          if (updates.tags !== undefined) player.tags = updates.tags;
          if (updates.share !== undefined) player.share = updates.share;
        });
      });

      // Refresh the roster
      await get().refreshData();
    } catch (error) {
      console.error('Failed to update player:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update player' });
    }
  },

  removePlayer: async (playerId) => {
    try {
      await database.write(async () => {
        const player = await database.get<Player>('players').find(playerId);
        await player.destroyPermanently();
      });

      // Refresh the roster
      await get().refreshData();
    } catch (error) {
      console.error('Failed to remove player:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to remove player' });
    }
  },

  generateWeek: async (weekIndex) => {
    try {
      const date = new Date();
      const weekDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 7 * weekIndex
      );

      let weekId: string = '';
      
      await database.write(async () => {
        const { league } = get();
        if (!league) throw new Error('No league found');

        const week = await database.get<Week>('weeks').create(week => {
          week.leagueId = league.id;
          week.index = weekIndex;
          week.dateISO = weekDate.toISOString();
          week.status = 'draft';
        });
        
        weekId = week.id;

        // Create default availability for all players
        const { roster } = get();
        for (const player of roster) {
          await database.get<Availability>('availability').create(availability => {
            availability.weekId = weekId;
            availability.playerId = player.id;
            availability.state = 'maybe';
          });
        }
      });

      // Refresh data
      await get().refreshData();
      return weekId;
    } catch (error) {
      console.error('Failed to generate week:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to generate week' });
      return '';
    }
  },

  setAvailability: async (weekId, playerId, state) => {
    try {
      await database.write(async () => {
        // Try to find existing availability record
        const availabilityCollection = database.get<Availability>('availability');
        const existing = await availabilityCollection.query(
          Q.where('week_id', weekId),
          Q.where('player_id', playerId)
        ).fetch();

        if (existing.length > 0) {
          // Update existing record
          await existing[0].update(availability => {
            availability.state = state;
          });
        } else {
          // Create new record
          await availabilityCollection.create(availability => {
            availability.weekId = weekId;
            availability.playerId = playerId;
            availability.state = state;
          });
        }
      });
    } catch (error) {
      console.error('Failed to set availability:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to set availability' });
    }
  },

  setSelectedWeek: (weekId) => set({ selectedWeek: weekId }),
  setHighlightPlayer: (playerId) => set({ highlightPlayer: playerId }),
  setMainPlayer: (playerId) => set({ mainPlayer: playerId }),
}));