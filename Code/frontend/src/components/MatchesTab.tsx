import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    Modal,
    SafeAreaView,
} from 'react-native';
// Use the correct UI theme with full color palette
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { generateAutoMatches, AutoMatchPlayer } from '../matchmaker';
import { Member, EventMatch, MatchPlayer, CourtLayout, CourtPosition, Sport } from '../types';
import { databaseService } from '../database/sqlite-service';
import { SearchWithChips } from './SearchWithChips';

// Court layout positions for different sports
const TENNIS_DOUBLES_LAYOUT: CourtLayout = {
    sport_id: 'tennis',
    name: 'Tennis Doubles',
    positions: [
        { id: 'a_deuce', label: '', x: 25, y: 25, team_side: 'A' },
        { id: 'a_ad', label: '', x: 25, y: 75, team_side: 'A' },
        { id: 'b_deuce', label: '', x: 75, y: 25, team_side: 'B' },
        { id: 'b_ad', label: '', x: 75, y: 75, team_side: 'B' },
    ],
};

const TENNIS_SINGLES_LAYOUT: CourtLayout = {
    sport_id: 'tennis',
    name: 'Tennis Singles',
    positions: [
        { id: 'a_center', label: '', x: 25, y: 50, team_side: 'A' },
        { id: 'b_center', label: '', x: 75, y: 50, team_side: 'B' },
    ],
};

const PICKLEBALL_DOUBLES_LAYOUT: CourtLayout = {
    sport_id: 'pickleball',
    name: 'Pickleball Doubles',
    positions: [
        { id: 'a_left', label: '', x: 25, y: 30, team_side: 'A' },
        { id: 'a_right', label: '', x: 25, y: 70, team_side: 'A' },
        { id: 'b_left', label: '', x: 75, y: 30, team_side: 'B' },
        { id: 'b_right', label: '', x: 75, y: 70, team_side: 'B' },
    ],
};

const GENERIC_FIELD_LAYOUT: CourtLayout = {
    sport_id: 'generic',
    name: 'Field',
    positions: [
        { id: 'a_pos1', label: '1', x: 20, y: 30, team_side: 'A' },
        { id: 'a_pos2', label: '2', x: 20, y: 50, team_side: 'A' },
        { id: 'a_pos3', label: '3', x: 20, y: 70, team_side: 'A' },
        { id: 'b_pos1', label: '1', x: 80, y: 30, team_side: 'B' },
        { id: 'b_pos2', label: '2', x: 80, y: 50, team_side: 'B' },
        { id: 'b_pos3', label: '3', x: 80, y: 70, team_side: 'B' },
    ],
};

interface Court {
    court_id: number | string;
    name: string;
    venueName?: string;
}

interface Field {
    field_id: number | string;
    name: string;
    venueName?: string;
}

interface EligiblePlayer extends Member {
    teamName?: string;
    teamId?: number | string;
    skillLevel?: string;
    contractShare?: number;
    shareType?: string;
    isReserve?: boolean;
}

interface MatchesTabProps {
    eventId: number | string | null;
    courtIds: (number | string)[];
    fieldIds: (number | string)[];
    memberIds: (number | string)[];
    teamIds: (number | string)[];
    isSeriesEvent: boolean;
    matchTypeIds: (number | string)[];
    members: Member[];
    teams: any[];
    sports?: Sport[];
    availableCourts: Court[];
    availableFields?: Field[];
    matchTypes: any[];
    onMatchesChange?: (matches: EventMatch[]) => void;
    // Filter props for eligibility
    ageGroupIds?: (number | string)[];
    genderIds?: (number | string)[];
    levelIds?: (number | string)[];
    genders?: any[];
}

interface ActiveSlot {
    matchId: number | string;
    teamSide: 'A' | 'B';
    positionSlot: string;
    currentPlayer?: MatchPlayer;
    title: string;
}

