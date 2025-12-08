import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ui/theme';

interface ScreenHeaderProps {
    title: string;
    rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, rightAction }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <View>
                <Text style={[styles.appName, { color: theme.colors.primary }]}>Team Sports</Text>
                <Text style={[styles.screenTitle, { color: theme.colors.text }]}>{title}</Text>
            </View>
            {rightAction && <View>{rightAction}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    appName: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});
