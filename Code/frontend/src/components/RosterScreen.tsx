import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { Player } from '../types';
import { databaseService } from '../database/sqlite-service';
import { ImportScreen } from './ImportScreen';
import { useTheme } from '../ui/theme';

const SKILL_LEVELS = [3, 3.5, 3.75, 4, 4.25, 4.5, 5, 5.5, 6];

interface EditPlayerModalProps {
  visible: boolean;
  player: Player | null;
  onClose: () => void;
  onSave: (player: Player) => void;
  onDelete?: (playerId: string) => void;
}

// Phone number formatting function
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const phoneNumber = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length <= 3) {
    return phoneNumber;
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }
};

function EditPlayerModal({ visible, player, onClose, onSave, onDelete }: EditPlayerModalProps) {
  const [editedPlayer, setEditedPlayer] = useState<Player | null>(player);

  React.useEffect(() => {
    setEditedPlayer(player);
  }, [player]);

  const handleSave = () => {
    console.log('🔄 Modal Save button clicked!');
    console.log('📝 editedPlayer:', editedPlayer);
    
    if (!editedPlayer) {
      console.log('❌ No edited player found');
      return;
    }
    
    // Validate required fields
    if (!editedPlayer.displayName?.trim()) {
      console.log('❌ Validation failed: Name is required');
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    if (!SKILL_LEVELS.includes(editedPlayer.skill)) {
      console.log('❌ Validation failed: Invalid skill level:', editedPlayer.skill);
      Alert.alert('Error', 'Please select a valid skill level');
      return;
    }

    console.log('✅ Validation passed, calling onSave with:', editedPlayer);
    onSave(editedPlayer);
    onClose();
  };

  const handleDelete = () => {
    if (!editedPlayer) return;
    
    // Use web-compatible confirmation dialog
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(`Are you sure you want to delete ${editedPlayer.displayName}?`)
      : true; // For native, we'll use Alert.alert below
    
    if (Platform.OS === 'web') {
      if (confirmed) {
        onDelete?.(editedPlayer.id);
        onClose();
      }
    } else {
      Alert.alert(
        'Delete Player',
        `Are you sure you want to delete ${editedPlayer.displayName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onDelete?.(editedPlayer.id);
              onClose();
            }
          }
        ]
      );
    }
  };

  if (!editedPlayer) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {player?.id.startsWith('new-') ? 'Add Player' : 'Edit Player'}
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerCancelButton} 
              onPress={onClose}
            >
              <Text style={styles.headerCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerSaveButton} 
              onPress={handleSave}
            >
              <Text style={styles.headerSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={editedPlayer.displayName || ''}
              onChangeText={(text) => setEditedPlayer({ ...editedPlayer, displayName: text })}
              placeholder="Enter player name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Skill Level *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillScrollView}>
              <View style={styles.skillPickerContainer}>
                {SKILL_LEVELS.map((skill) => (
                  <TouchableOpacity
                    key={skill}
                    style={[
                      styles.skillOption,
                      editedPlayer.skill === skill && styles.skillOptionActive
                    ]}
                    onPress={() => setEditedPlayer({ ...editedPlayer, skill })}
                  >
                    <Text style={[
                      styles.skillOptionText,
                      editedPlayer.skill === skill && styles.skillOptionTextActive
                    ]}>
                      {skill}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Handedness</Text>
            <View style={styles.segmentedControl}>
              {(['L', 'R', 'A'] as const).map((hand) => (
                <TouchableOpacity
                  key={hand}
                  style={[
                    styles.segmentButton,
                    editedPlayer.handed === hand && styles.segmentButtonActive
                  ]}
                  onPress={() => setEditedPlayer({ ...editedPlayer, handed: hand })}
                >
                  <Text style={[
                    styles.segmentText,
                    editedPlayer.handed === hand && styles.segmentTextActive
                  ]}>
                    {hand === 'L' ? 'Left' : hand === 'R' ? 'Right' : 'Ambidextrous'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editedPlayer.phone || ''}
              onChangeText={(text) => {
                const formatted = formatPhoneNumber(text);
                setEditedPlayer({ ...editedPlayer, phone: formatted });
              }}
              placeholder="(508) 555-1234"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={editedPlayer.email || ''}
              onChangeText={(text) => setEditedPlayer({ ...editedPlayer, email: text })}
              placeholder="player@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!player?.id.startsWith('new-') && (player?.createdAt || player?.updatedAt) && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Timestamps</Text>
              {player?.createdAt && (
                <Text style={styles.timestampText}>
                  Created: {new Date(player.createdAt).toLocaleString()}
                </Text>
              )}
              {player?.updatedAt && (
                <Text style={styles.timestampText}>
                  Updated: {new Date(player.updatedAt).toLocaleString()}
                </Text>
              )}
            </View>
          )}

          {!player?.id.startsWith('new-') && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Player</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlayerRow({ player, onEdit }: { player: Player; onEdit: (player: Player) => void }) {
  const getShareLabel = (shareType?: string) => {
    switch (shareType) {
      case 'F': return 'Full';
      case 'TQ': return '3/4';
      case 'TT': return '2/3';
      case 'H': return '1/2';
      case 'OT': return '1/3';
      case 'R': return 'Reserve';
      case 'C': return 'Custom';
      default: return shareType || 'R';
    }
  };

  const formatLastUpdated = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return `Updated ${date.toLocaleString()}`;
    if (diffInHours < 24) return `Updated ${date.toLocaleString()}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Updated ${date.toLocaleString()}`;
    
    return `Updated ${date.toLocaleString()}`;
  };

  return (
    <TouchableOpacity style={styles.playerRow} onPress={() => onEdit(player)}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.displayName}</Text>
        <View style={styles.playerDetails}>
          <Text style={styles.playerDetail}>Skill: {player.skill}</Text>
          <Text style={styles.playerDetail}>
            Hand: {player.handed === 'L' ? 'Left' : player.handed === 'R' ? 'Right' : 'Ambidextrous'}
          </Text>
          <Text style={styles.playerDetail}>
            Share: {getShareLabel(player.shareType)} ({player.sharePercentage || 0}%)
          </Text>
          {player.updatedAt && (
            <Text style={styles.playerTimestamp}>{formatLastUpdated(player.updatedAt)}</Text>
          )}
        </View>
        {player.phone && (
          <Text style={styles.playerContact}>{player.phone}</Text>
        )}
        {player.email && (
          <Text style={styles.playerContact}>{player.email}</Text>
        )}
      </View>
      <View style={styles.skillBadge}>
        <Text style={styles.skillText}>{player.skill}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RosterScreen() {
  console.log('🎾 RosterScreen rendered');
  console.log('🌐 Platform.OS:', Platform.OS);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showImportScreen, setShowImportScreen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    initializeAndLoad();
  }, []);

  // Database is always initialized on component mount
  useEffect(() => {
    initializeAndLoad();
  }, []);



  const initializeAndLoad = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Initializing database (force=true)');
      await databaseService.init(true);
      
      setInitialized(true);
      await loadPlayers();
    } catch (err) {
      setError('Failed to initialize database');
      console.error('💥 Error initializing database:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    console.log('📥 loadPlayers called');
    try {
      console.log('🗄️ Loading from database service');
      const dbPlayers = await databaseService.getPlayers(true);
      console.log('🗄️ Database returned:', dbPlayers.length, 'players');
      console.log('🗄️ Setting players state with:', dbPlayers);
      setPlayers(dbPlayers);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('💥 loadPlayers failed:', err);
      setError('Failed to load players: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddPlayer = () => {
    console.log('➕ Add Player button clicked');
    const newPlayer: Player = {
      id: `new-${Date.now()}`,
      displayName: '',
      skill: 3.5,
      handed: 'R'
    };
    console.log('🆕 Created new player template:', newPlayer);
    setEditingPlayer(newPlayer);
    setModalVisible(true);
    console.log('🎭 Modal opened for new player');
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setModalVisible(true);
  };

  const handleSavePlayer = async (player: Player) => {
    console.log('🚀 handleSavePlayer called with:', player);
    console.log('🌐 Is web platform:', databaseService.isWebPlatform());
    console.log('🆔 Player ID:', player.id, 'Starts with new?', player.id.startsWith('new-'));
    
    try {
      // For now, let's focus only on web since that's what's being used
      if (player.id.startsWith('new-')) {
        console.log('➕ Adding new player');
        const playerData = {
          displayName: player.displayName,
          skill: player.skill,
          handed: player.handed,
          phone: player.phone,
          email: player.email
        };
        console.log('📤 Calling databaseService.addPlayer with:', playerData);
        const playerId = await databaseService.addPlayer(playerData, true);
        console.log('✅ Database addPlayer returned ID:', playerId);
        
      } else {
        console.log('✏️ Updating existing player');
        const updateData = {
          displayName: player.displayName,
          skill: player.skill,
          handed: player.handed,
          phone: player.phone,
          email: player.email
        };
        console.log('📤 Calling databaseService.updatePlayer with ID:', player.id, 'data:', updateData);
        await databaseService.updatePlayer(player.id, updateData, true);
        console.log('✅ Database updatePlayer completed');
      }
      
      console.log('🔄 Reloading from database');
      await loadPlayers();
      console.log('🎉 Save operation completed!');
      
      // Close the modal after successful save
      setModalVisible(false);
      setEditingPlayer(null);
    } catch (err) {
      console.error('💥 Save operation failed:', err);
      setError('Failed to save player: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    console.log('🗑️ handleDeletePlayer called with ID:', playerId);
    
    try {
      console.log('🗑️ Deleting player from database');
      await databaseService.deletePlayer(playerId, true);
      console.log('✅ Database deletePlayer completed');
      
      console.log('🔄 Reloading from database');
      await loadPlayers();
      console.log('🎉 Delete operation completed!');
    } catch (err) {
      console.error('💥 Delete operation failed:', err);
      setError('Failed to delete player: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleClearAllPlayers = () => {
    console.log('🧹 Clear All Players button clicked');
    
    // Use browser confirm for web compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to delete ALL players from the roster?\n\nThis action cannot be undone.'
      );
      
      if (confirmed) {
        performClearAll();
      }
    } else {
      // Use React Native Alert for mobile
      Alert.alert(
        'Clear All Players',
        'Are you sure you want to delete ALL players from the roster? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: performClearAll,
          },
        ]
      );
    }
  };

  const performClearAll = async () => {
    try {
      console.log('🧹 Proceeding with clear all players');
      
      // Clear any existing errors first
      setError(null);
      setLoading(true);
      
      await databaseService.clearAllPlayers(true);
      console.log('🧹 All players cleared successfully');
      
      // Force reload from database 
      console.log('🔄 Reloading players after clear all...');
      await loadPlayers();
      console.log('🔄 Roster refreshed after clear all');
      
    } catch (error) {
      console.error('💥 performClearAll failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear all players';
      setError(errorMessage);
      
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      console.log('🔄 Clearing loading state');
      setLoading(false);
    }
  };

  const sortedRoster = [...players].sort((a, b) => 
    (a.displayName || '').localeCompare(b.displayName || '')
  );

  // Show loading state during initialization
  if (!initialized && loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.loadingText, { color: theme.colors.muted }]}>Initializing database...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if initialization failed
  if (error && !initialized) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>Database Error</Text>
          <Text style={[styles.errorDetail, { color: theme.colors.muted }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} onPress={initializeAndLoad}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Tennis Roster</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={[styles.clearAllButton, { backgroundColor: theme.colors.error }]} onPress={handleClearAllPlayers}>
            <Text style={styles.clearAllButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.importButton, { backgroundColor: theme.colors.accent }]} onPress={() => setShowImportScreen(true)}>
            <Text style={styles.importButtonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddPlayer}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.statsText, { color: theme.colors.muted }]}>{players.length} players</Text>
        <Text style={[styles.statsText, { color: theme.colors.muted }]}> 
          Avg skill: {players.length > 0 ? (players.reduce((sum: number, p: Player) => sum + p.skill, 0) / players.length).toFixed(1) : '0.0'}
        </Text>
        {loading && <Text style={[styles.loadingIndicator, { color: theme.colors.muted }]}>Syncing...</Text>}
        {!loading && players.length === 0 && !error && (
          <Text style={[styles.emptyStateText, { color: theme.colors.muted }]}>No players in roster. Use Import or Add to get started.</Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={sortedRoster}
        keyExtractor={(player) => player.id}
        renderItem={({ item }) => (
          <PlayerRow player={item} onEdit={handleEditPlayer} />
        )}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <EditPlayerModal
        visible={modalVisible}
        player={editingPlayer}
        onClose={() => {
          setModalVisible(false);
          setEditingPlayer(null);
        }}
        onSave={handleSavePlayer}
        onDelete={handleDeletePlayer}
      />

      {showImportScreen && (
        <Modal visible={showImportScreen} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
            <ImportScreen
              onBack={async () => {
                console.log('🔄 Returning from Import screen, refreshing roster...');
                setShowImportScreen(false);
                setLoading(true);
                try {
                  await loadPlayers(); // Refresh when returning from import
                  console.log('🔄 Roster refreshed after returning from import');
                } catch (error) {
                  console.error('💥 Failed to refresh after returning from import:', error);
                } finally {
                  setLoading(false);
                }
              }}
              onImportComplete={async () => {
                console.log('🔄 Import completed, refreshing roster...');
                setShowImportScreen(false);
                setLoading(true);
                try {
                  await loadPlayers(); // Refresh the roster after import
                  console.log('🔄 Roster refreshed after import');
                } catch (error) {
                  console.error('💥 Failed to refresh after import:', error);
                } finally {
                  setLoading(false);
                }
              }}
            />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearAllButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#6f42c1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statsText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  playerDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  playerDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 16,
  },
  playerTimestamp: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 2,
  },
  playerContact: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  skillBadge: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  skillText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerCancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerCancelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  headerSaveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  timestampText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#007bff',
  },
  segmentText: {
    fontSize: 14,
    color: '#495057',
  },
  segmentTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Skill picker styles
  skillScrollView: {
    maxHeight: 60,
  },
  skillPickerContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  skillOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    backgroundColor: 'white',
    minWidth: 60,
    alignItems: 'center',
  },
  skillOptionActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  skillOptionText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  skillOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Loading and error styles
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingIndicator: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  formActions: {
    marginTop: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});