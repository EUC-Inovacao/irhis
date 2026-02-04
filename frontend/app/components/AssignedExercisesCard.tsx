import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Patient } from '../types';
import { usePatients, SessionAsExercise } from '@context/PatientContext';

interface AssignedExercisesCardProps {
    patient: Patient;
    isEditable: boolean;
    navigation?: any;
}

type ExerciseItem = {
    id: string;
    name: string;
    targetRepetitions: number;
    targetSets: number;
    instructions: string;
    isNew?: boolean;
};

const AssignedExercisesCard: React.FC<AssignedExercisesCardProps> = ({ patient, isEditable, navigation }) => {
    const { colors } = useTheme();
    const { assignedExercises, sessionsByPatient, fetchPatientSessions, createSession } = usePatients();
    const [isEditing, setIsEditing] = useState(false);
    const listFromContext = assignedExercises[patient.id] ?? [];
    const toItem = (ex: SessionAsExercise): ExerciseItem => ({
        id: ex.id,
        name: ex.exerciseType?.name ?? (ex as any).name ?? 'Exercise',
        targetRepetitions: ex.targetReps ?? ex.exerciseType?.targetReps ?? 10,
        targetSets: ex.targetSets ?? ex.exerciseType?.targetSets ?? 3,
        instructions: '',
        isNew: false,
    });
    const listKey = useMemo(
        () => listFromContext.map((e) => e.id).join(','),
        [listFromContext]
    );
    const [exercises, setExercises] = useState<ExerciseItem[]>(() => listFromContext.map(toItem));

    useEffect(() => {
        if (!isEditing) {
            setExercises(listFromContext.map(toItem));
        }
    }, [patient.id, listKey, isEditing]);

    const handleSave = async () => {
        try {
            const newOnes = exercises.filter(e => e.id.startsWith('new_') || (e as any).isNew);
            for (const ex of newOnes) {
                await createSession(patient.id, {
                    exerciseType: ex.name,
                    exerciseDescription: ex.instructions,
                    repetitions: ex.targetRepetitions,
                    duration: undefined,
                });
            }
            await fetchPatientSessions(patient.id);
            setIsEditing(false);
            Alert.alert('Success', 'Exercise plan updated.');
        } catch (error) {
            Alert.alert('Error', 'Failed to update exercise plan.');
        }
    };

    const handleExerciseChange = (id: string, field: keyof ExerciseItem, value: string | number) => {
        setExercises(current =>
            current.map(ex => (ex.id === id ? { ...ex, [field]: value } : ex))
        );
    };

    const handleAddNewExercise = () => {
        setExercises(current => [...current, {
            id: `new_${Date.now()}`,
            name: 'New Exercise',
            targetRepetitions: 10,
            targetSets: 3,
            instructions: '',
            isNew: true,
        }]);
    };

    const handleExercisePress = (exercise: ExerciseItem) => {
        if (!isEditable && navigation) {
            navigation.navigate('ExerciseDetail', { exercise });
        }
    };

    const renderExercise = ({ item }: { item: ExerciseItem }) => {
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
                            onChangeText={text => handleExerciseChange(item.id, 'targetRepetitions', Number(text) || 0)}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: colors.text }}>reps</Text>
                        <TextInput
                            style={[styles.input, styles.setsInput, { color: colors.text }]}
                            value={String(item.targetSets)}
                            onChangeText={text => handleExerciseChange(item.id, 'targetSets', Number(text) || 0)}
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