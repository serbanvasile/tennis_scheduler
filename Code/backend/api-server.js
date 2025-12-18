const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database path - BRAND NEW DB
const dbPath = path.join(__dirname, 'team_sports.db');
console.log('Database path:', dbPath);

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database: team_sports.db');
    // Enable foreign key constraints at connection level (critical for referential integrity)
    db.run("PRAGMA foreign_keys = ON", (fkErr) => {
      if (fkErr) {
        console.error('Failed to enable foreign keys:', fkErr);
      } else {
        console.log('Foreign key constraints enabled');
      }
      initializeDatabase();
    });
  }
});

// Helper function to fetch SVG content from a URL
// Node.js doesn't have CORS restrictions, so this works for any URL
const fetchSvgContent = async (url) => {
  if (!url || !url.trim()) return null;

  // Only fetch SVG files
  if (!url.toLowerCase().includes('.svg')) return null;

  try {
    console.log('Fetching SVG from:', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Failed to fetch SVG:', response.status, response.statusText);
      return null;
    }

    const text = await response.text();

    // Validate it's actually SVG content
    if (text.includes('<svg') || text.includes('<?xml')) {
      console.log('SVG cached, length:', text.length);
      return text;
    }

    console.warn('Response is not valid SVG');
    return null;
  } catch (err) {
    console.error('Error fetching SVG:', err.message);
    return null;
  }
};

// Promise-based database helpers for proper async/await patterns
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Promise-based xref linking - waits for ALL inserts to complete
const linkEventXrefsAsync = async (eventId, xrefs, now) => {
  const { venueIds = [], teamIds = [], memberIds = [], eventTypeIds = [], systemIds = [], courtIds = [], fieldIds = [], seasonId, isTournament } = xrefs;

  console.log(`🔗 linkEventXrefsAsync for event ${eventId}:`, { teamIds, memberIds });

  const insertPromises = [];

  venueIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_venue_xref (event_id, venue_id, create_date, update_date) VALUES (?, ?, ?, ?)',
      [eventId, id, now, now]
    ));
  });

  teamIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_team_xref (guid, event_id, team_id, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), eventId, id, now, now]
    ));
  });

  eventTypeIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_eventType_xref (event_id, eventType_id, create_date, update_date) VALUES (?, ?, ?, ?)',
      [eventId, id, now, now]
    ));
  });

  systemIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_system_xref (event_id, system_id, create_date, update_date) VALUES (?, ?, ?, ?)',
      [eventId, id, now, now]
    ));
  });

  courtIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_court_xref (event_id, court_id, create_date, update_date) VALUES (?, ?, ?, ?)',
      [eventId, id, now, now]
    ));
  });

  fieldIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_field_xref (event_id, field_id, create_date, update_date) VALUES (?, ?, ?, ?)',
      [eventId, id, now, now]
    ));
  });

  memberIds.forEach(id => {
    insertPromises.push(dbRun(
      'INSERT INTO event_member_xref (guid, event_id, member_id, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), eventId, id, now, now]
    ));
  });

  if (seasonId) {
    insertPromises.push(dbRun(
      'INSERT INTO event_season_xref (event_id, season_id, is_tournament, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
      [eventId, seasonId, isTournament ? 1 : 0, now, now]
    ));
  }

  await Promise.all(insertPromises);
};

