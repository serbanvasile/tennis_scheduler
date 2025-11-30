import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { Player, League, Court, Week, Availability, Match, Score } from './models';

// Web-only database setup using LokiJS
const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'TennisScheduler',
  onSetUpError: (error: any) => {
    console.error('Database setup error:', error);
  }
});

// Create database instance
export const database = new Database({
  adapter,
  modelClasses: [
    Player,
    League,
    Court,
    Week,
    Availability,
    Match,
    Score,
  ],
});

// Seed data for web
export const seedDatabase = async () => {
  await database.write(async () => {
    // Check if we already have data
    const existingPlayers = await database.get<Player>('players').query().fetch();
    if (existingPlayers.length > 0) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding database with initial data...');

    // Create league
    const league = await database.get<League>('leagues').create((league: any) => {
      league._setRaw('name', 'Thursday Doubles');
      league._setRaw('season_start', '2024-09-01T00:00:00.000Z');
      league._setRaw('season_end', '2024-12-31T23:59:59.999Z');
      league._setRaw('week_days', JSON.stringify([4])); // Thursday
      league._setRaw('visibility', 'public');
      league._setRaw('rules', JSON.stringify({
        balanceWeights: {
          partners: 3,
          opponents: 2,
          courts: 1,
          sitouts: 4,
          skillParity: 5
        },
        targetPairsPerSeason: 50,
        allowSubs: true,
        ratingSystem: 'elo'
      }));
      league._setRaw('admin_dids', JSON.stringify(['admin']));
      league._setRaw('created_by', 'admin');
      league._setRaw('created_at', Date.now());
      league._setRaw('updated_at', Date.now());
    });

    // Create courts
    const courtData = [
      { label: 'Court 1', timeSlots: ['18:00', '19:15'] },
      { label: 'Court 2', timeSlots: ['18:00', '19:15'] },
      { label: 'Court 3', timeSlots: ['18:00', '19:15'] }
    ];

    for (const courtInfo of courtData) {
      await database.get<Court>('courts').create((court: any) => {
        court._setRaw('league_id', league.id);
        court._setRaw('label', courtInfo.label);
        court._setRaw('time_slots', JSON.stringify(courtInfo.timeSlots));
        court._setRaw('created_at', Date.now());
        court._setRaw('updated_at', Date.now());
      });
    }

    // Create players
    const playersData = [
      { displayName: "Bill Tauriello", skill: 3, handed: 'R', phone: "(508)304-2902", email: "bill.tauriello@email.com" },
      { displayName: "Bill Taylor", skill: 3, handed: 'R', phone: "(508)304-2116", email: "bill.taylor@email.com" },
      { displayName: "Bob Alexander", skill: 3, handed: 'R', phone: "(508)507-7500", email: "bob.alexander@email.com" },
      { displayName: "Claus Nussgruber", skill: 4, handed: 'R', phone: "(508)577-4173", email: "claus.nussgruber@email.com" },
      { displayName: "Doug King", skill: 3, handed: 'R', phone: "(508)558-3385", email: "doug.king@email.com" },
      { displayName: "Godehard Rau", skill: 4, handed: 'R', phone: "(508)872-0433", email: "godehard.rau@email.com" },
      { displayName: "Norm Goldberg", skill: 3, handed: 'R', phone: "(508)265-7951", email: "norm.goldberg@email.com" },
      { displayName: "Pierce Butler", skill: 3.5, handed: 'R', phone: "(508)500-4213", email: "pierce.butler@email.com" },
      { displayName: "Serban Vasile", skill: 2, handed: 'R', phone: "(508)558-7896", email: "serban.vasile@email.com" },
      { displayName: "Goran Mecovic", skill: 4.25, handed: 'R', phone: "(508)654-4275", email: "goran.mecovic@email.com" },
      { displayName: "George Walchuk", skill: 4, handed: 'R', phone: "(508)892-4833", email: "george.walchuk@email.com" },
      { displayName: "Klaus Tum", skill: 3.5, handed: 'R', phone: "(508)392-2379", email: "klaus.tum@email.com" },
      { displayName: "Sudhish Kumar", skill: 4, handed: 'R', phone: "(508)654-5023", email: "sudhish.kumar@email.com" },
      { displayName: "Tom Powers", skill: 3.75, handed: 'R', phone: "(508)329-7632", email: "tom.powers@email.com" },
      { displayName: "Adrian Clay", skill: 4, handed: 'R', phone: "(508)312-2100", email: "adrian.clay@email.com" },
      { displayName: "Matt Farber", skill: 3.75, handed: 'R', phone: "(508)310-4187", email: "matt.farber@email.com" },
      { displayName: "Bill Smallwood", skill: 3.75, handed: 'R', phone: "(508)507-7440", email: "bill.smallwood@email.com" },
      { displayName: "Mark Donnelly", skill: 3.75, handed: 'R', phone: "(508)932-9428", email: "mark.donnelly@email.com" },
      { displayName: "Don Rowe", skill: 3.75, handed: 'R', phone: "(508)303-1793", email: "don.rowe@email.com" }
    ];

    for (const playerData of playersData) {
      await database.get<Player>('players').create((player: any) => {
        player._setRaw('display_name', playerData.displayName);
        player._setRaw('skill', playerData.skill);
        player._setRaw('handed', playerData.handed);
        player._setRaw('phone', playerData.phone);
        player._setRaw('email', playerData.email);
        player._setRaw('tags', JSON.stringify([]));
        player._setRaw('created_at', Date.now());
        player._setRaw('updated_at', Date.now());
      });
    }

    console.log('Database seeded successfully!');
  });
};