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
    initializeDatabase();
  }
});

function initializeDatabase() {
  console.log('Initializing database schema...');

  db.serialize(() => {
    // Enable Foreign Keys
    db.run("PRAGMA foreign_keys = ON");

    // Helper to create standard fields string
    const standardFields = `
      create_user INTEGER,
      create_date INTEGER,
      update_user INTEGER,
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
    db.run(`CREATE TABLE IF NOT EXISTS members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      display_name TEXT,
      gender TEXT,
      birth_date INTEGER,
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

    // 7. venues
    db.run(`CREATE TABLE IF NOT EXISTS venues (
      venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
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

    // 10. events
    db.run(`CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER,
      description TEXT,
      status TEXT,
      courts INTEGER,
      event_type TEXT,
      ${standardFields}
    )`);

    // 11. eventTypes
    db.run(`CREATE TABLE IF NOT EXISTS eventTypes (
      eventType_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL UNIQUE, -- e.g. 'Match', 'Practice', 'Tournament'
      description TEXT,
      ${standardFields}
    )`);

    // 12. seasons
    db.run(`CREATE TABLE IF NOT EXISTS seasons (
      season_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL, -- e.g. 'Fall 2025'
      start_date INTEGER,
      end_date INTEGER,
      ${standardFields}
    )`);

    // 13. contacts
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      value TEXT NOT NULL, -- e.g. 'john@doe.com', '555-0123'
      type TEXT NOT NULL, -- 'Email', 'Phone', 'Address'
      label TEXT, -- 'Home', 'Work'
      ${standardFields}
    )`);

    // 14. systems
    db.run(`CREATE TABLE IF NOT EXISTS systems (
      system_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE,
      name TEXT NOT NULL, -- e.g. 'Round Robin', 'Swiss'
      config TEXT, -- JSON configuration for the system
      ${standardFields}
    )`);


    // --- XREF TABLES ---

    // 1. sport_league_xref
    db.run(`CREATE TABLE IF NOT EXISTS sport_league_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id INTEGER NOT NULL,
      league_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(sport_id) REFERENCES sports(sport_id),
      FOREIGN KEY(league_id) REFERENCES leagues(league_id)
    )`);

    // 2. team_league_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_league_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      league_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(league_id) REFERENCES leagues(league_id)
    )`);

    // 4. team_sport_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_sport_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      sport_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(sport_id) REFERENCES sports(sport_id)
    )`);

    // 5. team_color_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_color_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      color_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(color_id) REFERENCES colors(color_id)
    )`);

    // 4. team_member_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_member_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      -- Role could be here OR in member_role_xref. 
      -- If a member has a role SPECIFIC to a team, it goes here or we use member_role_xref linked to this context.
      -- For simplicity as per request 'member_role_xref' exists separately, but typically Team Membership implies a role.
      -- We will keep this for pure membership and allow roles to be associated structurally.
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(member_id) REFERENCES members(member_id)
    )`);

    // 5. member_role_xref
    // Note: This ties a member to a role. 
    // Context is vague here (Global role? Team specific?). 
    // Often you want team_member_role_xref. But sticking to list:
    db.run(`CREATE TABLE IF NOT EXISTS member_role_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      context_table TEXT, -- Optional: 'teams', 'leagues'
      context_id INTEGER, -- Optional: team_id, league_id
      ${standardFields},
      FOREIGN KEY(member_id) REFERENCES members(member_id),
      FOREIGN KEY(role_id) REFERENCES roles(role_id)
    )`);

    // 5.5 member_position_xref
    db.run(`CREATE TABLE IF NOT EXISTS member_position_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      position_id INTEGER NOT NULL,
      context_table TEXT,
      context_id INTEGER,
      ${standardFields},
      FOREIGN KEY(member_id) REFERENCES members(member_id),
      FOREIGN KEY(position_id) REFERENCES positions(position_id)
    )`);

    // 6. event_venue_xref
    db.run(`CREATE TABLE IF NOT EXISTS event_venue_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      venue_id INTEGER NOT NULL,
      usage_notes TEXT,
      ${standardFields},
      FOREIGN KEY(event_id) REFERENCES events(event_id),
      FOREIGN KEY(venue_id) REFERENCES venues(venue_id)
    )`);

    // 7. event_team_xref
    db.run(`CREATE TABLE IF NOT EXISTS event_team_xref (
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
    db.run(`CREATE TABLE IF NOT EXISTS event_eventType_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      eventType_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(event_id) REFERENCES events(event_id),
      FOREIGN KEY(eventType_id) REFERENCES eventTypes(eventType_id)
    )`);

    // 9. member_contact_xref
    db.run(`CREATE TABLE IF NOT EXISTS member_contact_xref (
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
    db.run(`CREATE TABLE IF NOT EXISTS venue_court_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      court_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(venue_id) REFERENCES venues(venue_id),
      FOREIGN KEY(court_id) REFERENCES courts(court_id)
    )`);

    // 11. venue_field_xref
    db.run(`CREATE TABLE IF NOT EXISTS venue_field_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(venue_id) REFERENCES venues(venue_id),
      FOREIGN KEY(field_id) REFERENCES fields(field_id)
    )`);

    // 12. team_contact_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_contact_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(contact_id) REFERENCES contacts(contact_id)
    )`);

    // 13. sport_season_xref
    db.run(`CREATE TABLE IF NOT EXISTS sport_season_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(sport_id) REFERENCES sports(sport_id),
      FOREIGN KEY(season_id) REFERENCES seasons(season_id)
    )`);

    // 14. team_season_xref
    db.run(`CREATE TABLE IF NOT EXISTS team_season_xref (
      ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      ${standardFields},
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
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
      const roles = ['Player', 'Captain', 'Coach', 'Admin', 'Spectator'];
      const eventTypes = ['Match', 'Practice', 'Meeting', 'Tournament'];

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

      console.log('Seeding completed.');
    }
  });
  seedPositions();
}

