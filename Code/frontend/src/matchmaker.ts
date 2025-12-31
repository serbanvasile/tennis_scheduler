import { Player, Match, PlayerStats, Availability, FairnessMetrics, EventMatch, MatchPlayer, CourtLayout } from './types';

// Extended stats for internal algorithm use
// Extended stats for internal algorithm use
interface InternalPlayerStats extends Omit<PlayerStats, 'playerId'> {
  playerId: string | number;
  seasonId?: string;
  partners: Record<string, number>;
  opponents: Record<string, number>;
  courtExposure: Record<string, number>;
  averageSkillDiff?: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  sitOuts: number;
}


// Simple ID generator (you'd use a proper UUID library in production)
export const id = () => Math.random().toString(36).substr(2, 9);

// Legacy functions for backward compatibility
export function greedyPairs(players: Player[]): string[][] {
  const s = [...players].sort((a, b) => (a.skill || 0) - (b.skill || 0));
  const out: string[][] = [];
  for (let i = 0; i + 1 < s.length; i += 2) out.push([String(s[i].member_id), String(s[i + 1].member_id)]);
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
  playerStats: Record<string, InternalPlayerStats>,
  previousMatches: Match[],
  courtCount: number,
  courtLayouts: any[] // was timeSlots
): {
  matches: Match[];
  sitouts: (string | number)[];
  fairnessScore: number;
} {
  const numPlayers = availablePlayers.length;
  const slotsPerCourt = courtLayouts.length;
  const totalSlots = courtCount * slotsPerCourt;
  const playersPerMatch = 4;
  const playersInMatches = Math.floor(numPlayers / playersPerMatch) * playersPerMatch;
  const sitouts = availablePlayers.slice(playersInMatches).map(p => p.member_id);

  // Get players who will play this week
  const playingPlayers = availablePlayers.slice(0, playersInMatches);

  // Generate all possible team combinations
  const teams = generateTeamCombinations(playingPlayers);

  // Generate all possible match pairings from teams
  const possibleMatches = generateMatchCombinations(teams, courtCount, courtLayouts);

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
  timeSlots: any[]
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
      combinedSkill: (team.playerA.skill || 0) + (team.playerB.skill || 0)
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
      const allPlayers = [teamA.playerA.member_id, teamA.playerB.member_id, teamB.playerA.member_id, teamB.playerB.member_id];
      if (allPlayers.some(id => usedPlayers.has(String(id)))) {
        continue;
      }

      // Create match
      matches.push({
        id: `m${id()}`,
        weekId: 'current',
        courtId: `c${courtIndex + 1}`,
        timeSlot: timeSlots[timeIndex],
        teamA: [String(teamA.playerA.member_id), String(teamA.playerB.member_id)],
        teamB: [String(teamB.playerA.member_id), String(teamB.playerB.member_id)],
        generatedBy: 'skill-optimizer'
      });

      // Mark players as used
      allPlayers.forEach(playerId => usedPlayers.add(String(playerId)));

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
  playerStats: Record<string, InternalPlayerStats>,
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
  playerStats: Record<string, InternalPlayerStats>
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
      const player = players.find(p => String(p.member_id) === id);
      return sum + (player?.skill || 0);
    }, 0);

    const teamBSkill = match.teamB.reduce((sum, id) => {
      const player = players.find(p => String(p.member_id) === id);
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
): InternalPlayerStats {
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
    gamesPlayed: playerMatches.length,
    wins: 0, // TODO: calculate from scores
    losses: 0, // TODO: calculate from scores
    partners,
    opponents,
    courtExposure,
    sitOuts: 0, // TODO: calculate sitout weeks
    averageSkillDiff: 0 // TODO: calculate average skill difference
  };
}

// Calculate fairness metrics for the league
export function calculateFairnessMetrics(
  matches: Match[],
  players: Player[],
  playerStats: Record<string, InternalPlayerStats>,
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
    partnerVariety: calculateDiversity(playerStats, 'partners'),
    opponentVariety: calculateDiversity(playerStats, 'opponents'),
    courtDistribution: courtBalance
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
  playerStats: Record<string, InternalPlayerStats>,
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
      const player = players.find(p => String(p.member_id) === id);
      return sum + (player?.skill || 0);
    }, 0);

    const teamBSkill = match.teamB.reduce((sum, id) => {
      const player = players.find(p => String(p.member_id) === id);
      return sum + (player?.skill || 0);
    }, 0);

    totalSkillDifference += Math.abs(teamASkill - teamBSkill);
  });

  const averageSkillDifference = totalSkillDifference / matches.length;

  // Return a score where lower difference = higher score
  return Math.max(0, 10 - averageSkillDifference);
}

