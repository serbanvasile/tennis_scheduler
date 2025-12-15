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

export interface System {
  system_id: number;
  guid: string;
  name: string; // 'Round Robin', 'Playoff', 'Swiss', 'Elimination', etc.
  description?: string;
}

export interface TennisEvent {
  event_id: number;
  guid: string;
  name: string;
  start_date: number;
  end_date?: number;
  description?: string;
  status?: string;

  // Series fields
  is_series_event?: boolean;
  series_id?: string;
  repeat_period?: 'hours' | 'days' | 'weeks';
  repeat_interval?: number;
  total_events?: number;

  // Enriched from xref joins (populated by GET /api/events)
  event_type_names?: string;
  system_names?: string;
  venue_names?: string;
  court_names?: string;
  field_names?: string;
  team_names?: string;
  season_name?: string;
  is_tournament?: boolean;
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
