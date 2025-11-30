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
} from 'react-native';
import { databaseService } from '../database/sqlite-service';
import { useTheme } from '../ui/theme';

interface ParsedPlayer {
  displayName: string;
  skill: number;
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
}

export const ImportScreen: React.FC<ImportScreenProps> = ({ onBack, onImportComplete }) => {
  const [clipboardData, setClipboardData] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [importMode, setImportMode] = useState<'update' | 'add-new'>('update');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const { theme } = useTheme();

  const sampleData = `#	NAME	Share	Cell	Level
1	Bill Tauriello	TQ	(908) 304-2902	3
2	Bill Taylor	TQ	(908) 217-2116	3.5
3	Bob Alexander	TQ	(908) 507-7500	3`;

  const handleParseData = () => {
    try {
      if (!clipboardData.trim()) {
        Alert.alert('Error', 'Please paste clipboard data first');
        return;
      }

      const players = databaseService.parseClipboardData(clipboardData);
      setParsedPlayers(players);
      setImportResults(null);
    } catch (error) {
      console.error('Parse error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse clipboard data';
      Alert.alert('Parse Error', errorMessage);
    }
  };

  const handleImport = async () => {
    if (parsedPlayers.length === 0) {
      Alert.alert('Error', 'No players to import. Please parse data first.');
      return;
    }

    setIsImporting(true);
    try {
      const results = await databaseService.importPlayers(parsedPlayers, importMode, true);
      setImportResults(results);
      
      if (results.errors && results.errors.length > 0) {
        Alert.alert(
          'Import Completed with Warnings',
          `Imported: ${results.imported}, Updated: ${results.updated}, Errors: ${results.errors.length}\n\nCheck console for error details.`
        );
      } else {
        Alert.alert(
          'Import Successful',
          `Imported: ${results.imported}, Updated: ${results.updated}`,
          [{ text: 'OK', onPress: onImportComplete }]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import players';
      Alert.alert('Import Error', errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateSharePercentage = (index: number, percentage: number) => {
    const updatedPlayers = [...parsedPlayers];
    updatedPlayers[index].sharePercentage = percentage;
    updatedPlayers[index].share = percentage; // Keep backwards compatibility
    setParsedPlayers(updatedPlayers);
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Import Players</Text>
      </View>

      <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Paste Clipboard Data</Text>
        <Text style={[styles.helpText, { color: theme.colors.muted }]}>
          Copy data from Excel with columns: #, NAME, Share, Cell, Level
        </Text>
        <Text style={[styles.sampleLabel, { color: theme.colors.text }]}>Sample format:</Text>
        <Text style={[styles.sampleData, { backgroundColor: theme.colors.card, color: theme.colors.text }]}>{sampleData}</Text>
        
        <TextInput
          style={[styles.textArea, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
          multiline
          placeholder="Paste your clipboard data here..."
          placeholderTextColor={theme.colors.muted}
          value={clipboardData}
          onChangeText={setClipboardData}
          numberOfLines={6}
        />
        
        <TouchableOpacity style={[styles.parseButton, { backgroundColor: theme.colors.primary }]} onPress={handleParseData}>
          <Text style={styles.parseButtonText}>Parse Data</Text>
        </TouchableOpacity>
      </View>

      {parsedPlayers.length > 0 && (
        <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Import Mode</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: theme.colors.border },
                importMode === 'update' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.card } // using card for active bg might need opacity but let's stick to theme
              ]}
              onPress={() => setImportMode('update')}
            >
              <Text style={[
                styles.modeButtonText,
                { color: theme.colors.text },
                importMode === 'update' && { color: theme.colors.primary }
              ]}>
                Update Existing
              </Text>
              <Text style={[styles.modeHelpText, { color: theme.colors.muted }]}>Update existing players by name, add new ones</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: theme.colors.border },
                importMode === 'add-new' && { borderColor: theme.colors.primary, backgroundColor: theme.colors.card }
              ]}
              onPress={() => setImportMode('add-new')}
            >
              <Text style={[
                styles.modeButtonText,
                { color: theme.colors.text },
                importMode === 'add-new' && { color: theme.colors.primary }
              ]}>
                Add New Only
              </Text>
              <Text style={[styles.modeHelpText, { color: theme.colors.muted }]}>Always create new players, even if names match</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {parsedPlayers.length > 0 && (
        <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Preview ({parsedPlayers.length} players)</Text>
          <ScrollView style={[styles.previewContainer, { borderColor: theme.colors.border }]} nestedScrollEnabled>
            {parsedPlayers.map((player, index) => (
              <View key={index} style={[styles.playerPreview, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.playerName, { color: theme.colors.text }]}>{player.displayName}</Text>
                <Text style={[styles.playerDetail, { color: theme.colors.muted }]}>Skill: {player.skill} | Phone: {player.phone}</Text>
                <View style={styles.shareRow}>
                  <Text style={[styles.shareLabel, { color: theme.colors.text }]}>
                    Share: {getShareTypeLabel(player.shareType)}
                  </Text>
                  {player.shareType === 'C' && (
                    <TextInput
                      style={[styles.customPercentageInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={player.sharePercentage.toString()}
                      onChangeText={(text) => {
                        const percentage = parseInt(text) || 0;
                        handleUpdateSharePercentage(index, Math.min(100, Math.max(0, percentage)));
                      }}
                      keyboardType="numeric"
                      placeholder="0-100"
                      placeholderTextColor={theme.colors.muted}
                    />
                  )}
                  <Text style={[styles.percentageText, { color: theme.colors.muted }]}>({player.sharePercentage}%)</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {parsedPlayers.length > 0 && (
        <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity 
            style={[styles.importButton, { backgroundColor: theme.colors.primary }, isImporting && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={isImporting}
          >
            <Text style={styles.importButtonText}>
              {isImporting 
                ? 'Importing...' 
                : importResults 
                  ? `✓ Imported: ${importResults.imported}, Updated: ${importResults.updated}${importResults.errors?.length > 0 ? `, Errors: ${importResults.errors.length}` : ''}`
                  : `Import ${parsedPlayers.length} Players`
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  parseButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  parseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#007bff',
    backgroundColor: '#f0f8ff',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modeButtonTextActive: {
    color: '#007bff',
  },
  modeHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  previewContainer: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  playerPreview: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerDetail: {
    fontSize: 14,
    color: '#666',
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
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 4,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  percentageText: {
    fontSize: 14,
    color: '#666',
  },
  importButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 16,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 4,
  },
  errorDetail: {
    fontSize: 14,
    color: '#dc3545',
    marginLeft: 8,
    marginBottom: 2,
  },
});