// ==========================================
// NEW AUTO-MATCH LOGIC (v5)
// ==========================================

export interface AutoMatchPlayer {
  member_id: string | number;
  first_name: string;
  last_name: string;
  display_name: string;
  skillLevel?: string;
  contractShare?: number;
  shareType?: string; // 'P' (percentage) or 'F' (fixed)
  teamId?: string | number;
}

/**
 * Generates matches automatically based on contract share, skill, and team affiliation.
 * 
 * Algorithm:
 * 1. Identify empty slots in the provided matches.
 * 2. Check if we have multiple teams - if so, separate players by team for inter-team competition.
 * 3. Sort eligible players by skill (descending), then contract share (descending) for tiebreaking.
 * 4. Fill slots ensuring players from different teams face each other when possible.
 * 5. Balance skills within each match.
 */
export function generateAutoMatches(
  eligiblePlayers: AutoMatchPlayer[],
  currentMatches: EventMatch[],
  courtLayout: CourtLayout
): EventMatch[] {
  // Deep copy matches to avoid mutating state directly
  const updatedMatches = JSON.parse(JSON.stringify(currentMatches));

  // Get position IDs for each side
  const positionsA = courtLayout.positions.filter(p => p.team_side === 'A');
  const positionsB = courtLayout.positions.filter(p => p.team_side === 'B');
  const slotsPerSide = Math.max(positionsA.length, positionsB.length);

  // Helper to parse skill level to number
  const getSkillValue = (player: AutoMatchPlayer): number => {
    const val = parseFloat(player.skillLevel || '0');
    return isNaN(val) ? 0 : val;
  };

  // Check if we have multiple teams
  const uniqueTeamIds = [...new Set(eligiblePlayers.map(p => String(p.teamId || 'none')))].filter(t => t !== 'none');
  const hasMultipleTeams = uniqueTeamIds.length > 1;

  if (hasMultipleTeams) {
    // INTER-TEAM MODE: Each match has one team on Team A side, another team on Team B side
    // All players on the same side of a court must be from the same team

    // Track which players have been assigned globally
    const assignedPlayerIds = new Set<string>();

    // Group players by team (each player only in one team - first match wins)
    const playersByTeam: Record<string, AutoMatchPlayer[]> = {};

    for (const player of eligiblePlayers) {
      const playerId = String(player.member_id);
      if (assignedPlayerIds.has(playerId)) continue;

      const teamKey = String(player.teamId || 'none');
      if (teamKey === 'none') continue;

      if (!playersByTeam[teamKey]) {
        playersByTeam[teamKey] = [];
      }
      playersByTeam[teamKey].push(player);
      assignedPlayerIds.add(playerId);
    }

    // Shuffle each team's players for variety
    for (const teamKey of Object.keys(playersByTeam)) {
      playersByTeam[teamKey].sort(() => Math.random() - 0.5);
    }

    // Create team pairings for matches (round-robin style)
    const teamIds = Object.keys(playersByTeam);
    const teamPairings: [string, string][] = [];

    // Generate all possible team-vs-team pairings
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        teamPairings.push([teamIds[i], teamIds[j]]);
      }
    }

    // Shuffle pairings for variety
    teamPairings.sort(() => Math.random() - 0.5);

    // Track usage index for each team's player pool
    const teamPlayerIndex: Record<string, number> = {};
    for (const teamKey of teamIds) {
      teamPlayerIndex[teamKey] = 0;
    }

    let pairingIndex = 0;

    // Fill matches
    for (const match of updatedMatches) {
      if (!match.team_a_players) match.team_a_players = [];
      if (!match.team_b_players) match.team_b_players = [];

      // Get next team pairing (cycle through pairings)
      const [teamAId, teamBId] = teamPairings[pairingIndex % teamPairings.length];
      pairingIndex++;

      const teamAPlayers = playersByTeam[teamAId] || [];
      const teamBPlayers = playersByTeam[teamBId] || [];

      // Fill Team A positions with players from teamAId
      for (let slot = 0; slot < positionsA.length; slot++) {
        const playerIdx = teamPlayerIndex[teamAId];
        if (playerIdx < teamAPlayers.length) {
          const player = teamAPlayers[playerIdx];
          teamPlayerIndex[teamAId]++;

          const slotId = positionsA[slot]?.id;
          match.team_a_players.push({
            member_id: player.member_id,
            team_side: 'A',
            position_slot: slotId,
            first_name: player.first_name,
            last_name: player.last_name,
            display_name: player.display_name,
            skill_name: player.skillLevel,
          });
        }
      }

      // Fill Team B positions with players from teamBId
      for (let slot = 0; slot < positionsB.length; slot++) {
        const playerIdx = teamPlayerIndex[teamBId];
        if (playerIdx < teamBPlayers.length) {
          const player = teamBPlayers[playerIdx];
          teamPlayerIndex[teamBId]++;

          const slotId = positionsB[slot]?.id;
          match.team_b_players.push({
            member_id: player.member_id,
            team_side: 'B',
            position_slot: slotId,
            first_name: player.first_name,
            last_name: player.last_name,
            display_name: player.display_name,
            skill_name: player.skillLevel,
          });
        }
      }
    }

    return updatedMatches;
  }

  // INTRA-TEAM MODE (original algorithm): Skill-balanced pairing when all players from same team
  // Sort players by skill descending, then by share descending (for tiebreaking)
  const sortedBySkill = [...eligiblePlayers].sort((a, b) => {
    const skillDiff = getSkillValue(b) - getSkillValue(a);
    if (skillDiff !== 0) return skillDiff;
    return (b.contractShare || 0) - (a.contractShare || 0);
  });

  // Create player pool
  const availablePlayers = [...sortedBySkill];

  for (const match of updatedMatches) {
    if (!match.team_a_players) match.team_a_players = [];
    if (!match.team_b_players) match.team_b_players = [];

    // Fill both teams for this match using skill-balanced pairing
    for (let slot = 0; slot < slotsPerSide && availablePlayers.length >= 2; slot++) {
      // Get current team averages
      const avgA = match.team_a_players.length > 0
        ? match.team_a_players.reduce((sum: number, p: MatchPlayer) => sum + getSkillValue({ skillLevel: p.skill_name } as AutoMatchPlayer), 0) / match.team_a_players.length
        : 0;
      const avgB = match.team_b_players.length > 0
        ? match.team_b_players.reduce((sum: number, p: MatchPlayer) => sum + getSkillValue({ skillLevel: p.skill_name } as AutoMatchPlayer), 0) / match.team_b_players.length
        : 0;

      // Pick a random player from the pool (not just the first)
      const randomIdx = Math.floor(Math.random() * availablePlayers.length);
      const player1 = availablePlayers.splice(randomIdx, 1)[0];
      if (!player1) break;

      // Find all partners where skill difference would be ≤ 0.5
      const MAX_SKILL_DIFF = 0.5;
      const validCandidates: { idx: number; diff: number }[] = [];
      let bestPartnerIdx = 0;
      let bestDiff = Infinity;

      for (let i = 0; i < availablePlayers.length; i++) {
        const potentialPartner = availablePlayers[i];
        const skill1 = getSkillValue(player1);
        const skill2 = getSkillValue(potentialPartner);

        // Simulate adding to teams and check difference
        const newAvgA = match.team_a_players.length > 0
          ? ((avgA * match.team_a_players.length) + skill1) / (match.team_a_players.length + 1)
          : skill1;
        const newAvgB = match.team_b_players.length > 0
          ? ((avgB * match.team_b_players.length) + skill2) / (match.team_b_players.length + 1)
          : skill2;
        const diff = Math.abs(newAvgA - newAvgB);

        // Track all valid candidates
        if (diff <= MAX_SKILL_DIFF) {
          validCandidates.push({ idx: i, diff });
        }

        // Also track absolute best for fallback
        if (diff < bestDiff) {
          bestDiff = diff;
          bestPartnerIdx = i;
        }
      }

      // Pick randomly from valid candidates, or fallback to best
      let chosenIdx: number;
      if (validCandidates.length > 0) {
        const randomCandidate = validCandidates[Math.floor(Math.random() * validCandidates.length)];
        chosenIdx = randomCandidate.idx;
      } else {
        chosenIdx = bestPartnerIdx;
      }

      const player2 = availablePlayers.length > 0 ? availablePlayers.splice(chosenIdx, 1)[0] : null;

      // Assign to Team A
      if (match.team_a_players.length < positionsA.length) {
        const slotId = positionsA[match.team_a_players.length]?.id;
        match.team_a_players.push({
          member_id: player1.member_id,
          team_side: 'A',
          position_slot: slotId,
          first_name: player1.first_name,
          last_name: player1.last_name,
          display_name: player1.display_name,
          skill_name: player1.skillLevel,
        });
      }

      // Assign to Team B
      if (player2 && match.team_b_players.length < positionsB.length) {
        const slotId = positionsB[match.team_b_players.length]?.id;
        match.team_b_players.push({
          member_id: player2.member_id,
          team_side: 'B',
          position_slot: slotId,
          first_name: player2.first_name,
          last_name: player2.last_name,
          display_name: player2.display_name,
          skill_name: player2.skillLevel,
        });
      }
    }
  }

  return updatedMatches;
}
