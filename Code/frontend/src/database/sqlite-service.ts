import { Platform } from 'react-native';
// Import new Types. Player is aliased to Member in types.ts
import { Member, Team, Venue, TennisEvent, Player } from '../types';

let SQLite: any;

// Only import SQLite on native platforms
if (Platform.OS !== 'web') {
  SQLite = require('react-native-sqlite-storage');
  SQLite.DEBUG(true);
  SQLite.enablePromise(true);
}

class DatabaseService {
  private db: any = null;
  private isWeb = Platform.OS === 'web';
  private API_URL = 'http://localhost:3001/api';

  async init(forceDatabase = false): Promise<void> {
    if (this.isWeb && !forceDatabase) {
      console.log('Web platform: Using in-memory/API storage');
    }

    try {
      // Check API health
      if (this.isWeb) {
        try {
          const response = await fetch(`${this.API_URL}/health`);
          if (response.ok) {
            console.log('✅ API server is running');
          }
        } catch (err) {
          console.error('❌ API server not available:', err);
        }
      }

      // Native Init (placeholder for future implementation)
      if (!this.isWeb) {
        this.db = await SQLite.openDatabase({ name: 'team_sports.db', location: 'default' });
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }

  // --- NEW API METHODS ---

  async getLookups(): Promise<any> {
    try {
      const response = await fetch(`${this.API_URL}/lookups`);
      return await response.json();
    } catch (err) {
      console.error('getLookups failed', err);
      return {};
    }
  }

  async getTeams(): Promise<Team[]> {
    try {
      const response = await fetch(`${this.API_URL}/teams`);
      return await response.json();
    } catch (err) {
      console.error('getTeams failed', err);
      return [];
    }
  }

  async getColors(): Promise<any[]> {
    try {
      const response = await fetch(`${this.API_URL}/colors`);
      return await response.json();
    } catch (err) {
      console.error('getColors failed', err);
      return [];
    }
  }

  async createTeam(name: string, sportId: number, teamColors?: string, colorIds?: number[], logoUrl?: string): Promise<any> {
    const response = await fetch(`${this.API_URL}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sportId, teamColors, colorIds, logoUrl })
    });
    return await response.json();
  }

  async updateTeam(teamId: number, name: string, sportId: number, teamColors?: string, colorIds?: number[], logoUrl?: string): Promise<any> {
    const response = await fetch(`${this.API_URL}/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sportId, teamColors, colorIds, logoUrl })
    });
    return await response.json();
  }

  async deleteTeam(teamId: number): Promise<any> {
    const response = await fetch(`${this.API_URL}/teams/${teamId}/delete`, {
      method: 'PUT',
    });
    return await response.json();
  }

  async deleteAllTeams(): Promise<any> {
    const response = await fetch(`${this.API_URL}/teams`, {
      method: 'DELETE',
    });
    return await response.json();
  }

  // Mapping getPlayers to getMembers for compatibility
  async getPlayers(): Promise<Player[]> {
    return this.getMembers();
  }

  async getMembers(): Promise<Member[]> {
    try {
      const response = await fetch(`${this.API_URL}/members`);
      return await response.json();
    } catch (err) {
      console.error('getMembers failed', err);
      return [];
    }
  }

  async getMemberDetails(memberId: number): Promise<Member> {
    const response = await fetch(`${this.API_URL}/members/${memberId}`);
    return await response.json();
  }

  async createMember(data: Partial<Member>, teams: any[]): Promise<any> {
    const response = await fetch(`${this.API_URL}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: data.first_name,
        lastName: data.last_name,
        displayName: data.display_name,
        gender: data.gender,
        teams // [{ teamId, roleIds, positionIds }]
      })
    });
    return await response.json();
  }

  async updateMember(memberId: number, data: Partial<Member>, teams: any[]): Promise<any> {
    const response = await fetch(`${this.API_URL}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: data.first_name,
        lastName: data.last_name,
        displayName: data.display_name,
        gender: data.gender,
        teams
      })
    });
    return await response.json();
  }

  async deleteMember(memberId: number): Promise<any> {
    const response = await fetch(`${this.API_URL}/members/${memberId}/delete`, { method: 'PUT' });
    return await response.json();
  }

  async deleteAllMembers(): Promise<any> {
    const response = await fetch(`${this.API_URL}/members`, { method: 'DELETE' });
    return await response.json();
  }

  async getRoles(): Promise<Role[]> {
    // Assuming generic roles for now, or fetch from lookup
    // We don't have a dedicated getRoles endpoint yet in API-Server?
    // I saw `roles` table. I should probably add a lookup for it or use getLookups if it included roles?
    // For now, I'll add a simple fetch if I add the endpoint, or use hardcoded if acceptable, but DB is better.
    // Let's assume I add /api/roles.
    const response = await fetch(`${this.API_URL}/lookups`); // Assumes lookups logic or add /api/roles
    // Wait, api-server `getLookups` (if exists) needs to checked.
    // If not, I'll add `getRoles` to sqlite-service using a new endpoint I'll add to backend.
    // Actually, let's just use `getLookups` pattern.
    return [];
  }

  async getPositions(): Promise<Position[]> {
    // Same here
    const response = await fetch(`${this.API_URL}/lookups`);
    return [];
  }

  async getLookups(): Promise<any> {
    const response = await fetch(`${this.API_URL}/lookups`);
    return await response.json();
  }

  // --- VENUES ---

  async getVenues(): Promise<Venue[]> {
    try {
      const response = await fetch(`${this.API_URL}/venues`);
      return await response.json();
    } catch (err) {
      console.error('getVenues failed', err);
      return [];
    }
  }

  async createVenue(name: string, address?: string, details?: any): Promise<any> {
    const response = await fetch(`${this.API_URL}/venues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, details })
    });
    return await response.json();
  }

  // --- EVENTS ---

  async getAllEvents(): Promise<TennisEvent[]> {
    try {
      const response = await fetch(`${this.API_URL}/events`);
      return await response.json(); // backend Returns simple events array
    } catch (err) {
      console.error('getAllEvents failed', err);
      return [];
    }
  }

  async createEvent(eventData: any): Promise<any> {
    // Adapter: Frontend 'Event' -> Backend payload
    const payload = {
      name: eventData.title || eventData.name, // Handle legacy 'title' field
      startDate: eventData.startDateTime || eventData.startDate,
      endDate: eventData.endDateTime || eventData.endDate,
      description: eventData.description,
      venueIds: eventData.venues?.map((v: any) => v.id) || [], // Assuming UI sends venue objects
      teamIds: eventData.teams?.map((t: any) => t.id) || []
    };

    const response = await fetch(`${this.API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  }

  // --- LEGACY STUBS / COMPATIBILITY (Optional) ---

  async addPlayer(player: any): Promise<string> {
    // Map legacy addPlayer to createMember
    const result = await this.createMember({
      first_name: player.displayName.split(' ')[0],
      last_name: player.displayName.split(' ').slice(1).join(' ') || 'Unknown',
      display_name: player.displayName,
      gender: 'U'
    });
    return result.member_id?.toString() || '0';
  }

  async updatePlayer(): Promise<void> { console.warn('updatePlayer not fully implemented'); }
  async deletePlayer(): Promise<void> { console.warn('deletePlayer not fully implemented'); }
  async clearAllPlayers(): Promise<void> { console.warn('clearAllPlayers not fully implemented'); }

  parseClipboardData(text: string): any[] {
    // Legacy support disabled for now or needs update
    return [];
  }
}

export const databaseService = new DatabaseService();