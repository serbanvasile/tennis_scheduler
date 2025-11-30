const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database path
const dbPath = path.join(__dirname, 'tennis_scheduler.db');
console.log('Database path:', dbPath);

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// API Routes

// GET /api/players - Get all players
app.get('/api/players', (req, res) => {
  console.log('GET /api/players');
  
  db.all('SELECT * FROM players ORDER BY display_name', (err, rows) => {
    if (err) {
      console.error('Error fetching players:', err);
      res.status(500).json({ error: 'Failed to fetch players' });
      return;
    }
    
    // Convert database format to frontend format
    const players = rows.map(row => ({
      id: row.id,
      displayName: row.display_name,
      skill: row.skill,
      handed: row.handed,
      phone: row.phone,
      email: row.email,
      tags: row.tags ? JSON.parse(row.tags) : [],
      share: row.share || 0,
      shareType: row.share_type || 'R',
      sharePercentage: row.share_percentage || 0,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
    }));
    
    console.log(`Found ${players.length} players`);
    res.json(players);
  });
});

// POST /api/players - Add new player
app.post('/api/players', (req, res) => {
  console.log('POST /api/players', req.body);
  
  const { displayName, skill, handed, phone, email, tags = [], share = 0, shareType = 'R', sharePercentage = 0 } = req.body;
  
  // Validate required fields
  if (!displayName || !skill || !handed) {
    console.error('Missing required fields:', { displayName, skill, handed });
    res.status(400).json({ error: 'Missing required fields: displayName, skill, handed' });
    return;
  }
  
  const id = Math.random().toString(36).substr(2, 9);
  const now = Date.now();
  
  console.log('Inserting player with data:', {
    id, displayName, skill, handed, 
    phone: phone || null, 
    email: email || null, 
    tags: JSON.stringify(tags), 
    share, shareType, sharePercentage, now
  });
  
  db.run(
    'INSERT INTO players (id, display_name, skill, handed, phone, email, tags, share, share_type, share_percentage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, displayName, skill, handed, phone || null, email || null, JSON.stringify(tags), share, shareType, sharePercentage, now, now],
    function(err) {
      if (err) {
        console.error('Error adding player:', err);
        res.status(500).json({ error: 'Failed to add player', details: err.message });
        return;
      }
      
      console.log('Player added with ID:', id);
      res.json({ id, displayName, skill, handed, phone, email, tags, share, shareType, sharePercentage });
    }
  );
});

