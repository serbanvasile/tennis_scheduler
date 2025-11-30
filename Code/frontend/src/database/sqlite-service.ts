import { Platform } from 'react-native';
import { Player } from '../types';

let SQLite: any;

// Only import SQLite on native platforms
if (Platform.OS !== 'web') {
  SQLite = require('react-native-sqlite-storage');
  SQLite.DEBUG(true);
  SQLite.enablePromise(true);
}

// Only import SQLite on native platforms
if (Platform.OS !== 'web') {
  SQLite = require('react-native-sqlite-storage');
  SQLite.DEBUG(true);
  SQLite.enablePromise(true);
}

class DatabaseService {
  private db: any = null;
  private isWeb = Platform.OS === 'web';

  async init(forceDatabase = false): Promise<void> {
    if (this.isWeb && !forceDatabase) {
      console.log('Web platform: Using in-memory storage (forceDatabase=false)');
      return;
    }

    if (forceDatabase) {
      console.log('Force database enabled: Attempting SQLite initialization on web');
    }

    try {
      // On web with forceDatabase, use REST API
      if (this.isWeb && forceDatabase) {
        console.log('Web platform: Using REST API for database operations');
        
        // Test API connection
        try {
          const response = await fetch('http://localhost:3001/api/health');
          if (response.ok) {
            console.log('✅ API server is running');
          } else {
            throw new Error('API server not responding');
          }
        } catch (err) {
          console.error('❌ API server not available:', err);
          throw new Error('API server not available. Please start the backend server.');
        }
        
        // Create API wrapper
        this.db = {
          executeSql: async (sql: string, params: any[] = []) => {
            console.log('API call would be made for:', sql.split(' ')[0]);
            // This won't be used directly - we'll use fetch in individual methods
            return [{ rows: { length: 0, item: () => null } }];
          }
        };
        
        console.log('✅ API wrapper initialized');
        return;
      }

      this.db = await SQLite.openDatabase({
        name: 'tennis_scheduler.db',
        location: 'default',
      });
      console.log('Database opened successfully');
      await this.createTables();
      console.log('Database initialization completed - no seeding performed');
      console.log('Database initialization completed - no seeding performed');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (this.isWeb || !this.db) return;

    const createPlayersTable = `
      CREATE TABLE IF NOT EXISTS players (
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
      )
    `;

    await this.db.executeSql(createPlayersTable);
    console.log('Players table created');
  }

  async getPlayers(forceDatabase = false): Promise<Player[]> {
    if ((this.isWeb && !forceDatabase) || !this.db) {
      console.log('getPlayers: Returning empty array (web without force or no db)');
      return [];
    }

    if (this.isWeb && forceDatabase) {
      // Use API for web platform
      try {
        console.log('🌐 Fetching players from API...');
        const response = await fetch('http://localhost:3001/api/players');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const players = await response.json();
        console.log('🌐 API returned:', players.length, 'players');
        return players;
      } catch (err) {
        console.error('💥 API request failed:', err);
        throw err;
      }
    }

    // Native platform SQLite
    try {
      console.log('getPlayers: Executing SQL query...');
      const [results] = await this.db.executeSql('SELECT * FROM players ORDER BY display_name');
      const players: Player[] = [];
      
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        players.push({
          id: row.id,
          displayName: row.display_name,
          skill: row.skill,
          handed: row.handed,
          phone: row.phone || undefined,
          email: row.email || undefined,
          tags: row.tags ? JSON.parse(row.tags) : undefined,
          share: row.share || undefined
        });
      }
      
      console.log('getPlayers: Returning', players.length, 'players from database');
      return players;
    } catch (error) {
      console.error('Error getting players:', error);
      return [];
    }
  }