function initializeDatabase() {
  console.log('Initializing database schema...');

  db.serialize(() => {
    // Enable Foreign Keys
    db.run("PRAGMA foreign_keys = ON");

    // Helper to create standard fields string
    const standardFields = `
      create_user TEXT,
      create_date INTEGER,
      update_user TEXT,
      update_date INTEGER,
      deleted_flag INTEGER DEFAULT 0
    `;

    // --- MAIN TABLES ---

    // 1. users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      email TEXT,
      ${standardFields}
    )`);

    // 2. sports
    db.run(`CREATE TABLE IF NOT EXISTS sports (
      sport_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      ${standardFields}
    )`);

    // 3. teams
    db.run(`CREATE TABLE IF NOT EXISTS teams (
      team_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      team_colors TEXT,
      logo_url TEXT,
      logo_svg TEXT,
      ${standardFields}
    )`);

    // 4. leagues
    db.run(`CREATE TABLE IF NOT EXISTS leagues (
      league_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      ${standardFields}
    )`);

    // 5. members (People/Players)
    // Note: skill is now stored in team_member_xref.skill_id (sport-specific)
    // Note: phone/email are now stored in contacts table via member_contact_xref
    db.run(`CREATE TABLE IF NOT EXISTS members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      display_name TEXT,
      gender TEXT,
      birth_date INTEGER,
      dominant_side TEXT CHECK(dominant_side IN ('L', 'R', 'A')) DEFAULT 'R',
      share REAL DEFAULT 0,
      share_type TEXT DEFAULT 'R',
      ${standardFields}
    )`);

    // 6. roles
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE, -- e.g. 'Captain', 'Player', 'Admin'
      description TEXT,
      ${standardFields}
    )`);

    // 6.5 positions
    db.run(`CREATE TABLE IF NOT EXISTS positions (
      position_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      sport_id INTEGER,
      description TEXT,
      ${standardFields},
      FOREIGN KEY(sport_id) REFERENCES sports(sport_id)
    )`);

    // 7. colors
    db.run(`CREATE TABLE IF NOT EXISTS colors (
      color_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE, -- e.g. 'Red', 'Blue'
      hex_code TEXT NOT NULL,
      ${standardFields}
    )`);

    // 7.5 skills - skill levels that can be assigned to members per team
    db.run(`CREATE TABLE IF NOT EXISTS skills (
      skill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL, -- e.g. '3.5', '4.0', 'Amateur', 'Pro'
      sort_order INTEGER DEFAULT 0, -- for ordering skills in UI
      ${standardFields}
    )`);

    // 7. venues
    db.run(`CREATE TABLE IF NOT EXISTS venues (
      venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      geocoded_data TEXT,
      details TEXT, -- JSON
      ${standardFields}
    )`);

    // 8. courts
    db.run(`CREATE TABLE IF NOT EXISTS courts (
      court_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL, -- e.g. 'Court 1'
      surface TEXT,
      ${standardFields}
    )`);

    // 9. fields
    db.run(`CREATE TABLE IF NOT EXISTS fields (
      field_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL, -- e.g. 'North Field'
      surface TEXT,
      ${standardFields}
    )`);

    // 10. events (sport-agnostic with series support)
    db.run(`CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER,
      description TEXT,
      status TEXT DEFAULT 'scheduled',
      -- Series support
      is_series_event INTEGER DEFAULT 0,
      series_id TEXT,
      repeat_period TEXT CHECK (repeat_period IN ('hours', 'days', 'weeks')),
      repeat_interval INTEGER DEFAULT 1,
      total_events INTEGER,
      last_event_date INTEGER, -- Optional end boundary for series
      last_event_time TEXT, -- Time component for last event
      ${standardFields}
    )`);

    // 10.5 user_preferences (for UI settings like preview counts)
    db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
      pref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      user_id INTEGER DEFAULT 0, -- 0 = global/default preferences
      preview_first_count INTEGER DEFAULT 4,
      preview_last_count INTEGER DEFAULT 4,
      ${standardFields}
    )`);

    // 11. eventTypes
    db.run(`CREATE TABLE IF NOT EXISTS eventTypes(
      eventType_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE, --e.g. 'Match', 'Practice', 'Tournament'
      description TEXT,
      ${standardFields}
    )`);

    // 12. seasons
    db.run(`CREATE TABLE IF NOT EXISTS seasons(
      season_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL, --e.g. 'Fall 2025'
      start_date INTEGER,
      end_date INTEGER,
      ${standardFields}
    )`);

    // 13. contacts
    db.run(`CREATE TABLE IF NOT EXISTS contacts(
      contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      value TEXT NOT NULL, --e.g. 'john@doe.com', '555-0123'
      type TEXT NOT NULL, -- 'Email', 'Phone', 'Address'
      label TEXT, -- 'Home', 'Work'
      ${standardFields}
    )`);

    // 13.5 contact_labels (lookup table for contact labels)
    db.run(`CREATE TABLE IF NOT EXISTS contact_labels(
      label_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      description TEXT,
      ${standardFields}
    )`);

    // 14. systems (scheduling/tournament systems - sport-agnostic)
    db.run(`CREATE TABLE IF NOT EXISTS systems(
      system_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE, --e.g. 'Round Robin', 'Swiss', 'Elimination'
      description TEXT,
      config TEXT, --JSON configuration for the system
      ${standardFields}
    )`);


    // --- XREF TABLES ---

    // 1. sport_league_xref
    db.run(`CREATE TABLE IF NOT EXISTS sport_league_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sport_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(sport_id) REFERENCES sports(sport_id),
        FOREIGN KEY(league_id) REFERENCES leagues(league_id)
      )`);

    // 1.5 skill_sport_xref - links skills to sports
    db.run(`CREATE TABLE IF NOT EXISTS skill_sport_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id INTEGER NOT NULL,
        sport_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(skill_id) REFERENCES skills(skill_id),
        FOREIGN KEY(sport_id) REFERENCES sports(sport_id)
      )`);

    // 2. team_league_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_league_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(team_id) REFERENCES teams(team_id),
        FOREIGN KEY(league_id) REFERENCES leagues(league_id)
      )`);

    // 4. team_sport_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_sport_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        sport_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(team_id) REFERENCES teams(team_id),
        FOREIGN KEY(sport_id) REFERENCES sports(sport_id)
      )`);

    // 5. team_color_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_color_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        color_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(team_id) REFERENCES teams(team_id),
        FOREIGN KEY(color_id) REFERENCES colors(color_id)
      )`);

    // 4. team_member_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_member_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        skill_id INTEGER, --skill level for this member on this team(sport - specific)
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
    FOREIGN KEY(member_id) REFERENCES members(member_id),
      FOREIGN KEY(skill_id) REFERENCES skills(skill_id)
    )`);

    // 5. member_role_xref
    // Note: This ties a member to a role. 
    // Context is vague here (Global role? Team specific?). 
    // Often you want team_member_role_xref. But sticking to list:
    db.run(`CREATE TABLE IF NOT EXISTS member_role_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        context_table TEXT, --Optional: 'teams', 'leagues'
      context_id INTEGER, --Optional: team_id, league_id
      ${standardFields},
        FOREIGN KEY(member_id) REFERENCES members(member_id),
        FOREIGN KEY(role_id) REFERENCES roles(role_id)
      )`);

    // 5.5 member_position_xref
    db.run(`CREATE TABLE IF NOT EXISTS member_position_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        position_id INTEGER NOT NULL,
        context_table TEXT,
        context_id INTEGER,
        ${standardFields},
        FOREIGN KEY(member_id) REFERENCES members(member_id),
        FOREIGN KEY(position_id) REFERENCES positions(position_id)
      )`);

    // event_team_xref - links events to teams
    db.run(`CREATE TABLE IF NOT EXISTS event_team_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        event_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id) ON DELETE CASCADE,
        FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
        UNIQUE(event_id, team_id)
      )`);

    // event_member_xref - links events to members
    db.run(`CREATE TABLE IF NOT EXISTS event_member_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guid TEXT UNIQUE NOT NULL,
        event_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id) ON DELETE CASCADE,
        FOREIGN KEY(member_id) REFERENCES members(member_id) ON DELETE CASCADE,
        UNIQUE(event_id, member_id)
      )`)
      ;
    // 5.6 member_contact_xref
    db.run(`CREATE TABLE IF NOT EXISTS member_contact_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(member_id) REFERENCES members(member_id),
        FOREIGN KEY(contact_id) REFERENCES contacts(contact_id)
      )`);

    // 6. event_venue_xref
    db.run(`CREATE TABLE IF NOT EXISTS event_venue_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        venue_id INTEGER NOT NULL,
        usage_notes TEXT,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(venue_id) REFERENCES venues(venue_id)
      )`);

    // 7. event_team_xref
    db.run(`CREATE TABLE IF NOT EXISTS event_team_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        outcome TEXT, -- 'Win', 'Loss', 'Draw'
      score TEXT,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(team_id) REFERENCES teams(team_id)
      )`);

    // 8. event_eventType_xref
    // Usually 1:1, but request asked for xref.
    db.run(`CREATE TABLE IF NOT EXISTS event_eventType_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        eventType_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(eventType_id) REFERENCES eventTypes(eventType_id)
      )`);

    // 9. member_contact_xref
    db.run(`CREATE TABLE IF NOT EXISTS member_contact_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        is_primary INTEGER DEFAULT 0,
        ${standardFields},
        FOREIGN KEY(member_id) REFERENCES members(member_id),
        FOREIGN KEY(contact_id) REFERENCES contacts(contact_id)
      )`);

    // 10. venue_court_xref
    // A venue has many courts.
    db.run(`CREATE TABLE IF NOT EXISTS venue_court_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        court_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(venue_id) REFERENCES venues(venue_id),
        FOREIGN KEY(court_id) REFERENCES courts(court_id)
      )`);

    // 11. venue_field_xref
    db.run(`CREATE TABLE IF NOT EXISTS venue_field_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        field_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(venue_id) REFERENCES venues(venue_id),
        FOREIGN KEY(field_id) REFERENCES fields(field_id)
      )`);

    // 12. team_contact_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_contact_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(team_id) REFERENCES teams(team_id),
        FOREIGN KEY(contact_id) REFERENCES contacts(contact_id)
      )`);

    // 13. sport_season_xref
    db.run(`CREATE TABLE IF NOT EXISTS sport_season_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sport_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(sport_id) REFERENCES sports(sport_id),
        FOREIGN KEY(season_id) REFERENCES seasons(season_id)
      )`);

    // 14. team_season_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_season_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(team_id) REFERENCES teams(team_id),
        FOREIGN KEY(season_id) REFERENCES seasons(season_id)
      )`);

    // 15. event_system_xref - links events to scheduling systems
    db.run(`CREATE TABLE IF NOT EXISTS event_system_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        system_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(system_id) REFERENCES systems(system_id)
      )`);

    // 16. event_court_xref - links events to courts (tennis, pickleball, etc)
    db.run(`CREATE TABLE IF NOT EXISTS event_court_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        court_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(court_id) REFERENCES courts(court_id)
      )`);

    // 17. event_field_xref - links events to fields (soccer, football, etc)
    db.run(`CREATE TABLE IF NOT EXISTS event_field_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        field_id INTEGER NOT NULL,
        ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(field_id) REFERENCES fields(field_id)
      )`);

    // 18. event_season_xref - links events to seasons/tournaments
    db.run(`CREATE TABLE IF NOT EXISTS event_season_xref(
        ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        is_tournament INTEGER DEFAULT 0, --0 = regular season, 1 = tournament
      ${standardFields},
        FOREIGN KEY(event_id) REFERENCES events(event_id),
        FOREIGN KEY(season_id) REFERENCES seasons(season_id)
      )`);

    console.log('Database tables initialized.');
    seedReferenceData();
  });
}

function seedReferenceData() {
  // Simple check to see if we need to seed
  db.get('SELECT count(*) as count FROM sports', (err, row) => {
    if (err) return console.error('Error checking sports:', err);

    if (row.count === 0) {
      console.log('Seeding initial reference data...');
      const now = Date.now();

      // Sports
      const sports = ['Tennis', 'Basketball', 'Soccer', 'Volleyball', 'Pickleball'];
      const users = ['System'];
      const roles = ['Player', 'Captain', 'Coach', 'Admin', 'Reserve'];
      const eventTypes = ['Match', 'Pickup', 'Practice', 'Meeting', 'Tournament'];

      // Seed Sports
      const stmtSport = db.prepare('INSERT INTO sports (guid, name, create_date, update_date) VALUES (?, ?, ?, ?)');
      sports.forEach(s => stmtSport.run(uuidv4(), s, now, now));
      stmtSport.finalize();

      // Seed Roles
      const stmtRole = db.prepare('INSERT INTO roles (guid, name, create_date, update_date) VALUES (?, ?, ?, ?)');
      roles.forEach(r => stmtRole.run(uuidv4(), r, now, now));
      stmtRole.finalize();

      // Seed EventTypes
      const stmtET = db.prepare('INSERT INTO eventTypes (guid, name, create_date, update_date) VALUES (?, ?, ?, ?)');
      eventTypes.forEach(e => stmtET.run(uuidv4(), e, now, now));
      stmtET.finalize();

      // Seed Systems (scheduling/tournament systems)
      const systems = ['Friendly', 'Round Robin', 'Playoff', 'Swiss', 'Elimination', 'League Play'];
      const stmtSys = db.prepare('INSERT INTO systems (guid, name, create_date, update_date) VALUES (?, ?, ?, ?)');
      systems.forEach(s => stmtSys.run(uuidv4(), s, now, now));
      stmtSys.finalize();

      // Seed Colors
      const colors = [
        { name: 'Red', hex: '#FF0000' },
        { name: 'Blue', hex: '#0055FF' }, // Brighter Blue
        { name: 'Green', hex: '#00AA00' },
        { name: 'Yellow', hex: '#FFFF00' },
        { name: 'Black', hex: '#000000' },
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Gold', hex: '#FFD700' },
        { name: 'Silver', hex: '#C0C0C0' },
        { name: 'Orange', hex: '#FFA500' },
        { name: 'Purple', hex: '#800080' }
      ];
      const stmtColor = db.prepare('INSERT INTO colors (guid, name, hex_code, create_date, update_date) VALUES (?, ?, ?, ?, ?)');
      colors.forEach(c => stmtColor.run(uuidv4(), c.name, c.hex, now, now));
      stmtColor.finalize();

      // Seed Contact Labels (ordered: preferred, emergency, other, expired, do not use)
      const contactLabels = [
        { name: 'preferred', order: 1 },
        { name: 'emergency', order: 2 },
        { name: 'other', order: 3 },
        { name: 'expired', order: 4 },
        { name: 'do not use', order: 5 }
      ];
      const stmtLabel = db.prepare('INSERT INTO contact_labels (guid, name, sort_order, create_date, update_date) VALUES (?, ?, ?, ?, ?)');
      contactLabels.forEach(l => stmtLabel.run(uuidv4(), l.name, l.order, now, now));
      stmtLabel.finalize(() => {
        console.log('Seeding completed. Now seeding positions...');
        seedPositions();
      });
    } else {
      // Sports already exist, still check/seed positions
      seedPositions();
    }
  });
}

function seedPositions() {
  const sportsData = [
    { name: 'Tennis', positions: ['Singles', 'Doubles'] },
    { name: 'Pickleball', positions: ['Singles', 'Doubles'] },
    { name: 'Soccer', positions: ['Goalie', 'Defender', 'Midfield', 'Forward'] },
    { name: 'Basketball', positions: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'] },
    { name: 'Volleyball', positions: ['Setter', 'Libero', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter'] }
  ];

  const now = Date.now();

  db.serialize(() => {
    sportsData.forEach(sport => {
      // Get Sport ID
      db.get("SELECT sport_id FROM sports WHERE name = ?", [sport.name], (err, row) => {
        if (row && row.sport_id) {
          const sportId = row.sport_id;
          sport.positions.forEach(posName => {
            db.get("SELECT position_id FROM positions WHERE name = ? AND sport_id = ?", [posName, sportId], (e, r) => {
              if (!r) {
                db.run("INSERT INTO positions (guid, name, sport_id, create_date, update_date) VALUES (?, ?, ?, ?, ?)",
                  [uuidv4(), posName, sportId, now, now],
                  (err) => {
                    if (err) console.error(`Failed to seed position ${posName}: `, err);
                  }
                );
              }
            });
          });
        }
      });
    });
  });

  // Call seedSkills after a delay to ensure positions are inserted
  setTimeout(seedSkills, 500);
}

// Seed skills by sport
function seedSkills() {
  const now = Date.now();

  // Define skills for different sports - 0.25 increments from 3.0 to 5.5
  const tennisPickleballSkills = ['3.0', '3.25', '3.5', '3.75', '4.0', '4.25', '4.5', '4.75', '5.0', '5.25', '5.5'];
  const generalSkills = ['Amateur', 'Skilled Amateur', 'Fit Amateur', 'Semi-Pro', 'Pro'];

  // Tennis and Pickleball use numeric ratings
  const tennisPickleballSports = ['Tennis', 'Pickleball'];
  // All other sports use general ratings
  const generalSports = ['Basketball', 'Soccer', 'Volleyball'];

  console.log('Seeding skills...');

  db.get('SELECT count(*) as count FROM skills', (err, row) => {
    if (err) return console.error('Error checking skills:', err);

    if (row.count === 0) {
      // Seed Tennis/Pickleball skills
      tennisPickleballSkills.forEach((skillName, idx) => {
        db.run(
          'INSERT INTO skills (guid, name, sort_order, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), skillName, idx + 1, now, now],
          function (err) {
            if (err) return console.error('Failed to insert skill:', err);
            const skillId = this.lastID;

            // Link to Tennis and Pickleball
            tennisPickleballSports.forEach(sportName => {
              db.get('SELECT sport_id FROM sports WHERE name = ?', [sportName], (e, sport) => {
                if (sport) {
                  db.run(
                    'INSERT INTO skill_sport_xref (skill_id, sport_id, create_date, update_date) VALUES (?, ?, ?, ?)',
                    [skillId, sport.sport_id, now, now]
                  );
                }
              });
            });
          }
        );
      });

      // Seed general skills
      generalSkills.forEach((skillName, idx) => {
        db.run(
          'INSERT INTO skills (guid, name, sort_order, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), skillName, idx + 1, now, now],
          function (err) {
            if (err) return console.error('Failed to insert skill:', err);
            const skillId = this.lastID;

            // Link to general sports
            generalSports.forEach(sportName => {
              db.get('SELECT sport_id FROM sports WHERE name = ?', [sportName], (e, sport) => {
                if (sport) {
                  db.run(
                    'INSERT INTO skill_sport_xref (skill_id, sport_id, create_date, update_date) VALUES (?, ?, ?, ?)',
                    [skillId, sport.sport_id, now, now]
                  );
                }
              });
            });
          }
        );
      });

      console.log('Skills seeding completed.');
    } else {
      console.log('Skills already seeded.');
    }
  });
}
// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'team_sports.db', timestamp: new Date().toISOString() });
});

// Google Maps API Proxy (to avoid CORS errors in browser)
app.get('/api/geocode', async (req, res) => {
  const query = req.query.q;
  const GOOGLE_MAPS_API_KEY = 'AIzaSyAqOnn8hRcEuC9N1AV0Oq7xxaFO6T3O2yM';

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('Google Maps API error:', error);
    res.status(500).json({ error: 'Failed to fetch from Google Maps API', details: error.message });
  }
});

// --- API ROUTES ---

// Helper for standardized error response
const sendError = (res, err, message = 'Internal Server Error', status = 500) => {
  console.error(`Error: ${message}`, err);
  res.status(status).json({ error: message, details: err.message });
};

// 0. COLORS
app.get('/api/colors', (req, res) => {
  db.all("SELECT * FROM colors ORDER BY name", [], (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch colors');
    res.json(rows);
  });
});

// 0.5 USER PREFERENCES
app.get('/api/preferences', (req, res) => {
  db.get('SELECT * FROM user_preferences WHERE user_id = 0 ORDER BY pref_id DESC LIMIT 1', [], (err, row) => {
    if (err) return sendError(res, err, 'Failed to fetch preferences');
    if (!row) {
      // Return defaults
      res.json({ preview_first_count: 4, preview_last_count: 4 });
    } else {
      res.json(row);
    }
  });
});

app.post('/api/preferences', (req, res) => {
  const { preview_first_count, preview_last_count } = req.body;
  const now = Date.now();

  db.get('SELECT * FROM user_preferences WHERE user_id = 0', [], (err, existing) => {
    if (err) return sendError(res, err, 'Failed to check preferences');

    if (existing) {
      db.run(
        'UPDATE user_preferences SET preview_first_count = ?, preview_last_count = ?, update_date = ? WHERE pref_id = ?',
        [preview_first_count, preview_last_count, now, existing.pref_id],
        (err) => {
          if (err) return sendError(res, err, 'Failed to update preferences');
          res.json({ success: true });
        }
      );
    } else {
      db.run(
        'INSERT INTO user_preferences (guid, user_id, preview_first_count, preview_last_count, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), 0, preview_first_count, preview_last_count, now, now],
        (err) => {
          if (err) return sendError(res, err, 'Failed to create preferences');
          res.json({ success: true });
        }
      );
    }
  });
});

// 1. LOOKUPS
app.get('/api/lookups', (req, res) => {
  const lookups = {};

  // Parallel fetch for simplified lookups
  db.serialize(() => {
    db.all('SELECT * FROM sports', (err, rows) => {
      if (err) return sendError(res, err, 'Failed to fetch sports');
      lookups.sports = rows;

      db.all('SELECT * FROM roles', (err, rows) => {
        if (err) return sendError(res, err, 'Failed to fetch roles');
        lookups.roles = rows;

        db.all('SELECT * FROM eventTypes', (err, rows) => {
          if (err) return sendError(res, err, 'Failed to fetch eventTypes');
          lookups.eventTypes = rows;

          db.all('SELECT * FROM positions ORDER BY name', (err, rows) => {
            if (err) return sendError(res, err, 'Failed to fetch positions');
            lookups.positions = rows;

            // Fetch skills with their sport associations
            db.all(`
              SELECT s.*, ssx.sport_id
              FROM skills s
              LEFT JOIN skill_sport_xref ssx ON s.skill_id = ssx.skill_id
              ORDER BY s.sort_order, s.name
            `, (err, rows) => {
              if (err) return sendError(res, err, 'Failed to fetch skills');
              lookups.skills = rows;

              // Fetch systems (scheduling/tournament systems)
              db.all('SELECT * FROM systems ORDER BY name', (err, rows) => {
                if (err) return sendError(res, err, 'Failed to fetch systems');
                lookups.systems = rows;

                // Fetch contact labels (ordered by sort_order)
                db.all('SELECT * FROM contact_labels ORDER BY sort_order', (err, rows) => {
                  if (err) return sendError(res, err, 'Failed to fetch contact labels');
                  lookups.contact_labels = rows;

                  res.json(lookups);
                });
              });
            });
          });
        });
      });
    });
  });
});

// 2. MEMBERS
app.get('/api/members', async (req, res) => {
  try {
    // Get all members
    const members = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM members WHERE (deleted_flag IS NULL OR deleted_flag = 0) ORDER BY last_name, first_name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // For each member, get their team assignments with roles and positions
    const enrichedMembers = await Promise.all(members.map(async (member) => {
      const teamAssignments = await new Promise((resolve, reject) => {
        const sql = `
          SELECT 
            t.team_id, t.name as team_name, 
            s.name as sport_name,
            tmx.skill_id, sk.name as skill_name,
            GROUP_CONCAT(DISTINCT r.name) as role_names,
            GROUP_CONCAT(DISTINCT p.name) as position_names
          FROM team_member_xref tmx
          JOIN teams t ON tmx.team_id = t.team_id
          LEFT JOIN team_sport_xref tsx ON t.team_id = tsx.team_id
          LEFT JOIN sports s ON tsx.sport_id = s.sport_id
          LEFT JOIN skills sk ON tmx.skill_id = sk.skill_id
          LEFT JOIN member_role_xref mrx ON mrx.member_id = tmx.member_id AND mrx.context_table = 'teams' AND mrx.context_id = t.team_id
          LEFT JOIN roles r ON mrx.role_id = r.role_id
          LEFT JOIN member_position_xref mpx ON mpx.member_id = tmx.member_id AND mpx.context_table = 'teams' AND mpx.context_id = t.team_id
          LEFT JOIN positions p ON mpx.position_id = p.position_id
          WHERE tmx.member_id = ?
          GROUP BY t.team_id
        `;
        db.all(sql, [member.member_id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      // Get contacts for this member
      const contacts = await new Promise((resolve, reject) => {
        db.all(`
          SELECT c.contact_id, c.value, c.type, c.label
          FROM member_contact_xref mcx
          JOIN contacts c ON mcx.contact_id = c.contact_id
          WHERE mcx.member_id = ? AND (c.deleted_flag IS NULL OR c.deleted_flag = 0)
        `, [member.member_id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      return {
        ...member,
        teams: teamAssignments,
        contacts: contacts
      };
    }));

    res.json(enrichedMembers);
  } catch (err) {
    sendError(res, err, 'Failed to fetch members');
  }
});



// Helper to save member relations
const saveMemberRelations = (db, memberId, teams, callback) => {
  const now = Date.now();
  // Clear all existing relations for this member (CONTEXT: Teams)
  db.run(`DELETE FROM team_member_xref WHERE member_id = ?`, [memberId], () => {
    db.run(`DELETE FROM member_role_xref WHERE member_id = ? AND context_table = 'teams'`, [memberId], () => {
      db.run(`DELETE FROM member_position_xref WHERE member_id = ? AND context_table = 'teams'`, [memberId], () => {

        if (!teams || teams.length === 0) return callback();

        console.log('saveMemberRelations - teams:', JSON.stringify(teams));

        const stmtTeam = db.prepare(`INSERT INTO team_member_xref (team_id, member_id, skill_id, create_date, update_date) VALUES (?, ?, ?, ?, ?)`);
        const stmtRole = db.prepare(`INSERT INTO member_role_xref (member_id, role_id, context_table, context_id, create_date, update_date) VALUES (?, ?, 'teams', ?, ?, ?)`);
        const stmtPos = db.prepare(`INSERT INTO member_position_xref (member_id, position_id, context_table, context_id, create_date, update_date) VALUES (?, ?, 'teams', ?, ?, ?)`);

        teams.forEach(t => {
          stmtTeam.run(t.teamId, memberId, t.skillId || null, now, now);
          if (t.roleIds) t.roleIds.forEach(rid => stmtRole.run(memberId, rid, t.teamId, now, now));
          if (t.positionIds) t.positionIds.forEach(pid => stmtPos.run(memberId, pid, t.teamId, now, now));
        });

        stmtTeam.finalize();
        stmtRole.finalize();
        stmtPos.finalize(() => callback());
      });
    });
  });
};

// Helper to save member contacts
const saveMemberContacts = (db, memberId, contacts, callback) => {
  const now = Date.now();

  // First, soft-delete existing contact links for this member
  db.run(`DELETE FROM member_contact_xref WHERE member_id = ?`, [memberId], () => {
    if (!contacts || contacts.length === 0) return callback();

    let pending = contacts.length;

    contacts.forEach(contact => {
      const guid = uuidv4();
      // Insert new contact
      db.run(
        `INSERT INTO contacts (guid, value, type, label, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [guid, contact.value, contact.type, contact.label || 'preferred', now, now],
        function (err) {
          if (err) {
            console.error('Failed to insert contact:', err);
            if (--pending === 0) callback();
            return;
          }
          const contactId = this.lastID;
          // Link to member
          db.run(
            `INSERT INTO member_contact_xref (member_id, contact_id, create_date, update_date) VALUES (?, ?, ?, ?)`,
            [memberId, contactId, now, now],
            () => {
              if (--pending === 0) callback();
            }
          );
        }
      );
    });
  });
};

