import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme, MAX_CONTENT_WIDTH } from '../ui/theme';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
    onConfirm,
    onCancel,
}) => {
    const { theme } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, { borderColor: theme.colors.border, borderWidth: 1 }]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.buttonText, { color: theme.colors.text }]}>{cancelLabel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: isDestructive ? '#d9534f' : theme.colors.primary }]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: isDestructive ? 'white' : 'black', fontWeight: 'bold' }]}>
                                {confirmLabel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 12,
        padding: 24,
        borderWidth: 1,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
    }
});
