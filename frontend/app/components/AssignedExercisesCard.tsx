import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Patient } from '../types';
import { usePatients, SessionAsExercise } from '@context/PatientContext';
import { assignExerciseToPatient, getAvailableExercises } from '@services/exerciseAssignmentService';
import { ExerciseTypesRepository } from '@storage/repositories';
import { useFocusEffect } from '@react-navigation/native';

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
    const { assignedExercises, sessionsByPatient, fetchPatientSessions, createSession, fetchAssignedExercises } = usePatients();
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
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:44',message:'Updating exercises from context',data:{patientId:patient.id, listFromContextLength:listFromContext.length, listKey, isEditing, exerciseIds:listFromContext.map(e=>e.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            const newExercises = listFromContext.map(toItem);
            setExercises(newExercises);
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:50',message:'Exercises state updated',data:{exercisesCount:newExercises.length, exerciseNames:newExercises.map(e=>e.name)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
        }
    }, [patient.id, listKey, isEditing, listFromContext.length, listFromContext]);

    const handleSave = async () => {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:48',message:'handleSave called',data:{patientId:patient.id, exercisesCount:exercises.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        try {
            const newOnes = exercises.filter(e => e.id.startsWith('new_') || (e as any).isNew);
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:51',message:'Found new exercises to save',data:{newOnesCount:newOnes.length, newOnes:newOnes.map(e=>({id:e.id,name:e.name}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // Get all available exercise types to find or create
            const allExerciseTypes = await getAvailableExercises();
            
            for (const ex of newOnes) {
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:57',message:'Processing new exercise',data:{exerciseName:ex.name, patientId:patient.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                
                // Find existing exercise type by name, or create a new one
                let exerciseType = allExerciseTypes.find(et => et.name.toLowerCase() === ex.name.toLowerCase());
                
                if (!exerciseType) {
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:64',message:'Exercise type not found, creating new one',data:{exerciseName:ex.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
                    // Create new exercise type
                    const newExerciseTypeId = `ex_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
                    const newExerciseType = {
                        id: newExerciseTypeId,
                        name: ex.name,
                        description: ex.instructions || null,
                        targetReps: ex.targetRepetitions || null,
                        targetSets: ex.targetSets || null,
                        instructions: ex.instructions || null,
                        category: 'knee', // Default category
                    };
                    await ExerciseTypesRepository.create(newExerciseType);
                    exerciseType = newExerciseType;
                    // #region agent log
                    fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:77',message:'New exercise type created',data:{exerciseTypeId:newExerciseTypeId, exerciseName:ex.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion
                }
                
                // Now assign the exercise to the patient using assignExerciseToPatient
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:81',message:'Assigning exercise to patient using assignExerciseToPatient',data:{exerciseTypeId:exerciseType.id, exerciseName:ex.name, patientId:patient.id, targetReps:ex.targetRepetitions, targetSets:ex.targetSets},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                await assignExerciseToPatient(
                    patient.id,
                    exerciseType.id,
                    ex.targetRepetitions,
                    ex.targetSets,
                    ex.name
                );
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:89',message:'Exercise assigned successfully',data:{exerciseTypeId:exerciseType.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
            }
            
            setIsEditing(false);
            await fetchAssignedExercises(patient.id);
            Alert.alert('Success', 'Exercise plan updated.');
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/3a24ed6e-2364-40cb-80fb-67e27d6c712f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignedExercisesCard.tsx:95',message:'Error saving exercises',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            console.error('Error saving exercises:', error);
            Alert.alert('Error', `Failed to update exercise plan: ${error instanceof Error ? error.message : String(error)}`);
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