app.post('/api/members', (req, res) => {
  const { firstName, lastName, displayName, gender, teams, contacts, dominant_side, share, share_type } = req.body;
  if (!firstName || !lastName) return sendError(res, new Error('Validation'), 'Name required', 400);

  const now = Date.now();
  const guid = uuidv4();

  db.serialize(() => {
    db.run(
      `INSERT INTO members (guid, first_name, last_name, display_name, gender, dominant_side, share, share_type, create_date, update_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [guid, firstName, lastName, displayName, gender, dominant_side || 'R', share || 0, share_type || 'R', now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to create member');
        const memberId = this.lastID;
        saveMemberRelations(db, memberId, teams, () => {
          saveMemberContacts(db, memberId, contacts, () => {
            res.status(201).json({ member_id: memberId, success: true });
          });
        });
      }
    );
  });
});

app.put('/api/members/:memberId', (req, res) => {
  const { memberId } = req.params;
  const { firstName, lastName, displayName, gender, teams, contacts, dominant_side, share, share_type } = req.body;
  const now = Date.now();

  db.run(
    `UPDATE members SET first_name=?, last_name=?, display_name=?, gender=?, dominant_side=?, share=?, share_type=?, update_date=? WHERE member_id=?`,
    [firstName, lastName, displayName, gender, dominant_side || 'R', share || 0, share_type || 'R', now, memberId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to update member');
      saveMemberRelations(db, memberId, teams, () => {
        saveMemberContacts(db, memberId, contacts, () => {
          res.json({ success: true, member_id: memberId });
        });
      });
    }
  );
});

// Soft Delete Member
app.put('/api/members/:memberId/delete', (req, res) => {
  const { memberId } = req.params;
  const now = Date.now();
  db.run(
    `UPDATE members SET deleted_flag = 1, update_date = ? WHERE member_id = ?`,
    [now, memberId],
    (err) => {
      if (err) return sendError(res, err, 'Failed to delete member');
      res.json({ success: true });
    }
  );
});

// Hard Delete All Members
app.delete('/api/members', (req, res) => {
  db.serialize(() => {
    db.run(`DELETE FROM team_member_xref`);
    db.run(`DELETE FROM member_role_xref`);
    db.run(`DELETE FROM member_position_xref`);
    db.run(`DELETE FROM member_contact_xref`);
    db.run(`DELETE FROM members`, (err) => {
      if (err) return sendError(res, err, 'Failed to delete all members');
      res.json({ success: true });
    });
  });
});

app.get('/api/members/:memberId', (req, res) => {
  const { memberId } = req.params;

  // 1. Get Member Basic
  db.get(`SELECT * FROM members WHERE member_id = ?`, [memberId], (err, member) => {
    if (err || !member) return sendError(res, err || new Error('Not found'), 'Member not found');

    // 2. Get Team Assignments
    const sqlTeams = `
            SELECT t.team_id, t.name as team_name, s.name as sport_name, s.sport_id, tmx.skill_id
            FROM team_member_xref tmx
            JOIN teams t ON tmx.team_id = t.team_id
            LEFT JOIN team_sport_xref tsx ON t.team_id = tsx.team_id
            LEFT JOIN sports s ON tsx.sport_id = s.sport_id
            WHERE tmx.member_id = ?
        `;
    db.all(sqlTeams, [memberId], (err, teams) => {
      if (err) return sendError(res, err, 'Failed to fetch teams');

      // 3. For each team, get Roles and Positions
      const promises = (teams || []).map(team => {
        return new Promise((resolve) => {
          const pRoles = new Promise(r => {
            db.all(`SELECT r.role_id, r.name FROM member_role_xref mrx 
                                JOIN roles r ON mrx.role_id = r.role_id
                                WHERE mrx.member_id = ? AND mrx.context_table = 'teams' AND mrx.context_id = ?`,
              [memberId, team.team_id], (e, rows) => r(rows || []));
          });
          const pPositions = new Promise(r => {
            db.all(`SELECT p.position_id, p.name FROM member_position_xref mpx 
                                JOIN positions p ON mpx.position_id = p.position_id
                                WHERE mpx.member_id = ? AND mpx.context_table = 'teams' AND mpx.context_id = ?`,
              [memberId, team.team_id], (e, rows) => r(rows || []));
          });

          Promise.all([pRoles, pPositions]).then(([roles, positions]) => {
            team.roles = roles;
            team.positions = positions;
            resolve(team);
          });
        });
      });

      Promise.all(promises).then(enrichedTeams => {
        member.teams = enrichedTeams;

        // 4. Get Contacts
        const sqlContacts = `
          SELECT c.contact_id, c.guid, c.value, c.type, c.label
          FROM member_contact_xref mcx
          JOIN contacts c ON mcx.contact_id = c.contact_id
          WHERE mcx.member_id = ?
        `;
        db.all(sqlContacts, [memberId], (err, contacts) => {
          if (err) {
            member.contacts = [];
          } else {
            member.contacts = contacts || [];
          }
          res.json(member);
        });
      });
    });
  });
});

// 3. TEAMS
app.get('/api/teams', (req, res) => {
  const sql = `
    SELECT t.*, s.name as sport_name, tsx.sport_id
    FROM teams t
    LEFT JOIN team_sport_xref tsx ON t.team_id = tsx.team_id
    LEFT JOIN sports s ON tsx.sport_id = s.sport_id
    WHERE (t.deleted_flag IS NULL OR t.deleted_flag = 0)
    ORDER BY s.name, t.name
  `;
  db.all(sql, (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch teams');
    res.json(rows);
  });
});

app.post('/api/teams', async (req, res) => {
  const { name, sportId, teamColors, colorIds, logoUrl } = req.body;
  if (!name || !sportId) return sendError(res, new Error('Validation'), 'Name and SportID required', 400);

  const now = Date.now();
  const guid = uuidv4();

  // Fetch SVG content if logo URL is provided
  const logoSvg = await fetchSvgContent(logoUrl);

  db.serialize(() => {
    // 1. Create Team
    db.run(
      `INSERT INTO teams (guid, name, team_colors, logo_url, logo_svg, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [guid, name, teamColors, logoUrl, logoSvg, now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to create team');
        const teamId = this.lastID;

        // 2. Link to Sport
        db.run(
          `INSERT INTO team_sport_xref (team_id, sport_id, create_date, update_date) VALUES (?, ?, ?, ?)`,
          [teamId, sportId, now, now],
          (err) => {
            if (err) return sendError(res, err, 'Failed to link sport');

            // 3. Link Colors
            if (colorIds && Array.isArray(colorIds) && colorIds.length > 0) {
              const stmt = db.prepare(`INSERT INTO team_color_xref (team_id, color_id, create_date, update_date) VALUES (?, ?, ?, ?)`);
              colorIds.forEach(cid => stmt.run(teamId, cid, now, now));
              stmt.finalize();
            }

            res.status(201).json({ team_id: teamId, guid, name, sportId });
          }
        );
      }
    );
  });
});

app.put('/api/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const { name, sportId, teamColors, colorIds, logoUrl } = req.body;
  if (!name || !sportId) return sendError(res, new Error('Validation'), 'Name and SportID required', 400);

  const now = Date.now();

  // Fetch SVG content if logo URL is provided
  const logoSvg = await fetchSvgContent(logoUrl);

  // 1. Update Team
  db.run(
    `UPDATE teams SET name = ?, team_colors = ?, logo_url = ?, logo_svg = ?, update_date = ? WHERE team_id = ?`,
    [name, teamColors, logoUrl, logoSvg, now, teamId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to update team');

      // 2. Update Sport Link (Delete + Insert)
      db.run(`DELETE FROM team_sport_xref WHERE team_id = ?`, [teamId], (err) => {
        if (err) console.error('Failed to clear old sport link', err); // Log but continue

        db.run(`INSERT INTO team_sport_xref (team_id, sport_id, create_date, update_date) VALUES (?, ?, ?, ?)`,
          [teamId, sportId, now, now],
          (err) => {
            if (err) return sendError(res, err, 'Failed to link sport');

            // 3. Update Colors (Delete + Insert)
            db.run(`DELETE FROM team_color_xref WHERE team_id = ?`, [teamId], (err) => {
              if (err) console.error('Failed to clear old color links', err);

              if (colorIds && Array.isArray(colorIds) && colorIds.length > 0) {
                const stmt = db.prepare(`INSERT INTO team_color_xref (team_id, color_id, create_date, update_date) VALUES (?, ?, ?, ?)`);
                db.serialize(() => {
                  colorIds.forEach(cid => stmt.run(teamId, cid, now, now));
                  stmt.finalize((err) => {
                    if (err) return sendError(res, err, 'Failed to save colors');
                    res.json({ success: true, team_id: teamId });
                  });
                });
              } else {
                res.json({ success: true, team_id: teamId });
              }
            });
          }
        );
      });
    }
  );
});



