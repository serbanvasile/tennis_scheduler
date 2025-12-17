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
import { Team, Color, Sport } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';
import { RemoteImage } from './RemoteImage';

export default function TeamsScreen() {
    const { theme } = useTheme();
    const [teams, setTeams] = useState<Team[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Edit State
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
    const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);

    // Confirmation State
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

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
        if (sports.length > 0) setSelectedSportId(sports[0].sport_id);
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
        const filteredTeams = searchQuery
            ? teams.filter(t => {
                const search = searchQuery.toLowerCase();
                const name = t.name.toLowerCase();
                const sport = (t.sport_name || '').toLowerCase();
                const colors = (t.team_colors || '').toLowerCase();
                return name.includes(search) || sport.includes(search) || colors.includes(search);
            })
            : teams;

        const isFiltered = searchQuery.trim() !== '';
        setConfirmConfig({
            title: isFiltered ? `Delete ${filteredTeams.length} Filtered Team${filteredTeams.length !== 1 ? 's' : ''}?` : 'Delete All Teams?',
            message: isFiltered
                ? `This will permanently delete the ${filteredTeams.length} team(s) that match your current search filter "${searchQuery}". Other teams will not be affected. This cannot be undone.`
                : 'This will permanently remove ALL teams from the database. This action cannot be undone.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    // Delete each filtered team individually
                    for (const team of filteredTeams) {
                        await databaseService.deleteTeam(team.team_id);
                    }
                    setConfirmVisible(false);
                    loadData();
                } catch (e: any) {
                    console.error('Delete teams error:', e);
                    const errorMessage = e?.message || 'Failed to delete teams';
                    showAlert('Error', errorMessage);
                    setConfirmVisible(false);
                }
            }
        });
        setConfirmVisible(true);
    };

    const toggleColor = (id: number) => {
        if (selectedColorIds.includes(id)) {
            setSelectedColorIds(prev => prev.filter(cid => cid !== id));
        } else {
            setSelectedColorIds(prev => [...prev, id]);
        }
    };

    const renderTeamCard = ({ item }: { item: Team }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleEdit(item)}
        >
            <View style={styles.cardContent}>
                <View style={[styles.logoPlaceholder, { backgroundColor: 'black', borderWidth: 1, borderColor: theme.colors.primary }]}>
                    <Text style={[styles.logoText, { color: theme.colors.primary }]}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.teamName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.teamDetail, { color: theme.colors.primary, fontWeight: 'bold' }]}>{item.sport_name || 'Unknown Sport'}</Text>
                    {item.team_colors && (
                        <View style={styles.colorRow}>
                            <Text style={[styles.colorLabel, { color: theme.colors.muted }]}>Colors: {item.team_colors}</Text>
                        </View>
                    )}
                </View>
                {(item.logo_url && item.logo_url.trim() !== '') || (item as any).logo_svg ? (
                    <RemoteImage
                        uri={item.logo_url}
                        svgContent={(item as any).logo_svg}
                        width={50}
                        height={50}
                        circular
                        style={styles.teamLogo}
                    />
                ) : null}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScreenHeader
                title="Teams"
                rightAction={
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: '#d9534f' }]} onPress={promptDeleteAll}>
                            <Text style={styles.buttonTextWhite}>
                                {searchQuery
                                    ? `Delete Filtered (${teams.filter(t => {
                                        const search = searchQuery.toLowerCase();
                                        const name = t.name.toLowerCase();
                                        const sport = (t.sport_name || '').toLowerCase();
                                        const colors = (t.team_colors || '').toLowerCase();
                                        return name.includes(search) || sport.includes(search) || colors.includes(search);
                                    }).length})`
                                    : `Delete All (${teams.length})`}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => { resetForm(); setModalVisible(true); }}>
                            <Text style={styles.addButtonText}>+ New Team</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <>
                    {/* Search Input and Count */}
                    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 8 }]}
                            placeholder="Search teams..."
                            placeholderTextColor={theme.colors.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <Text style={{ color: theme.colors.muted, fontSize: 12, marginBottom: 8 }}>
                            {searchQuery
                                ? `Showing ${teams.filter(t => {
                                    const search = searchQuery.toLowerCase();
                                    const name = t.name.toLowerCase();
                                    const sport = (t.sport_name || '').toLowerCase();
                                    const colors = (t.team_colors || '').toLowerCase();
                                    return name.includes(search) || sport.includes(search) || colors.includes(search);
                                }).length} of ${teams.length} teams`
                                : `${teams.length} teams`}
                        </Text>
                    </View>
                    <FlatList
                        data={teams.filter(t => {
                            if (!searchQuery) return true;
                            const search = searchQuery.toLowerCase();
                            const name = t.name.toLowerCase();
                            const sport = (t.sport_name || '').toLowerCase();
                            const colors = (t.team_colors || '').toLowerCase();
                            return name.includes(search) || sport.includes(search) || colors.includes(search);
                        })}
                        keyExtractor={t => t.team_id.toString()}
                        renderItem={renderTeamCard}
                        contentContainerStyle={styles.list}
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
                                        onPress={() => setSelectedSportId(s.sport_id)}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: theme.colors.text },
                                            selectedSportId === s.sport_id && { color: 'black', fontWeight: 'bold' }
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
                                <TouchableOpacity style={[styles.deleteButton, { backgroundColor: '#d9534f' }]} onPress={promptDeleteTeam}>
                                    <Text style={styles.buttonTextWhite}>Delete</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={{ flex: 1 }} /> // Spacer
                            )}

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.muted }]} onPress={() => { setModalVisible(false); resetForm(); }}>
                                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>{editingTeamId ? 'Save Changes' : 'Create Team'}</Text>
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
    addButtonText: { color: 'black', fontWeight: 'bold' },
    list: { padding: 16 },

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
    teamLogo: { marginLeft: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 25 },
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

    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
    colorChip: { flexDirection: 'row', alignItems: 'center', padding: 6, paddingRight: 10, borderRadius: 16, borderWidth: 1 },
    colorPreview: { width: 16, height: 16, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: '#fff' },
    chipText: { fontSize: 12 },

    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
    cancelButton: { padding: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
    saveButton: { padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    deleteButton: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    deleteButtonHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
    buttonText: { fontWeight: '600' },
    buttonTextWhite: { color: 'white', fontWeight: 'bold' },
    saveButtonText: { color: 'black', fontWeight: 'bold' }
});
