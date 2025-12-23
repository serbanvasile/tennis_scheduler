export type DID = string; // did:key / did:pkh

// --- NEW SCHEMA TYPES (Greenfield) ---

export interface Sport {
  sport_id: number | string;
  guid: string;
  name: string;
  description?: string;
}

export interface Color {
  color_id: number | string;
  guid: string;
  name: string;
  hex_code: string;
}

export interface Team {
  team_id: number | string;
  guid: string;
  name: string;
  sport_id?: number | string;
  sport_name?: string; // Joined field
  team_colors?: string; // Legacy/Display
  logo_url?: string;
  colors?: Color[]; // New linked colors
}

export interface Role {
  role_id: number | string;
  guid: string;
  name: string;
  description?: string;
}

export interface Member {
  member_id: number | string;
  guid: string;
  first_name: string;
  last_name: string;
  display_name: string;
  gender?: string;
  skill?: number; // Added for RosterScreen compatibility
  dominant_side?: string;
  share?: number;
  share_type?: string;
  share_percentage?: number;
  phone?: string;
  email?: string;
  role_name?: string; // from relationship
  membership_id?: number; // ref key
  joined_date?: number;
  teams?: Team[];
  contacts?: any[];
}

export interface Venue {
  venue_id: number | string;
  guid: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geocoded_data?: string; // JSON string from Google Maps
  details?: any;
}

export interface System {
  system_id: number;
  guid: string;
  name: string; // 'Round Robin', 'Playoff', 'Swiss', 'Elimination', etc.
  description?: string;
}

export interface TennisEvent {
  event_id: string | number;  // Can be UUID string or legacy numeric ID
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

  // ID arrays for editing (populated by getEventDetails)
  venueIds?: number[];
  teamIds?: number[];
  memberIds?: number[];
  eventTypeIds?: number[];
  systemIds?: number[];
  courtIds?: number[];
  fieldIds?: number[];
  seasonId?: number;
  isTournament?: boolean;
}

// --- LEGACY / SHARED TYPES (Keep for compat or reuse) ---

export type Player = Member; // Alias for backward compat in components

export interface Position {
  position_id: number;
  guid: string;
  name: string;
  sport_id?: number;
  description?: string;
}

export interface Skill {
  skill_id: number;
  guid: string;
  name: string;
  sort_order?: number;
}

export type Court = {
  id: string;
  label: string;
  location?: string;
  timeSlots: string[];
};

export type Week = {
  id: string;
  leagueId: string;
  index: number;
  dateISO: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  notes?: string;
};

export type Availability = {
  id: string;
  weekId: string;
  playerId: string;
  state: 'in' | 'out' | 'maybe';
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

export type Score = {
  id: string;
  matchId: string;
  teamAPoints: number;
  teamBPoints: number;
};

export interface League {
  id: string;
  name: string;
  season?: {
    startISO: string;
    endISO: string;
    weekDays: number[];
  };
  courts: Court[];
  rules?: any;
  visibility?: 'public' | 'private';
  adminDIDs?: string[];
  createdBy?: string;
  createdAt?: string;
}

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  sitOuts: number;
}

export interface FairnessMetrics {
  partnerVariety: number;
  opponentVariety: number;
  courtDistribution: number;
}