// PUT /api/players/:id - Update player
app.put('/api/players/:id', (req, res) => {
  console.log('PUT /api/players/' + req.params.id, req.body);
  
  const { id } = req.params;
  const { displayName, skill, handed, phone, email, tags, share, shareType, sharePercentage } = req.body;
  const now = Date.now();
  
  const updates = [];
  const values = [];
  
  if (displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(displayName);
  }
  if (skill !== undefined) {
    updates.push('skill = ?');
    values.push(skill);
  }
  if (handed !== undefined) {
    updates.push('handed = ?');
    values.push(handed);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    values.push(phone);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(tags));
  }
  if (share !== undefined) {
    updates.push('share = ?');
    values.push(share);
  }
  if (shareType !== undefined) {
    updates.push('share_type = ?');
    values.push(shareType);
  }
  if (sharePercentage !== undefined) {
    updates.push('share_percentage = ?');
    values.push(sharePercentage);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  
  updates.push('updated_at = ?');
  values.push(now, id);
  
  db.run(
    `UPDATE players SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('Error updating player:', err);
        res.status(500).json({ error: 'Failed to update player' });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      
      console.log('Player updated:', id);
      res.json({ success: true });
    }
  );
});

// POST /api/players/import - Import players from clipboard data
app.post('/api/players/import', (req, res) => {
  console.log('POST /api/players/import', req.body);
  
  const { players, mode = 'update' } = req.body;
  
  if (!players || !Array.isArray(players)) {
    res.status(400).json({ error: 'Missing or invalid players array' });
    return;
  }
  
  const results = {
    imported: 0,
    updated: 0,
    errors: []
  };
  
  const processPlayer = (playerData, index) => {
    return new Promise((resolve) => {
      const { displayName, skill, handed, phone, email, tags = [], share = 0, shareType = 'R', sharePercentage = 0 } = playerData;
      
      // Validate required fields
      if (!displayName || !skill || !handed) {
        results.errors.push(`Row ${index + 1}: Missing required fields`);
        resolve();
        return;
      }
      
      if (mode === 'update') {
        // Try to find existing player by name
        db.get('SELECT id FROM players WHERE display_name = ?', [displayName], (err, row) => {
          if (err) {
            results.errors.push(`Row ${index + 1}: Database error - ${err.message}`);
            resolve();
            return;
          }
          
          if (row) {
            // Update existing player
            const now = Date.now();
            db.run(
              'UPDATE players SET skill = ?, handed = ?, phone = ?, email = ?, tags = ?, share = ?, share_type = ?, share_percentage = ?, updated_at = ? WHERE id = ?',
              [skill, handed, phone || null, email || null, JSON.stringify(tags), share, shareType, sharePercentage, now, row.id],
              function(err) {
                if (err) {
                  results.errors.push(`Row ${index + 1}: Update error - ${err.message}`);
                } else {
                  results.updated++;
                }
                resolve();
              }
            );
          } else {
            // Create new player
            const id = Math.random().toString(36).substr(2, 9);
            const now = Date.now();
            db.run(
              'INSERT INTO players (id, display_name, skill, handed, phone, email, tags, share, share_type, share_percentage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [id, displayName, skill, handed, phone || null, email || null, JSON.stringify(tags), share, shareType, sharePercentage, now, now],
              function(err) {
                if (err) {
                  results.errors.push(`Row ${index + 1}: Insert error - ${err.message}`);
                } else {
                  results.imported++;
                }
                resolve();
              }
            );
          }
        });
      } else {
        // Always add new mode
        const id = Math.random().toString(36).substr(2, 9);
        const now = Date.now();
        db.run(
          'INSERT INTO players (id, display_name, skill, handed, phone, email, tags, share, share_type, share_percentage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, displayName, skill, handed, phone || null, email || null, JSON.stringify(tags), share, shareType, sharePercentage, now, now],
          function(err) {
            if (err) {
              results.errors.push(`Row ${index + 1}: Insert error - ${err.message}`);
            } else {
              results.imported++;
            }
            resolve();
          }
        );
      }
    });
  };
  
  // Process all players sequentially
  const processAllPlayers = async () => {
    for (let i = 0; i < players.length; i++) {
      await processPlayer(players[i], i);
    }
    
    console.log('Import results:', results);
    res.json(results);
  };
  
  processAllPlayers().catch(err => {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed', details: err.message });
  });
});

// DELETE /api/players - Delete all players
app.delete('/api/players', (req, res) => {
  console.log('DELETE /api/players - Clear All Players');
  
  db.run('DELETE FROM players', [], function(err) {
    if (err) {
      console.error('Error clearing all players:', err);
      res.status(500).json({ error: 'Failed to clear all players' });
      return;
    }
    
    console.log(`Cleared all players. ${this.changes} players deleted.`);
    res.json({ success: true, deletedCount: this.changes });
  });
});

// DELETE /api/players/:id - Delete player
app.delete('/api/players/:id', (req, res) => {
  console.log('DELETE /api/players/' + req.params.id);
  
  const { id } = req.params;
  
  db.run('DELETE FROM players WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting player:', err);
      res.status(500).json({ error: 'Failed to delete player' });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    
    console.log('Player deleted:', id);
    res.json({ success: true });
  });
});

// Events API endpoints

// GET /api/events - Get all events with smart series numbering
app.get('/api/events', (req, res) => {
  console.log('🔍 GET /api/events - DEBUGGING VERSION');
  console.log('🔍 Timestamp:', new Date().toISOString());
  
  // Use ROW_NUMBER to automatically number series events
  const query = `
    SELECT 
      id,
      title,
      start_date_time,
      end_date_time,
      courts,
      event_type,
      system_type,
      is_series_event,
      series_id,
      total_matches,
      repeat_period,
      repeat_interval,
      created_at,
      updated_at,
      CASE 
        WHEN is_series_event = 1 AND series_id IS NOT NULL THEN
          ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY start_date_time)
        ELSE NULL
      END as series_event_number
    FROM tennis_events 
    ORDER BY start_date_time ASC
  `;
  
  db.all(query, (err, rows) => {
    console.log('🔍 Database query executed');
    if (err) {
      console.error('❌ Error fetching events:', err);
      res.status(500).json({ error: 'Failed to fetch events' });
      return;
    }
    
    console.log(`✅ Found ${rows.length} events in database`);
    console.log('🔍 Raw database rows:', rows.map(r => ({ id: r.id, title: r.title, start: r.start_date_time })));
    
    // Convert database format to frontend format
    const events = rows.map(row => ({
      id: row.id,
      title: row.title,
      startDateTime: row.start_date_time,
      endDateTime: row.end_date_time,
      courts: row.courts,
      eventType: row.event_type,
      system: row.system_type,
      isSeriesEvent: Boolean(row.is_series_event),
      seriesId: row.series_id,
      totalMatches: row.total_matches,
      repeatPeriod: row.repeat_period,
      repeatInterval: row.repeat_interval,
      seriesEventNumber: row.series_event_number,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
    }));
    
    console.log(`Returning ${events.length} formatted events to frontend`);
    res.json(events);
  });
});

// POST /api/events - Create new event(s)
app.post('/api/events', (req, res) => {
  console.log('POST /api/events');
  console.log('Request body:', req.body);
  console.log('Events array:', req.body.events);
  console.log('Events count:', req.body.events ? req.body.events.length : 'undefined');
  
  const { events } = req.body;
  
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid request: events array required' });
  }
  
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO tennis_events (
      id, title, start_date_time, end_date_time, courts, event_type, system_type,
      is_series_event, series_id, total_matches, repeat_period, repeat_interval,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let insertedCount = 0;
  let errors = [];
  
  events.forEach((event, index) => {
    console.log(`Processing event ${index + 1}:`, event);
    try {
      const result = stmt.run(
        event.id,
        event.title,
        event.startDateTime,
        event.endDateTime || null,
        event.courts,
        event.eventType,
        event.system,
        event.isSeriesEvent ? 1 : 0,
        event.seriesId || null,
        event.totalMatches || null,
        event.repeatPeriod || null,
        event.repeatInterval || null,
        now,
        now
      );
      
      console.log(`Event ${index + 1} insert result:`, result);
      // SQLite3 prepared statement always succeeds if no error is thrown
      insertedCount++;
      console.log(`✅ Event ${index + 1} inserted successfully`);
    } catch (err) {
      console.error(`Error inserting event ${index + 1}:`, err);
      errors.push(`Event ${index + 1}: ${err.message}`);
    }
  });
  
  stmt.finalize((err) => {
    if (err) {
      console.error('Error finalizing statement:', err);
      return res.status(500).json({ error: 'Database finalization error' });
    }
    
    // Ensure database is flushed to disk before responding
    db.serialize(() => {
      if (errors.length > 0) {
        return res.status(400).json({ 
          error: 'Some events failed to insert', 
          details: errors,
          inserted: insertedCount 
        });
      }
      
      res.status(201).json({ 
        message: `Successfully created ${insertedCount} event(s)`,
        inserted: insertedCount 
      });
    });
  });
});

// PUT /api/events/:id - Update an event
app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  console.log('PUT /api/events/' + id);
  console.log('Request body:', req.body);
  
  const { 
    title, startDateTime, endDateTime, courts, eventType, system,
    isSeriesEvent, seriesId, totalMatches, repeatPeriod, repeatInterval 
  } = req.body;
  
  const now = Date.now();
  
  const stmt = db.prepare(`
    UPDATE tennis_events SET 
      title = ?, start_date_time = ?, end_date_time = ?, courts = ?, event_type = ?, 
      system_type = ?, is_series_event = ?, series_id = ?, total_matches = ?, 
      repeat_period = ?, repeat_interval = ?, updated_at = ?
    WHERE id = ?
  `);
  
  stmt.run(
    title, startDateTime, endDateTime || null, courts, eventType, system,
    isSeriesEvent ? 1 : 0, seriesId || null, totalMatches || null,
    repeatPeriod || null, repeatInterval || null, now, id,
    function(err) {
      if (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ error: 'Failed to update event' });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Event not found' });
      } else {
        console.log('✅ Event updated successfully');
        res.json({ message: 'Event updated successfully' });
      }
    }
  );
  
  stmt.finalize();
});

// DELETE /api/events/:id - Delete a single event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  console.log('DELETE /api/events/' + id);
  
  const stmt = db.prepare('DELETE FROM tennis_events WHERE id = ?');
  
  stmt.run(id, function(err) {
    if (err) {
      console.error('Error deleting event:', err);
      res.status(500).json({ error: 'Failed to delete event' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
    } else {
      console.log('✅ Event deleted successfully');
      res.json({ message: 'Event deleted successfully' });
    }
  });
  
  stmt.finalize();
});

// DELETE /api/events - Clear all events
app.delete('/api/events', (req, res) => {
  console.log('DELETE /api/events (clear all)');
  
  db.run('DELETE FROM tennis_events', function(err) {
    if (err) {
      console.error('Error clearing events:', err);
      res.status(500).json({ error: 'Failed to clear events' });
    } else {
      console.log(`✅ Cleared ${this.changes} events from database`);
      res.json({ message: 'All events cleared successfully', deleted: this.changes });
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tennis API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log('📋 Available routes:');
  console.log('  GET /api/players');
  console.log('  POST /api/players');
  console.log('  POST /api/players/import');
  console.log('  PUT /api/players/:id');
  console.log('  DELETE /api/players/:id');
  console.log('  DELETE /api/players (clear all)');
  console.log('  GET /api/events');
  console.log('  POST /api/events');
  console.log('  PUT /api/events/:id');
  console.log('  DELETE /api/events/:id');
  console.log('  DELETE /api/events (clear all)');
  console.log('  GET /api/health');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});