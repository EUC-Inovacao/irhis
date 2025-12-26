import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@theme/ThemeContext';

interface AssignmentModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (name: string, dosage?: string) => void;
    assignmentType: 'exercise' | 'medication';
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ visible, onClose, onSave, assignmentType }) => {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');

    const handleSave = () => {
        if (name) {
            onSave(name, dosage);
            setName('');
            setDosage('');
            onClose();
        }
    };

    const title = assignmentType === 'exercise' ? 'Assign New Exercise' : 'Assign New Medication';

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.centeredView}
            >
                <View style={[styles.modalView, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.mediumGray }]}
                        placeholder="Name"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor={colors.textSecondary}
                    />
                    {assignmentType === 'medication' && (
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.mediumGray }]}
                            placeholder="Dosage (e.g., 200mg twice a day)"
                            value={dosage}
                            onChangeText={setDosage}
                            placeholderTextColor={colors.textSecondary}
                        />
                    )}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                            <Text style={[styles.buttonText, { color: colors.white }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
                            <Text style={[styles.buttonText, { color: colors.white }]}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        borderRadius: 20,
        padding: 25,
        alignItems: 'stretch',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalTitle: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
    },
    input: {
        height: 50,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        fontSize: 17,
        borderWidth: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        borderRadius: 12,
        padding: 12,
        elevation: 2,
        flex: 1,
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#8E8E93',
    },
    saveButton: {
        backgroundColor: '#0A84FF',
    },
    buttonText: {
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default AssignmentModal; 