// Soft Delete Team
app.put('/api/teams/:teamId/delete', (req, res) => {
  const { teamId } = req.params;
  const now = Date.now();

  // First check if any members are assigned to this team
  db.get(
    `SELECT COUNT(*) as memberCount FROM team_member_xref WHERE team_id = ?`,
    [teamId],
    (err, row) => {
      if (err) return sendError(res, err, 'Failed to check team members');

      if (row.memberCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete team',
          message: `This team has ${row.memberCount} member(s) assigned. Please remove all members from the team before deleting.`,
          memberCount: row.memberCount
        });
      }

      // No members assigned, proceed with deletion
      db.run(
        `UPDATE teams SET deleted_flag = 1, update_date = ? WHERE team_id = ?`,
        [now, teamId],
        function (err) {
          if (err) return sendError(res, err, 'Failed to delete team');
          res.json({ success: true, team_id: teamId });
        }
      );
    }
  );
});

// Hard Delete All Teams
app.delete('/api/teams', (req, res) => {
  // First check if any teams have members assigned
  db.get(
    `SELECT COUNT(*) as memberCount FROM team_member_xref`,
    (err, row) => {
      if (err) return sendError(res, err, 'Failed to check team members');

      if (row.memberCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete all teams',
          message: `There are ${row.memberCount} member-team assignment(s). Please remove all members from all teams before deleting.`,
          memberCount: row.memberCount
        });
      }

      // No members assigned to any team, proceed with deletion
      db.serialize(() => {
        db.run(`DELETE FROM team_sport_xref`);
        db.run(`DELETE FROM team_color_xref`);
        db.run(`DELETE FROM teams`, (err) => {
          if (err) return sendError(res, err, 'Failed to delete all teams');
          res.json({ success: true });
        });
      });
    }
  );
});

