export type DID = string; // did:key / did:pkh

export type Court = { 
  id: string; 
  label: string; 
  location?: string; 
  timeSlots: string[]; // e.g., ['18:00','19:15']
};

export type Rules = {
  targetPairsPerSeason: number;
  balanceWeights: {
    partners: number;
    opponents: number;
    courts: number;
    sitouts: number;
    skillParity: number;
  };
  maxCourtsPerWeek?: number;
  allowSubs: boolean;
  ratingSystem: 'none' | 'elo';
};

export type League = {
  id: string; // CID/streamID
  name: string;
  season: { 
    startISO: string; 
    endISO: string; 
    weekDays: number[]; // e.g., [4] for Thu
  };
  courts: Court[];
  rules: Rules;
  visibility: 'public' | 'private';
  adminDIDs: DID[];
  createdBy: DID;
  createdAt: string; // ISO
  policyHash?: string; // snapshot of on-chain policy
};

export type Player = {
  id: DID;
  displayName: string;
  phone?: string; // stored encrypted
  email?: string;
  skill: number; // 1..10 (USTA levels)
  handed: 'L' | 'R' | 'A'; // Left, Right, Ambidextrous
  tags?: string[];
  share?: number; // percentage of 100 for contract tennis
  shareType?: 'TQ' | 'F' | 'H' | 'OT' | 'TT' | 'R' | 'C'; // Three Quarters, Full, Half, One Third, Two Thirds, Reserve, Custom
  sharePercentage?: number; // auto-filled based on shareType or custom for 'C'
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
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
  weekId: string;
  playerId: DID;
  state: 'yes' | 'no' | 'maybe';
  updatedAt: string;
  signature?: string; // signed by player
};

export type Match = {
  id: string;
  weekId: string;
  courtId: string;
  timeSlot: string;
  teamA: DID[]; // 2 players
  teamB: DID[]; // 2 players
  generatedBy: DID;
  lock?: boolean;
  skillLevel?: number; // average skill level
};

export type Score = {
  matchId: string;
  setScores: [number, number][];
  winner: 'A' | 'B' | 'split' | 'NA';
  submittedBy: DID;
  updatedAt: string;
  signature?: string;
};

export type StatsSnapshot = {
  weekId: string;
  metrics: Record<string, number | string>;
};

export type AuditEvent = {
  id: string;
  type: string;
  actor: DID;
  at: string;
  payloadCID: string;
  sig: string;
};

// Player Statistics Types
export type PlayerStats = {
  playerId: DID;
  seasonId: string;
  totalMatches: number;
  wins: number;
  losses: number;
  partners: Record<DID, number>; // partner -> count
  opponents: Record<DID, number>; // opponent -> count
  courtExposure: Record<string, number>; // court -> count
  sitouts: number;
  averageSkillDiff: number;
};

// Fairness Metrics
export type FairnessMetrics = {
  partnerDiversity: number; // 0-1 score
  opponentDiversity: number;
  courtBalance: number;
  sitoutBalance: number;
  skillBalance: number;
  overallFairness: number;
};
