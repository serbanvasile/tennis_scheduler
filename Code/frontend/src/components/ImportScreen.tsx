import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';
import { ScreenHeader } from './ScreenHeader';
import { Team, Role, Sport, Position } from '../types';

// interface Position {
//   position_id: number | string;
//   name: string;
//   sport_id: number | string;
// }

interface ParsedMember {
  displayName: string;
  skill: string;
  gender: string;
  handed: string;
  phone: string;
  email: string;
  tags: string[];
  share: number;
  shareType: string;
  sharePercentage: number;
}

interface ImportScreenProps {
  onBack: () => void;
  onImportComplete: () => void;
  teams: Team[];
  roles: Role[];
  positions: Position[];
  sports: Sport[];
  skills: any[];
  levels: any[];
  ageGroups: any[];
  genders: any[];
}

export const ImportScreen: React.FC<ImportScreenProps> = ({
  onBack,
  onImportComplete,
  teams,
  roles,
  positions,
  sports,
  skills,
  levels,
  ageGroups,
  genders
}) => {
  const [clipboardData, setClipboardData] = useState('');
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [importMode, setImportMode] = useState<'update' | 'add-new'>('update');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const { theme } = useTheme();

  // Default Assignments State
  const [selectedTeamId, setSelectedTeamId] = useState<number | string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<(number | string)[]>([]);
  const [selectedPositionIds, setSelectedPositionIds] = useState<(number | string)[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | string | null>(null);

  const sampleData = `#\tNAME\tGender\tShare\tCell\tLevel
1\tAlex Johnson\tM\tTQ\t(555) 123-4567\t3.5
2\tSam Williams\tF\tTQ\t(555) 234-5678\t4.0
3\tJordan Smith\tM\tH\t(555) 345-6789\t3.5`;

  // Get selected team's sport for filtering positions
  const selectedTeam = teams.find(t => t.team_id === selectedTeamId);
  const selectedSportId = selectedTeam?.sport_id;
  const filteredPositions = positions.filter(p => p.sport_id === selectedSportId);

  const handleParseData = () => {
    try {
      if (!clipboardData.trim()) {
        Alert.alert('Error', 'Please paste clipboard data first');
        return;
      }

      const members = parseClipboardDataLocal(clipboardData);
      setParsedMembers(members);
      setImportResults(null);
    } catch (error) {
      console.error('Parse error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse clipboard data';
      Alert.alert('Parse Error', errorMessage);
    }
  };

  // Local parsing function with dynamic column detection
  const parseClipboardDataLocal = (text: string): ParsedMember[] => {
    const lines = text.trim().split('\n');
    const members: ParsedMember[] = [];

    // Column indices (will be detected from header, -1 means not found)
    let colName = -1, colGender = -1, colShare = -1, colPhone = -1, colSkill = -1;
    let hasHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split('\t');

      // Need at least 1 column (name)
      if (parts.length < 1) continue;

      // Detect header row and column positions
      const lowerParts = parts.map(p => p.toLowerCase().trim());
      if (lowerParts.includes('name') && !hasHeader) {
        hasHeader = true;
        colName = lowerParts.findIndex(p => p === 'name');
        colGender = lowerParts.findIndex(p => p === 'gender' || p === 'sex');
        colShare = lowerParts.findIndex(p => p === 'share' || p === 'type');
        colPhone = lowerParts.findIndex(p => p === 'cell' || p === 'phone' || p === 'mobile');
        colSkill = lowerParts.findIndex(p => p === 'level' || p === 'skill' || p === 'rating');
        continue; // Skip header
      }

      // If no header detected, assume first column is name (fallback)
      if (colName === -1) {
        colName = 0;
      }

      const shareTypeMap: { [key: string]: number } = {
        'F': 100, 'TQ': 75, 'TT': 67, 'H': 50, 'OT': 33, 'R': 0, 'C': 0
      };

      const displayName = parts[colName]?.trim() || '';
      if (!displayName) continue;

      // All other fields are optional with sensible defaults
      const genderRaw = colGender >= 0 && parts[colGender] ? parts[colGender].trim().toUpperCase() : '';
      const gender = genderRaw === 'M' || genderRaw === 'MALE' ? 'M' :
        genderRaw === 'F' || genderRaw === 'FEMALE' ? 'F' : 'U';

      const shareRaw = colShare >= 0 && parts[colShare] ? parts[colShare].trim().toUpperCase() : 'F';
      const shareType = shareRaw || 'F';
      const sharePercentage = shareTypeMap[shareType] ?? 100;

      const skillRaw = colSkill >= 0 && parts[colSkill] ? parts[colSkill].trim() : '';
      const phone = colPhone >= 0 && parts[colPhone] ? parts[colPhone].trim() : '';

      members.push({
        displayName,
        skill: skillRaw || '3.5',
        gender,
        handed: 'R',
        phone: phone || '',
        email: '',
        tags: [],
        share: sharePercentage,
        shareType: shareType,
        sharePercentage: sharePercentage
      });
    }

    if (members.length === 0) {
      throw new Error('No valid members found. Check the data format.');
    }

    return members;
  };

  const handleImport = async () => {
    if (parsedMembers.length === 0) {
      Alert.alert('Error', 'No members to import. Please parse data first.');
      return;
    }

    if (!selectedTeamId) {
      Alert.alert('Error', 'Please select a team to assign imported members to.');
      return;
    }

    if (selectedRoleIds.length === 0) {
      Alert.alert('Error', 'Please select at least one role for imported members.');
      return;
    }

    if (selectedPositionIds.length === 0) {
      Alert.alert('Error', 'Please select at least one position for imported members.');
      return;
    }

    if (!selectedLevelId) {
      Alert.alert('Error', 'Please select a level for imported members.');
      return;
    }

    setIsImporting(true);
    try {
      // Import members one by one with team/role/position assignments
      let imported = 0;
      const errors: string[] = [];

      for (const member of parsedMembers) {
        try {
          // Split display name into first/last
          const nameParts = member.displayName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Build contacts array from phone/email
          const contacts: any[] = [];
          if (member.phone) {
            contacts.push({ type: 'phone', value: member.phone, label: 'preferred' });
          }
          if (member.email) {
            contacts.push({ type: 'email', value: member.email, label: 'preferred' });
          }

          // Find the skill_id based on skill name and selected team's sport
          // Normalize skill value: ensure numeric skills have proper decimal format (e.g., "3" -> "3.0")
          const teamSportId = selectedTeam?.sport_id;
          let normalizedSkill = member.skill;
          const skillNum = parseFloat(member.skill);
          if (!isNaN(skillNum)) {
            // If it's a whole number, add .0 suffix to match database format
            if (Number.isInteger(skillNum)) {
              normalizedSkill = skillNum.toFixed(1);
            }
          }

          // Try exact match first with normalized skill
          let matchingSkill = skills.find(s =>
            s.sport_id === teamSportId && s.name === normalizedSkill
          );

          // If no match, try matching without decimal normalization
          if (!matchingSkill) {
            matchingSkill = skills.find(s =>
              s.sport_id === teamSportId && s.name === member.skill
            );
          }

          // If still no match, try numeric comparison for close matches (within 0.1)
          if (!matchingSkill && !isNaN(skillNum)) {
            matchingSkill = skills.find(s => {
              if (s.sport_id !== teamSportId) return false;
              const dbSkillNum = parseFloat(s.name);
              if (isNaN(dbSkillNum)) return false;
              return Math.abs(dbSkillNum - skillNum) < 0.01;
            });
          }

          const skillId = matchingSkill?.skill_id || null;
          if (!skillId && member.skill) {
            console.warn(`Could not match skill "${member.skill}" for ${member.displayName}, available skills:`,
              skills.filter(s => s.sport_id === teamSportId).map(s => s.name));
          }

          // Determine role IDs: if shareType is 'R' (Reserve), use the Reserve role instead of defaults
          let memberRoleIds = selectedRoleIds;
          if (member.shareType === 'R') {
            const reserveRole = roles.find(r => r.name === 'Reserve');
            if (reserveRole) {
              memberRoleIds = [reserveRole.role_id];
            }
          }

          // Create member with new fields AND team/role/position/contacts assignments
          // Get defaults for v2 fields
          const ageGroupIds = getDefaultAgeGroupParticipation();
          const genderCategoryIds = getDefaultGenderParticipation(member.gender);

          const result = await databaseService.createMember(
            {
              first_name: firstName,
              last_name: lastName,
              display_name: firstName, // Default display name to first name only
              gender: member.gender,
              dominant_side: member.handed,
              share: member.sharePercentage,
              share_type: member.shareType,
              // New v2 fields with defaults
              age_group_ids: ageGroupIds,
              gender_category_ids: genderCategoryIds
            },
            [{ teamId: selectedTeamId, roleIds: memberRoleIds, positionIds: selectedPositionIds, skillId, levelId: selectedLevelId }],
            contacts
          );

          if (result.member_id) {
            imported++;
          } else if (result.error) {
            errors.push(`${member.displayName}: ${result.error}`);
          }
        } catch (err) {
          errors.push(`${member.displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      const results = { imported, updated: 0, errors };
      setImportResults(results);

      if (errors.length > 0) {
        // Errors occurred - stay on import screen and display errors
        Alert.alert(
          'Import Completed with Errors',
          `Imported: ${results.imported} members\nErrors: ${errors.length}\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`
        );
      } else {
        // All successful - close import screen and refresh member list
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import members';
      Alert.alert('Import Error', errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateSharePercentage = (index: number, percentage: number) => {
    const updatedMembers = [...parsedMembers];
    updatedMembers[index].sharePercentage = percentage;
    updatedMembers[index].share = percentage;
    setParsedMembers(updatedMembers);
  };

  const getShareTypeLabel = (shareType: string) => {
    switch (shareType) {
      case 'F': return 'Full (100%)';
      case 'TQ': return 'Three Quarters (75%)';
      case 'TT': return 'Two Thirds (67%)';
      case 'H': return 'Half (50%)';
      case 'OT': return 'One Third (33%)';
      case 'R': return 'Reserve (0%)';
      case 'C': return 'Custom';
      default: return shareType;
    }
  };

  const toggleRole = (roleId: number | string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const togglePosition = (positionId: number | string) => {
    setSelectedPositionIds(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    );
  };

  // Helper function to get default gender participation based on member gender
  const getDefaultGenderParticipation = (memberGender: string): string[] => {
    // Find gender IDs
    const menGender = genders.find((g: any) => g.name === 'Men');
    const womenGender = genders.find((g: any) => g.name === 'Women');
    const mixedGender = genders.find((g: any) => g.name === 'Mixed');
    const openGender = genders.find((g: any) => g.name === 'Open');

    const ids: string[] = [];
    if (memberGender === 'M') {
      if (menGender) ids.push(menGender.gender_id);
      if (mixedGender) ids.push(mixedGender.gender_id);
      if (openGender) ids.push(openGender.gender_id);
    } else if (memberGender === 'F') {
      if (womenGender) ids.push(womenGender.gender_id);
      if (mixedGender) ids.push(mixedGender.gender_id);
      if (openGender) ids.push(openGender.gender_id);
    }
    return ids;
  };

  // Get default Adult age group ID
  const getDefaultAgeGroupParticipation = (): string[] => {
    const adultAgeGroup = ageGroups.find((ag: any) => ag.name === 'Adult');
    return adultAgeGroup ? [adultAgeGroup.age_group_id] : [];
  };

  const canImport = selectedTeamId && selectedRoleIds.length > 0 && selectedPositionIds.length > 0 && selectedLevelId && parsedMembers.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, backgroundColor: theme.colors.background }}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ScreenHeader
            title="Import Members"
            rightAction={
              <TouchableOpacity onPress={onBack}>
                <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            }
          />

          <ScrollView style={styles.scrollContent}>
            {/* Section 1: Paste Data */}
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Paste Clipboard Data</Text>
              <Text style={[styles.helpText, { color: theme.colors.muted }]}>
                Copy data from Excel with columns: #, NAME, Share, Cell, Level
              </Text>
              <Text style={[styles.sampleLabel, { color: theme.colors.text }]}>Sample format:</Text>
              <Text style={[styles.sampleData, { backgroundColor: theme.colors.card, color: theme.colors.text }]}>{sampleData}</Text>

              <TextInput
                style={[styles.textArea, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                multiline
                placeholder="Paste your clipboard data here..."
                placeholderTextColor={theme.colors.muted}
                value={clipboardData}
                onChangeText={setClipboardData}
                numberOfLines={6}
              />

              <TouchableOpacity style={[styles.parseButton, { backgroundColor: theme.colors.primary }]} onPress={handleParseData}>
                <Text style={[styles.parseButtonText, { color: theme.colors.buttonText }]}>Parse Data</Text>
              </TouchableOpacity>
            </View>

            {/* Section 2: Default Assignments (Required) */}
            {parsedMembers.length > 0 && (
              <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Default Assignments (Required)</Text>
                <Text style={[styles.helpText, { color: theme.colors.muted }]}>
                  All imported members will be assigned to the selected team, roles, and positions.
                </Text>

                {/* Team Selection */}
                <Text style={[styles.subLabel, { color: theme.colors.text }]}>Select Team *</Text>
                <View style={styles.chipContainer}>
                  {teams.map(team => {
                    const sport = sports.find(s => s.sport_id === team.sport_id);
                    return (
                      <TouchableOpacity
                        key={team.team_id}
                        style={[
                          styles.chip,
                          { borderColor: theme.colors.border },
                          selectedTeamId === team.team_id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => {
                          setSelectedTeamId(team.team_id);
                          setSelectedPositionIds([]); // Reset positions when team changes
                        }}
                      >
                        <Text style={[
                          { color: theme.colors.text },
                          selectedTeamId === team.team_id && { color: theme.colors.buttonText, fontWeight: 'bold' }
                        ]}>
                          {sport?.name || 'Unknown'} • {team.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Role Selection */}
                <Text style={[styles.subLabel, { color: theme.colors.text }]}>Select Role(s) *</Text>
                <View style={styles.chipContainer}>
                  {roles.map(role => (
                    <TouchableOpacity
                      key={role.role_id}
                      style={[
                        styles.chip,
                        { borderColor: theme.colors.border },
                        selectedRoleIds.includes(role.role_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => toggleRole(role.role_id)}
                    >
                      <Text style={[
                        { color: theme.colors.text },
                        selectedRoleIds.includes(role.role_id) && { color: theme.colors.buttonText, fontWeight: 'bold' }
                      ]}>
                        {role.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Position Selection (filtered by team's sport) */}
                <Text style={[styles.subLabel, { color: theme.colors.text }]}>Select Position(s) *</Text>
                {selectedTeamId ? (
                  <View style={styles.chipContainer}>
                    {filteredPositions.length > 0 ? (
                      filteredPositions.map(pos => (
                        <TouchableOpacity
                          key={pos.position_id}
                          style={[
                            styles.chip,
                            { borderColor: theme.colors.border },
                            selectedPositionIds.includes(pos.position_id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          ]}
                          onPress={() => togglePosition(pos.position_id)}
                        >
                          <Text style={[
                            { color: theme.colors.text },
                            selectedPositionIds.includes(pos.position_id) && { color: theme.colors.buttonText, fontWeight: 'bold' }
                          ]}>
                            {pos.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={{ color: theme.colors.muted }}>No positions defined for this sport.</Text>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: theme.colors.muted }}>Select a team first to see positions.</Text>
                )}

                {/* Level Selection (Amateur/Pro only) */}
                <Text style={[styles.subLabel, { color: theme.colors.text }]}>Select Level *</Text>
                <View style={styles.chipContainer}>
                  {levels.filter((l: any) => l.name !== 'Open').map((level: any) => (
                    <TouchableOpacity
                      key={level.level_id}
                      style={[
                        styles.chip,
                        { borderColor: theme.colors.border },
                        selectedLevelId === level.level_id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => setSelectedLevelId(selectedLevelId === level.level_id ? null : level.level_id)}
                    >
                      <Text style={[
                        { color: theme.colors.text },
                        selectedLevelId === level.level_id && { color: theme.colors.buttonText, fontWeight: 'bold' }
                      ]}>
                        {level.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Section 3: Import Mode */}
            {parsedMembers.length > 0 && (
              <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Import Mode</Text>
                <View style={styles.modeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { borderColor: theme.colors.border },
                      importMode === 'update' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setImportMode('update')}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      { color: theme.colors.text },
                      importMode === 'update' && { color: theme.colors.buttonText, fontWeight: 'bold' }
                    ]}>
                      Update Existing
                    </Text>
                    <Text style={[styles.modeHelpText, { color: importMode === 'update' ? theme.colors.buttonText : theme.colors.muted }]}>Update existing members by name, add new ones</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { borderColor: theme.colors.border },
                      importMode === 'add-new' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => setImportMode('add-new')}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      { color: theme.colors.text },
                      importMode === 'add-new' && { color: theme.colors.buttonText, fontWeight: 'bold' }
                    ]}>
                      Add New Only
                    </Text>
                    <Text style={[styles.modeHelpText, { color: importMode === 'add-new' ? theme.colors.buttonText : theme.colors.muted }]}>Always create new members, even if names match</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Section 4: Preview */}
            {parsedMembers.length > 0 && (
              <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Preview ({parsedMembers.length} members)</Text>
                <View style={[styles.previewContainer, { borderColor: theme.colors.border }]}>
                  {parsedMembers.map((member, index) => (
                    <View key={index} style={[styles.memberPreview, { borderBottomColor: theme.colors.border }]}>
                      <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.displayName}</Text>
                      <Text style={[styles.memberDetail, { color: theme.colors.muted }]}>Skill: {member.skill} | Phone: {member.phone}</Text>
                      <View style={styles.shareRow}>
                        <Text style={[styles.shareLabel, { color: theme.colors.text }]}>
                          Share: {getShareTypeLabel(member.shareType)}
                        </Text>
                        {member.shareType === 'C' && (
                          <TextInput
                            style={[styles.customPercentageInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                            value={member.sharePercentage.toString()}
                            onChangeText={(text) => {
                              const percentage = parseInt(text) || 0;
                              handleUpdateSharePercentage(index, Math.min(100, Math.max(0, percentage)));
                            }}
                            keyboardType="numeric"
                            placeholder="0-100"
                            placeholderTextColor={theme.colors.muted}
                          />
                        )}
                        <Text style={[styles.percentageText, { color: theme.colors.muted }]}>({member.sharePercentage}%)</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Section 5: Import Button */}
            {parsedMembers.length > 0 && (
              <View style={[styles.section, { borderBottomWidth: 0 }]}>
                <TouchableOpacity
                  style={[
                    styles.importButton,
                    { backgroundColor: canImport ? theme.colors.primary : theme.colors.muted },
                    isImporting && styles.importButtonDisabled
                  ]}
                  onPress={handleImport}
                  disabled={isImporting || !canImport}
                >
                  <Text style={[styles.importButtonText, { color: canImport ? theme.colors.buttonText : 'white' }]}>
                    {isImporting
                      ? 'Importing...'
                      : importResults
                        ? `✓ Imported: ${importResults.imported}${importResults.errors?.length > 0 ? `, Errors: ${importResults.errors.length}` : ''}`
                        : canImport
                          ? `Import ${parsedMembers.length} Members`
                          : 'Select team, roles, and positions to import'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    marginBottom: 8,
  },
  sampleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  sampleData: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  parseButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeHelpText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  previewContainer: {
    maxHeight: 300,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  memberPreview: {
    padding: 12,
    borderBottomWidth: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareLabel: {
    fontSize: 14,
    flex: 1,
  },
  customPercentageInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 4,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  percentageText: {
    fontSize: 14,
  },
  importButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
