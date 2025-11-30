import { Player, Match, PlayerStats, Availability, FairnessMetrics } from './types';

// Simple ID generator (you'd use a proper UUID library in production)
export const id = () => Math.random().toString(36).substr(2, 9);

// Legacy functions for backward compatibility
export function greedyPairs(players: Player[]): string[][] {
  const s = [...players].sort((a, b) => a.skill - b.skill);
  const out: string[][] = [];
  for (let i = 0; i + 1 < s.length; i += 2) out.push([s[i].id, s[i + 1].id]);
  return out;
}

export function makeMatches(
  weekId: string,
  pairs: string[][],
  courts: any[]
): Match[] {
  const matches: Match[] = [];
  let idx = 0;
  for (const c of courts) {
    for (const t of c.timeSlots) {
      if (idx + 1 >= pairs.length) break;
      matches.push({
        id: `${weekId}-${c.id}-${t}`,
        weekId,
        courtId: c.id,
        timeSlot: t,
        teamA: pairs[idx++],
        teamB: pairs[idx++],
        generatedBy: 'legacy-greedy'
      });
    }
  }
  return matches;
}

// Enhanced fairness-based scheduling algorithm
export function createOptimalSchedule(
  availablePlayers: Player[],
  playerStats: Record<string, PlayerStats>,
  previousMatches: Match[],
  courtCount: number,
  timeSlots: string[]
): {
  matches: Match[];
  sitouts: string[];
  fairnessScore: number;
} {
  const numPlayers = availablePlayers.length;
  const slotsPerCourt = timeSlots.length;
  const totalSlots = courtCount * slotsPerCourt;
  const playersPerMatch = 4;
  const playersInMatches = Math.floor(numPlayers / playersPerMatch) * playersPerMatch;
  const sitouts = availablePlayers.slice(playersInMatches).map(p => p.id);

  // Get players who will play this week
  const playingPlayers = availablePlayers.slice(0, playersInMatches);
  
  // Generate all possible team combinations
  const teams = generateTeamCombinations(playingPlayers);
  
  // Generate all possible match pairings from teams
  const possibleMatches = generateMatchCombinations(teams, courtCount, timeSlots);
  
  // Score each possible complete schedule
  const bestSchedule = findOptimalSchedule(
    possibleMatches,
    playingPlayers,
    playerStats,
    previousMatches
  );

  return {
    matches: bestSchedule,
    sitouts,
    fairnessScore: calculateScheduleFairness(bestSchedule, playingPlayers, playerStats)
  };
}

// Generate all possible 2-player teams from available players
function generateTeamCombinations(players: Player[]): { playerA: Player; playerB: Player }[] {
  const teams: { playerA: Player; playerB: Player }[] = [];
  
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      teams.push({ playerA: players[i], playerB: players[j] });
    }
  }
  
  return teams;
}

// Generate possible match combinations for a given week
function generateMatchCombinations(
  teams: { playerA: Player; playerB: Player }[],
  courtCount: number,
  timeSlots: string[]
): Match[][] {
  // This is a simplified version - in practice you'd use more sophisticated algorithms
  // like constraint satisfaction or genetic algorithms for larger player pools
  
  const matchesPerSlot = courtCount;
  const totalMatches = timeSlots.length * courtCount;
  
  // For demo, generate a few reasonable schedules to choose from
  const schedules: Match[][] = [];
  
  // Generate one schedule using skill-based pairing
  const skillBasedSchedule = generateSkillBasedSchedule(teams, courtCount, timeSlots);
  if (skillBasedSchedule.length > 0) {
    schedules.push(skillBasedSchedule);
  }
  
  // Generate one schedule prioritizing partner diversity
  const diversitySchedule = generateDiversityBasedSchedule(teams, courtCount, timeSlots);
  if (diversitySchedule.length > 0) {
    schedules.push(diversitySchedule);
  }
  
  return schedules;
}

