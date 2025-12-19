import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../ui/theme';

interface SearchWithChipsProps {
    chips: string[];
    onChipsChange: (chips: string[]) => void;
    placeholder?: string;
    resultCount?: number;
    totalCount?: number;
    mode?: 'AND' | 'OR';
    onModeChange?: (mode: 'AND' | 'OR') => void;
}

/**
 * Reusable search input component with filter chips and mode selector.
 * - Type text and press ENTER to add a chip
 * - Click X on a chip to remove it
 * - Click ⋮ (three dots) to toggle between AND/OR modes
 * - Displays result count when filtering
 */
export function SearchWithChips({
    chips,
    onChipsChange,
    placeholder = 'Search...',
    resultCount,
    totalCount,
    mode = 'AND',
    onModeChange
}: SearchWithChipsProps) {
    const { theme } = useTheme();
    const [inputValue, setInputValue] = useState('');
    const [showModeSelector, setShowModeSelector] = useState(false);

    const handleAddChip = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !chips.includes(trimmed)) {
            onChipsChange([...chips, trimmed]);
            setInputValue('');
        }
    };

    const handleRemoveChip = (chipToRemove: string) => {
        onChipsChange(chips.filter(chip => chip !== chipToRemove));
    };

    const handleKeyPress = (e: any) => {
        if (Platform.OS === 'web' && (e.key === 'Enter' || e.keyCode === 13)) {
            e.preventDefault();
            handleAddChip();
        }
    };

    const handleModeChange = (newMode: 'AND' | 'OR') => {
        if (onModeChange) {
            onModeChange(newMode);
        }
        setShowModeSelector(false);
    };

    return (
        <View style={styles.container}>
            {/* Search Input with Settings Button */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={[
                        styles.input,
                        {
                            color: theme.colors.text,
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.inputBackground || theme.colors.surface
                        }
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.muted}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onSubmitEditing={handleAddChip}
                    onKeyPress={handleKeyPress}
                />

                {/* Settings Button (Three Dots) */}
                {onModeChange && (
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => setShowModeSelector(!showModeSelector)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={[styles.settingsIcon, { color: theme.colors.text }]}>⋮</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Mode Selector Dropdown */}
            {showModeSelector && onModeChange && (
                <View style={[styles.modeSelector, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Text style={[styles.modeSelectorTitle, { color: theme.colors.muted }]}>Filter Mode:</Text>
                    <View style={styles.modeChipsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.modeChip,
                                { borderColor: theme.colors.border },
                                mode === 'AND' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            ]}
                            onPress={() => handleModeChange('AND')}
                        >
                            <Text style={[
                                styles.modeChipText,
                                { color: theme.colors.text },
                                mode === 'AND' && { color: 'black', fontWeight: 'bold' }
                            ]}>
                                AND
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modeChip,
                                { borderColor: theme.colors.border },
                                mode === 'OR' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            ]}
                            onPress={() => handleModeChange('OR')}
                        >
                            <Text style={[
                                styles.modeChipText,
                                { color: theme.colors.text },
                                mode === 'OR' && { color: 'black', fontWeight: 'bold' }
                            ]}>
                                OR
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.modeDescription, { color: theme.colors.muted }]}>
                        {mode === 'AND'
                            ? 'Show items matching ALL words'
                            : 'Show items matching ANY word'}
                    </Text>
                    <Text style={[styles.wildcardHint, { color: theme.colors.muted }]}>
                        💡 Use * for wildcards: Fri* *day F*y
                    </Text>
                </View>
            )}

            {/* Filter Chips */}
            {chips.length > 0 && (
                <View style={styles.chipsContainer}>
                    {chips.map((chip, index) => (
                        <View
                            key={index}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: theme.colors.primary,
                                    borderColor: theme.colors.primary
                                }
                            ]}
                        >
                            <Text style={styles.chipText}>{chip}</Text>
                            <TouchableOpacity
                                onPress={() => handleRemoveChip(chip)}
                                style={styles.chipRemove}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={styles.chipRemoveText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Result Count */}
            {resultCount !== undefined && totalCount !== undefined && (
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 8 }}>
                    {chips.length > 0
                        ? `Showing ${resultCount} of ${totalCount} items (${mode} mode)`
                        : `${totalCount} items`}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12
    },
    inputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: 14,
        paddingRight: 40 // Make room for settings button
    },
    settingsButton: {
        position: 'absolute',
        right: 8,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        width: 32,
        height: '100%'
    },
    settingsIcon: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 24
    },
    modeSelector: {
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1
    },
    modeSelectorTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8
    },
    modeChipsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8
    },
    modeChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1
    },
    modeChipText: {
        fontSize: 14,
        fontWeight: '600'
    },
    modeDescription: {
        fontSize: 11,
        fontStyle: 'italic'
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingLeft: 12,
        paddingRight: 8,
        borderRadius: 16,
        borderWidth: 1
    },
    chipText: {
        color: 'black',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6
    },
    chipRemove: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    chipRemoveText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 20
    },
    wildcardHint: {
        fontSize: 11,
        marginTop: 6,
        fontStyle: 'italic'
    }
});
