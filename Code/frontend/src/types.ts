export type DID = string; // did:key / did:pkh

// --- NEW SCHEMA TYPES (Greenfield) ---

export interface Sport {
  sport_id: number;
  guid: string;
  name: string;
}

export interface Color {
  color_id: number;
  guid: string;
  name: string;
  hex_code: string;
}

export interface Team {
  team_id: number;
  guid: string;
  name: string;
  sport_id?: number;
  sport_name?: string; // Joined field
  team_colors?: string; // Legacy/Display
  logo_url?: string;
  colors?: Color[]; // New linked colors
}

export interface Role {
  role_id: number;
  guid: string;
  name: string;
}

export interface Member {
  member_id: number;
  guid: string;
  first_name: string;
  last_name: string;
  display_name: string;
  gender?: string;
  role_name?: string; // from relationship
  membership_id?: number; // ref key
  joined_date?: number;
}

export interface Venue {
  venue_id: number;
  guid: string;
  name: string;
  address?: string;
  details?: any;
}

export interface TennisEvent {
  event_id: number;
  guid: string;
  name: string;
  start_date: number;
  end_date?: number;
  description?: string;
  status?: string;
  courts?: number;
  event_type?: string;
  venue_ids?: number[]; // IDs for fetching
  venue_names?: string[]; // Display helper
}

// --- LEGACY / SHARED TYPES (Keep for compat or reuse) ---

export type Player = Member; // Alias for backward compat in components

export type Court = {
  id: string;
  label: string;
  location?: string;
  timeSlots: string[];
};

export type Match = {
  id: string;
  weekId: string;
  courtId: string;
  timeSlot: string;
  teamA: string[];
  teamB: string[];
  generatedBy: string;
  lock?: boolean;
};

// ... (Other legacy rules/stats types omitted for brevity unless needed)
