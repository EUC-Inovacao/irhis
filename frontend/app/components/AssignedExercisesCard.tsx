import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Patient } from '../types';
import { usePatients, SessionAsExercise } from '@context/PatientContext';
import {
    assignExerciseToPatient,
    getAvailableExercises,
    getOrCreateExerciseTypeByName,
    updateAssignedExercise,
} from '@services/exerciseAssignmentService';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const { assignedExercises, fetchAssignedExercises } = usePatients();
    const [isEditing, setIsEditing] = useState(false);
    const listFromContext = assignedExercises[patient.id] ?? [];
    const toItem = (ex: SessionAsExercise): ExerciseItem => ({
        id: ex.id,
        name: ex.exerciseType?.name ?? (ex as any).name ?? t('assignedExercises.exerciseFallback'),
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
    const originalItemsById = useMemo(
        () => new Map(listFromContext.map((exercise) => [exercise.id, toItem(exercise)])),
        [listFromContext, t]
    );

    // Refresh exercises when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (!isEditing) {
                fetchAssignedExercises(patient.id);
            }
        }, [patient.id, isEditing, fetchAssignedExercises])
    );

    useEffect(() => {
        if (!isEditing) {
            const newExercises = listFromContext.map(toItem);
            setExercises(newExercises);
        }
    }, [patient.id, listKey, isEditing, listFromContext.length, listFromContext]);

    const handleSave = async () => {
        try {
            const newOnes = exercises.filter(e => e.id.startsWith('new_') || (e as any).isNew);
            const updatedOnes = exercises.filter((exercise) => {
                if (exercise.id.startsWith('new_') || exercise.isNew) {
                    return false;
                }

                const original = originalItemsById.get(exercise.id);
                if (!original) {
                    return false;
                }

                return original.name !== exercise.name || original.targetRepetitions !== exercise.targetRepetitions;
            });
            
            // Resolve exercise types in the service layer so this component does not talk to storage directly.
            const allExerciseTypes = newOnes.length > 0 ? await getAvailableExercises() : [];

            for (const exercise of updatedOnes) {
                await updateAssignedExercise(
                    patient.id,
                    exercise.id,
                    exercise.targetRepetitions,
                    exercise.name.trim()
                );
            }
            
            for (const ex of newOnes) {
                const exerciseType = await getOrCreateExerciseTypeByName(allExerciseTypes, {
                    name: ex.name,
                    instructions: ex.instructions,
                    targetRepetitions: ex.targetRepetitions,
                    targetSets: ex.targetSets,
                });

                await assignExerciseToPatient(
                    patient.id,
                    exerciseType.id,
                    ex.targetRepetitions,
                    ex.targetSets,
                    ex.name
                );
            }
            
            setIsEditing(false);
            await fetchAssignedExercises(patient.id);
            Alert.alert(
                t('common.success'),
                t('assignedExercises.updatedSuccess')
            );
        } catch (error) {
            console.error('Error saving exercises:', error);
            Alert.alert(
                t('common.error'),
                `${t('assignedExercises.updateFailed')}: ${error instanceof Error ? error.message : String(error)}`
            );
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
            name: t('assignedExercises.newExercise'),
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
                        placeholder={t('assignedExercises.namePlaceholder')}
                    />
                    <View style={styles.repsSetsContainer}>
                        <TextInput
                            style={[styles.input, styles.repsInput, { color: colors.text }]}
                            value={String(item.targetRepetitions)}
                            onChangeText={text => handleExerciseChange(item.id, 'targetRepetitions', Number(text) || 0)}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: colors.text }}>{t('assignedExercises.reps')}</Text>
                        <TextInput
                            style={[styles.input, styles.setsInput, { color: colors.text }]}
                            value={String(item.targetSets)}
                            onChangeText={text => handleExerciseChange(item.id, 'targetSets', Number(text) || 0)}
                            keyboardType="number-pad"
                        />
                        <Text style={{ color: colors.text }}>{t('assignedExercises.sets')}</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.instructionsInput, { color: colors.text }]}
                        value={item.instructions}
                        onChangeText={text => handleExerciseChange(item.id, 'instructions', text)}
                        placeholder={t('assignedExercises.instructionsPlaceholder')}
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
                            {t('assignedExercises.details', {
                                reps: item.targetRepetitions,
                                sets: item.targetSets,
                            })}
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
                <Text style={[styles.title, { color: colors.text }]}>{t('assignedExercises.title')}</Text>
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
                        <Text style={[styles.buttonText, { color: colors.primary }]}>{t('assignedExercises.addExercise')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
                        <Text style={[styles.buttonText, { color: colors.white }]}>{t('assignedExercises.saveChanges')}</Text>
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
