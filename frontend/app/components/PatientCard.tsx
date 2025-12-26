import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Patient } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { usePatients } from '@context/PatientContext';

const PatientCard = ({ item, navigation }: { item: Patient; navigation: any }) => {
    const { colors } = useTheme();
    const { assignedExercises } = usePatients();
    const exercises = assignedExercises[item.id] || [];
    const completedExercises = exercises.filter(ex => ex.completed === 1).length;
    const totalExercises = exercises.length;
    const progress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    // Get the latest weekly feedback
    const latestFeedback = item.feedback?.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    const renderFeedbackIndicator = (value: number, label: string, icon: string) => (
        <View style={styles.feedbackItem}>
            <Ionicons name={icon as any} size={16} color={colors.textSecondary} />
            <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.feedbackValue, { color: colors.text }]}>{value}/10</Text>
        </View>
    );

    return (
        <TouchableOpacity 
            style={[styles.patientCard, { backgroundColor: colors.card }]} 
            onPress={() => navigation.navigate('PatientDetail', { patientId: item.id, role: 'doctor' })}
        >
            <View style={styles.patientHeader}>
                <View style={styles.patientInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.purple[100] }]}>
                        <Text style={[styles.avatarText, { color: colors.purple[600] }]}>
                            {item.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                    </View>
                    <View>
                        <Text style={[styles.patientName, { color: colors.text }]}>{item.name}</Text>
                        <View style={styles.patientMetaRow}>
                            <Text style={[styles.patientSubtext, { color: colors.textSecondary }]}>
                                {totalExercises > 0 
                                    ? `${completedExercises}/${totalExercises} exercises`
                                    : 'No exercises assigned'}
                            </Text>
                            {totalExercises > 0 && (
                                <View style={[styles.exerciseBadge, { backgroundColor: colors.purple[100] }]}>
                                    <Ionicons name="fitness-outline" size={12} color={colors.purple[500]} />
                                    <Text style={[styles.exerciseBadgeText, { color: colors.purple[500] }]}>
                                        {totalExercises}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                <View style={[styles.progressBadge, { backgroundColor: colors.purple[50] }]}>
                    <Text style={[styles.progressText, { color: colors.purple[500] }]}>
                        {`${Math.round(progress)}%`}
                    </Text>
                </View>
            </View>

            <View style={[styles.progressBar, { backgroundColor: colors.gray[200] }]}>
                <View 
                    style={[
                        styles.progressFill, 
                        { 
                            backgroundColor: colors.purple[500],
                            width: `${progress}%` 
                        }
                    ]} 
                />
            </View>

            {item.details && (
                <View style={styles.dataPreview}>
                    <View style={styles.detailsColumn}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Age</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.details.age}</Text>
                        
                        <Text style={[styles.detailLabel, { color: colors.textSecondary, marginTop: 12 }]}>Sex</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.details.sex}</Text>
                    </View>
                    <View style={styles.detailsColumn}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Height</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.details.height} m</Text>
                        
                        <Text style={[styles.detailLabel, { color: colors.textSecondary, marginTop: 12 }]}>Weight</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.details.weight} kg</Text>
                    </View>
                    <View style={styles.detailsColumn}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>BMI</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{item.details.bmi.toFixed(1)}</Text>
                    </View>
                </View>
            )}

            {latestFeedback && (
                <View style={[styles.feedbackContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.feedbackTitle, { color: colors.text }]}>Latest Weekly Feedback</Text>
                    <View style={styles.feedbackGrid}>
                        {renderFeedbackIndicator(latestFeedback.pain, 'Pain', 'bandage-outline')}
                        {renderFeedbackIndicator(latestFeedback.fatigue, 'Fatigue', 'battery-half-outline')}
                        {renderFeedbackIndicator(latestFeedback.difficulty, 'Difficulty', 'barbell-outline')}
                    </View>
                    {latestFeedback.comments && (
                        <Text style={[styles.comments, { color: colors.textSecondary }]} numberOfLines={2}>
                            {latestFeedback.comments}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    patientCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    patientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    patientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
    },
    patientName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    patientSubtext: {
        fontSize: 14,
    },
    patientMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    exerciseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 4,
    },
    exerciseBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    progressBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    dataPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    detailsColumn: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    feedbackContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    feedbackTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    feedbackGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    feedbackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    feedbackLabel: {
        fontSize: 12,
    },
    feedbackValue: {
        fontSize: 12,
        fontWeight: '600',
    },
    comments: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 8,
    },
});

export default PatientCard; 