// 4. TEAM ROSTER
app.get('/api/teams/:teamId/members', (req, res) => {
  const { teamId } = req.params;
  const sql = `
    SELECT m.*, tmx.ref_id as membership_id, tmx.create_date as joined_date
    FROM members m
    JOIN team_member_xref tmx ON m.member_id = tmx.member_id
    WHERE tmx.team_id = ?
    ORDER BY m.last_name
  `;
  db.all(sql, [teamId], (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch team members');
    res.json(rows);
  });
});

app.post('/api/teams/:teamId/members', (req, res) => {
  const { teamId } = req.params;
  const { memberId, roleId } = req.body;

  if (!memberId) return sendError(res, new Error('Validation'), 'MemberID required', 400);

  const now = Date.now();

  db.serialize(() => {
    // 1. Link Member to Team
    db.run(
      `INSERT INTO team_member_xref (team_id, member_id, create_date, update_date) VALUES (?, ?, ?, ?)`,
      [teamId, memberId, now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to add member to team');

        // 2. Assign Role (if provided)
        if (roleId) {
          // Note: Using member_role_xref generally, but could contextually tie it here.
          // For now, simpler global/context role association:
          db.run(
            `INSERT INTO member_role_xref (member_id, role_id, context_table, context_id, create_date, update_date) 
             VALUES (?, ?, 'teams', ?, ?, ?)`,
            [memberId, roleId, teamId, now, now],
            (err) => {
              if (err) console.warn('Failed to assign role', err); // Non-blocking warning
            }
          );
        }

        res.status(201).json({ success: true, teamId, memberId });
      }
    );
    // Seed Colors
    const colors = [
      { name: 'Red', hex: '#FF0000' },
      { name: 'Blue', hex: '#0000FF' },
      { name: 'Green', hex: '#008000' },
      { name: 'Yellow', hex: '#EBEB00' },
      { name: 'Black', hex: '#000000' },
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Gold', hex: '#FFD700' },
      { name: 'Silver', hex: '#C0C0C0' },
      { name: 'Orange', hex: '#FFA500' },
      { name: 'Purple', hex: '#800080' }
    ];

    const insertColor = db.prepare("INSERT OR IGNORE INTO colors (guid, name, hex_code, create_date) VALUES (?, ?, ?, ?)");
    colors.forEach(c => {
      insertColor.run(uuidv4(), c.name, c.hex, Date.now());
    });
    insertColor.finalize();

  });
});

