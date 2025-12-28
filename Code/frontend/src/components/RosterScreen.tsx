import React, { useState, useCallback, useRef } from 'react';
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
  ScrollView,
  Linking
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { commonStyles } from '../ui/commonStyles';
import { Member, MemberTeam, Sport, Role, Position, Team } from '../types';
import { ScreenHeader } from './ScreenHeader';
import { ConfirmationModal } from './ConfirmationModal';
import { ImportScreen } from './ImportScreen';
import { SearchWithChips } from './SearchWithChips';
import { filterItemsByChips } from '../utils/searchUtils';

// Tab Component
const Tabs = ({ activeTab, onChange }: { activeTab: string, onChange: (tab: string) => void }) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [tabLayouts, setTabLayouts] = useState<{ [key: string]: { x: number, width: number } }>({});
  const [containerWidth, setContainerWidth] = useState(0);

  const tabs = [
    { key: 'General', label: 'General' },
    { key: 'Participation', label: 'Participation' },
    { key: 'Teams', label: 'Teams & Roles' },
    { key: 'Contract', label: 'Contract' },
    { key: 'Contact', label: 'Contact' },
    { key: 'Other', label: 'Other' }
  ];

  const handleTabPress = (key: string) => {
    onChange(key);
    const layout = tabLayouts[key];
    if (layout && scrollViewRef.current && containerWidth > 0) {
      const tabCenter = layout.x + layout.width / 2;
      const containerCenter = containerWidth / 2;
      const scrollX = tabCenter - containerCenter;
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  };

  return (
    <View style={commonStyles.tabContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              commonStyles.tab,
              activeTab === tab.key && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
              { paddingHorizontal: 12 }
            ]}
            onPress={() => handleTabPress(tab.key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setTabLayouts(prev => ({ ...prev, [tab.key]: { x, width } }));
            }}
          >
            <Text style={[commonStyles.tabText, { color: theme.colors.text }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Contact icon mapping with URL schemes
const getContactUrl = (type: string, value: string): string | null => {
  const cleanValue = value.replace(/[^\d+]/g, ''); // Clean phone numbers
  switch (type.toLowerCase()) {
    case 'phone':
      return `sms:${cleanValue}`; // Open SMS/text messaging
    case 'email':
      return `mailto:${value}`;
    case 'whatsapp':
      return `https://wa.me/${cleanValue}`;
    case 'signal':
      return `https://signal.me/#p/${cleanValue}`;
    default:
      return null;
  }
};

const getContactIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'phone':
      return '💬'; // SMS/text
    case 'email':
      return '✉️'; // Email
    case 'whatsapp':
      return '📱'; // WhatsApp (using phone with arrow)
    case 'signal':
      return '🔒'; // Signal (secure messaging)
    default:
      return '📞'; // Default phone
  }
};

// Contact Icons Component
const ContactIcons = ({ contacts, theme }: { contacts: any[], theme: any }) => {
  if (!contacts || contacts.length === 0) return null;

  const handlePress = (type: string, value: string) => {
    const url = getContactUrl(type, value);
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', `Could not open ${type} app`);
      });
    }
  };

  return (
    <View style={styles.contactIconsRow}>
      {contacts.map((contact, idx) => (
        <TouchableOpacity
          key={idx}
          style={[styles.contactIconButton, { borderColor: theme.colors.border }]}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering card press
            handlePress(contact.type, contact.value);
          }}
        >
          <Text style={styles.contactIcon}>{getContactIcon(contact.type)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Share Type Mapping
const SHARE_TYPE_MAP: { [key: string]: number } = {
  'R': 0,    // Reserve
  'OQ': 25,  // One Quarter
  'OT': 33,  // One Third
  'H': 50,   // Half
  'TT': 66,  // Two Thirds
  'TQ': 75,  // Three Quarter
  'F': 100,  // Full
  'C': -1    // Custom (no default)
};

const getShareTypeFromValue = (value: number): string => {
  for (const [type, val] of Object.entries(SHARE_TYPE_MAP)) {
    if (val === value && type !== 'C') return type;
  }
  return 'C'; // Custom
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
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [allContactLabels, setAllContactLabels] = useState<any[]>([]);
  // New v2 lookups
  const [allAgeGroups, setAllAgeGroups] = useState<any[]>([]);
  const [allGenders, setAllGenders] = useState<any[]>([]);
  const [allLevels, setAllLevels] = useState<any[]>([]);
  const [allMemberships, setAllMemberships] = useState<any[]>([]);
  const [allPaidStatuses, setAllPaidStatuses] = useState<any[]>([]);

  // Edit State
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('General');

  // Form State - General
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [skill, setSkill] = useState('3.5');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dominantSide, setDominantSide] = useState('R');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [shareType, setShareType] = useState('F');
  const [share, setShare] = useState('100');
  // New v2 member fields
  const [ageGroupIds, setAgeGroupIds] = useState<string[]>([]);
  const [genderCategoryIds, setGenderCategoryIds] = useState<string[]>([]);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [paidStatusId, setPaidStatusId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState('');

  // Form State - Teams [{ teamId, roleIds[], positionIds[] }]
  const [memberTeams, setMemberTeams] = useState<any[]>([]);
  const [teamSearchChips, setTeamSearchChips] = useState<string[]>([]);
  const [teamSearchMode, setTeamSearchMode] = useState<'AND' | 'OR'>('OR');

  // Form State - Contacts [{ type, value, label }]
  const [memberContacts, setMemberContacts] = useState<any[]>([]);
  const [newContactType, setNewContactType] = useState('phone');
  const [newContactValue, setNewContactValue] = useState('');
  const [newContactLabel, setNewContactLabel] = useState('preferred');

  // Confirmation
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: () => { }, isDestructive: false });

  // Import Modal
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Add Member Choice Modal
  const [addMemberChoiceVisible, setAddMemberChoiceVisible] = useState(false);

  // Add/Edit Contact Modal
  const [addContactModalVisible, setAddContactModalVisible] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);

  // Roster Filter
  const [searchChips, setSearchChips] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('OR');

  const handleImportClick = () => {
    if (allTeams.length === 0) {
      Alert.alert(
        'No Teams Available',
        'At least one team must be created before importing members. Please create a team first on the Teams screen.',
        [{ text: 'OK' }]
      );
      return;
    }
    setImportModalVisible(true);
  };

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
        setAllSkills(lookups.skills || []);
        setAllContactLabels(lookups.contact_labels || []);
        // New v2 lookups
        setAllAgeGroups(lookups.age_groups || []);
        setAllGenders(lookups.genders || []);
        setAllLevels(lookups.levels || []);
        setAllMemberships(lookups.memberships || []);
        setAllPaidStatuses(lookups.paid_statuses || []);
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
    setTeamSearchChips([]);

    try {
      const details = await databaseService.getMemberDetails(member.member_id);
      setFirstName(details.first_name);
      setLastName(details.last_name);
      setDisplayName(details.display_name || '');
      setBirthDate(details.birth_date ? new Date(details.birth_date).toISOString().split('T')[0] : '');
      setGender(details.gender || 'U');
      setSkill(details.skill?.toString() || '3.5');
      setPhone((details as any).phone || '');
      setEmail((details as any).email || '');
      setDominantSide((details as any).dominant_side || 'R');
      setCountryOfOrigin((details as any).country_of_origin || '');
      setShare(((details as any).share || 0).toString());
      setShareType((details as any).share_type || 'F');

      const mappedTeams = (details.teams || []).map((t: any) => ({
        teamId: t.team_id,
        roleIds: t.roles.map((r: any) => r.role_id),
        positionIds: t.positions.map((p: any) => p.position_id),
        skillId: t.skill_id || null,
        levelId: t.level_id || null
      }));
      setMemberTeams(mappedTeams);

      // Load contacts if available
      setMemberContacts((details as any).contacts || []);

      // Load new v2 fields
      setAgeGroupIds((details as any).age_group_ids || []);
      setGenderCategoryIds((details as any).gender_category_ids || []);
      setMembershipId((details as any).membership_id || null);
      setPaidStatusId((details as any).paid_status_id || null);
      setPaidAmount(((details as any).paid_amount || '').toString());

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
    setBirthDate('');
    setGender('U');
    setSkill('3.5');
    setPhone('');
    setEmail('');
    setDominantSide('R');
    setCountryOfOrigin('');
    setShareType('F');
    setShare('100');
    setMemberTeams([]);
    setTeamSearchChips([]);
    setMemberContacts([]);
    setNewContactType('phone');
    setNewContactValue('');
    setNewContactLabel('preferred');
    setEditingContactIndex(null);
    setActiveTab('General');
    // Reset v2 fields
    setAgeGroupIds([]);
    setGenderCategoryIds([]);
    setMembershipId(null);
    setPaidStatusId(null);
    setPaidAmount('');
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      Alert.alert('Error', 'First and Last Name are required');
      return;
    }

    try {
      const memberData = {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        birth_date: birthDate ? new Date(birthDate).getTime() : null,
        gender,
        skill: skill || '3.5',
        dominant_side: dominantSide,
        country_of_origin: countryOfOrigin,
        phone,
        email,
        share: parseFloat(share) || 0,
        share_type: shareType,
        // New v2 fields
        age_group_ids: ageGroupIds,
        gender_category_ids: genderCategoryIds,
        membership_id: membershipId,
        paid_status_id: paidStatusId,
        paid_amount: paidAmount ? parseFloat(paidAmount) : null
      };

      if (editingMemberId) {
        await databaseService.updateMember(editingMemberId, memberData, memberTeams, memberContacts);
      } else {
        await databaseService.createMember(memberData, memberTeams, memberContacts);
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
    // Get filtered members based on current search
    const filteredMembers = filterItemsByChips(
      members,
      searchChips,
      (member) => {
        const fullName = `${member.first_name} ${member.last_name}`;
        const displayN = member.display_name || '';
        const teamsStr = (member as any).teams?.map((t: any) => `${t.sport_name} ${t.team_name} ${t.role_names || ''} ${t.position_names || ''}`).join(' ') || '';
        const phoneStr = (member as any).phone || '';
        const emailStr = (member as any).email || '';
        return `${fullName} ${displayN} ${teamsStr} ${phoneStr} ${emailStr}`;
      },
      searchMode
    );

    const isFiltered = searchChips.length > 0;
    setConfirmConfig({
      title: isFiltered ? `Delete ${filteredMembers.length} Filtered Member${filteredMembers.length !== 1 ? 's' : ''}?` : 'Delete All Members?',
      message: isFiltered
        ? `This will permanently delete the ${filteredMembers.length} member(s) that match your current search filters (${searchChips.join(', ')}). Other members will not be affected. This cannot be undone.`
        : 'This will permanently remove ALL members from the database. This cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          // Use batch delete instead of looping
          const memberIds = filteredMembers.map(m => m.member_id);
          await databaseService.deleteMembersBatch(memberIds);
          setConfirmVisible(false);
          loadData();
        } catch (error: any) {
          // Display validation error from backend
          Alert.alert('Cannot Delete', error.message);
          setConfirmVisible(false);
        }
      }
    });
    setConfirmVisible(true);
  };

  const toggleTeam = (teamId: number) => {
    const exists = memberTeams.find(mt => mt.teamId === teamId);
    if (exists) {
      setMemberTeams(prev => prev.filter(mt => mt.teamId !== teamId));
    } else {
      setMemberTeams(prev => [...prev, { teamId, roleIds: [], positionIds: [], skillId: null }]);
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
  const filteredTeams = filterItemsByChips(
    allTeams,
    teamSearchChips,
    (t) => {
      const sportName = allSports.find(s => s.sport_id === t.sport_id)?.name || '';
      return `${t.name} ${sportName}`;
    },
    teamSearchMode
  );

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => handleEdit(item)}>
      <View style={styles.cardContent}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.chipBackground, borderWidth: 1, borderColor: theme.colors.primary }]}>
          <Text style={[styles.avatarText, { color: theme.colors.chipText }]}>{item.first_name[0]}{item.last_name[0]}</Text>
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
                    <Text style={{ fontWeight: 'bold' }}>{t.sport_name?.toUpperCase()} • </Text>
                    <Text style={{ fontWeight: 'normal' }}>{t.team_name}</Text>
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
        {/* Contact Action Icons */}
        <ContactIcons contacts={(item as any).contacts || []} theme={theme} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Roster"
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.deleteButtonHeader, { backgroundColor: theme.colors.error }]} onPress={promptDeleteAll}>
              <Text style={[styles.buttonTextWhite, { color: theme.colors.errorText }]}>
                {searchChips.length > 0
                  ? `Delete Filtered (${filterItemsByChips(
                    members,
                    searchChips,
                    (m) => `${m.first_name} ${m.last_name} ${m.display_name || ''} ${(m as any).teams?.map((t: any) => `${t.sport_name} ${t.team_name} ${t.role_names || ''} ${t.position_names || ''}`).join(' ') || ''} ${(m as any).phone || ''} ${(m as any).email || ''}`,
                    searchMode
                  ).length})`
                  : `Delete All (${members.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={() => setAddMemberChoiceVisible(true)}>
              <Text style={[styles.addButtonText, { color: theme.colors.buttonText }]}>New Member</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} /> : (
        <>
          {/* Search with Chips */}
          <SearchWithChips
            chips={searchChips}
            onChipsChange={setSearchChips}
            mode={searchMode}
            onModeChange={setSearchMode}
            placeholder="Search members by name, team, role..."
            topSpacing={true}
            resultCount={filterItemsByChips(
              members,
              searchChips,
              (m) => `${m.first_name} ${m.last_name} ${m.display_name || ''} ${(m as any).teams?.map((t: any) => `${t.sport_name} ${t.team_name} ${t.role_names || ''} ${t.position_names || ''}`).join(' ') || ''} ${(m as any).phone || ''} ${(m as any).email || ''}`,
              searchMode
            ).length}
            totalCount={members.length}
          />
          <FlatList
            data={filterItemsByChips(
              members,
              searchChips,
              (m) => `${m.first_name} ${m.last_name} ${m.display_name || ''} ${(m as any).teams?.map((t: any) => `${t.sport_name} ${t.team_name} ${t.role_names || ''} ${t.position_names || ''}`).join(' ') || ''} ${(m as any).phone || ''} ${(m as any).email || ''}`,
              searchMode
            ).sort((a, b) => {
              const lastNameCompare = a.last_name.localeCompare(b.last_name);
              return lastNameCompare !== 0 ? lastNameCompare : a.first_name.localeCompare(b.first_name);
            })}
            keyExtractor={m => m.member_id.toString()}
            renderItem={renderMemberCard}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.colors.muted }}>No members found</Text>
            }
          />
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {editingMemberId ? `Edit Member (${firstName} ${lastName})` : 'New Member'}
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
                    <Text style={[styles.label, { color: theme.colors.text }]}>Date of Birth</Text>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={birthDate}
                      onChangeText={(text) => {
                        // Mask format: YYYY-MM-DD
                        // Only allow numbers to be typed
                        const cleaned = text.replace(/[^0-9]/g, '');

                        let formatted = cleaned;
                        if (cleaned.length > 4) {
                          formatted = cleaned.substring(0, 4) + '-' + cleaned.substring(4);
                        }
                        if (cleaned.length > 6) {
                          formatted = formatted.substring(0, 7) + '-' + formatted.substring(7);
                        }

                        // Limit to 10 chars (YYYY-MM-DD)
                        setBirthDate(formatted.substring(0, 10));
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.colors.muted}
                      maxLength={10}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              ) : activeTab === 'Participation' ? (
                <>
                  {/* Gender (Legacy) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Gender</Text>
                    <View style={styles.chipContainer}>
                      {[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'U', label: 'Unknown' }].map(opt => {
                        const isSelected = gender === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => setGender(opt.value)}
                          >
                            <Text style={{ color: isSelected ? theme.colors.buttonText : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{opt.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Gender Category (v2) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Gender Category</Text>
                    <View style={styles.chipContainer}>
                      {allGenders.map(g => {
                        const isSelected = genderCategoryIds.includes(g.gender_id);
                        return (
                          <TouchableOpacity
                            key={g.gender_id}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => {
                              if (isSelected) {
                                setGenderCategoryIds(genderCategoryIds.filter(id => id !== g.gender_id));
                              } else {
                                setGenderCategoryIds([...genderCategoryIds, g.gender_id]);
                              }
                            }}
                          >
                            <Text style={{ color: isSelected ? theme.colors.buttonText : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{g.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Age Group Participation (v2) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Age Group</Text>
                    <View style={styles.chipContainer}>
                      {allAgeGroups.map(ag => {
                        const isSelected = ageGroupIds.includes(ag.age_group_id);
                        return (
                          <TouchableOpacity
                            key={ag.age_group_id}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => {
                              if (isSelected) {
                                setAgeGroupIds(ageGroupIds.filter(id => id !== ag.age_group_id));
                              } else {
                                setAgeGroupIds([...ageGroupIds, ag.age_group_id]);
                              }
                            }}
                          >
                            <Text style={{ color: isSelected ? theme.colors.buttonText : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{ag.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : activeTab === 'Teams' ? (
                <View>
                  <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Assigned Teams</Text>

                  {/* Selected Teams - always show assigned teams with remove button */}
                  {memberTeams.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.label, { color: theme.colors.muted, marginBottom: 8 }]}>Selected ({memberTeams.length}):</Text>
                      <View style={styles.chipContainer}>
                        {memberTeams.map(mt => {
                          const team = allTeams.find(t => t.team_id === mt.teamId);
                          if (!team) return null;
                          return (
                            <TouchableOpacity
                              key={`selected-${mt.teamId}`}
                              style={[styles.chip, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                              onPress={() => toggleTeam(mt.teamId)}
                            >
                              <Text style={[styles.chipText, { color: theme.colors.buttonText, fontWeight: 'bold' }]}>
                                {team.name} ✕
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <SearchWithChips
                    chips={teamSearchChips}
                    onChipsChange={setTeamSearchChips}
                    mode={teamSearchMode}
                    onModeChange={setTeamSearchMode}
                    placeholder="Type team name and press ENTER to search..."
                    resultCount={filteredTeams.length}
                    totalCount={allTeams.length}
                  />

                  {/* Search results - only show when searching */}
                  {teamSearchChips.length > 0 && (
                    <View style={styles.chipContainer}>
                      {filteredTeams.map(t => {
                        const isSelected = memberTeams.some(mt => mt.teamId === t.team_id);
                        return (
                          <TouchableOpacity
                            key={t.team_id}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => toggleTeam(t.team_id)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                { color: isSelected ? theme.colors.buttonText : theme.colors.text },
                                isSelected && { fontWeight: 'bold' }
                              ]}
                              numberOfLines={2}
                              ellipsizeMode="tail"
                            >
                              {t.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {filteredTeams.length === 0 && <Text style={{ color: theme.colors.muted }}>No teams found.</Text>}
                    </View>
                  )}

                  {teamSearchChips.length === 0 && memberTeams.length === 0 && (
                    <Text style={{ color: theme.colors.muted, fontStyle: 'italic' }}>Search to add teams</Text>
                  )}

                  {memberTeams.map(mt => {
                    const team = allTeams.find(t => t.team_id === mt.teamId);
                    if (!team) return null;

                    const sportId = team.sport_id;
                    const sport = allSports.find(s => s.sport_id === sportId);
                    const sportName = sport?.name || 'Unknown Sport';
                    const relevantPositions = allPositions.filter(p => !p.sport_id || p.sport_id === sportId);

                    return (
                      <View key={mt.teamId} style={[styles.teamDetailCard, { borderColor: theme.colors.border, marginLeft: 16, marginTop: 8, borderTopWidth: 1, paddingTop: 8 }]}>
                        <Text style={[styles.teamDetailTitle, { color: theme.colors.primary }]}>
                          <Text style={{ fontWeight: 'bold' }}>{sportName.toUpperCase()} • </Text>
                          {team.name}
                        </Text>

                        <Text style={[styles.label, { color: theme.colors.text }]}>Roles:</Text>
                        <View style={styles.chipContainer}>
                          {allRoles.map(r => {
                            const active = mt.roleIds.includes(r.role_id);
                            return (
                              <TouchableOpacity
                                key={r.role_id}
                                style={[styles.chip, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                onPress={() => toggleRole(mt.teamId, r.role_id)}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    { color: active ? theme.colors.buttonText : theme.colors.text },
                                    active && { fontWeight: 'bold' }
                                  ]}
                                >
                                  {r.name}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>

                        <Text style={[styles.label, { color: theme.colors.text, marginTop: 8 }]}>Positions:</Text>
                        <View style={styles.chipContainer}>
                          {relevantPositions.map(p => {
                            const active = mt.positionIds.includes(p.position_id);
                            return (
                              <TouchableOpacity
                                key={p.position_id}
                                style={[styles.chip, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                onPress={() => togglePosition(mt.teamId, p.position_id)}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    { color: active ? theme.colors.buttonText : theme.colors.text },
                                    active && { fontWeight: 'bold' }
                                  ]}
                                >
                                  {p.name}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                          {relevantPositions.length === 0 && <Text style={{ fontSize: 10, color: theme.colors.muted }}>No positions for this sport.</Text>}
                        </View>

                        <Text style={[styles.label, { color: theme.colors.text, marginTop: 8 }]}>Level:</Text>
                        <View style={styles.chipContainer}>
                          {allLevels.filter(l => l.name !== 'Open').map(l => {
                            const active = mt.levelId === l.level_id;
                            return (
                              <TouchableOpacity
                                key={l.level_id}
                                style={[styles.chip, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                onPress={() => {
                                  setMemberTeams(prev => prev.map(t =>
                                    t.teamId === mt.teamId ? { ...t, levelId: active ? null : l.level_id } : t
                                  ));
                                }}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    { color: active ? theme.colors.buttonText : theme.colors.text },
                                    active && { fontWeight: 'bold' }
                                  ]}
                                >
                                  {l.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <Text style={[styles.label, { color: theme.colors.text, marginTop: 8 }]}>Skill Level:</Text>
                        <View style={styles.chipContainer}>
                          {(() => {
                            // Filter skills for this team's sport
                            const relevantSkills = allSkills.filter(s => s.sport_id === team.sport_id);
                            const isKnownSkill = relevantSkills.some(s => s.skill_id === mt.skillId);
                            // If skillId exists but is not in known skills, it's custom
                            const isCustomSkill = !!mt.skillId && !isKnownSkill;

                            return (
                              <>
                                {relevantSkills.map(s => {
                                  const active = mt.skillId === s.skill_id;
                                  return (
                                    <TouchableOpacity
                                      key={s.skill_id}
                                      style={[styles.chip, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                      onPress={() => {
                                        setMemberTeams(prev => prev.map(t =>
                                          t.teamId === mt.teamId ? { ...t, skillId: s.skill_id } : t
                                        ));
                                      }}
                                    >
                                      <Text
                                        style={[
                                          styles.chipText,
                                          { color: active ? theme.colors.buttonText : theme.colors.text },
                                          active && { fontWeight: 'bold' }
                                        ]}
                                      >
                                        {s.name}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  {/* Custom Skill Option */}
                                  <TouchableOpacity
                                    style={[styles.chip, isCustomSkill ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                    onPress={() => {
                                      if (!isCustomSkill) {
                                        setMemberTeams(prev => prev.map(t =>
                                          t.teamId === mt.teamId ? { ...t, skillId: 'Custom' } : t
                                        ));
                                      } else {
                                        setMemberTeams(prev => prev.map(t =>
                                          t.teamId === mt.teamId ? { ...t, skillId: null } : t
                                        ));
                                      }
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.chipText,
                                        { color: isCustomSkill ? theme.colors.buttonText : theme.colors.text },
                                        isCustomSkill && { fontWeight: 'bold' }
                                      ]}
                                    >
                                      Custom
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Custom Skill Input */}
                                  {isCustomSkill && (
                                    <TextInput
                                      style={[
                                        styles.chip,
                                        {
                                          minWidth: 60,
                                          borderColor: theme.colors.primary,
                                          color: theme.colors.text,
                                          backgroundColor: theme.colors.surface,
                                          paddingHorizontal: 8,
                                          textAlignVertical: 'center'
                                        }
                                      ]}
                                      value={mt.skillId === 'Custom' ? '' : mt.skillId}
                                      placeholder="Enter skill"
                                      placeholderTextColor={theme.colors.muted}
                                      onChangeText={(text) => {
                                        setMemberTeams(prev => prev.map(t =>
                                          t.teamId === mt.teamId ? { ...t, skillId: text } : t
                                        ));
                                      }}
                                    />
                                  )}
                                </View>
                              </>
                            );
                          })()}
                        </View>
                      </View>
                    );
                  })}
                  {memberTeams.length === 0 && <Text style={{ color: theme.colors.muted, marginTop: 20 }}>Select a team above to configure roles.</Text>}
                </View>
              ) : activeTab === 'Contract' ? (
                <>
                  {/* Share Type */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Share Type</Text>
                    <View style={styles.chipContainer}>
                      {[['R', 'OQ', 'OT', 'H'], ['TT', 'TQ', 'F', 'C']].map((row, rowIdx) => (
                        <View key={rowIdx} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {row.map(type => {
                            const isSelected = shareType === type;
                            return (
                              <TouchableOpacity
                                key={type}
                                style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                                onPress={() => {
                                  setShareType(type);
                                  if (type !== 'C') {
                                    setShare((SHARE_TYPE_MAP[type] || 0).toString());
                                  }
                                }}
                              >
                                <Text style={{ color: isSelected ? theme.colors.buttonText : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{type}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Share Percentage - only editable for Custom */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Share (%)</Text>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, width: 80, textAlign: 'center' }]}
                      value={share}
                      editable={shareType === 'C'}
                      onChangeText={(t) => {
                        const num = parseInt(t) || 0;
                        setShare(Math.min(100, Math.max(0, num)).toString());
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.colors.muted}
                    />
                  </View>

                  {/* Membership (v2) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Membership</Text>
                    <View style={styles.chipContainer}>
                      {allMemberships.map(m => {
                        const isSelected = membershipId === m.membership_id;
                        return (
                          <TouchableOpacity
                            key={m.membership_id}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => setMembershipId(isSelected ? null : m.membership_id)}
                          >
                            <Text style={{ color: isSelected ? theme.colors.buttonText : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{m.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Paid Status (v2) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Paid Status</Text>
                    <View style={styles.chipContainer}>
                      {allPaidStatuses.map(ps => {
                        const isSelected = paidStatusId === ps.paid_status_id;
                        return (
                          <TouchableOpacity
                            key={ps.paid_status_id}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => setPaidStatusId(isSelected ? null : ps.paid_status_id)}
                          >
                            <Text style={{ color: isSelected ? theme.colors.buttonText : theme.colors.text, fontWeight: isSelected ? 'bold' : 'normal' }}>{ps.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Paid Amount (v2) */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Paid Amount ($)</Text>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, width: 120, textAlign: 'center' }]}
                      value={paidAmount}
                      onChangeText={setPaidAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.muted}
                    />
                  </View>
                </>
              ) : activeTab === 'Contact' ? (
                <View>
                  <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Contact Information</Text>

                  {/* Existing contacts - clickable to edit */}
                  {memberContacts.map((contact, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.teamDetailCard, { borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => {
                        // Open edit modal with this contact's data
                        setEditingContactIndex(index);
                        setNewContactType(contact.type.toLowerCase()); // Normalize to lowercase for chip matching
                        setNewContactValue(contact.value);
                        setNewContactLabel(contact.label || 'preferred');
                        setAddContactModalVisible(true);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: 'bold', textTransform: 'capitalize' }}>{contact.type}</Text>
                        <Text style={{ color: theme.colors.text }}>{contact.value}</Text>
                        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{contact.label || 'No label'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {memberContacts.length === 0 && (
                    <Text style={{ color: theme.colors.muted, marginBottom: 16 }}>No contacts added yet.</Text>
                  )}

                  {/* Add Contact Button */}
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.colors.primary, alignSelf: 'flex-start' }]}
                    onPress={() => {
                      // Reset for new contact
                      setEditingContactIndex(null);
                      setNewContactType('phone');
                      setNewContactValue('');
                      setNewContactLabel('preferred');
                      setAddContactModalVisible(true);
                    }}
                  >
                    <Text style={[styles.buttonTextBold, { color: theme.colors.buttonText }]}>Add Contact</Text>
                  </TouchableOpacity>
                </View>
              ) : activeTab === 'Other' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Dominant Side</Text>
                    <View style={styles.chipContainer}>
                      {[{ value: 'R', label: 'Right' }, { value: 'L', label: 'Left' }, { value: 'A', label: 'Ambidextrous' }].map(opt => {
                        const isSelected = dominantSide === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                            onPress={() => setDominantSide(opt.value)}
                          >
                            <Text style={{ color: isSelected ? (theme.colors.buttonText as string) : (theme.colors.text as string), fontWeight: isSelected ? 'bold' : 'normal' }}>{opt.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Country of Origin */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Country of Origin</Text>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={countryOfOrigin}
                      onChangeText={setCountryOfOrigin}
                      placeholder="e.g. USA, Canada"
                      placeholderTextColor={theme.colors.muted}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalButtons}>
              {editingMemberId ? (
                <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.colors.error }]} onPress={promptDelete}>
                  <Text style={[styles.buttonTextWhite, { color: theme.colors.errorText }]}>Delete</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.muted }]} onPress={() => setModalVisible(false)}><Text style={{ color: theme.colors.text }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSave}><Text style={[styles.buttonTextBold, { color: theme.colors.buttonText }]}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={importModalVisible} animationType="slide" transparent={false}>
        <ImportScreen
          onBack={() => {
            setImportModalVisible(false);
            loadData();
          }}
          onImportComplete={() => {
            setImportModalVisible(false);
            loadData();
          }}
          teams={allTeams}
          roles={allRoles}
          positions={allPositions}
          sports={allSports}
          skills={allSkills}
          levels={allLevels}
          ageGroups={allAgeGroups}
          genders={allGenders}
        />
      </Modal>

      {/* Add Member Choice Modal */}
      <Modal visible={addMemberChoiceVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.choiceModalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.choiceTitle, { color: theme.colors.text }]}>Add Members</Text>
            <Text style={[styles.choiceMessage, { color: theme.colors.text }]}>
              Would you like to create a single member manually or import multiple members from Excel?
            </Text>
            <View style={styles.choiceButtons}>
              <TouchableOpacity
                style={[styles.choiceButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => setAddMemberChoiceVisible(false)}
              >
                <Text style={[styles.choiceButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setAddMemberChoiceVisible(false);
                  resetForm();
                  setModalVisible(true);
                }}
              >
                <Text style={[styles.choiceButtonText, { color: theme.colors.buttonText }]}>Manual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setAddMemberChoiceVisible(false);
                  handleImportClick();
                }}
              >
                <Text style={[styles.choiceButtonText, { color: theme.colors.buttonText }]}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Contact Modal */}
      <Modal visible={addContactModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, maxHeight: '70%' }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>
              {editingContactIndex !== null ? 'Edit Contact' : 'Add New Contact Method'}
              {editingMemberId && firstName && lastName ? ` (${firstName} ${lastName})` : ''}
            </Text>

            <ScrollView style={styles.modalContent}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Type:</Text>
              <View style={styles.chipContainer}>
                {['phone', 'email', 'whatsapp', 'signal', 'other'].map(type => {
                  const isSelected = newContactType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                      onPress={() => setNewContactType(type)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.buttonText : theme.colors.text },
                          isSelected && { fontWeight: 'bold' }
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Value:</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={newContactValue}
                  onChangeText={setNewContactValue}
                  placeholder={newContactType === 'email' ? 'email@example.com' : newContactType === 'phone' ? '(555) 555-5555' : 'Contact info'}
                  placeholderTextColor={theme.colors.muted}
                  keyboardType={newContactType === 'email' ? 'email-address' : newContactType === 'phone' ? 'phone-pad' : 'default'}
                />
              </View>

              <Text style={[styles.label, { color: theme.colors.text }]}>Label:</Text>
              <View style={styles.chipContainer}>
                {allContactLabels.map(label => {
                  const isSelected = newContactLabel === label.name;
                  return (
                    <TouchableOpacity
                      key={label.label_id}
                      style={[styles.chip, isSelected ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.border }]}
                      onPress={() => setNewContactLabel(label.name)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.buttonText : theme.colors.text },
                          isSelected && { fontWeight: 'bold' }
                        ]}
                      >
                        {label.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              {/* Delete button - only show when editing */}
              {editingContactIndex !== null ? (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => {
                    setMemberContacts(memberContacts.filter((_, i) => i !== editingContactIndex));
                    setAddContactModalVisible(false);
                    setEditingContactIndex(null);
                    setNewContactValue('');
                  }}
                >
                  <Text style={[styles.buttonTextWhite, { color: theme.colors.errorText }]}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: theme.colors.muted }]}
                  onPress={() => {
                    setAddContactModalVisible(false);
                    setEditingContactIndex(null);
                    setNewContactValue('');
                  }}
                >
                  <Text style={{ color: theme.colors.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    if (newContactValue.trim()) {
                      const newContact = { type: newContactType, value: newContactValue.trim(), label: newContactLabel };
                      if (editingContactIndex !== null) {
                        // Update existing contact
                        const updatedContacts = [...memberContacts];
                        updatedContacts[editingContactIndex] = newContact;
                        setMemberContacts(updatedContacts);
                      } else {
                        // Add new contact
                        setMemberContacts([...memberContacts, newContact]);
                      }
                      setNewContactValue('');
                      setEditingContactIndex(null);
                      setAddContactModalVisible(false);
                    }
                  }}
                >
                  <Text style={[styles.buttonTextBold, { color: theme.colors.buttonText }]}>
                    {editingContactIndex !== null ? 'Save' : 'Add'}
                  </Text>
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
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmVisible(false)}
        isDestructive={confirmConfig.isDestructive}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 15 },
  card: { padding: 20, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  textContainer: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: 'bold' },
  detailText: { fontSize: 14, marginTop: 2 },
  addButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  addButtonText: { fontWeight: 'bold' },
  deleteButtonHeader: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  buttonTextWhite: { color: 'white', fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, maxHeight: '90%', borderRadius: 12, padding: 20, borderWidth: 1, display: 'flex', flexDirection: 'column' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalContent: { flexGrow: 1, flexShrink: 1, minHeight: 200 },

  // Use common styles (imported from commonStyles)
  tabContainer: commonStyles.tabContainer,
  tab: commonStyles.tab,
  tabText: commonStyles.tabText,

  inputGroup: { marginBottom: 16 },
  label: commonStyles.label,
  input: commonStyles.input,

  sectionHeader: commonStyles.sectionHeader,
  chipContainer: commonStyles.chipContainer,
  chip: commonStyles.chip,
  chipText: commonStyles.chipText,
  chipSmall: commonStyles.chipSmall,

  teamDetailCard: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
  teamDetailTitle: { fontWeight: 'bold', marginBottom: 8 },
  labelSmall: commonStyles.labelSmall,

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  cancelButton: { padding: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  saveButton: { padding: 12, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  deleteButton: { padding: 12, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  buttonTextBold: { fontWeight: 'bold' },

  // Contact Icons
  contactIconsRow: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  contactIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  contactIcon: { fontSize: 18 },

  // Add Member Choice Modal
  choiceModalContainer: {
    width: '100%',
    maxWidth: 550,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  choiceMessage: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  choiceButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  choiceButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  choiceButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  sportValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
