import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme/ThemeContext';
import { useAuth } from '@context/AuthContext';
import { usePatients } from '@context/PatientContext';
import { useHealth } from '@context/HealthContext';
import { Ionicons } from '@expo/vector-icons';
import ActivityRings from '@components/ActivityRings';
import ChartCard from '@components/ChartCard';
import WeeklyFeedbackCard from '@components/WeeklyFeedbackCard';
import ExerciseCard from '@components/ExerciseCard';

const PatientHomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { patients, assignedExercises, fetchAssignedExercises } = usePatients();
    const { healthData, dailyData, isConnected, isLoading, connectDevice, refreshHealthData } = useHealth();
    const patient = user ? patients[user.id] : null;
    const exercises = user ? (assignedExercises[user.id] || []) : [];

    // Debug logging
    useEffect(() => {
        console.log('Current user:', user);
        console.log('All patients:', patients);
        console.log('Current patient:', patient);
        console.log('Assigned exercises:', exercises);
    }, [user, patients, patient, exercises]);

    // Fetch assigned exercises when component mounts
    useEffect(() => {
        if (user?.id) {
            fetchAssignedExercises(user.id);
        }
    }, [user?.id, fetchAssignedExercises]);

    if (!patient) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <View style={styles.container}>
                    <Text style={[styles.title, { color: colors.text }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const completedExercises = exercises.filter(ex => ex.completed === 1).length;
    const totalExercises = exercises.length;

    const activityData = {
        move: {
            goal: dailyData?.goals.calories || 400,
            current: dailyData?.calories || 0,
        },
        exercise: {
            goal: dailyData?.goals.activeMinutes || 30,
            current: dailyData?.activeMinutes || 0,
        },
        stand: {
            goal: 12,
            current: Math.round((dailyData?.activeMinutes || 0) / 60) || 0,
        },
    };

    const handleWeeklyFeedbackSubmit = async (feedback: any) => {
        try {
            console.log('Submitting feedback for user:', user?.id);
            console.log('Patient data:', patient);
            
            if (!user?.id) {
                console.error('No user ID available');
                return;
            }

            const newFeedback = {
                ...feedback,
                sessionId: `weekly_${Date.now()}`,
                timestamp: new Date().toISOString(),
            };

            // Note: This would need to be updated to use local storage
            // For now, we'll just log it
            console.log('Feedback submitted:', newFeedback);
        } catch (error) {
            console.error('Failed to submit weekly feedback:', error);
        }
    };

    const renderExerciseItem = ({ item }: { item: any }) => (
        <ExerciseCard
            exercise={item}
            patientId={user?.id || ''}
            onPress={() => navigation.navigate('Live Session')}
            showProgress={true}
        />
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Welcome back,</Text>
                        <Text style={[styles.title, { color: colors.text }]}>{patient.name}</Text>
                    </View>
                    {!isConnected ? (
                        <TouchableOpacity 
                            style={[styles.connectButton, { backgroundColor: colors.purple[500] }]}
                            onPress={connectDevice}
                        >
                            <Ionicons name="watch-outline" size={20} color={colors.white} />
                            <Text style={[styles.connectButtonText, { color: colors.white }]}>
                                Connect Watch
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.refreshButton, { backgroundColor: colors.card }]}
                            onPress={refreshHealthData}
                            disabled={isLoading}
                        >
                            <Ionicons 
                                name={isLoading ? "sync" : "refresh-outline"} 
                                size={24} 
                                color={colors.text} 
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
                    <ActivityRings data={activityData} size={180} />
                    <View style={styles.progressInfo}>
                        <Text style={[styles.progressTitle, { color: colors.text }]}>Today's Progress</Text>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            {`${completedExercises} of ${totalExercises} exercises completed`}
                        </Text>
                    </View>
                </View>

                {isConnected && healthData && (
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.statIcon, { backgroundColor: colors.purple[50] }]}>
                                <Ionicons name="walk-outline" size={24} color={colors.purple[500]} />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {healthData.steps.toLocaleString()}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Steps</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
                                <Ionicons name="flame-outline" size={24} color={colors.success} />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {healthData.calories}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Calories</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.statIcon, { backgroundColor: colors.info + '15' }]}>
                                <Ionicons name="heart-outline" size={24} color={colors.info} />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {healthData.heartRate?.current || '--'}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>BPM</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.statIcon, { backgroundColor: colors.warning + '15' }]}>
                                <Ionicons name="walk-outline" size={24} color={colors.warning} />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {(healthData.distance / 1000).toFixed(1)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>KM</Text>
                        </View>
                    </View>
                )}

                <WeeklyFeedbackCard onSubmit={handleWeeklyFeedbackSubmit} />

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Exercises</Text>
                {exercises.length > 0 ? (
                    <FlatList
                        data={exercises}
                        renderItem={renderExerciseItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.exerciseList}
                        scrollEnabled={false}
                    />
                ) : (
                    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                        <Ionicons name="fitness-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            No Exercises Assigned
                        </Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            Your doctor will assign exercises for you to complete.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    connectButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    progressInfo: {
        width: '100%',
        marginTop: 20,
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    exerciseList: {
        gap: 12,
    },
    exerciseCard: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    exerciseContent: {
        padding: 16,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    exerciseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    exerciseIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    exerciseStatus: {
        fontSize: 14,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptyState: {
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        marginTop: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6B7280', // textSecondary color
    },
});

export default PatientHomeScreen; 