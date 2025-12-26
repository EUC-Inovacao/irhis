import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import { Ionicons } from '@expo/vector-icons';
import type { Patient } from '../types';
import PatientCard from '@components/PatientCard';
import { useFocusEffect } from '@react-navigation/native';

interface StatCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    value: string | number;
    label: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
        </View>
    );
};

const DoctorHomeScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { patients, assignedExercises, fetchPatients, loading } = usePatients();

    useFocusEffect(
        useCallback(() => {
            fetchPatients();
        }, [fetchPatients])
    );
    
    const patientList = Object.values(patients);

    const totalPatients = patientList.length;
    // Calculate stats based on assigned exercises
    const activePatients = patientList.filter(p => {
        const exercises = assignedExercises[p.id] || [];
        return exercises.some(ex => ex.completed === 0);
    }).length;
    const completedPatients = patientList.filter(p => {
        const exercises = assignedExercises[p.id] || [];
        return exercises.length > 0 && exercises.every(ex => ex.completed === 1);
    }).length;
    const averageProgress = patientList.reduce((acc, patient) => {
        const exercises = assignedExercises[patient.id] || [];
        const completed = exercises.filter(ex => ex.completed === 1).length;
        const total = exercises.length;
        return acc + (total > 0 ? (completed / total) * 100 : 0);
    }, 0) / (totalPatients || 1);

    const renderHeader = () => (
        <>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Welcome back,</Text>
                    <Text style={[styles.title, { color: colors.text }]}>{user?.name}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => navigation.navigate('CreatePatient')}
                >
                    <Ionicons name="person-add-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
                <StatCard 
                    icon="people" 
                    value={totalPatients} 
                    label="Total Patients"
                    color={colors.purple[500]}
                />
                <StatCard 
                    icon="fitness" 
                    value={activePatients} 
                    label="Active Patients"
                    color={colors.success}
                />
                <StatCard 
                    icon="checkmark-circle" 
                    value={completedPatients} 
                    label="Completed"
                    color={colors.info}
                />
                <StatCard 
                    icon="trending-up" 
                    value={`${Math.round(averageProgress)}%`} 
                    label="Avg. Progress"
                    color={colors.warning}
                />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient List</Text>
        </>
    );

    if (loading && patientList.length === 0) {
        return (
            <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <FlatList
                data={patientList}
                renderItem={({ item }) => <PatientCard item={item} navigation={navigation} />}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.contentContainer}
                ListEmptyComponent={
                    <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
                        <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Patients Found</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            There are currently no patients in the system.
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    contentContainer: {
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
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: '47%',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 20,
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
    emptyContainer: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 12,
        marginTop: 16,
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
        marginBottom: 24,
    },
    assignButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    assignButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default DoctorHomeScreen; 