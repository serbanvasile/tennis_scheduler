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
  Alert,
  ScrollView
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { Member, MemberTeam, Sport, Role, Position, Team } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';

// Tab Component
const Tabs = ({ activeTab, onChange }: { activeTab: string, onChange: (tab: string) => void }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'General' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
        onPress={() => onChange('General')}
      >
        <Text style={[styles.tabText, { color: theme.colors.text }]}>General</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'Teams' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
        onPress={() => onChange('Teams')}
      >
        <Text style={[styles.tabText, { color: theme.colors.text }]}>Teams & Roles</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function RosterScreen() {
  const { theme } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Lookups
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [allSports, setAllSports] = useState<Sport[]>([]);

  // Edit State
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('General');

  // Form State - General
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');

  // Form State - Teams [{ teamId, roleIds[], positionIds[] }]
  const [memberTeams, setMemberTeams] = useState<any[]>([]);
  const [filterText, setFilterText] = useState('');

  // Confirmation
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, isDestructive: false });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, teamsData, lookups] = await Promise.all([
        databaseService.getMembers(),
        databaseService.getTeams(),
        databaseService.getLookups()
      ]);
      setMembers(membersData);
      setAllTeams(teamsData);
      if (lookups) {
        setAllRoles(lookups.roles || []);
        setAllPositions(lookups.positions || []);
        setAllSports(lookups.sports || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load roster data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (member: Member) => {
    setEditingMemberId(member.member_id);
    setActiveTab('General');
    setFilterText('');

    try {
      const details = await databaseService.getMemberDetails(member.member_id);
      setFirstName(details.first_name);
      setLastName(details.last_name);
      setDisplayName(details.display_name || '');
      setGender(details.gender || '');

      const mappedTeams = (details.teams || []).map(t => ({
        teamId: t.team_id,
        roleIds: t.roles.map(r => r.role_id),
        positionIds: t.positions.map(p => p.position_id)
      }));
      setMemberTeams(mappedTeams);

      setModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Failed to load member details');
    }
  };

  const resetForm = () => {
    setEditingMemberId(null);
    setFirstName('');
    setLastName('');
    setDisplayName('');
    setGender('');
    setMemberTeams([]);
    setFilterText('');
    setActiveTab('General');
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Error', 'First and Last Name are required');
      return;
    }

    try {
      const memberData = { first_name: firstName, last_name: lastName, display_name: displayName, gender };

      if (editingMemberId) {
        await databaseService.updateMember(editingMemberId, memberData, memberTeams);
      } else {
        await databaseService.createMember(memberData, memberTeams);
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to save member');
    }
  };

  const promptDelete = () => {
    if (!editingMemberId) return;
    setConfirmConfig({
      title: 'Delete Member?',
      message: 'Are you sure you want to delete this member?',
      isDestructive: true,
      onConfirm: async () => {
        await databaseService.deleteMember(editingMemberId);
        setConfirmVisible(false);
        setModalVisible(false);
        loadData();
      }
    });
    setConfirmVisible(true);
  };

  const promptDeleteAll = () => {
    setConfirmConfig({
      title: 'Delete All Members?',
      message: 'This will permanently remove ALL members. This cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        await databaseService.deleteAllMembers();
        setConfirmVisible(false);
        loadData();
      }
    });
    setConfirmVisible(true);
  };

  const toggleTeam = (teamId: number) => {
    const exists = memberTeams.find(mt => mt.teamId === teamId);
    if (exists) {
      setMemberTeams(prev => prev.filter(mt => mt.teamId !== teamId));
    } else {
      setMemberTeams(prev => [...prev, { teamId, roleIds: [], positionIds: [] }]);
    }
  };

  const toggleRole = (teamId: number, roleId: number) => {
    setMemberTeams(prev => prev.map(mt => {
      if (mt.teamId !== teamId) return mt;
      const hasRole = mt.roleIds.includes(roleId);
      return {
        ...mt,
        roleIds: hasRole ? mt.roleIds.filter((id: number) => id !== roleId) : [...mt.roleIds, roleId]
      };
    }));
  };

  const togglePosition = (teamId: number, positionId: number) => {
    setMemberTeams(prev => prev.map(mt => {
      if (mt.teamId !== teamId) return mt;
      const hasPos = mt.positionIds.includes(positionId);
      return {
        ...mt,
        positionIds: hasPos ? mt.positionIds.filter((id: number) => id !== positionId) : [...mt.positionIds, positionId]
      };
    }));
  };

  // Filtered Teams Logic
  const filteredTeams = allTeams.filter(t => {
    if (!filterText) return true;
    const search = filterText.toLowerCase();
    const sportName = allSports.find(s => s.sport_id === t.sport_id)?.name.toLowerCase() || '';
    return t.name.toLowerCase().includes(search) || sportName.includes(search);
  });

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => handleEdit(item)}>
      <View style={styles.cardContent}>
        <View style={[styles.avatar, { backgroundColor: 'black', borderWidth: 1, borderColor: theme.colors.primary }]}>
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{item.first_name[0]}{item.last_name[0]}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.nameText, { color: theme.colors.text }]}>
            {item.last_name}, {item.first_name} {item.display_name ? `(${item.display_name})` : ''}
          </Text>
          {item.teams && item.teams.length > 0 ? (
            <>
              {item.teams.map((t: any, idx: number) => (
                <View key={idx}>
                  <Text style={{ color: theme.colors.primary, fontSize: 14, marginTop: 2 }}>
                    <Text style={{ fontWeight: 'bold' }}>{t.sport_name}</Text>
                    <Text style={{ fontWeight: 'normal' }}> • {t.team_name}</Text>
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      {t.role_names ? `Role: ${t.role_names.split(',').join(', ')}` : ''}
                      {t.role_names && t.position_names ? ' • ' : ''}
                      {t.position_names ? `Position: ${t.position_names.split(',').join(', ')}` : ''}
                      {!t.role_names && !t.position_names ? 'No role/position assigned' : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 2 }}>No Teams Assigned</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Roster"
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: '#d9534f' }]} onPress={promptDeleteAll}>
              <Text style={styles.buttonTextWhite}>Delete All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => { resetForm(); setModalVisible(true); }}>
              <Text style={styles.addButtonText}>+ Member</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={members}
          keyExtractor={m => m.member_id.toString()}
          renderItem={renderMemberCard}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {editingMemberId ? 'Edit Member' : 'New Member'}
            </Text>

            <Tabs activeTab={activeTab} onChange={setActiveTab} />

            <ScrollView style={styles.modalContent}>
              {activeTab === 'General' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>First Name</Text>
                    <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={firstName} onChangeText={setFirstName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Last Name</Text>
                    <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={lastName} onChangeText={setLastName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Display Name (Optional)</Text>
                    <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={displayName} onChangeText={setDisplayName} />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Gender</Text>
                    <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={gender} onChangeText={setGender} placeholder="M/F/Other" placeholderTextColor={theme.colors.muted} />
                  </View>
                </>
              ) : (
                <View>
                  <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Assigned Teams</Text>

                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 12 }]}
                    placeholder="Filter teams..."
                    placeholderTextColor={theme.colors.muted}
                    value={filterText}
                    onChangeText={setFilterText}
                  />

                  <View style={styles.chipContainer}>
                    {filteredTeams.map(t => {
                      const isSelected = memberTeams.some(mt => mt.teamId === t.team_id);
                      return (
                        <TouchableOpacity
                          key={t.team_id}
                          style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                          onPress={() => toggleTeam(t.team_id)}
                        >
                          <Text style={{ color: isSelected ? 'black' : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{t.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {filteredTeams.length === 0 && <Text style={{ color: theme.colors.muted }}>No teams found.</Text>}
                  </View>

                  {memberTeams.map(mt => {
                    const team = allTeams.find(t => t.team_id === mt.teamId);
                    if (!team) return null;

                    const sportId = team.sport_id;
                    const relevantPositions = allPositions.filter(p => !p.sport_id || p.sport_id === sportId);

                    return (
                      <View key={mt.teamId} style={[styles.teamDetailCard, { borderColor: theme.colors.border }]}>
                        <Text style={[styles.teamDetailTitle, { color: theme.colors.primary }]}>{team.name} Settings</Text>

                        <Text style={[styles.labelSmall, { color: theme.colors.text }]}>Roles:</Text>
                        <View style={styles.chipContainer}>
                          {allRoles.map(r => {
                            const active = mt.roleIds.includes(r.role_id);
                            return (
                              <TouchableOpacity
                                key={r.role_id}
                                style={[styles.chipSmall, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                onPress={() => toggleRole(mt.teamId, r.role_id)}
                              >
                                <Text style={{ fontSize: 10, color: active ? 'black' : theme.colors.text, fontWeight: active ? 'bold' : 'normal' }}>{r.name}</Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>

                        <Text style={[styles.labelSmall, { color: theme.colors.text, marginTop: 8 }]}>Positions:</Text>
                        <View style={styles.chipContainer}>
                          {relevantPositions.map(p => {
                            const active = mt.positionIds.includes(p.position_id);
                            return (
                              <TouchableOpacity
                                key={p.position_id}
                                style={[styles.chipSmall, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                onPress={() => togglePosition(mt.teamId, p.position_id)}
                              >
                                <Text style={{ fontSize: 10, color: active ? 'black' : theme.colors.text, fontWeight: active ? 'bold' : 'normal' }}>{p.name}</Text>
                              </TouchableOpacity>
                            )
                          })}
                          {relevantPositions.length === 0 && <Text style={{ fontSize: 10, color: theme.colors.muted }}>No positions for this sport.</Text>}
                        </View>
                      </View>
                    );
                  })}
                  {memberTeams.length === 0 && <Text style={{ color: theme.colors.muted, marginTop: 20 }}>Select a team above to configure roles.</Text>}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              {editingMemberId ? (
                <TouchableOpacity style={[styles.deleteButton, { backgroundColor: '#d9534f' }]} onPress={promptDelete}>
                  <Text style={styles.buttonTextWhite}>Delete</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.muted }]} onPress={() => setModalVisible(false)}><Text style={{ color: theme.colors.text }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}><Text style={styles.buttonTextBold}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={confirmVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmVisible(false)}
        isDestructive={confirmConfig.isDestructive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  card: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  textContainer: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: 'bold' },
  detailText: { fontSize: 14, marginTop: 2 },
  addButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { color: 'black', fontWeight: 'bold' },
  deleteButtonHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  buttonTextWhite: { color: 'white', fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxWidth: MAX_CONTENT_WIDTH, maxHeight: '90%', borderRadius: 12, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalContent: { flex: 1 },

  tabContainer: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  tab: { paddingVertical: 10, paddingHorizontal: 20 },
  tabText: { fontWeight: '600' },

  inputGroup: { marginBottom: 16 },
  label: { marginBottom: 6, fontWeight: '500' },
  input: { padding: 12, borderRadius: 8, borderWidth: 1 },

  sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  chipSmall: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1 },

  teamDetailCard: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
  teamDetailTitle: { fontWeight: 'bold', marginBottom: 8 },
  labelSmall: { fontSize: 12, fontWeight: '600', marginBottom: 4 },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelButton: { padding: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  saveButton: { padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  deleteButton: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  buttonTextBold: { color: 'black', fontWeight: 'bold' }
});
