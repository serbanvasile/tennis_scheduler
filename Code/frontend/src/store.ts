import { create } from "zustand";
import type { 
  League, Player, Week, Availability, Match, Court, PlayerStats, 
  FairnessMetrics, Score, DID 
} from "./types";
import { greedyPairs, makeMatches, createOptimalSchedule, calculatePlayerStatistics, calculateFairnessMetrics } from "./matchmaker";

const id = () => Math.random().toString(36).substr(2, 9);

export type RootState = {
  // Core data
  league: League;
  roster: Player[];
  weeks: Week[];
  availability: Availability[];
  matches: Match[];
  scores: Score[];
  playerStats: Record<string, PlayerStats>;
  
  // UI state
  selectedWeek: string | null;
  highlightPlayer: DID | null;
  mainPlayer: DID | null;
  
  // Actions
  setAvailability: (weekId: string, playerId: string, state: Availability["state"]) => void;
  generateWeek: (weekIndex: number) => string;
  makeSchedule: (weekId: string) => void;
  setSelectedWeek: (weekId: string | null) => void;
  setHighlightPlayer: (playerId: DID | null) => void;
  setMainPlayer: (playerId: DID | null) => void;
  
  // Player management
  addPlayer: (player: Omit<Player, 'id'>) => void;
  updatePlayer: (playerId: DID, updates: Partial<Player>) => void;
  removePlayer: (playerId: DID) => void;
  
  // Stats and analytics
  calculatePlayerStats: (playerId: DID) => PlayerStats;
  calculateFairnessMetrics: (weekId?: string) => FairnessMetrics;
  getPlayerPivot: (mainPlayerId: DID) => {
    pairedWith: Record<DID, number>;
    playedAgainst: Record<DID, number>;
    sameCourt: Record<DID, number>;
  };
  
  // Match management
  updateMatch: (matchId: string, updates: Partial<Match>) => void;
  lockMatch: (matchId: string, locked: boolean) => void;
  addScore: (score: Score) => void;
};

// Demo seed data (can be replaced by P2P/CRDT layer later)
const demoCourts: Court[] = [
  { id: "c1", label: "Court 1", timeSlots: ["18:00", "19:15"] },
  { id: "c2", label: "Court 2", timeSlots: ["18:00", "19:15"] },
  { id: "c3", label: "Court 3", timeSlots: ["18:00", "19:15"] }
];