export function MatchesTab({
    eventId,
    courtIds,
    fieldIds,
    memberIds,
    teamIds,
    isSeriesEvent,
    matchTypeIds,
    members,
    teams,
    matchTypes,
    availableCourts,
    sports = [],
    availableFields = [],
    onMatchesChange,
    ageGroupIds = [],
    genderIds = [],
    levelIds = [],
    genders = [],
}: MatchesTabProps) {
    const { theme } = useTheme();
    const [matches, setMatches] = useState<EventMatch[]>([]);
    const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
    const [searchChips, setSearchChips] = useState<string[]>([]);
    const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('AND');

    // Get appropriate court layout based on match type
    const getLayout = useCallback((): CourtLayout => {
        // Get the selected match type
        const matchType = matchTypes.find(mt => matchTypeIds.includes(mt.match_type_id));
        const matchTypeName = matchType?.name?.toLowerCase() || '';

        // Check for racquet sport types based on match type name
        if (matchTypeName.includes('singles')) {
            return TENNIS_SINGLES_LAYOUT;
        }
        if (matchTypeName.includes('doubles')) {
            return TENNIS_DOUBLES_LAYOUT;
        }
        // Also check for tennis/pickleball/racquet in the name
        if (matchTypeName.includes('tennis') || matchTypeName.includes('pickleball') || matchTypeName.includes('racquet')) {
            return TENNIS_DOUBLES_LAYOUT;
        }

        return GENERIC_FIELD_LAYOUT;
    }, [matchTypes, matchTypeIds]);

    const layout = getLayout();
    const isRacquetSport = layout.sport_id === 'tennis' || layout.sport_id === 'pickleball' || layout.name.includes('Tennis') || layout.name.includes('Pickleball');

    // Build eligible players list with same filtering as Participants tab
    useEffect(() => {
        const eligible: EligiblePlayer[] = [];
        const safeTeamIds = teamIds.map(String);

        // Get the selected match type names for position filtering
        const selectedMatchTypes = matchTypes.filter(mt => matchTypeIds.includes(mt.match_type_id));
        const matchTypeNames = selectedMatchTypes.map((mt: any) => mt.name.toLowerCase());

        // Filter function matching CalendarScreen Participants tab logic
        const filterMember = (m: Member): boolean => {
            const memberTeams = (m as any).teams || [];

            // 1. Must belong to selected teams
            const inTeam = teamIds.some(teamId =>
                memberTeams.some((t: any) => String(t.team_id) === String(teamId))
            );
            if (!inTeam) return false;

            // 2. Filter by Gender Category
            if (genderIds.length > 0) {
                const memberGenderCats = (m as any).gender_category_ids || [];
                const hasGender = genderIds.some(id => memberGenderCats.includes(id));
                const legacyMatch = genderIds.some(id => {
                    const genderName = genders.find((g: any) => g.gender_id === id)?.name?.toLowerCase();
                    return genderName && (
                        (genderName === 'male' && m.gender === 'M') ||
                        (genderName === 'female' && m.gender === 'F')
                    );
                });
                if (!hasGender && !legacyMatch) return false;
            }

            // 3. Filter by Age Group
            if (ageGroupIds.length > 0) {
                const memberAgeGroups = (m as any).age_group_ids || [];
                const hasAgeGroup = ageGroupIds.some(id => memberAgeGroups.includes(id));
                if (!hasAgeGroup) return false;
            }

            // 4. Filter by Level
            if (levelIds.length > 0) {
                const hasLevel = levelIds.some(levelId =>
                    memberTeams.some((t: any) =>
                        teamIds.includes(t.team_id) && t.level_id === levelId
                    )
                );
                if (!hasLevel) return false;
            }

            // 5. Filter by Match Type (mapped to Positions)
            if (matchTypeIds.length > 0) {
                const hasPositionMatch = memberTeams.some((t: any) =>
                    teamIds.some(tid => String(t.team_id) === String(tid)) &&
                    (t.positions || []).some((pos: any) => matchTypeNames.includes(pos.name.toLowerCase()))
                );
                if (!hasPositionMatch) return false;
            }

            return true;
        };

        // Determine which members to consider
        // If no specific players selected, filter ALL members using same criteria as Participants tab
        let candidateMemberIds: (number | string)[] = memberIds;

        if (memberIds.length === 0 && teamIds.length > 0) {
            // Apply same filtering as CalendarScreen Participants tab
            candidateMemberIds = members.filter(filterMember).map(m => m.member_id);
        }

        candidateMemberIds.forEach(memberId => {
            const member = members.find(m => String(m.member_id) === String(memberId));
            if (!member) return;

            // Get team info for this member
            const memberTeams = (member as any).teams || [];
            const relevantTeam = memberTeams.find((t: any) => safeTeamIds.includes(String(t.team_id)));

            // Check if member is a reserve (based on role_names)
            const roleNames = (relevantTeam?.role_names || '').toLowerCase();
            const isReserve = roleNames.includes('reserve');

            eligible.push({
                ...member,
                teamName: relevantTeam?.team_name || teams.find(t => String(t.team_id) === String(relevantTeam?.team_id))?.name,
                teamId: relevantTeam?.team_id,
                skillLevel: relevantTeam?.skill_name || relevantTeam?.level_name || (member as any).skill_name,
                contractShare: relevantTeam?.share ?? (member as any).share,
                shareType: relevantTeam?.share_type ?? (member as any).share_type,
                isReserve,
            });
        });

        setEligiblePlayers(eligible);
    }, [memberIds, members, teamIds, teams, matchTypes, matchTypeIds, ageGroupIds, genderIds, levelIds, genders]);

    // Initialize/Sync Matches
    useEffect(() => {
        setMatches(currentMatches => {
            const newMatches = [...currentMatches];
            const existingCourtIds = new Set(newMatches.filter(m => m.court_id).map(m => m.court_id));
            const existingFieldIds = new Set(newMatches.filter(m => m.field_id).map(m => m.field_id));
            let matchesChanged = false;

            // Add new courts
            courtIds.forEach((courtId, index) => {
                if (!existingCourtIds.has(courtId)) {
                    newMatches.push({
                        match_id: `court_${courtId}`,
                        event_id: eventId || 'new',
                        court_id: courtId,
                        status: 'scheduled',
                        team_a_players: [],
                        team_b_players: [],
                        match_order: index + 1,
                    });
                    matchesChanged = true;
                }
            });

            // Add new fields
            fieldIds.forEach((fieldId, index) => {
                if (!existingFieldIds.has(fieldId)) {
                    newMatches.push({
                        match_id: `field_${fieldId}`,
                        event_id: eventId || 'new',
                        field_id: fieldId,
                        status: 'scheduled',
                        team_a_players: [],
                        team_b_players: [],
                        match_order: courtIds.length + index + 1,
                    });
                    matchesChanged = true;
                }
            });

            // Remove unused
            const filtered = newMatches.filter(m => {
                if (m.court_id) return courtIds.includes(m.court_id);
                if (m.field_id) return fieldIds.includes(m.field_id);
                return false;
            });

            if (filtered.length !== newMatches.length) matchesChanged = true;

            return matchesChanged ? filtered : currentMatches;
        });
    }, [courtIds.join(','), fieldIds.join(','), eventId]);

    // Load matches from DB
    useEffect(() => {
        if (!eventId) return;
        const loadMatches = async () => {
            setLoading(true);
            try {
                const savedMatches = await databaseService.getEventMatches(eventId);
                if (savedMatches.length > 0) {
                    setMatches(savedMatches);
                }
            } catch (error) {
                console.error('Failed to load matches:', error);
            } finally {
                setLoading(false);
            }
        };
        loadMatches();
    }, [eventId]);

    // Notify parent
    useEffect(() => {
        if (onMatchesChange && matches.length > 0) {
            onMatchesChange(matches);
        }
    }, [matches, onMatchesChange]);

    const getAssignedPlayerIds = useCallback(() => {
        const ids = new Set<string | number>();
        matches.forEach(match => {
            match.team_a_players?.forEach(p => ids.add(p.member_id));
            match.team_b_players?.forEach(p => ids.add(p.member_id));
        });
        return ids;
    }, [matches]);

    const assignPlayer = useCallback((
        matchId: number | string,
        player: EligiblePlayer,
        teamSide: 'A' | 'B',
        positionSlot: string
    ) => {
        setMatches(prev => prev.map(match => {
            if (match.match_id !== matchId) return match;

            const matchPlayer: MatchPlayer = {
                member_id: player.member_id,
                team_side: teamSide,
                position_slot: positionSlot,
                first_name: player.first_name,
                last_name: player.last_name,
                display_name: player.display_name,
                skill_name: player.skillLevel,
            };

            const teamProp = teamSide === 'A' ? 'team_a_players' : 'team_b_players';
            const currentTeam = match[teamProp] || [];

            // Remove existing player at this slot if any (though UI prevents this mostly)
            const filteredTeam = currentTeam.filter(p => p.position_slot !== positionSlot);

            return {
                ...match,
                [teamProp]: [...filteredTeam, matchPlayer],
            };
        }));
        setActiveSlot(null);
    }, []);

    const removePlayer = useCallback((matchId: number | string, memberId: number | string) => {
        setMatches(prev => prev.map(match => {
            if (match.match_id !== matchId) return match;
            return {
                ...match,
                team_a_players: match.team_a_players?.filter(p => p.member_id !== memberId) || [],
                team_b_players: match.team_b_players?.filter(p => p.member_id !== memberId) || [],
            };
        }));
        setActiveSlot(null);
    }, []);

    const calculateSkillAverage = useCallback((players: MatchPlayer[]) => {
        if (!players || players.length === 0) return null;

        const skills = players.map(p => {
            let skillVal = p.skill_name;
            // Robust lookup for existing matches that might lack skill data
            if (!skillVal) {
                const rich = eligiblePlayers.find(ep => String(ep.member_id) === String(p.member_id));
                skillVal = rich?.skillLevel;
            }
            const num = parseFloat(skillVal || '0');
            return isNaN(num) ? 0 : num;
        });

        const validSkills = skills.filter(s => s > 0);
        if (validSkills.length === 0) return null;

        const avg = validSkills.reduce((a, b) => a + b, 0) / validSkills.length;
        return avg.toFixed(1);
    }, [eligiblePlayers]);

    const handleAutoMatch = useCallback(async () => {
        // Filter out reserves - they should not participate in Auto-Draw
        const nonReservePlayers = eligiblePlayers.filter(p => !p.isReserve);

        if (nonReservePlayers.length === 0) {
            Alert.alert('No Players', 'No eligible non-reserve players to assign.');
            return;
        }

        // Shuffle players for variety on each click
        const shuffledPlayers = [...nonReservePlayers].sort(() => Math.random() - 0.5);

        const autoMatchPlayers: AutoMatchPlayer[] = shuffledPlayers.map(p => ({
            member_id: p.member_id,
            first_name: p.first_name,
            last_name: p.last_name,
            display_name: p.display_name,
            skillLevel: p.skillLevel,
            contractShare: p.contractShare,
            shareType: p.shareType,
            teamId: p.teamId
        }));

        try {
            // Clear existing assignments first by resetting team_a_players and team_b_players
            const clearedMatches = matches.map(m => ({
                ...m,
                team_a_players: [],
                team_b_players: [],
            }));
            const updatedMatches = generateAutoMatches(autoMatchPlayers, clearedMatches, layout);
            setMatches(updatedMatches);
        } catch (error) {
            console.error("Auto-match failed", error);
            Alert.alert('Error', 'Failed to generate matches automatically.');
        }
    }, [eligiblePlayers, matches, layout]);


    // Filter players for Modal
    const filteredModalPlayers = useMemo(() => {
        let players = eligiblePlayers;

        const allAssignedIds = getAssignedPlayerIds();
        players = players.filter(p =>
            !allAssignedIds.has(p.member_id) ||
            (activeSlot?.currentPlayer?.member_id === p.member_id)
        );

        if (searchChips.length > 0) {
            if (searchMode === 'AND') {
                players = players.filter(p => {
                    const fullName = `${p.first_name} ${p.last_name} ${p.display_name || ''} ${p.teamName || ''}`.toLowerCase();
                    return searchChips.every(chip => fullName.includes(chip.toLowerCase()));
                });
            } else {
                players = players.filter(p => {
                    const fullName = `${p.first_name} ${p.last_name} ${p.display_name || ''} ${p.teamName || ''}`.toLowerCase();
                    return searchChips.some(chip => fullName.includes(chip.toLowerCase()));
                });
            }
        }
        // Sort alphabetically by first name, then last name
        players.sort((a, b) => {
            const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
            const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        return players;
    }, [eligiblePlayers, getAssignedPlayerIds, activeSlot, searchChips, searchMode]);

    // Grouping for Modal
    const groupedModalPlayers = useMemo(() => {
        return filteredModalPlayers.reduce((acc, player) => {
            const teamName = player.teamName || 'Unassigned';
            if (!acc[teamName]) acc[teamName] = [];
            acc[teamName].push(player);
            return acc;
        }, {} as Record<string, EligiblePlayer[]>);
    }, [filteredModalPlayers]);


    const renderCourtCard = (match: EventMatch) => {
        const courtName = match.court_name || availableCourts.find(c => String(c.court_id) === String(match.court_id))?.name;
        const fieldName = match.field_name || availableFields.find(f => String(f.field_id) === String(match.field_id))?.name;
        const resourceName = courtName || fieldName || 'Court';
        const teamAAvg = calculateSkillAverage(match.team_a_players || []);
        const teamBAvg = calculateSkillAverage(match.team_b_players || []);

        return (
            <View key={match.match_id} style={[styles.courtCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={[styles.courtHeader, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.courtTitle, { color: theme.colors.text }]}>{resourceName}</Text>
                    <View style={styles.courtHeaderMeta}>
                        {/* Could put match status here */}
                    </View>
                </View>

                <View style={styles.courtLayout}>
                    {/* Team A */}
                    <View style={[styles.teamSide, { borderRightColor: theme.colors.border }]}>
                        <View style={styles.teamHeader}>
                            <Text style={[styles.teamLabel, { color: theme.colors.primary }]}>Team A</Text>
                            {teamAAvg && (
                                <View style={[styles.pill, { backgroundColor: `${String(theme.colors.primary)}20` }]}>
                                    <Text style={[styles.skillAvg, { color: theme.colors.primary, fontWeight: 'bold' }]}>Skill Avg: {teamAAvg}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.positionsContainer}>
                            {layout.positions.filter(p => p.team_side === 'A').map(pos => {
                                const player = match.team_a_players?.find(p => p.position_slot === pos.id);
                                // Find rich player data with safe string comparison
                                const richPlayer = player ? eligiblePlayers.find(ep => String(ep.member_id) === String(player.member_id)) : null;
                                // Display skill priority: Match data -> Rich data fallback
                                const displaySkill = player?.skill_name || richPlayer?.skillLevel;

                                return (
                                    <TouchableOpacity
                                        key={pos.id}
                                        style={[
                                            styles.positionSlot,
                                            {
                                                borderColor: player ? theme.colors.primary : theme.colors.border,
                                                backgroundColor: player ? `${String(theme.colors.primary)}10` : 'transparent',
                                                borderStyle: player ? 'solid' : 'dashed'
                                            }
                                        ]}
                                        onPress={() => {
                                            setSearchChips([]); // Reset search
                                            setActiveSlot({
                                                matchId: match.match_id,
                                                teamSide: 'A',
                                                positionSlot: pos.id,
                                                currentPlayer: player,
                                                title: `Team A - ${resourceName}`
                                            });
                                        }}
                                    >
                                        {player ? (
                                            <View style={[styles.playerInfo, { alignItems: 'center' }]}>
                                                <Text style={[styles.playerName, { color: theme.colors.text, textAlign: 'center' }]}>
                                                    {richPlayer?.display_name || richPlayer ? `${richPlayer?.first_name} ${richPlayer?.last_name}` : player.display_name}
                                                </Text>
                                                <View style={styles.playerBadges}>
                                                    {displaySkill && (
                                                        <View style={[styles.pill, { backgroundColor: `${String(theme.colors.primary)}20`, marginRight: 4 }]}>
                                                            <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '500' }}>Skill: {displaySkill}</Text>
                                                        </View>
                                                    )}
                                                    {richPlayer?.contractShare !== undefined && (
                                                        <View style={[styles.pill, { backgroundColor: `${String(theme.colors.primary)}20` }]}>
                                                            <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '500' }}>
                                                                Share: {richPlayer.contractShare}%
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ) : (
                                            <Text style={[styles.emptySlotText, { color: theme.colors.muted }]}>Assign Player</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Team B */}
                    <View style={styles.teamSide}>
                        <View style={styles.teamHeader}>
                            <Text style={[styles.teamLabel, { color: theme.colors.error }]}>Team B</Text>
                            {teamBAvg && (
                                <View style={[styles.pill, { backgroundColor: `${String(theme.colors.error)}20` }]}>
                                    <Text style={[styles.skillAvg, { color: theme.colors.error, fontWeight: 'bold' }]}>Skill Avg: {teamBAvg}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.positionsContainer}>
                            {layout.positions.filter(p => p.team_side === 'B').map(pos => {
                                const player = match.team_b_players?.find(p => p.position_slot === pos.id);
                                // Find rich player data
                                const richPlayer = player ? eligiblePlayers.find(ep => String(ep.member_id) === String(player.member_id)) : null;
                                const displaySkill = player?.skill_name || richPlayer?.skillLevel;

                                return (
                                    <TouchableOpacity
                                        key={pos.id}
                                        style={[
                                            styles.positionSlot,
                                            {
                                                borderColor: player ? theme.colors.error : theme.colors.border,
                                                backgroundColor: player ? `${String(theme.colors.error)}10` : 'transparent',
                                                borderStyle: player ? 'solid' : 'dashed'
                                            }
                                        ]}
                                        onPress={() => {
                                            setSearchChips([]); // Reset search
                                            setActiveSlot({
                                                matchId: match.match_id,
                                                teamSide: 'B',
                                                positionSlot: pos.id,
                                                currentPlayer: player,
                                                title: `Team B - ${resourceName}`
                                            });
                                        }}
                                    >
                                        {player ? (
                                            <View style={[styles.playerInfo, { alignItems: 'center' }]}>
                                                <Text style={[styles.playerName, { color: theme.colors.text, textAlign: 'center' }]}>
                                                    {richPlayer?.display_name || richPlayer ? `${richPlayer?.first_name} ${richPlayer?.last_name}` : player.display_name}
                                                </Text>
                                                <View style={styles.playerBadges}>
                                                    {displaySkill && (
                                                        <View style={[styles.pill, { backgroundColor: `${String(theme.colors.error)}20`, marginRight: 4 }]}>
                                                            <Text style={{ color: theme.colors.error, fontSize: 10, fontWeight: '500' }}>Skill: {displaySkill}</Text>
                                                        </View>
                                                    )}
                                                    {richPlayer?.contractShare !== undefined && (
                                                        <View style={[styles.pill, { backgroundColor: `${String(theme.colors.error)}20` }]}>
                                                            <Text style={{ color: theme.colors.error, fontSize: 10, fontWeight: '500' }}>
                                                                Share: {richPlayer.contractShare}%
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ) : (
                                            <Text style={[styles.emptySlotText, { color: theme.colors.muted }]}>Assign Player</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (courtIds.length === 0 && fieldIds.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.muted }}>Please select courts or fields in the Venues tab first.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.actionBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.statsText, { color: theme.colors.text }]}>
                    {unassignedPlayersCount(eligiblePlayers, matches)} Players Unassigned
                </Text>
                <TouchableOpacity
                    style={[styles.autoMatchButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleAutoMatch}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Auto-Draw</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {[...matches].sort((a, b) => {
                    const nameA = (a.court_name || availableCourts.find(c => String(c.court_id) === String(a.court_id))?.name ||
                        a.field_name || availableFields.find(f => String(f.field_id) === String(a.field_id))?.name || '').toLowerCase();
                    const nameB = (b.court_name || availableCourts.find(c => String(c.court_id) === String(b.court_id))?.name ||
                        b.field_name || availableFields.find(f => String(f.field_id) === String(b.field_id))?.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                }).map(renderCourtCard)}
            </ScrollView>

            <Modal
                transparent={true}
                visible={!!activeSlot}
                animationType="slide"
                onRequestClose={() => setActiveSlot(null)}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={[styles.modalContentContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                            <TouchableOpacity onPress={() => setActiveSlot(null)} style={styles.closeButton}>
                                <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{activeSlot?.title}</Text>
                            <View style={{ width: 60 }} />
                        </View>

                        <View style={styles.modalBody}>
                            <SearchWithChips
                                chips={searchChips}
                                onChipsChange={setSearchChips}
                                placeholder="Search players..."
                                mode={searchMode}
                                onModeChange={setSearchMode}
                                resultCount={filteredModalPlayers.length}
                                totalCount={eligiblePlayers.length}
                                topSpacing={true}
                            />

                            {activeSlot?.currentPlayer && (
                                <TouchableOpacity
                                    style={[styles.clearButton, { backgroundColor: `${String(theme.colors.error)}20`, borderColor: theme.colors.error }]}
                                    onPress={() => removePlayer(activeSlot.matchId, activeSlot.currentPlayer!.member_id)}
                                >
                                    <Text style={{ color: theme.colors.error, fontWeight: '600' }}>Remove {activeSlot.currentPlayer.first_name}</Text>
                                </TouchableOpacity>
                            )}

                            <ScrollView style={styles.modalList}>
                                {Object.entries(groupedModalPlayers).map(([teamName, players]) => (
                                    <View key={teamName} style={styles.modalGroup}>
                                        <Text style={[styles.modalGroupTitle, { color: theme.colors.muted }]}>{teamName}</Text>
                                        {players.map(player => (
                                            <TouchableOpacity
                                                key={player.member_id}
                                                style={[styles.modalPlayerRow, { borderBottomColor: theme.colors.border }]}
                                                onPress={() => assignPlayer(activeSlot!.matchId, player, activeSlot!.teamSide, activeSlot!.positionSlot)}
                                            >
                                                <View style={styles.modalPlayerInfo}>
                                                    <Text style={[styles.modalPlayerName, { color: theme.colors.text }]}>
                                                        {`${player.first_name} ${player.last_name}`}
                                                    </Text>
                                                    <View style={styles.modalBadges}>
                                                        {player.skillLevel && (
                                                            <View style={[styles.pill, { backgroundColor: `${String(theme.colors.primary)}20`, marginRight: 4 }]}>
                                                                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '500' }}>Skill: {player.skillLevel}</Text>
                                                            </View>
                                                        )}
                                                        {player.contractShare !== undefined && (
                                                            <View style={[styles.pill, { backgroundColor: `${String(theme.colors.primary)}20` }]}>
                                                                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '500' }}>
                                                                    Share: {player.contractShare}%
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                                {activeSlot?.currentPlayer?.member_id === player.member_id && (
                                                    <Text style={{ color: theme.colors.primary }}>✓</Text>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ))}
                                {filteredModalPlayers.length === 0 && (
                                    <Text style={{ padding: 20, textAlign: 'center', color: theme.colors.muted }}>No eligible players found.</Text>
                                )}
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
}

const unassignedPlayersCount = (eligible: EligiblePlayer[], matches: EventMatch[]) => {
    const assigned = new Set<string | number>();
    matches.forEach(m => {
        m.team_a_players?.forEach(p => assigned.add(p.member_id));
        m.team_b_players?.forEach(p => assigned.add(p.member_id));
    });
    return eligible.filter(p => !assigned.has(p.member_id)).length;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    statsText: {
        fontSize: 14,
        fontWeight: '500',
    },
    autoMatchButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
    },
    courtCard: {
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    courtHeader: {
        padding: 12,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    courtTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    courtHeaderMeta: {},
    courtLayout: {
        flexDirection: 'row',
    },
    teamSide: {
        flex: 1,
        padding: 8,
        borderRightWidth: 1, // Only for first child, logic handled in render with conditional style
    },
    teamHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    teamLabel: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    skillAvg: {
        fontSize: 12,
    },
    positionsContainer: {
        gap: 8,
    },
    positionSlot: {
        height: 75,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        padding: 8,
    },
    emptySlotText: {
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    playerContent: {
        flex: 1,
        justifyContent: 'center',
    },
    playerName: {
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 4,
    },
    playerMetaRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    metaPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    metaText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    playerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    playerBadges: {
        flexDirection: 'row',
        marginTop: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContentContainer: {
        width: '100%',
        maxWidth: MAX_CONTENT_WIDTH,
        height: '100%',
        maxHeight: Platform.OS === 'web' ? '80%' : '100%',
        borderRadius: Platform.OS === 'web' ? 12 : 0,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        flex: 1,
    },
    modalList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    modalGroup: {
        marginTop: 16,
    },
    modalGroupTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    modalPlayerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalPlayerInfo: {
        flex: 1,
    },
    modalPlayerName: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '500',
    },
    modalBadges: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    pill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    clearButton: {
        margin: 16,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
    },
});
