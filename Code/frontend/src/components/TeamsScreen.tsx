import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { commonStyles } from '../ui/commonStyles';
import { Team, Color, Sport } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';
import { RemoteImage } from './RemoteImage';
import { SearchWithChips } from './SearchWithChips';
import { filterItemsByChips } from '../utils/searchUtils';
import { getSportSvgContent } from '../utils/sportIcons';

export default function TeamsScreen() {
    const { theme } = useTheme();
    const [teams, setTeams] = useState<Team[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Edit State
    const [editingTeamId, setEditingTeamId] = useState<number | string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [selectedSportId, setSelectedSportId] = useState<number | string | null>(null);
    const [selectedColorIds, setSelectedColorIds] = useState<(number | string)[]>([]);

    // Confirmation State
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false
    });

    // Search State
    const [searchChips, setSearchChips] = useState<string[]>([]);
    const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('OR');

    // Helper to get default logo URL based on sport name
    const getDefaultLogoForSport = (sportName: string): string => {
        const normalizedName = sportName.toLowerCase().trim();
        // Available sport logos: basketball, pickleball, soccer, tennis, volleyball
        const availableLogos = ['basketball', 'pickleball', 'soccer', 'tennis', 'volleyball'];
        if (availableLogos.includes(normalizedName)) {
            return `../../assets/svg/${normalizedName}.svg`;
        }
        return '';
    };

    // Handle sport selection with default logo
    const handleSportSelect = (sportId: number) => {
        setSelectedSportId(sportId);
        // Always set the default logo for the selected sport
        const sport = sports.find(s => s.sport_id === sportId);
        if (sport) {
            const defaultLogo = getDefaultLogoForSport(sport.name);
            setLogoUrl(defaultLogo);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [teamsData, colorsData, lookups] = await Promise.all([
                databaseService.getTeams(),
                databaseService.getColors(),
                databaseService.getLookups()
            ]);
            setTeams(teamsData);
            setColors(colorsData);
            if (lookups?.sports) {
                setSports(lookups.sports);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to load teams data');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingTeamId(null);
        setName('');
        setLogoUrl('');
        setSelectedColorIds([]);
        setSelectedSportId(null);  // Don't default to any sport - make user pick
    };

    const handleEdit = (team: Team) => {
        setEditingTeamId(team.team_id);
        setName(team.name);
        setLogoUrl(team.logo_url || '');
        setSelectedSportId(team.sport_id || (sports.length > 0 ? sports[0].sport_id : null));

        if (team.team_colors) {
            const names = team.team_colors.split(' & ');
            const ids = colors.filter(c => names.includes(c.name)).map(c => c.color_id);
            setSelectedColorIds(ids);
        } else {
            setSelectedColorIds([]);
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name || !selectedSportId) {
            Alert.alert('Error', 'Name and Sport are required');
            return;
        }

        try {
            const selectedColorNames = colors
                .filter(c => selectedColorIds.includes(c.color_id))
                .map(c => c.name)
                .join(' & ');

            if (editingTeamId) {
                await databaseService.updateTeam(
                    editingTeamId,
                    name,
                    selectedSportId,
                    selectedColorNames,
                    selectedColorIds,
                    logoUrl
                );
            } else {
                await databaseService.createTeam(
                    name,
                    selectedSportId,
                    selectedColorNames,
                    selectedColorIds,
                    logoUrl
                );
            }

            setModalVisible(false);
            resetForm();
            loadData();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save team');
        }
    };

    const showAlert = (title: string, message: string) => {
        // Use window.alert on web since Alert.alert from react-native doesn't work properly
        if (typeof window !== 'undefined' && window.alert) {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const promptDeleteTeam = () => {
        if (!editingTeamId) return;
        setConfirmConfig({
            title: 'Delete Team?',
            message: 'Are you sure you want to delete this team?',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const result = await databaseService.deleteTeam(editingTeamId);
                    console.log('Delete team result:', result);
                    if (result.error) {
                        showAlert('Cannot Delete Team', result.message || 'This team has members assigned.');
                        setConfirmVisible(false);
                        return;
                    }
                    setConfirmVisible(false);
                    setModalVisible(false); // Close edit modal too
                    loadData();
                } catch (e: any) {
                    console.error('Delete team error:', e);
                    const errorMessage = e?.message || 'Failed to delete team';
                    showAlert('Error', errorMessage);
                    setConfirmVisible(false);
                }
            }
        });
        setConfirmVisible(true);
    };

    const promptDeleteAll = () => {
        // Get filtered teams based on current search
        const filteredTeams = filterItemsByChips(
            teams,
            searchChips,
            (team) => `${team.name} ${team.sport_name || ''} ${team.team_colors || ''}`,
            searchMode
        );

        const isFiltered = searchChips.length > 0;
        setConfirmConfig({
            title: isFiltered ? `Delete ${filteredTeams.length} Filtered Team${filteredTeams.length !== 1 ? 's' : ''}?` : 'Delete All Teams?',
            message: isFiltered
                ? `This will permanently delete the ${filteredTeams.length} team(s) that match your current search filters (${searchChips.join(', ')}). Other teams will not be affected. This cannot be undone.`
                : 'This will permanently remove ALL teams from the database. This action cannot be undone.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    // Use batch delete instead of looping
                    const teamIds = filteredTeams.map(t => t.team_id);
                    await databaseService.deleteTeamsBatch(teamIds);
                    setConfirmVisible(false);
                    loadData();
                } catch (e: any) {
                    console.error('Delete teams error:', e);
                    // Display validation error from backend
                    showAlert('Cannot Delete', e.message || 'Failed to delete teams');
                    setConfirmVisible(false);
                }
            }
        });
        setConfirmVisible(true);
    };

    const toggleColor = (id: number | string) => {
        if (selectedColorIds.includes(id)) {
            setSelectedColorIds(prev => prev.filter(cid => cid !== id));
        } else {
            setSelectedColorIds(prev => [...prev, id]);
        }
    };

    const renderTeamCard = ({ item }: { item: Team }) => {
        let svgContent = (item as any).logo_svg;

        // If no static SVG but we have a URL pointing to our local assets (default logic),
        // let's grab the raw SVG content and colorize it.
        // The default URL format in updateTeam was: `../../assets/svg/${normalizedName}.svg`
        if (!svgContent && item.logo_url && item.logo_url.includes('assets/svg/')) {
            // Extract sport name from URL or use the team's sport name
            // URL format: ../../assets/svg/soccer.svg
            const sportNameFromUrl = item.logo_url.split('/').pop()?.replace('.svg', '');
            const sportToUse = sportNameFromUrl || item.sport_name;

            if (sportToUse) {
                const rawSvg = getSportSvgContent(sportToUse);
                if (rawSvg) {
                    svgContent = rawSvg
                        .replace(/fill:\s*#000000/g, `fill:${theme.colors.primary as string}`)
                        .replace(/fill="#000000"/g, `fill="${theme.colors.primary as string}"`)
                        .replace(/fill="black"/g, `fill="${theme.colors.primary as string}"`);
                }
            }
        }

        const hasLogo = (item.logo_url && item.logo_url.trim() !== '') || svgContent;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => handleEdit(item)}
            >
                <View style={styles.cardContent}>
                    {hasLogo ? (
                        <View style={{ marginRight: 16 }}>
                            <RemoteImage
                                uri={item.logo_url}
                                svgContent={svgContent}
                                width={50}
                                height={50}
                                circular
                                style={{ borderRadius: 25 }}
                            />
                        </View>
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.chipBackground, borderWidth: 1, borderColor: theme.colors.primary }]}>
                            <Text style={[styles.logoText, { color: theme.colors.chipText }]}>{item.name.charAt(0)}</Text>
                        </View>
                    )}
                    <View style={styles.textContainer}>
                        <Text style={[styles.teamName, { color: theme.colors.text }]}>{item.name}</Text>
                        <Text style={[styles.teamDetail, { color: theme.colors.primary, fontWeight: 'bold' }]}>{(item.sport_name || 'Unknown Sport').toUpperCase()}</Text>
                        {item.team_colors && (
                            <View style={styles.colorRow}>
                                <Text style={[styles.colorLabel, { color: theme.colors.muted }]}>Colors: {item.team_colors}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScreenHeader
                title="Teams"
                rightAction={
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: theme.colors.error }]} onPress={promptDeleteAll}>
                            <Text style={[styles.buttonTextWhite, { color: theme.colors.errorText }]}>
                                {searchChips.length > 0
                                    ? `Delete Filtered (${filterItemsByChips(
                                        teams,
                                        searchChips,
                                        (t) => `${t.name} ${t.sport_name || ''} ${t.team_colors || ''}`,
                                        searchMode
                                    ).length})`
                                    : `Delete All (${teams.length})`}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => { resetForm(); setModalVisible(true); }}>
                            <Text style={[styles.addButtonText, { color: theme.colors.buttonText }]}>New Team</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <>
                    {/* Search with Chips */}
                    <SearchWithChips
                        chips={searchChips}
                        onChipsChange={setSearchChips}
                        mode={searchMode}
                        onModeChange={setSearchMode}
                        placeholder="Search teams by name, sport, colors..."
                        topSpacing={true}
                        resultCount={filterItemsByChips(
                            teams,
                            searchChips,
                            (t) => `${t.name} ${t.sport_name || ''} ${t.team_colors || ''}`,
                            searchMode
                        ).length}
                        totalCount={teams.length}
                    />
                    <FlatList
                        data={filterItemsByChips(
                            teams,
                            searchChips,
                            (t) => `${t.name} ${t.sport_name || ''} ${t.team_colors || ''}`,
                            searchMode
                        ).sort((a, b) => a.name.localeCompare(b.name))}
                        keyExtractor={t => t.team_id.toString()}
                        renderItem={renderTeamCard}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.colors.muted }}>No teams found</Text>
                        }
                    />
                </>
            )}

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
                            {editingTeamId ? 'Edit Team' : 'Create New Team'}
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Team Name</Text>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Golden Warriors"
                                placeholderTextColor={theme.colors.muted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Sport</Text>
                            <View style={styles.chipContainer}>
                                {sports.map(s => (
                                    <TouchableOpacity
                                        key={s.sport_id}
                                        style={[
                                            styles.chip,
                                            { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
                                            selectedSportId === s.sport_id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                        ]}
                                        onPress={() => handleSportSelect(s.sport_id as number)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: theme.colors.text },
                                            selectedSportId === s.sport_id && { color: theme.colors.buttonText, fontWeight: 'bold' }
                                        ]}>{s.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Team Colors</Text>
                            <View style={styles.chipContainer}>
                                {colors.map(c => {
                                    const isSelected = selectedColorIds.includes(c.color_id);
                                    return (
                                        <TouchableOpacity
                                            key={c.color_id}
                                            style={[
                                                styles.colorChip,
                                                { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
                                                isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }
                                            ]}
                                            onPress={() => toggleColor(c.color_id)}
                                        >
                                            <View style={[styles.colorPreview, { backgroundColor: c.hex_code }]} />
                                            <Text style={[styles.chipText, { color: theme.colors.text }]}>{c.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Logo URL (Optional)</Text>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}
                                value={logoUrl}
                                onChangeText={setLogoUrl}
                                placeholder="https://..."
                                placeholderTextColor={theme.colors.muted}
                            />
                        </View>

                        <View style={[styles.modalButtons, { justifyContent: 'space-between' }]}>
                            {editingTeamId ? (
                                <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.colors.error }]} onPress={promptDeleteTeam}>
                                    <Text style={[styles.buttonTextWhite, { color: theme.colors.errorText }]}>Delete</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={{ flex: 1 }} /> // Spacer
                            )}

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.muted }]} onPress={() => { setModalVisible(false); resetForm(); }}>
                                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                                    <Text style={[styles.saveButtonText, { color: theme.colors.buttonText }]}>{editingTeamId ? 'Save Changes' : 'Create Team'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </View>
            </Modal>

            <ConfirmationModal
                visible={confirmVisible}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDestructive={confirmConfig.isDestructive}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmVisible(false)}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    title: { fontSize: 24, fontWeight: 'bold' },
    addButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    addButtonText: { fontWeight: 'bold' },
    list: { paddingHorizontal: 16, paddingBottom: 15 },

    card: {
        padding: 20,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
    },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    logoPlaceholder: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
    },
    logoText: { fontSize: 20, fontWeight: 'bold' },
    textContainer: { flex: 1 },
    teamLogo: { marginLeft: 12, borderRadius: 35 },
    teamName: { fontSize: 18, fontWeight: 'bold' },
    teamDetail: { fontSize: 14, marginTop: 2 },
    colorRow: { marginTop: 4 },
    colorLabel: { fontSize: 12 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', maxWidth: MAX_CONTENT_WIDTH, maxHeight: '90%', borderRadius: 12, padding: 20, borderWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    label: { marginBottom: 6, fontWeight: '500' },
    input: { padding: 12, borderRadius: 8, borderWidth: 1 },

    chipContainer: commonStyles.chipContainer,
    chip: commonStyles.chip,
    colorChip: { flexDirection: 'row', alignItems: 'center', padding: 6, paddingRight: 10, borderRadius: 16, borderWidth: 1, maxWidth: '100%' },
    colorPreview: { width: 16, height: 16, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: '#fff' },
    chipText: commonStyles.chipText,

    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
    cancelButton: { padding: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
    saveButton: { padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    deleteButton: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    deleteButtonHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
    buttonText: { fontWeight: '600' },
    buttonTextWhite: { color: 'white', fontWeight: 'bold' },
    saveButtonText: { fontWeight: 'bold' }
});