// Generate schedule prioritizing skill balance
function generateSkillBasedSchedule(
  teams: { playerA: Player; playerB: Player }[],
  courtCount: number,
  timeSlots: string[]
): Match[] {
  const matches: Match[] = [];
  const usedPlayers = new Set<string>();
  
  // Sort teams by combined skill level
  const sortedTeams = teams
    .map(team => ({
      ...team,
      combinedSkill: team.playerA.skill + team.playerB.skill
    }))
    .sort((a, b) => a.combinedSkill - b.combinedSkill);
  
  let courtIndex = 0;
  let timeIndex = 0;
  
  for (let i = 0; i < sortedTeams.length - 1; i++) {
    const teamA = sortedTeams[i];
    
    // Find best opposing team
    for (let j = i + 1; j < sortedTeams.length; j++) {
      const teamB = sortedTeams[j];
      
      // Check if any players are already used
      const allPlayers = [teamA.playerA.id, teamA.playerB.id, teamB.playerA.id, teamB.playerB.id];
      if (allPlayers.some(id => usedPlayers.has(id))) {
        continue;
      }
      
      // Create match
      matches.push({
        id: `m${id()}`,
        weekId: 'current',
        courtId: `c${courtIndex + 1}`,
        timeSlot: timeSlots[timeIndex],
        teamA: [teamA.playerA.id, teamA.playerB.id],
        teamB: [teamB.playerA.id, teamB.playerB.id],
        generatedBy: 'skill-optimizer'
      });
      
      // Mark players as used
      allPlayers.forEach(playerId => usedPlayers.add(playerId));
      
      // Move to next court/time slot
      courtIndex++;
      if (courtIndex >= courtCount) {
        courtIndex = 0;
        timeIndex++;
        if (timeIndex >= timeSlots.length) {
          break;
        }
      }
      
      break; // Found a match for teamA
    }
  }
  
  return matches;
}

// Generate schedule prioritizing partner diversity
function generateDiversityBasedSchedule(
  teams: { playerA: Player; playerB: Player }[],
  courtCount: number,
  timeSlots: string[]
): Match[] {
  // This would implement logic to maximize partner diversity
  // For now, return skill-based as placeholder
  return generateSkillBasedSchedule(teams, courtCount, timeSlots);
}

// Find the optimal schedule from all possibilities
function findOptimalSchedule(
  possibleSchedules: Match[][],
  players: Player[],
  playerStats: Record<string, PlayerStats>,
  previousMatches: Match[]
): Match[] {
  let bestSchedule: Match[] = [];
  let bestScore = -Infinity;
  
  for (const schedule of possibleSchedules) {
    const score = calculateScheduleFairness(schedule, players, playerStats);
    
    if (score > bestScore) {
      bestScore = score;
      bestSchedule = schedule;
    }
  }
  
  return bestSchedule;
}

// Calculate fairness score for a given schedule
function calculateScheduleFairness(
  matches: Match[],
  players: Player[],
  playerStats: Record<string, PlayerStats>
): number {
  // Implement fairness scoring based on:
  // - Skill balance within matches
  // - Partner diversity
  // - Court distribution
  // - Historical balance
  
  let skillBalanceScore = 0;
  let partnerDiversityScore = 0;
  
  for (const match of matches) {
    // Calculate skill balance for this match
    const teamASkill = match.teamA.reduce((sum, id) => {
      const player = players.find(p => p.id === id);
      return sum + (player?.skill || 0);
    }, 0);
    
    const teamBSkill = match.teamB.reduce((sum, id) => {
      const player = players.find(p => p.id === id);
      return sum + (player?.skill || 0);
    }, 0);
    
    // Lower difference is better
    const skillDiff = Math.abs(teamASkill - teamBSkill);
    skillBalanceScore += Math.max(0, 10 - skillDiff);
  }
  
  // Average the scores
  const averageSkillBalance = matches.length > 0 ? skillBalanceScore / matches.length : 0;
  
  // Combine different fairness metrics (weights from design spec)
  return (
    averageSkillBalance * 5 + // skillParity weight
    partnerDiversityScore * 3 + // partners weight
    0 * 2 + // opponents weight (placeholder)
    0 * 1 + // courts weight (placeholder)
    0 * 4   // sitouts weight (placeholder)
  );
}