// 5. VENUES
app.get('/api/venues', (req, res) => {
  db.all('SELECT * FROM venues WHERE (deleted_flag IS NULL OR deleted_flag = 0) ORDER BY name', (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch venues');
    res.json(rows);
  });
});

app.post('/api/venues', (req, res) => {
  const { name, address, details, latitude, longitude, geocoded_data } = req.body;
  if (!name) return sendError(res, new Error('Validation'), 'Name required', 400);

  const now = Date.now();
  const guid = uuidv4();

  db.run(
    `INSERT INTO venues (guid, name, address, latitude, longitude, geocoded_data, details, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [guid, name, address, latitude, longitude, JSON.stringify(geocoded_data || null), JSON.stringify(details || {}), now, now],
    function (err) {
      if (err) return sendError(res, err, 'Failed to create venue');
      res.status(201).json({ venue_id: this.lastID, guid, name });
    }
  );
});

// Duplicate LOOKUPS endpoint removed - using the one defined earlier in the file

// 6. EVENTS
app.get('/api/events', (req, res) => {
  // Enhanced query with xref joins for enriched data - includes both names AND ids
  const sql = `
    SELECT e.*,
      GROUP_CONCAT(DISTINCT et.name) as event_type_names,
      GROUP_CONCAT(DISTINCT eetx.eventType_id) as event_type_ids,
      GROUP_CONCAT(DISTINCT s.name) as system_names,
      GROUP_CONCAT(DISTINCT esyx.system_id) as system_ids,
      GROUP_CONCAT(DISTINCT v.name) as venue_names,
      GROUP_CONCAT(DISTINCT evx.venue_id) as venue_ids,
      GROUP_CONCAT(DISTINCT c.name) as court_names,
      GROUP_CONCAT(DISTINCT ecx.court_id) as court_ids,
      GROUP_CONCAT(DISTINCT f.name) as field_names,
      GROUP_CONCAT(DISTINCT efx.field_id) as field_ids,
      GROUP_CONCAT(DISTINCT t.name) as team_names,
      GROUP_CONCAT(DISTINCT etx.team_id) as team_ids,
      GROUP_CONCAT(DISTINCT m.first_name || ' ' || m.last_name) as member_names,
      GROUP_CONCAT(DISTINCT emx.member_id) as member_ids,
      sea.name as season_name,
      esx.is_tournament
    FROM events e
    LEFT JOIN event_eventType_xref eetx ON e.event_id = eetx.event_id
    LEFT JOIN eventTypes et ON eetx.eventType_id = et.eventType_id
    LEFT JOIN event_system_xref esyx ON e.event_id = esyx.event_id
    LEFT JOIN systems s ON esyx.system_id = s.system_id
    LEFT JOIN event_venue_xref evx ON e.event_id = evx.event_id
    LEFT JOIN venues v ON evx.venue_id = v.venue_id
    LEFT JOIN event_court_xref ecx ON e.event_id = ecx.event_id
    LEFT JOIN courts c ON ecx.court_id = c.court_id
    LEFT JOIN event_field_xref efx ON e.event_id = efx.event_id
    LEFT JOIN fields f ON efx.field_id = f.field_id
    LEFT JOIN event_team_xref etx ON e.event_id = etx.event_id
    LEFT JOIN teams t ON etx.team_id = t.team_id
    LEFT JOIN event_member_xref emx ON e.event_id = emx.event_id
    LEFT JOIN members m ON emx.member_id = m.member_id
    LEFT JOIN event_season_xref esx ON e.event_id = esx.event_id
    LEFT JOIN seasons sea ON esx.season_id = sea.season_id
    WHERE e.deleted_flag IS NULL OR e.deleted_flag = 0
    GROUP BY e.event_id
    ORDER BY e.start_date
  `;

  db.all(sql, (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch events');
    res.json(rows);
  });
});

// Helper: Calculate next date for series
function calculateNextDate(baseDate, period, interval, index) {
  const base = new Date(baseDate);
  switch (period) {
    case 'hours':
      return base.getTime() + (index * interval * 60 * 60 * 1000);
    case 'days':
      return base.getTime() + (index * interval * 24 * 60 * 60 * 1000);
    case 'weeks':
      return base.getTime() + (index * interval * 7 * 24 * 60 * 60 * 1000);
    default:
      return base.getTime();
  }
}

// Old linkEventXrefs removed - using linkEventXrefsAsync instead


app.post('/api/events', async (req, res) => {
  try {
    const {
      name, startDate, endDate, description,
      // xref IDs
      venueIds = [], teamIds = [], memberIds = [], eventTypeIds = [], systemIds = [],
      courtIds = [], fieldIds = [], seasonId, isTournament = false,
      // Series options
      isSeriesEvent = false,
      repeatPeriod,    // 'hours' | 'days' | 'weeks'
      repeatInterval = 1,
      totalEvents = 1,
      lastEventDate,   // Optional end boundary timestamp
      lastEventTime    // Optional end boundary time string
    } = req.body;

    if (!name || !startDate) {
      return sendError(res, new Error('Validation'), 'Name and StartDate required', 400);
    }

    const now = Date.now();
    const xrefs = { venueIds, teamIds, memberIds, eventTypeIds, systemIds, courtIds, fieldIds, seasonId, isTournament };

    console.log('🔗 Backend received xrefs:', { teamIds, memberIds, venueIds });
    if (isSeriesEvent && repeatPeriod && totalEvents > 0) {
      // Generate series of events using async/await
      const seriesId = uuidv4();
      const createdEvents = [];

      // Calculate end boundary if provided
      const lastEventDateTime = lastEventDate && lastEventTime
        ? lastEventDate  // Already a timestamp from frontend
        : null;

      // Use totalEvents or 1000 as fallback limit
      const maxIterations = totalEvents || 1000;

      for (let i = 0; i < maxIterations; i++) {
        const eventStartDate = calculateNextDate(startDate, repeatPeriod, repeatInterval, i);

        // Stop if we've passed the last event date/time
        if (lastEventDateTime && eventStartDate > lastEventDateTime) break;

        const eventEndDate = endDate ? calculateNextDate(endDate, repeatPeriod, repeatInterval, i) : null;
        const eventGuid = uuidv4();
        const eventName = `${name} #${i + 1}`;

        // Insert event and wait for completion
        const result = await dbRun(
          `INSERT INTO events (guid, name, start_date, end_date, description, status, is_series_event, series_id, repeat_period, repeat_interval, total_events, last_event_date, last_event_time, create_date, update_date)
           VALUES (?, ?, ?, ?, ?, 'scheduled', 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [eventGuid, eventName, eventStartDate, eventEndDate, description, seriesId, repeatPeriod, repeatInterval, totalEvents, lastEventDate, lastEventTime, now, now]
        );

        const eventId = result.lastID;
        createdEvents.push({ event_id: eventId, guid: eventGuid, name: eventName, start_date: eventStartDate });

        // Link xrefs and wait for completion
        await linkEventXrefsAsync(eventId, xrefs, now);
      }

      // All events created and xrefs linked - now safe to respond
      res.status(201).json({
        series_id: seriesId,
        total_events: createdEvents.length,
        events: createdEvents
      });
    } else {
      // Single event creation
      const guid = uuidv4();

      const result = await dbRun(
        `INSERT INTO events (guid, name, start_date, end_date, description, status, is_series_event, create_date, update_date)
         VALUES (?, ?, ?, ?, ?, 'scheduled', 0, ?, ?)`,
        [guid, name, startDate, endDate, description, now, now]
      );

      const eventId = result.lastID;
      await linkEventXrefsAsync(eventId, xrefs, now);

      res.status(201).json({ event_id: eventId, guid, name });
    }
  } catch (err) {
    console.error('Error creating event:', err);
    sendError(res, err, 'Failed to create event');
  }
});

// UPDATE event
app.put('/api/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { name, startDate, endDate, description, venueIds = [], teamIds = [], memberIds = [], eventTypeIds = [], systemIds = [], courtIds = [], fieldIds = [] } = req.body;
    const now = Date.now();

    // Update event
    await dbRun(
      'UPDATE events SET name = ?, start_date = ?, end_date = ?, description = ?, update_date = ? WHERE event_id = ?',
      [name, startDate, endDate, description, now, eventId]
    );

    // Clear old xrefs (wait for all to complete)
    await Promise.all([
      dbRun('DELETE FROM event_venue_xref WHERE event_id = ?', [eventId]),
      dbRun('DELETE FROM event_eventType_xref WHERE event_id = ?', [eventId]),
      dbRun('DELETE FROM event_system_xref WHERE event_id = ?', [eventId]),
      dbRun('DELETE FROM event_court_xref WHERE event_id = ?', [eventId]),
      dbRun('DELETE FROM event_field_xref WHERE event_id = ?', [eventId]),
      dbRun('DELETE FROM event_team_xref WHERE event_id = ?', [eventId]),
      dbRun('DELETE FROM event_member_xref WHERE event_id = ?', [eventId])
    ]);

    // Re-link xrefs and wait for completion
    const xrefs = { venueIds, teamIds, memberIds, eventTypeIds, systemIds, courtIds, fieldIds };
    await linkEventXrefsAsync(eventId, xrefs, now);

    res.json({ event_id: eventId, name, updated: true });
  } catch (err) {
    console.error('Error updating event:', err);
    sendError(res, err, 'Failed to update event');
  }
});

// DELETE event (with optional series deletion)
app.delete('/api/events/:id', (req, res) => {
  const eventId = req.params.id;
  const { deleteSeries } = req.query;
  const now = Date.now();

  if (deleteSeries === 'true') {
    // Get series_id first, then delete all events in series
    db.get('SELECT series_id FROM events WHERE event_id = ?', [eventId], (err, row) => {
      if (err) return sendError(res, err, 'Failed to find event');
      if (!row || !row.series_id) {
        // No series, just delete single event
        db.run('UPDATE events SET deleted_flag = 1, update_date = ? WHERE event_id = ?', [now, eventId], function (err) {
          if (err) return sendError(res, err, 'Failed to delete event');
          res.json({ deleted: this.changes });
        });
      } else {
        // Delete all events in series
        db.run('UPDATE events SET deleted_flag = 1, update_date = ? WHERE series_id = ?', [now, row.series_id], function (err) {
          if (err) return sendError(res, err, 'Failed to delete series');
          res.json({ deleted: this.changes, series_id: row.series_id });
        });
      }
    });
  } else {
    // Delete single event only
    db.run('UPDATE events SET deleted_flag = 1, update_date = ? WHERE event_id = ?', [now, eventId], function (err) {
      if (err) return sendError(res, err, 'Failed to delete event');
      res.json({ deleted: this.changes });
    });
  }
});

// DELETE ALL events (hard delete)
app.delete('/api/events', (req, res) => {
  // Must delete xref tables FIRST to avoid foreign key constraint errors
  db.serialize(() => {
    db.run('DELETE FROM event_venue_xref');
    db.run('DELETE FROM event_team_xref');
    db.run('DELETE FROM event_eventType_xref');
    db.run('DELETE FROM event_system_xref');
    db.run('DELETE FROM event_court_xref');
    db.run('DELETE FROM event_field_xref');
    db.run('DELETE FROM event_season_xref');
    db.run('DELETE FROM events', function (err) {
      if (err) return sendError(res, err, 'Failed to delete all events');
      res.json({ deleted: this.changes });
    });
  });
});

// 7. VENUES - Enhanced CRUD
app.put('/api/venues/:id', (req, res) => {
  const { name, address, details, latitude, longitude, geocoded_data } = req.body;
  const venueId = req.params.id;
  const now = Date.now();

  if (!name) return sendError(res, new Error('Validation'), 'Name required', 400);

  db.run(
    'UPDATE venues SET name = ?, address = ?, latitude = ?, longitude = ?, geocoded_data = ?, details = ?, update_date = ? WHERE venue_id = ?',
    [name, address, latitude, longitude, JSON.stringify(geocoded_data || null), JSON.stringify(details || {}), now, venueId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to update venue');
      res.json({ venue_id: venueId, name, updated: this.changes });
    }
  );
});

app.put('/api/venues/:id/delete', (req, res) => {
  const venueId = req.params.id;
  const now = Date.now();

  db.run('UPDATE venues SET deleted_flag = 1, update_date = ? WHERE venue_id = ?', [now, venueId], function (err) {
    if (err) return sendError(res, err, 'Failed to delete venue');
    res.json({ deleted: this.changes });
  });
});

app.delete('/api/venues', (req, res) => {
  // Delete in correct order: xrefs first, then child tables, then venues
  db.serialize(() => {
    db.run('DELETE FROM venue_court_xref');
    db.run('DELETE FROM venue_field_xref');
    db.run('DELETE FROM courts');
    db.run('DELETE FROM fields');
    db.run('DELETE FROM venues', function (err) {
      if (err) return sendError(res, err, 'Failed to delete all venues');
      res.json({ deleted: this.changes });
    });
  });
});

// 8. COURTS
app.get('/api/venues/:venueId/courts', (req, res) => {
  const venueId = req.params.venueId;
  db.all(`
    SELECT c.*
    FROM courts c
    JOIN venue_court_xref vcx ON c.court_id = vcx.court_id
    WHERE vcx.venue_id = ? AND (c.deleted_flag IS NULL OR c.deleted_flag = 0)
    ORDER BY c.name
  `, [venueId], (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch courts');
    res.json(rows);
  });
});

app.post('/api/venues/:venueId/courts', (req, res) => {
  const venueId = req.params.venueId;
  const { name, surface } = req.body;
  const now = Date.now();
  const guid = uuidv4();

  if (!name) return sendError(res, new Error('Validation'), 'Name required', 400);

  db.serialize(() => {
    db.run(
      'INSERT INTO courts (guid, name, surface, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
      [guid, name, surface, now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to create court');
        const courtId = this.lastID;

        db.run(
          'INSERT INTO venue_court_xref (venue_id, court_id, create_date, update_date) VALUES (?, ?, ?, ?)',
          [venueId, courtId, now, now]
        );

        res.status(201).json({ court_id: courtId, guid, name, venue_id: venueId });
      }
    );
  });
});

app.put('/api/courts/:id', (req, res) => {
  const courtId = req.params.id;
  const { name, surface } = req.body;
  const now = Date.now();

  db.run(
    'UPDATE courts SET name = ?, surface = ?, update_date = ? WHERE court_id = ?',
    [name, surface, now, courtId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to update court');
      res.json({ court_id: courtId, name, updated: this.changes });
    }
  );
});

app.delete('/api/courts/:id', (req, res) => {
  const courtId = req.params.id;
  const now = Date.now();

  db.run('UPDATE courts SET deleted_flag = 1, update_date = ? WHERE court_id = ?', [now, courtId], function (err) {
    if (err) return sendError(res, err, 'Failed to delete court');
    res.json({ deleted: this.changes });
  });
});

// 9. FIELDS
app.get('/api/venues/:venueId/fields', (req, res) => {
  const venueId = req.params.venueId;
  db.all(`
    SELECT f.*
    FROM fields f
    JOIN venue_field_xref vfx ON f.field_id = vfx.field_id
    WHERE vfx.venue_id = ? AND (f.deleted_flag IS NULL OR f.deleted_flag = 0)
    ORDER BY f.name
  `, [venueId], (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch fields');
    res.json(rows);
  });
});

app.post('/api/venues/:venueId/fields', (req, res) => {
  const venueId = req.params.venueId;
  const { name, surface } = req.body;
  const now = Date.now();
  const guid = uuidv4();

  if (!name) return sendError(res, new Error('Validation'), 'Name required', 400);

  db.serialize(() => {
    db.run(
      'INSERT INTO fields (guid, name, surface, create_date, update_date) VALUES (?, ?, ?, ?, ?)',
      [guid, name, surface, now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to create field');
        const fieldId = this.lastID;

        db.run(
          'INSERT INTO venue_field_xref (venue_id, field_id, create_date, update_date) VALUES (?, ?, ?, ?)',
          [venueId, fieldId, now, now]
        );

        res.status(201).json({ field_id: fieldId, guid, name, venue_id: venueId });
      }
    );
  });
});

app.put('/api/fields/:id', (req, res) => {
  const fieldId = req.params.id;
  const { name, surface } = req.body;
  const now = Date.now();

  db.run(
    'UPDATE fields SET name = ?, surface = ?, update_date = ? WHERE field_id = ?',
    [name, surface, now, fieldId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to update field');
      res.json({ field_id: fieldId, name, updated: this.changes });
    }
  );
});

app.delete('/api/fields/:id', (req, res) => {
  const fieldId = req.params.id;
  const now = Date.now();

  db.run('UPDATE fields SET deleted_flag = 1, update_date = ? WHERE field_id = ?', [now, fieldId], function (err) {
    if (err) return sendError(res, err, 'Failed to delete field');
    res.json({ deleted: this.changes });
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close((err) => {
    if (err) console.error('Error closing DB:', err);
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
