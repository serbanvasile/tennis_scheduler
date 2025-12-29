/**
 * TEMPORARY STUB - Legacy Store for Phase 1-2 Compatibility
 * 
 * This file maintains compatibility with components that still use the old
 * Zustand store pattern. Main UI screens now use databaseService from
 * local-database-service.ts directly.
 * 
 * Legacy components using this stub:
 * - MatchCard.tsx
 * - CourtColumn.tsx  
 * - AnalyticsScreen.tsx
 * - App.tsx (Dashboard/Weeks screens)
 */

import { create } from "zustand";
import type { DID } from "./types";

// Minimal types needed for legacy components
interface LegacyLeague {
    name: string;
    courts: Array<{ id: string; label: string; timeSlots: string[] }>;
}

interface LegacyPlayer {
    id: DID;
    displayName: string;
    skill: number;
    handed?: 'L' | 'R' | 'A';
}

interface LegacyWeek {
    id: string;
    dateISO: string;
    index: number;
    status: string;
}

interface LegacyMatch {
    id: number | string;
    weekId: number | string;
    courtId: number | string;
    timeSlot: string;
    teamA: string[];
    teamB: string[];
    generatedBy: string;
    lock?: boolean;
}

interface PlayerStats {
    totalMatches: number;
    partners: Record<string, number>;
    opponents: Record<string, number>;
    courts: Record<string, number>;
}

interface FairnessMetrics {
    partnerDiversity: number;
    opponentDiversity: number;
    skillBalance: number;
    courtBalance: number;
    overallFairness: number;
}

interface LegacyStoreState {
    league: LegacyLeague;
    roster: LegacyPlayer[];
    weeks: LegacyWeek[];
    matches: LegacyMatch[];
    scores: any[];
    availability: any[];
    highlightPlayer: DID | null;
    mainPlayer: DID | null;
    playerStats: Record<string, PlayerStats>;

    setHighlightPlayer: (id: DID | null) => void;
    setMainPlayer: (id: DID | null) => void;
    generateWeek: (index: number) => void;
    makeSchedule: (weekId: string) => void;
    calculatePlayerStats: (playerId: DID) => PlayerStats;
    calculateFairnessMetrics: (weekId?: string) => FairnessMetrics;
}

// Default empty fairness metrics
const defaultFairness: FairnessMetrics = {
    partnerDiversity: 0,
    opponentDiversity: 0,
    skillBalance: 0,
    courtBalance: 0,
    overallFairness: 0,
};

// Default empty player stats
const defaultPlayerStats: PlayerStats = {
    totalMatches: 0,
    partners: {},
    opponents: {},
    courts: {},
};

// Initial empty data - Phase 2 will populate from WatermelonDB
export const useStore = create<LegacyStoreState>((set, get) => ({
    league: {
        name: "Team Sports",
        courts: []
    },
    roster: [],
    weeks: [],
    matches: [],
    scores: [],
    availability: [],
    highlightPlayer: null,
    mainPlayer: null,
    playerStats: {},

    setHighlightPlayer: (id) => set({ highlightPlayer: id }),
    setMainPlayer: (id) => set({ mainPlayer: id }),

    generateWeek: (index) => {
        console.log('Legacy store: generateWeek called -', index);
        // No-op in stub, will be implemented in Phase 2
    },

    makeSchedule: (weekId) => {
        console.log('Legacy store: makeSchedule called -', weekId);
        // No-op in stub, will be implemented in Phase 2
    },

    calculatePlayerStats: (playerId: DID): PlayerStats => {
        // Return stub stats - real implementation would aggregate from matches
        return defaultPlayerStats;
    },

    calculateFairnessMetrics: (weekId?: string): FairnessMetrics => {
        // Return stub metrics - real implementation would calculate from matches
        return defaultFairness;
    },
}));