  async addPlayer(playerData: Omit<Player, 'id'>, forceDatabase = false): Promise<string> {
    if ((this.isWeb && !forceDatabase) || !this.db) {
      throw new Error('Database not available on web (use forceDatabase=true)');
    }

    if (this.isWeb && forceDatabase) {
      // Use API for web platform
      try {
        console.log('🌐 Adding player via API:', playerData);
        const response = await fetch('http://localhost:3001/api/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(playerData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('🌐 API addPlayer returned:', result.id);
        return result.id;
      } catch (err) {
        console.error('💥 API addPlayer failed:', err);
        throw err;
      }
    }

    // Native platform SQLite
    const id = Math.random().toString(36).substr(2, 9);
    const now = Date.now();

    await this.db.executeSql(
      'INSERT INTO players (id, display_name, skill, handed, phone, email, tags, share, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, playerData.displayName, playerData.skill, playerData.handed, playerData.phone || null, playerData.email || null, JSON.stringify(playerData.tags || []), playerData.share || 0, now, now]
    );

    console.log('addPlayer: Successfully added player with ID:', id);
    return id;
  }

  async updatePlayer(id: string, playerData: Partial<Omit<Player, 'id'>>, forceDatabase = false): Promise<void> {
    if ((this.isWeb && !forceDatabase) || !this.db) {
      throw new Error('Database not available on web (use forceDatabase=true)');
    }

    if (this.isWeb && forceDatabase) {
      // Use API for web platform
      try {
        console.log('🌐 Updating player via API:', id, playerData);
        const response = await fetch(`http://localhost:3001/api/players/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(playerData),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        console.log('🌐 API updatePlayer completed');
        return;
      } catch (err) {
        console.error('💥 API updatePlayer failed:', err);
        throw err;
      }
    }

    // Native platform SQLite
    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    if (playerData.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(playerData.displayName);
    }
    
    if (playerData.skill !== undefined) {
      updates.push('skill = ?');
      values.push(playerData.skill);
    }
    
    if (playerData.handed !== undefined) {
      updates.push('handed = ?');
      values.push(playerData.handed);
    }
    
    if (playerData.phone !== undefined) {
      updates.push('phone = ?');
      values.push(playerData.phone);
    }
    
    if (playerData.email !== undefined) {
      updates.push('email = ?');
      values.push(playerData.email);
    }
    
    if (playerData.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(playerData.tags));
    }
    
    if (playerData.share !== undefined) {
      updates.push('share = ?');
      values.push(playerData.share);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now, id);

    await this.db.executeSql(
      `UPDATE players SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log('updatePlayer: Successfully updated player ID:', id);
  }

  async deletePlayer(id: string, forceDatabase = false): Promise<void> {
    if ((this.isWeb && !forceDatabase) || !this.db) {
      throw new Error('Database not available on web (use forceDatabase=true)');
    }

    if (this.isWeb && forceDatabase) {
      // Use API for web platform
      try {
        console.log('🌐 Deleting player via API:', id);
        const response = await fetch(`http://localhost:3001/api/players/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        console.log('🌐 API deletePlayer completed');
        return;
      } catch (err) {
        console.error('💥 API deletePlayer failed:', err);
        throw err;
      }
    }

    // Native platform SQLite
    await this.db.executeSql('DELETE FROM players WHERE id = ?', [id]);
    console.log('deletePlayer: Successfully deleted player ID:', id);
  }

  // Import functionality
  parseClipboardData(clipboardText: string): any[] {
    console.log('parseClipboardData: Parsing clipboard data');
    
    const lines = clipboardText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid data format: Need at least header and one data row');
    }
    
    // Skip header line (should be: #	NAME	Share	Cell	Level)
    const dataLines = lines.slice(1);
    const players = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      // Split by tab
      const columns = line.split('\t');
      if (columns.length < 5) {
        console.warn(`Row ${i + 1}: Invalid number of columns, skipping`);
        continue;
      }
      
      const [rowNum, name, shareType, phone, skill] = columns;
      
      // Calculate share percentage based on share type
      let sharePercentage = 0;
      switch (shareType) {
        case 'F': sharePercentage = 100; break;   // Full
        case 'TQ': sharePercentage = 75; break;   // Three Quarters
        case 'TT': sharePercentage = 67; break;   // Two Thirds
        case 'H': sharePercentage = 50; break;    // Half
        case 'OT': sharePercentage = 33; break;   // One Third
        case 'R': sharePercentage = 0; break;     // Reserve
        case 'C': sharePercentage = 50; break;    // Custom (default to 50%, user can edit)
        default: sharePercentage = 0; break;
      }
      
      const player = {
        displayName: name.trim(),
        skill: parseFloat(skill.trim()),
        handed: 'R', // Default to right-handed
        phone: phone.trim(),
        email: '',
        tags: [],
        share: sharePercentage, // Keep for backwards compatibility
        shareType: shareType.trim(),
        sharePercentage: sharePercentage
      };
      
      players.push(player);
    }
    
    console.log(`parseClipboardData: Parsed ${players.length} players`);
    return players;
  }

  async importPlayers(players: any[], mode: 'update' | 'add-new' = 'update', force?: boolean): Promise<any> {
    console.log(`importPlayers: Importing ${players.length} players with mode: ${mode}`);
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch('http://localhost:3001/api/players/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            players,
            mode
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('importPlayers: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('importPlayers: API response:', result);
        return result;
      } catch (error) {
        console.error('importPlayers: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode would go here
    throw new Error('Native import not implemented yet');
  }

  async clearAllPlayers(force?: boolean): Promise<void> {
    console.log('clearAllPlayers: Clearing all players from database');
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch('http://localhost:3001/api/players', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('clearAllPlayers: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('clearAllPlayers: API response:', result);
        return result;
      } catch (error) {
        console.error('clearAllPlayers: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode
    await this.db.executeSql('DELETE FROM players', []);
    console.log('clearAllPlayers: Successfully cleared all players');
  }

  // Events API methods
  async getAllEvents(force?: boolean): Promise<any[]> {
    console.log('getAllEvents: Fetching all events from database');
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch('http://localhost:3001/api/events');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('getAllEvents: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const events = await response.json();
        console.log('getAllEvents: API response:', events);
        return events;
      } catch (error) {
        console.error('getAllEvents: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode (not implemented yet)
    throw new Error('Native SQLite events support not implemented');
  }

  async createEvents(events: any[], force?: boolean): Promise<void> {
    console.log('createEvents: Creating events in database');
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch('http://localhost:3001/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('createEvents: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('createEvents: API response:', result);
        return result;
      } catch (error) {
        console.error('createEvents: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode (not implemented yet)
    throw new Error('Native SQLite events support not implemented');
  }

  async updateEvent(eventId: string, eventData: any, force?: boolean): Promise<void> {
    console.log('updateEvent: Updating event in database', eventId);
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('updateEvent: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('updateEvent: API response:', result);
        return result;
      } catch (error) {
        console.error('updateEvent: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode (not implemented yet)
    throw new Error('Native SQLite events support not implemented');
  }

  async deleteEvent(eventId: string, force?: boolean): Promise<void> {
    console.log('deleteEvent: Deleting event from database', eventId);
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('deleteEvent: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('deleteEvent: API response:', result);
        return result;
      } catch (error) {
        console.error('deleteEvent: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode (not implemented yet)
    throw new Error('Native SQLite events support not implemented');
  }

  async clearAllEvents(force?: boolean): Promise<void> {
    console.log('clearAllEvents: Clearing all events from database');
    
    if (this.isWeb || force) {
      // Web API mode
      try {
        const response = await fetch('http://localhost:3001/api/events', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('clearAllEvents: API error response:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('clearAllEvents: API response:', result);
        return result;
      } catch (error) {
        console.error('clearAllEvents: API call failed:', error);
        throw error;
      }
    }

    // Native platform SQLite mode (not implemented yet)
    throw new Error('Native SQLite events support not implemented');
  }

  isWebPlatform(): boolean {
    return this.isWeb;
  }
}

export const databaseService = new DatabaseService();