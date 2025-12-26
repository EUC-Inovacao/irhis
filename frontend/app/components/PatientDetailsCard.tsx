import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { PatientDetails } from '../types';

interface PatientDetailsCardProps {
    details: PatientDetails;
    onUpdateDetails: (details: Partial<PatientDetails>) => void;
    isEditable: boolean;
}

const PatientDetailsCard: React.FC<PatientDetailsCardProps> = ({ details, onUpdateDetails, isEditable }) => {
    const { colors } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [editableDetails, setEditableDetails] = useState(details);

    useEffect(() => {
        setEditableDetails(details);
    }, [details]);

    const handleSave = () => {
        const { weight, height } = editableDetails;
        if (weight > 0 && height > 0) {
            editableDetails.bmi = weight / (height * height);
        }
        onUpdateDetails(editableDetails);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableDetails(details);
        setIsEditing(false);
    };
    
    const DetailItem = ({ label, value, unit, isEditingValue, onChangeText, keyboardType = 'default' }: any) => (
        <View style={styles.detailItem}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            {isEditing && onChangeText ? (
                <TextInput
                    style={[styles.value, styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                    value={String(isEditingValue ?? '')}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                />
            ) : (
                <Text style={[styles.value, { color: colors.text }]}>{value}{unit}</Text>
            )}
        </View>
    );
    
    const calculateBmi = (weight: number, height: number) => {
        if (height > 0 && weight > 0) {
            return (weight / (height * height)).toFixed(1);
        }
        return 'N/A';
    }
    
    const editableBmi = calculateBmi(editableDetails.weight, editableDetails.height);
    const originalBmi = calculateBmi(details.weight, details.height);

    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Patient Details</Text>
                {isEditable && !isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Ionicons name="pencil" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.detailsGrid}>
                <DetailItem 
                    label="Age" 
                    value={details.age} 
                    isEditingValue={editableDetails.age}
                    isEditing={isEditing} 
                    onChangeText={(text: string) => setEditableDetails({ ...editableDetails, age: Number(text) })}
                    keyboardType="numeric" 
                />
                <DetailItem 
                    label="Sex" 
                    value={details.sex} 
                    isEditingValue={editableDetails.sex}
                    isEditing={isEditing} 
                    onChangeText={(text: string) => setEditableDetails({ ...editableDetails, sex: text as any })} 
                />
                <DetailItem 
                    label="Height" 
                    value={details.height} 
                    unit=" m" 
                    isEditingValue={editableDetails.height}
                    isEditing={isEditing} 
                    onChangeText={(text: string) => setEditableDetails({ ...editableDetails, height: Number(text) })}
                    keyboardType="numeric" 
                />
                <DetailItem 
                    label="Weight" 
                    value={details.weight} 
                    unit=" kg" 
                    isEditingValue={editableDetails.weight}
                    isEditing={isEditing} 
                    onChangeText={(text: string) => setEditableDetails({ ...editableDetails, weight: Number(text) })}
                    keyboardType="numeric" 
                />
                <DetailItem 
                    label="BMI" 
                    value={isEditing ? editableBmi : originalBmi} 
                />
            </View>

            {isEditing ? (
                <>
                    <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Other Clinical Info</Text>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.mediumGray }]}
                        value={editableDetails.clinicalInfo}
                        onChangeText={(text) => setEditableDetails({ ...editableDetails, clinicalInfo: text })}
                        multiline
                        placeholder="Add specific information about the patient..."
                        placeholderTextColor={colors.textSecondary}
                    />
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
                            <Text style={[styles.buttonText, { color: colors.white }]}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={styles.infoSection}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Other Clinical Info</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{details.clinicalInfo}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    detailItem: {
        width: '48%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        borderBottomWidth: 1,
        paddingBottom: 4,
    },
    infoSection: {
        marginTop: 16,
    },
    textInput: {
        minHeight: 100,
        textAlignVertical: 'top',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: 16,
        marginTop: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 16,
        gap: 12,
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonText: {
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
});

export default PatientDetailsCard; 