const demoPlayers: Player[] = [
  { id: "p1", displayName: "Bill Tauriello", skill: 3, handed: 'R', phone: "(508)304-2902", email: "bill.tauriello@email.com" },
  { id: "p2", displayName: "Bill Taylor", skill: 3, handed: 'R', phone: "(508)304-2116", email: "bill.taylor@email.com" },
  { id: "p3", displayName: "Bob Alexander", skill: 3, handed: 'R', phone: "(508)507-7500", email: "bob.alexander@email.com" },
  { id: "p4", displayName: "Claus Nussgruber", skill: 4, handed: 'R', phone: "(508)577-4173", email: "claus.nussgruber@email.com" },
  { id: "p5", displayName: "Doug King", skill: 3, handed: 'R', phone: "(508)558-3385", email: "doug.king@email.com" },
  { id: "p6", displayName: "Godehard Rau", skill: 4, handed: 'R', phone: "(508)872-0433", email: "godehard.rau@email.com" },
  { id: "p7", displayName: "Norm Goldberg", skill: 3, handed: 'R', phone: "(508)265-7951", email: "norm.goldberg@email.com" },
  { id: "p8", displayName: "Pierce Butler", skill: 3.5, handed: 'R', phone: "(508)500-4213", email: "pierce.butler@email.com" },
  { id: "p9", displayName: "Serban Vasile", skill: 2, handed: 'R', phone: "(508)558-7896", email: "serban.vasile@email.com" },
  { id: "p10", displayName: "Goran Mecovic", skill: 4.25, handed: 'R', phone: "(508)654-4275", email: "goran.mecovic@email.com" },
  { id: "p11", displayName: "George Walchuk", skill: 4, handed: 'R', phone: "(508)892-4833", email: "george.walchuk@email.com" },
  { id: "p12", displayName: "Klaus Tum", skill: 3.5, handed: 'R', phone: "(508)392-2379", email: "klaus.tum@email.com" },
  { id: "p13", displayName: "Sudhish Kumar", skill: 4, handed: 'R', phone: "(508)654-5023", email: "sudhish.kumar@email.com" },
  { id: "p14", displayName: "Tom Powers", skill: 3.75, handed: 'R', phone: "(508)329-7632", email: "tom.powers@email.com" },
  { id: "p15", displayName: "Adrian Clay", skill: 4, handed: 'R', phone: "(508)312-2100", email: "adrian.clay@email.com" },
  { id: "p16", displayName: "Matt Farber", skill: 3.75, handed: 'R', phone: "(508)310-4187", email: "matt.farber@email.com" },
  { id: "p17", displayName: "Bill Smallwood", skill: 3.75, handed: 'R', phone: "(508)507-7440", email: "bill.smallwood@email.com" },
  { id: "p18", displayName: "Mark Donnelly", skill: 3.75, handed: 'R', phone: "(508)932-9428", email: "mark.donnelly@email.com" },
  { id: "p19", displayName: "Don Rowe", skill: 3.75, handed: 'R', phone: "(508)303-1793", email: "don.rowe@email.com" }
];

