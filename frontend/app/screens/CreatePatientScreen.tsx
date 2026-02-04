import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePatients } from '@context/PatientContext';
import { getUnassignedPatients } from "@services/patientService";
import { assignPatientToDoctor } from "@services/patientService";
import type { Patient } from '../types';

const CreatePatientScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { assignPatient } = usePatients();
    const [unassignedPatients, setUnassignedPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUnassignedPatients = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUnassignedPatients();
            setUnassignedPatients(data);
        } catch (error) {
            console.error('Failed to fetch unassigned patients:', error);
            Alert.alert('Error', 'Failed to fetch unassigned patients.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnassignedPatients();
    }, [fetchUnassignedPatients]);
    
    const handleAssignPatient = async (patientId: string) => {
        try {
            await assignPatient(patientId);
            Alert.alert('Success', 'Patient assigned successfully.');
            fetchUnassignedPatients(); // Refresh the list
        } catch (error) {
            Alert.alert('Error', 'Failed to assign patient.');
        }
    };

    const renderPatientItem = ({ item }: { item: Patient }) => (
        <View style={[styles.patientCard, { backgroundColor: colors.card }]}>
            <View style={styles.patientInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {item.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                </View>
                <Text style={[styles.patientName, { color: colors.text }]}>{item.name}</Text>
            </View>
            <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAssignPatient(item.id)}
            >
                <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <FlatList
                data={unassignedPatients}
                renderItem={renderPatientItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.container}
                ListHeaderComponent={() => (
                    <Text style={[styles.title, { color: colors.text }]}>Assign New Patient</Text>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="person-add-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>No new patients to assign</Text>
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
    container: {
        flex: 1,
        padding: 16,
    },
    listContainer: {
        gap: 12,
    },
    patientCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    patientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
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
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        color: '#8E8E93',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
});

export default CreatePatientScreen; 