function seedPositions() {
  const sportsData = [
    { name: 'Tennis', positions: ['Singles', 'Doubles'] },
    { name: 'Soccer', positions: ['Goalie', 'Defender', 'Midfield', 'Forward'] }
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
                    if (err) console.error(`Failed to seed position ${posName}:`, err);
                  }
                );
              }
            });
          });
        }
      });
    });
  });
}


// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'team_sports.db', timestamp: new Date().toISOString() });
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

            res.json(lookups);
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
            GROUP_CONCAT(DISTINCT r.name) as role_names,
            GROUP_CONCAT(DISTINCT p.name) as position_names
          FROM team_member_xref tmx
          JOIN teams t ON tmx.team_id = t.team_id
          LEFT JOIN team_sport_xref tsx ON t.team_id = tsx.team_id
          LEFT JOIN sports s ON tsx.sport_id = s.sport_id
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

      return {
        ...member,
        teams: teamAssignments
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

        const stmtTeam = db.prepare(`INSERT INTO team_member_xref (team_id, member_id, create_date, update_date) VALUES (?, ?, ?, ?)`);
        const stmtRole = db.prepare(`INSERT INTO member_role_xref (member_id, role_id, context_table, context_id, create_date, update_date) VALUES (?, ?, 'teams', ?, ?, ?)`);
        const stmtPos = db.prepare(`INSERT INTO member_position_xref (member_id, position_id, context_table, context_id, create_date, update_date) VALUES (?, ?, 'teams', ?, ?, ?)`);

        teams.forEach(t => {
          stmtTeam.run(t.teamId, memberId, now, now);
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

app.post('/api/members', (req, res) => {
  const { firstName, lastName, displayName, gender, email, phone, teams } = req.body;
  if (!firstName || !lastName) return sendError(res, new Error('Validation'), 'Name required', 400);

  const now = Date.now();
  const guid = uuidv4();

  db.serialize(() => {
    db.run(
      `INSERT INTO members (guid, first_name, last_name, display_name, gender, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [guid, firstName, lastName, displayName, gender, now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to create member');
        const memberId = this.lastID;
        saveMemberRelations(db, memberId, teams, () => {
          res.status(201).json({ member_id: memberId, success: true });
        });
      }
    );
  });
});

app.put('/api/members/:memberId', (req, res) => {
  const { memberId } = req.params;
  const { firstName, lastName, displayName, gender, teams } = req.body;
  const now = Date.now();

  db.run(
    `UPDATE members SET first_name=?, last_name=?, display_name=?, gender=?, update_date=? WHERE member_id=?`,
    [firstName, lastName, displayName, gender, now, memberId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to update member');
      saveMemberRelations(db, memberId, teams, () => {
        res.json({ success: true, member_id: memberId });
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
            SELECT t.team_id, t.name as team_name, s.name as sport_name, s.sport_id
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
        res.json(member);
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

app.post('/api/teams', (req, res) => {
  const { name, sportId, teamColors, colorIds, logoUrl } = req.body;
  if (!name || !sportId) return sendError(res, new Error('Validation'), 'Name and SportID required', 400);

  const now = Date.now();
  const guid = uuidv4();

  db.serialize(() => {
    // 1. Create Team
    db.run(
      `INSERT INTO teams (guid, name, team_colors, logo_url, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [guid, name, teamColors, logoUrl, now, now],
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

app.put('/api/teams/:teamId', (req, res) => {
  const { teamId } = req.params;
  const { name, sportId, teamColors, colorIds, logoUrl } = req.body;
  if (!name || !sportId) return sendError(res, new Error('Validation'), 'Name and SportID required', 400);

  const now = Date.now();

  // 1. Update Team
  db.run(
    `UPDATE teams SET name = ?, team_colors = ?, logo_url = ?, update_date = ? WHERE team_id = ?`,
    [name, teamColors, logoUrl, now, teamId],
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
  db.run(
    `UPDATE teams SET deleted_flag = 1, update_date = ? WHERE team_id = ?`,
    [now, teamId],
    function (err) {
      if (err) return sendError(res, err, 'Failed to delete team');
      res.json({ success: true, team_id: teamId });
    }
  );
});

// Hard Delete All Teams
app.delete('/api/teams', (req, res) => {
  // Manual cleanup for safety.
  db.serialize(() => {
    db.run(`DELETE FROM team_sport_xref`);
    db.run(`DELETE FROM team_color_xref`);
    db.run(`DELETE FROM team_member_xref`);
    db.run(`DELETE FROM teams`, (err) => {
      if (err) return sendError(res, err, 'Failed to delete all teams');
      res.json({ success: true });
    });
  });
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
  db.all('SELECT * FROM venues ORDER BY name', (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch venues');
    res.json(rows);
  });
});

app.post('/api/venues', (req, res) => {
  const { name, address, details } = req.body;
  if (!name) return sendError(res, new Error('Validation'), 'Name required', 400);

  const now = Date.now();
  const guid = uuidv4();

  db.run(
    `INSERT INTO venues (guid, name, address, details, create_date, update_date) VALUES (?, ?, ?, ?, ?, ?)`,
    [guid, name, address, JSON.stringify(details || {}), now, now],
    function (err) {
      if (err) return sendError(res, err, 'Failed to create venue');
      res.status(201).json({ venue_id: this.lastID, guid, name });
    }
  );
});

// Duplicate LOOKUPS endpoint removed - using the one defined earlier in the file

// 6. EVENTS
app.get('/api/events', (req, res) => {
  // Return basic event info joined with linked Venues and Teams if reasonable, 
  // or just return events and let client fetch details. 
  // For now, basic list:
  db.all('SELECT * FROM events ORDER BY start_date', (err, rows) => {
    if (err) return sendError(res, err, 'Failed to fetch events');
    res.json(rows);
  });
});

app.post('/api/events', (req, res) => {
  const { name, startDate, endDate, description, venueIds = [], teamIds = [] } = req.body;
  if (!name || !startDate) return sendError(res, new Error('Validation'), 'Name and StartDate required', 400);

  const now = Date.now();
  const guid = uuidv4();

  db.serialize(() => {
    // 1. Create Event
    db.run(
      `INSERT INTO events (guid, name, start_date, end_date, description, status, create_date, update_date) 
       VALUES (?, ?, ?, ?, ?, 'Scheduled', ?, ?)`,
      [guid, name, startDate, endDate, description, now, now],
      function (err) {
        if (err) return sendError(res, err, 'Failed to create event');
        const eventId = this.lastID;

        // 2. Link Venues
        if (venueIds.length > 0) {
          const vStmt = db.prepare(`INSERT INTO event_venue_xref (event_id, venue_id, create_date, update_date) VALUES (?, ?, ?, ?)`);
          venueIds.forEach(vid => vStmt.run(eventId, vid, now, now));
          vStmt.finalize();
        }

        // 3. Link Teams
        if (teamIds.length > 0) {
          const tStmt = db.prepare(`INSERT INTO event_team_xref (event_id, team_id, create_date, update_date) VALUES (?, ?, ?, ?)`);
          teamIds.forEach(tid => tStmt.run(eventId, tid, now, now));
          tStmt.finalize();
        }

        res.status(201).json({ event_id: eventId, guid, name });
      }
    );
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
