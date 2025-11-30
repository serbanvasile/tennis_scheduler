const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file in the project root
const dbPath = path.join(__dirname, 'tennis_scheduler.db');
console.log('Creating database at:', dbPath);

const db = new sqlite3.Database(dbPath);

// Create tables based on our schema
db.serialize(() => {
  // Players table
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    skill REAL NOT NULL,
    handed TEXT CHECK(handed IN ('L', 'R', 'A')) DEFAULT 'R',
    phone TEXT,
    email TEXT,
    tags TEXT DEFAULT '[]',
    share REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  )`);

  // Leagues table
  db.run(`CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    season_start TEXT NOT NULL,
    season_end TEXT NOT NULL,
    week_days TEXT DEFAULT '[]',
    visibility TEXT CHECK(visibility IN ('public', 'private')) DEFAULT 'public',
    rules TEXT DEFAULT '{}',
    admin_dids TEXT DEFAULT '[]',
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  )`);

  // Courts table
  db.run(`CREATE TABLE IF NOT EXISTS courts (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    label TEXT NOT NULL,
    location TEXT,
    time_slots TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (league_id) REFERENCES leagues (id)
  )`);

  // Weeks table
  db.run(`CREATE TABLE IF NOT EXISTS weeks (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    date_iso TEXT NOT NULL,
    status TEXT CHECK(status IN ('draft', 'published', 'completed', 'cancelled')) DEFAULT 'draft',
    notes TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (league_id) REFERENCES leagues (id)
  )`);

  // Availability table
  db.run(`CREATE TABLE IF NOT EXISTS availability (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    state TEXT CHECK(state IN ('yes', 'no', 'maybe')) DEFAULT 'maybe',
    signature TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (week_id) REFERENCES weeks (id),
    FOREIGN KEY (player_id) REFERENCES players (id)
  )`);

  // Matches table
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL,
    court_id TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    team_a TEXT DEFAULT '[]',
    team_b TEXT DEFAULT '[]',
    generated_by TEXT NOT NULL,
    locked BOOLEAN DEFAULT 0,
    skill_level REAL,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (week_id) REFERENCES weeks (id),
    FOREIGN KEY (court_id) REFERENCES courts (id)
  )`);

  // Scores table
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    set_scores TEXT DEFAULT '[]',
    winner TEXT CHECK(winner IN ('A', 'B', 'split', 'NA')) DEFAULT 'NA',
    submitted_by TEXT NOT NULL,
    signature TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (match_id) REFERENCES matches (id)
  )`);

  // Generate a unique ID function
  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Insert sample data
  console.log('Inserting sample data...');

  // Create a league
  const leagueId = generateId();
  db.run(`INSERT INTO leagues (id, name, season_start, season_end, week_days, created_by) 
          VALUES (?, ?, ?, ?, ?, ?)`, 
          [leagueId, 'Thursday Doubles', '2024-09-01T00:00:00.000Z', '2024-12-31T23:59:59.999Z', JSON.stringify([4]), 'admin']);

  // Create courts
  const court1Id = generateId();
  const court2Id = generateId();
  const court3Id = generateId();
  
  db.run(`INSERT INTO courts (id, league_id, label, time_slots) VALUES (?, ?, ?, ?)`, 
         [court1Id, leagueId, 'Court 1', JSON.stringify(['18:00', '19:15'])]);
  db.run(`INSERT INTO courts (id, league_id, label, time_slots) VALUES (?, ?, ?, ?)`, 
         [court2Id, leagueId, 'Court 2', JSON.stringify(['18:00', '19:15'])]);
  db.run(`INSERT INTO courts (id, league_id, label, time_slots) VALUES (?, ?, ?, ?)`, 
         [court3Id, leagueId, 'Court 3', JSON.stringify(['18:00', '19:15'])]);

  // Insert all 19 players
  const players = [
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

  players.forEach(player => {
    const playerId = generateId();
    db.run(`INSERT INTO players (id, display_name, skill, handed, phone, email) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [playerId, player.displayName, player.skill, player.handed, player.phone, player.email]);
  });

});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('Database created successfully!');
    console.log('Database file location:', dbPath);
    console.log('You can now open this file with DB Browser for SQLite');
  }
});