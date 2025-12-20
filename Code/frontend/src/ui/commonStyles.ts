import { StyleSheet } from 'react-native';

/**
 * Common shared styles used across all screens for consistency
 * Import and use these in CalendarScreen, RosterScreen, TeamsScreen, etc.
 */
export const commonStyles = StyleSheet.create({
    // Chips - used for selecting/displaying items like teams, members, roles, etc.
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    chip: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        maxWidth: '100%'
    },
    chipText: {
        fontSize: 14,
        flexShrink: 1,
        textAlign: 'center'
    },
    chipSmall: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1,
        maxWidth: '100%'
    },
    chipSmallText: {
        fontSize: 12,
        flexShrink: 1,
        textAlign: 'center'
    },

    // Form elements
    formGroup: {
        marginBottom: 12
    },
    label: {
        marginBottom: 6,
        marginTop: 12,
        fontWeight: '500',
        fontSize: 14
    },
    labelFirst: {
        marginBottom: 6,
        marginTop: 0,
        fontWeight: '500',
        fontSize: 14
    },
    labelSmall: {
        marginBottom: 4,
        marginTop: 8,
        fontWeight: '500',
        fontSize: 12
    },
    input: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1
    },

    // Sections
    section: {
        paddingBottom: 16,
        marginBottom: 8,
        marginTop: 8,
        borderBottomWidth: 1
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc'
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    tabText: {
        fontWeight: '600',
        textAlign: 'center'
    },

    // Buttons
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    buttonText: {
        fontWeight: '600'
    },
    buttonTextBold: {
        color: 'black',
        fontWeight: 'bold'
    }
});