export const useStore = create<RootState>((set, get) => ({
  league: {
    id: "league1",
    name: "Thursday Doubles",
    season: {
      startISO: "2024-09-01T00:00:00.000Z",
      endISO: "2024-12-31T23:59:59.999Z",
      weekDays: [4] // Thursday
    },
    visibility: "public",
    courts: demoCourts,
    rules: {
      balanceWeights: {
        partners: 3,
        opponents: 2,
        courts: 1,
        sitouts: 4,
        skillParity: 5
      },
      targetPairsPerSeason: 50,
      allowSubs: true,
      ratingSystem: "elo"
    },
    adminDIDs: ["admin"],
    createdBy: "admin",
    createdAt: new Date().toISOString()
  },
  roster: demoPlayers,
  weeks: [],
  availability: [],
  matches: [],
  scores: [],
  playerStats: {},
  
  // UI state
  selectedWeek: null,
  highlightPlayer: null,
  mainPlayer: null,

  setAvailability: (weekId, playerId, state) =>
    set((s) => {
      const existing = s.availability.find(
        (a) => a.weekId === weekId && a.playerId === playerId
      );
      if (existing) {
        existing.state = state;
        existing.updatedAt = new Date().toISOString();
      } else {
        s.availability.push({ 
          weekId, 
          playerId, 
          state, 
          updatedAt: new Date().toISOString()
        });
      }
      return { availability: [...s.availability] };
    }),

  generateWeek: (weekIndex) => {
    const date = new Date();
    const weekDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 7 * weekIndex
    );
    const weekId = `w${id()}`;
    set((s) => ({
      weeks: [
        ...s.weeks,
        {
          id: weekId,
          leagueId: "league1",
          index: weekIndex,
          dateISO: weekDate.toISOString(),
          status: "draft"
        }
      ]
    }));
    // default everyone as maybe
    const av = get().roster.map((p) => ({
      weekId,
      playerId: p.id,
      state: "maybe" as const,
      updatedAt: new Date().toISOString()
    }));
    set((s) => ({ availability: [...s.availability, ...av] }));
    return weekId;
  },

  makeSchedule: (weekId) => {
    const { roster, availability, league, playerStats } = get();
    const yesPlayers = availability
      .filter(
        (a) => a.weekId === weekId && (a.state === "yes" || a.state === "maybe")
      ) // for demo treat maybe as yes
      .map((a) => roster.find((p) => p.id === a.playerId)!)
      .filter(Boolean) as Player[];

    // Use advanced fairness-based scheduling if enough players
    if (yesPlayers.length >= 8) {
      const previousMatches = get().matches.filter(m => m.weekId !== weekId);
      const optimalSchedule = createOptimalSchedule(
        yesPlayers,
        playerStats,
        previousMatches,
        league.courts.length,
        league.courts[0]?.timeSlots || ["18:00", "19:15"]
      );
      
      // Update matches with optimal schedule
      const updatedMatches = optimalSchedule.matches.map(match => ({
        ...match,
        weekId,
        id: `m${id()}`
      }));
      
      set({ matches: [...get().matches.filter(m => m.weekId !== weekId), ...updatedMatches] });
      
      // Update player statistics after scheduling
      const updatedStats = { ...get().playerStats };
      yesPlayers.forEach(player => {
        updatedStats[player.id] = calculatePlayerStatistics(
          player.id,
          get().matches,
          get().scores,
          "2024-Fall"
        );
      });
      set({ playerStats: updatedStats });
      
      return;
    }

    // Fallback to legacy algorithm for smaller groups
    // naive deterministic pairing by skill proximity, then fill courts
    const sorted = [...yesPlayers].sort((a, b) => a.skill - b.skill);
    const pairs: string[][] = [];
    for (let i = 0; i + 1 < sorted.length; i += 2)
      pairs.push([sorted[i].id, sorted[i + 1].id]);

    const matches: Match[] = [];
    let pairIdx = 0;
    for (const court of league.courts) {
      for (const t of court.timeSlots) {
        if (pairIdx + 1 >= pairs.length) break;
        const teamA = pairs[pairIdx++];
        const teamB = pairs[pairIdx++];
        matches.push({
          id: `m${id()}`,
          weekId,
          courtId: court.id,
          timeSlot: t,
          teamA,
          teamB,
          generatedBy: `legacy-${Date.now()}`
        });
      }
    }
    set({ matches: [...get().matches.filter(m => m.weekId !== weekId), ...matches] });
  },

  setSelectedWeek: (weekId) => set({ selectedWeek: weekId }),
  setHighlightPlayer: (playerId) => set({ highlightPlayer: playerId }),
  setMainPlayer: (playerId) => set({ mainPlayer: playerId }),
  
  addPlayer: (player) => {
    const newPlayer: Player = {
      ...player,
      id: `p${id()}`
    };
    set((s) => ({ roster: [...s.roster, newPlayer] }));
  },
  
  updatePlayer: (playerId, updates) => 
    set((s) => ({
      roster: s.roster.map(p => p.id === playerId ? { ...p, ...updates } : p)
    })),
  
  removePlayer: (playerId) => 
    set((s) => ({
      roster: s.roster.filter(p => p.id !== playerId)
    })),
  
  calculatePlayerStats: (playerId) => {
    const { matches, scores } = get();
    return calculatePlayerStatistics(playerId, matches, scores, "2024-Fall");
  },
  
  calculateFairnessMetrics: (weekId) => {
    const { matches, roster, playerStats } = get();
    return calculateFairnessMetrics(matches, roster, playerStats, weekId);
  },
  
  getPlayerPivot: (mainPlayerId) => {
    return {
      pairedWith: {},
      playedAgainst: {},
      sameCourt: {}
    };
  },
  
  updateMatch: (matchId, updates) => 
    set((s) => ({
      matches: s.matches.map(m => m.id === matchId ? { ...m, ...updates } : m)
    })),
  
  lockMatch: (matchId, locked) => 
    set((s) => ({
      matches: s.matches.map(m => 
        m.id === matchId ? { ...m, locked } : m
      )
    })),
  
  addScore: (score) => 
    set((s) => ({ scores: [...s.scores, score] }))
}));
