import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { RecoveryProcess, Patient } from '../types';
import * as patientService from '@services/patientService';
import { usePatients } from '@context/PatientContext';

interface AssignedExercisesCardProps {
    patient: Patient;
    isEditable: boolean;
    navigation?: any;
}

const AssignedExercisesCard: React.FC<AssignedExercisesCardProps> = ({ patient, isEditable, navigation }) => {
    const { colors } = useTheme();
    const { updatePatient } = usePatients();
    const [isEditing, setIsEditing] = useState(false);
    const [exercises, setExercises] = useState(patient.recovery_process);

    const handleSave = async () => {
        try {
            const updatedPatient = await patientService.updateRecoveryProcess(patient.id, exercises);
            updatePatient(patient.id, updatedPatient);
            setIsEditing(false);
            Alert.alert('Success', 'Exercise plan updated.');
        } catch (error) {
            Alert.alert('Error', 'Failed to update exercise plan.');
        }
    };

    const handleExerciseChange = (id: string, field: keyof RecoveryProcess, value: string | number) => {
        setExercises(currentExercises =>
            currentExercises.map(ex => (ex.id === id ? { ...ex, [field]: value } : ex))
        );
    };

    const handleAddNewExercise = () => {
        const newExercise: RecoveryProcess = {
            id: `new_${Date.now()}`,
            name: 'New Exercise',
            completed: false,
            targetRepetitions: 10,
            targetSets: 3,
            instructions: '',
        };
        setExercises(current => [...current, newExercise]);
    };

    const handleExercisePress = (exercise: RecoveryProcess) => {
        if (!isEditable && navigation) {
            navigation.navigate('ExerciseDetail', { exercise });
        }
    };
    
    const renderExercise = ({ item }: { item: RecoveryProcess }) => {
        if (isEditing) {
            return (
                <View style={styles.editExerciseContainer}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={item.name}
                        onChangeText={text => handleExerciseChange(item.id, 'name', text)}
                        placeholder="Exercise Name"
                    />
                    <View style={styles.repsSetsContainer}>
                        <TextInput
                            style={[styles.input, styles.repsInput, { color: colors.text }]}
                            value={String(item.targetRepetitions)}
                            onChangeText={text => handleExerciseChange(item.id, 'targetRepetitions', Number(text))}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: colors.text }}>reps</Text>
                        <TextInput
                            style={[styles.input, styles.setsInput, { color: colors.text }]}
                            value={String(item.targetSets)}
                            onChangeText={text => handleExerciseChange(item.id, 'targetSets', Number(text))}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: colors.text }}>sets</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.instructionsInput, { color: colors.text }]}
                        value={item.instructions}
                        onChangeText={text => handleExerciseChange(item.id, 'instructions', text)}
                        placeholder="Instructions"
                    />
                </View>
            );
        }

        return (
            <TouchableOpacity 
                style={styles.exerciseContainer}
                onPress={() => handleExercisePress(item)}
                disabled={isEditable}
            >
                <View style={styles.exerciseHeader}>
                    <View>
                        <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                            {item.targetRepetitions} reps, {item.targetSets} sets
                        </Text>
                    </View>
                    {!isEditable && (
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Assigned Exercises</Text>
                {isEditable && (
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                        <Ionicons name={isEditing ? "close" : "pencil"} size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={exercises}
                renderItem={renderExercise}
                keyExtractor={item => item.id}
                scrollEnabled={false}
            />
            {isEditing && (
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAddNewExercise}>
                        <Ionicons name="add" size={20} color={colors.primary} />
                        <Text style={[styles.buttonText, { color: colors.primary }]}>Add Exercise</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
                        <Text style={[styles.buttonText, { color: colors.white }]}>Save Changes</Text>
                    </TouchableOpacity>
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
    exerciseContainer: {
        paddingVertical: 8,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '500',
    },
    exerciseDetails: {
        fontSize: 14,
    },
    editExerciseContainer: {
        marginBottom: 16,
    },
    input: {
        borderBottomWidth: 1,
        borderColor: '#E0E0E0',
        paddingVertical: 8,
        fontSize: 16,
    },
    repsSetsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    repsInput: {
        width: 50,
    },
    setsInput: {
        width: 50,
    },
    instructionsInput: {
        marginTop: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    addButton: {
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontWeight: '600',
    },
});

export default AssignedExercisesCard; 