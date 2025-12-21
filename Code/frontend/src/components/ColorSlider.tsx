import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, THEME_COUNT } from '../ui/theme';

export function ColorSlider() {
    const { theme, themeIndex, setThemeIndex, resetTheme } = useTheme();

    const goToPrevTheme = () => {
        const newIndex = themeIndex > 0 ? themeIndex - 1 : THEME_COUNT - 1;
        setThemeIndex(newIndex);
    };

    const goToNextTheme = () => {
        const newIndex = themeIndex < THEME_COUNT - 1 ? themeIndex + 1 : 0;
        setThemeIndex(newIndex);
    };

    // Determine if current theme is dark (first half) or light (second half)
    const isDarkTheme = themeIndex < THEME_COUNT / 2;

    // Truncate theme name to 12 chars
    const displayName = theme.name.length > 12
        ? theme.name.substring(0, 12) + '...'
        : theme.name;

    return (
        <View style={styles.container}>
            {/* Reset button */}
            <TouchableOpacity
                onPress={resetTheme}
                style={[styles.resetButton, { borderColor: theme.colors.primary as string }]}
                accessibilityLabel="Reset to default theme"
            >
                <Text style={[styles.resetText, { color: theme.colors.primary as string }]}>↺</Text>
            </TouchableOpacity>

            {/* Dark/Light indicator */}
            <Text style={[styles.modeIndicator, { color: theme.colors.muted as string }]}>
                {isDarkTheme ? '🌙' : '☀️'}
            </Text>

            {/* Left arrow */}
            <TouchableOpacity
                onPress={goToPrevTheme}
                style={[styles.arrowButton, { borderColor: theme.colors.border as string }]}
                accessibilityLabel="Previous theme"
            >
                <Text style={[styles.arrowText, { color: theme.colors.primary as string }]}>◀</Text>
            </TouchableOpacity>

            {/* Theme name display */}
            <Text style={[styles.themeName, { color: theme.colors.primary as string }]}>
                {displayName}
            </Text>

            {/* Right arrow */}
            <TouchableOpacity
                onPress={goToNextTheme}
                style={[styles.arrowButton, { borderColor: theme.colors.border as string }]}
                accessibilityLabel="Next theme"
            >
                <Text style={[styles.arrowText, { color: theme.colors.primary as string }]}>▶</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
        gap: 3,
    },
    resetButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modeIndicator: {
        fontSize: 12,
        marginRight: 2,
    },
    arrowButton: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowText: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    themeName: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ColorSlider;
