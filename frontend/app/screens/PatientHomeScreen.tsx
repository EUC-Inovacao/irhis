import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@theme/ThemeContext';
import { useAuth } from '@context/AuthContext';
import { usePatients } from '@context/PatientContext';
import { buildTodayPlan, PlannedExercise } from '../exercises/todayPlan';

/**
 * Patient home: one large button to start today's exercises and the list of
 * exercises with today's status. Built for older patients using the app alone:
 * large text, one main action, no red "failed" states.
 */
const PatientHomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { patients, sessionsByPatient, loading, patientDashboardError, fetchAssignedExercises, fetchPatients } = usePatients();
    const patient = user ? patients[user.id] : null;
    const [refreshing, setRefreshing] = useState(false);

    const plan: PlannedExercise[] = useMemo(() => {
        const sessions = user ? sessionsByPatient?.[user.id] : undefined;
        return sessions ? buildTodayPlan(sessions) : [];
    }, [sessionsByPatient, user]);
    const doneCount = plan.filter((p) => p.doneToday).length;
    const allDone = plan.length > 0 && doneCount === plan.length;

    // Refresh today's status when coming back from an exercise
    useFocusEffect(
        useCallback(() => {
            if (user?.id) fetchAssignedExercises(user.id);
        }, [user?.id, fetchAssignedExercises])
    );

    const refreshDashboard = useCallback(async () => {
        if (!user?.id) return;
        setRefreshing(true);
        try {
            await fetchPatients();
            await fetchAssignedExercises(user.id);
        } finally {
            setRefreshing(false);
        }
    }, [user?.id, fetchPatients, fetchAssignedExercises]);

    if (!patient) {
        if (patientDashboardError) {
            return (
                <SafeAreaView edges={["left", "right"]} style={[styles.safeArea, { backgroundColor: colors.background }]}>
                    <View style={[styles.container, styles.centered]}>
                        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.errorTitle, { color: colors.text }]}>{t('patientHome.loadFailedTitle')}</Text>
                        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{patientDashboardError}</Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                            onPress={() => refreshDashboard()}
                        >
                            <Text style={styles.retryButtonText}>{t('patientHome.tryAgain')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }
        return (
            <SafeAreaView edges={["left", "right"]} style={[styles.safeArea, { backgroundColor: colors.background }]}>
                <View style={[styles.container, styles.centered]}>
                    <Text style={[styles.greeting, { color: colors.text }]}>
                        {loading ? t('patientHome.loading') : t('patientHome.loadingDashboard')}
                    </Text>
                    {!loading && (
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 16 }]}
                            onPress={() => fetchPatients()}
                        >
                            <Text style={styles.retryButtonText}>{t('patientHome.retry')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    const exerciseName = (p: PlannedExercise) => (p.protocol ? t(p.protocol.nameKey) : p.storedName);
    const targetText = (p: PlannedExercise) =>
        p.protocol?.counting === 'knee-extension'
            ? t('guided.targetPerLeg', { count: p.targetReps })
            : t('guided.target', { count: p.targetReps });

    return (
        <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refreshDashboard} tintColor={colors.primary} />
                }
            >
                <Text style={[styles.welcome, { color: colors.textSecondary }]}>{t('guided.hello')}</Text>
                <Text style={[styles.greeting, { color: colors.text }]}>{patient.name}</Text>

                {plan.length > 0 ? (
                    <>
                        {allDone && (
                            <View style={[styles.doneBanner, { backgroundColor: colors.success + '1F', borderColor: colors.success }]}>
                                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                                <Text style={[styles.doneBannerText, { color: colors.text }]}>{t('guided.allDoneToday')}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.startButton, { backgroundColor: colors.primary }]}
                            onPress={() => navigation.navigate('GuidedConnect')}
                            accessibilityRole="button"
                        >
                            <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                            <Text style={styles.startButtonText}>
                                {allDone ? t('guided.doAgain') : t('guided.startExercises')}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            {t('guided.todayTitle', { done: doneCount, total: plan.length })}
                        </Text>
                        {plan.map((p) => (
                            <View
                                key={p.key}
                                style={[
                                    styles.exerciseRow,
                                    {
                                        backgroundColor: p.doneToday ? colors.success + '1F' : colors.card,
                                        borderColor: p.doneToday ? colors.success : colors.border,
                                    },
                                ]}
                            >
                                <View style={styles.exerciseText}>
                                    <Text style={[styles.exerciseName, { color: colors.text }]}>{exerciseName(p)}</Text>
                                    <Text style={[styles.exerciseTarget, { color: colors.textSecondary }]}>{targetText(p)}</Text>
                                </View>
                                {p.doneToday ? (
                                    <View style={styles.status}>
                                        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                                        <Text style={[styles.statusText, { color: colors.success }]}>{t('guided.doneToday')}</Text>
                                    </View>
                                ) : (
                                    <View style={styles.status}>
                                        <Ionicons name="ellipse-outline" size={26} color={colors.textSecondary} />
                                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>{t('guided.toDo')}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </>
                ) : (
                    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                        <Ionicons name="fitness-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('patientHome.noExercisesAssigned')}</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('patientHome.noExercisesDescription')}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.historyLink, { borderColor: colors.primary }]}
                    onPress={() => navigation.navigate('History')}
                >
                    <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                    <Text style={[styles.historyLinkText, { color: colors.primary }]}>{t('patientHome.viewFullHistory')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8, textAlign: 'center' },
    errorText: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
    retryButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
    retryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    welcome: { fontSize: 20 },
    greeting: { fontSize: 30, fontWeight: '700', marginBottom: 20 },
    doneBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 2,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    doneBannerText: { flex: 1, fontSize: 20, fontWeight: '600' },
    startButton: {
        minHeight: 96,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    startButtonText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
    sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 12,
    },
    exerciseText: { flex: 1 },
    exerciseName: { fontSize: 22, fontWeight: '700' },
    exerciseTarget: { fontSize: 17, marginTop: 4 },
    status: { alignItems: 'center', minWidth: 84 },
    statusText: { fontSize: 15, fontWeight: '600', marginTop: 2, textAlign: 'center' },
    emptyState: { alignItems: 'center', padding: 24, borderRadius: 16, marginTop: 8 },
    emptyTitle: { fontSize: 20, fontWeight: '600', marginTop: 12, textAlign: 'center' },
    emptyText: { fontSize: 16, marginTop: 6, textAlign: 'center' },
    historyLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 20,
    },
    historyLinkText: { fontSize: 18, fontWeight: '600' },
});

export default PatientHomeScreen;
