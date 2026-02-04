import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { usePatients } from '../context/PatientContext';
import { Ionicons } from '@expo/vector-icons';
import type { DoctorPatientItem } from '../services/doctorService';
import { useFocusEffect } from '@react-navigation/native';

const PatientListScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { doctorPatientsItems, patients, assignedExercises, fetchPatients, loading } = usePatients();

  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, [fetchPatients])
  );

  const getProgress = (patientId: string) => {
    const exercises = assignedExercises[patientId] || [];
    const total = exercises.length;
    if (total === 0) return null;
    const completed = exercises.filter((ex) => ex.completed === 1).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Patient List</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Table view. Tap a row to open profile.
        </Text>
      </View>
      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPatients} colors={[colors.primary]} />}
        showsHorizontalScrollIndicator
      >
        <View style={[styles.table, { borderColor: colors.border }]}>
          <View style={[styles.tableHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cell, styles.cellName, { color: colors.text }]}>Name</Text>
            <Text style={[styles.cell, styles.cellNif, { color: colors.text }]}>Tax ID</Text>
            <Text style={[styles.cell, styles.cellStatus, { color: colors.text }]}>Status</Text>
            <Text style={[styles.cell, styles.cellProgress, { color: colors.text }]}>Progress</Text>
            <Text style={[styles.cell, styles.cellAction, { color: colors.text }]}>Action</Text>
          </View>
          {doctorPatientsItems.length === 0 ? (
            <View style={[styles.emptyRow, { borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No patients</Text>
            </View>
          ) : (
            doctorPatientsItems.map((item) => {
              if (item.type === 'pending') {
                return (
                  <View key={item.id} style={[styles.tableRow, { borderColor: colors.border }]}>
                    <Text style={[styles.cell, styles.cellName, { color: colors.text }]} numberOfLines={1}>{item.inviteeName || item.email}</Text>
                    <Text style={[styles.cell, styles.cellNif, { color: colors.textSecondary }]}>—</Text>
                    <View style={[styles.badge, { backgroundColor: colors.warning + '25' }]}>
                      <Text style={[styles.badgeText, { color: colors.warning }]}>Pendente</Text>
                    </View>
                    <Text style={[styles.cell, styles.cellProgress, { color: colors.textSecondary }]}>—</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ManageInvites')} style={styles.actionBtn}>
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              const patient = patients[item.id];
              const progress = getProgress(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tableRow, { borderColor: colors.border }]}
                  onPress={() => navigation.navigate('PatientDetail', { patientId: item.id, role: 'doctor' })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cell, styles.cellName, { color: colors.text }]} numberOfLines={1}>{patient?.name ?? item.name}</Text>
                  <Text style={[styles.cell, styles.cellNif, { color: colors.textSecondary }]} numberOfLines={1}>{item.nif || '—'}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.success }]}>Confirmado</Text>
                  </View>
                  <Text style={[styles.cell, styles.cellProgress, { color: colors.text }]}>{progress !== null ? `${progress}%` : '—'}</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PatientDetail', { patientId: item.id, role: 'doctor' })}
                    style={styles.actionBtn}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Abrir</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const cellWidths = { name: 140, nif: 90, status: 100, progress: 70, action: 70 };
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 8 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', minWidth: 480 },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, alignItems: 'center' },
  emptyRow: { padding: 24, borderBottomWidth: 0 },
  emptyText: { fontSize: 14 },
  cell: { fontSize: 14 },
  cellName: { width: cellWidths.name, marginRight: 8 },
  cellNif: { width: cellWidths.nif, marginRight: 8 },
  cellStatus: { width: cellWidths.status, marginRight: 8 },
  cellProgress: { width: cellWidths.progress, marginRight: 8 },
  cellAction: { width: cellWidths.action },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, width: cellWidths.status, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  actionBtn: { width: cellWidths.action, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});

export default PatientListScreen;
