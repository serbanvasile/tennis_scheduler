import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ui/theme';

interface SearchWithChipsProps {
    chips: string[];
    onChipsChange: (chips: string[]) => void;
    mode?: 'AND' | 'OR';
    onModeChange?: (mode: 'AND' | 'OR') => void;
    placeholder?: string;
    resultCount?: number;
    totalCount?: number;
    topSpacing?: boolean; // Add top spacing for main screens
}

export function SearchWithChips({
    chips,
    onChipsChange,
    mode = 'AND',
    onModeChange,
    placeholder = 'Type and press ENTER...',
    resultCount,
    totalCount,
    topSpacing = false
}: SearchWithChipsProps) {
    const { theme } = useTheme();
    const [inputValue, setInputValue] = useState('');
    const [showModeSelector, setShowModeSelector] = useState(false);
    const inputRef = useRef<any>(null);

    const handleAddChip = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !chips.includes(trimmed)) {
            onChipsChange([...chips, trimmed]);
            setInputValue('');
            // Focus back to input after render
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    inputRef.current?.focus();
                });
            });
        }
    };

    const handleRemoveChip = (chipToRemove: string) => {
        onChipsChange(chips.filter(c => c !== chipToRemove));
    };

    const handleModeChange = (newMode: 'AND' | 'OR') => {
        if (onModeChange) {
            onModeChange(newMode);
        }
        setShowModeSelector(false);
    };

    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === 'Enter') {
            handleAddChip();
        }
    };

    return (
        <View style={[styles.container, topSpacing && styles.containerWithTopSpacing]}>
            {/* Input Container with Chips Inside */}
            <View style={styles.inputContainer}>
                <View style={[
                    styles.inputWrapper,
                    {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.inputBackground || theme.colors.surface
                    }
                ]}>
                    {/* Chips inside the input */}
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
                            <Text style={[styles.chipText, { color: theme.colors.buttonText }]}>{chip}</Text>
                            <TouchableOpacity
                                onPress={() => handleRemoveChip(chip)}
                                style={styles.chipRemove}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={[styles.chipRemoveText, { color: theme.colors.buttonText }]}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Text Input */}
                    <TextInput
                        ref={inputRef}
                        style={[
                            styles.textInput,
                            { color: theme.colors.text }
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={theme.colors.muted}
                        value={inputValue}
                        onChangeText={setInputValue}
                        onSubmitEditing={handleAddChip}
                        onKeyPress={handleKeyPress}
                    />
                </View>

                {/* Settings Button */}
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
                                mode === 'AND' && { color: theme.colors.buttonText, fontWeight: 'bold' }
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
                                mode === 'OR' && { color: theme.colors.buttonText, fontWeight: 'bold' }
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

            {/* Result Count */}
            {resultCount !== undefined && totalCount !== undefined && (
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 8, marginBottom: 4 }}>
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
        paddingTop: 0,
        paddingBottom: 4
    },
    containerWithTopSpacing: {
        paddingTop: 15
    },
    inputContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center'
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: 6,
        borderRadius: 8,
        borderWidth: 1,
        minHeight: 44,
        gap: 4
    },
    textInput: {
        flex: 1,
        minWidth: 120,
        fontSize: 14,
        padding: 6
    },
    settingsButton: {
        position: 'absolute',
        right: 8,
        top: 8,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    settingsIcon: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    modeSelector: {
        marginTop: 8,
        marginBottom: 8,
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
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1
    },
    modeChipText: {
        fontSize: 12,
        fontWeight: '600'
    },
    modeDescription: {
        fontSize: 12,
        marginBottom: 4
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingLeft: 8,
        paddingRight: 6,
        borderRadius: 16,
        borderWidth: 1
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 4
    },
    chipRemove: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    chipRemoveText: {
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 18
    },
    wildcardHint: {
        fontSize: 11,
        marginTop: 6,
        fontStyle: 'italic'
    }
});