// Calculate comprehensive player statistics
export function calculatePlayerStatistics(
  playerId: string,
  matches: Match[],
  scores: any[], // TODO: implement Score type
  seasonId: string
): PlayerStats {
  const playerMatches = matches.filter(m => 
    m.teamA.includes(playerId) || m.teamB.includes(playerId)
  );
  
  const partners: Record<string, number> = {};
  const opponents: Record<string, number> = {};
  const courtExposure: Record<string, number> = {};
  
  playerMatches.forEach(match => {
    // Count partners
    const isTeamA = match.teamA.includes(playerId);
    const teammates = isTeamA ? match.teamA : match.teamB;
    const opponentTeam = isTeamA ? match.teamB : match.teamA;
    
    teammates.forEach(teammate => {
      if (teammate !== playerId) {
        partners[teammate] = (partners[teammate] || 0) + 1;
      }
    });
    
    // Count opponents
    opponentTeam.forEach(opponent => {
      opponents[opponent] = (opponents[opponent] || 0) + 1;
    });
    
    // Count court exposure
    courtExposure[match.courtId] = (courtExposure[match.courtId] || 0) + 1;
  });
  
  return {
    playerId,
    seasonId,
    totalMatches: playerMatches.length,
    wins: 0, // TODO: calculate from scores
    losses: 0, // TODO: calculate from scores
    partners,
    opponents,
    courtExposure,
    sitouts: 0, // TODO: calculate sitout weeks
    averageSkillDiff: 0 // TODO: calculate average skill difference
  };
}

// Calculate fairness metrics for the league
export function calculateFairnessMetrics(
  matches: Match[],
  players: Player[],
  playerStats: Record<string, PlayerStats>,
  weekId?: string
): FairnessMetrics {
  const weekMatches = weekId ? matches.filter(m => m.weekId === weekId) : matches;
  
  // Calculate partner balance (standard deviation of partner counts)
  const partnerCounts = Object.values(playerStats).map(stats => 
    Object.values(stats.partners).reduce((sum: number, count: number) => sum + count, 0)
  );
  const partnerBalance = calculateStandardDeviation(partnerCounts);
  
  // Calculate opponent balance
  const opponentCounts = Object.values(playerStats).map(stats => 
    Object.values(stats.opponents).reduce((sum: number, count: number) => sum + count, 0)
  );
  const opponentBalance = calculateStandardDeviation(opponentCounts);
  
  // Calculate court balance
  const courtCounts = Object.values(playerStats).map(stats => 
    Object.values(stats.courtExposure).reduce((sum: number, count: number) => sum + count, 0)
  );
  const courtBalance = calculateStandardDeviation(courtCounts);
  
  // Calculate overall fairness score
  const overallFairness = (
    (10 - Math.min(10, partnerBalance)) * 3 +
    (10 - Math.min(10, opponentBalance)) * 2 +
    (10 - Math.min(10, courtBalance)) * 1
  ) / 6;
  
  return {
    partnerDiversity: calculateDiversity(playerStats, 'partners'),
    opponentDiversity: calculateDiversity(playerStats, 'opponents'),
    skillBalance: calculateSkillBalance(weekMatches, players),
    courtBalance,
    sitoutBalance: 0, // TODO: implement sitout tracking
    overallFairness
  };
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  
  return Math.sqrt(variance);
}

function calculateDiversity(
  playerStats: Record<string, PlayerStats>,
  type: 'partners' | 'opponents'
): number {
  // Calculate how evenly distributed partnerships/oppositions are
  const allCounts = Object.values(playerStats).map(stats => 
    type === 'partners' ? stats.partners : stats.opponents
  );
  
  // This is a simplified diversity metric
  // In practice, you'd use Shannon entropy or similar
  return allCounts.length > 0 ? 5.0 : 0;
}

function calculateSkillBalance(matches: Match[], players: Player[]): number {
  if (matches.length === 0) return 0;
  
  let totalSkillDifference = 0;
  
  matches.forEach(match => {
    const teamASkill = match.teamA.reduce((sum, id) => {
      const player = players.find(p => p.id === id);
      return sum + (player?.skill || 0);
    }, 0);
    
    const teamBSkill = match.teamB.reduce((sum, id) => {
      const player = players.find(p => p.id === id);
      return sum + (player?.skill || 0);
    }, 0);
    
    totalSkillDifference += Math.abs(teamASkill - teamBSkill);
  });
  
  const averageSkillDifference = totalSkillDifference / matches.length;
  
  // Return a score where lower difference = higher score
  return Math.max(0, 10 - averageSkillDifference);
}
