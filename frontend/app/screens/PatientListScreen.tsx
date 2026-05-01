import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { usePatients } from '../context/PatientContext';
import { Ionicons } from '@expo/vector-icons';
import type {
  DoctorPatientItem,
  DoctorPatientConfirmed,
} from '../services/doctorService';
import { useFocusEffect } from '@react-navigation/native';
import SegmentedControl from '../components/SegmentedControl';
import { useTranslation } from 'react-i18next';

const EMPTY_VALUE = '--';

const PatientListScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { doctorPatientsItems, patients, assignedExercises, fetchPatients, loading } =
    usePatients();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'last_activity' | 'progress'>(
    'name'
  );

  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, [fetchPatients])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchPatients({ search: debouncedSearch } as any);
  }, [debouncedSearch, fetchPatients]);

  const getProgress = (patientId: string) => {
    const exercises = assignedExercises[patientId] || [];
    const total = exercises.length;
    if (total === 0) return null;
    const completed = exercises.filter((ex) => ex.completed === 1).length;
    return Math.round((completed / total) * 100);
  };

  const getLastActivity = (item: DoctorPatientItem): string => {
    if (item.type === 'pending') return EMPTY_VALUE;
    const confirmed = item as DoctorPatientConfirmed;
    const lastSession = confirmed.lastSessionAt;
    const lastFeedback = confirmed.lastFeedbackAt;
    if (!lastSession && !lastFeedback) return EMPTY_VALUE;
    const dates = [lastSession, lastFeedback].filter(Boolean) as string[];
    if (dates.length === 0) return EMPTY_VALUE;
    const mostRecent = dates.sort().reverse()[0];
    return new Date(mostRecent).toLocaleDateString();
  };

  const getLatestMetrics = (item: DoctorPatientItem): string => {
    if (item.type === 'pending') return EMPTY_VALUE;
    const confirmed = item as DoctorPatientConfirmed;
    if (confirmed.lastAvgROM !== undefined) {
      return t('patientList.metricRom', { value: confirmed.lastAvgROM.toFixed(1) });
    }
    if (confirmed.lastAvgVelocity !== undefined) {
      return t('patientList.metricVelocity', {
        value: confirmed.lastAvgVelocity.toFixed(2),
      });
    }
    return EMPTY_VALUE;
  };

  const filteredAndSortedItems = React.useMemo(() => {
    let items = doctorPatientsItems;

    if (filter === 'confirmed') {
      items = items.filter((item) => item.type === 'patient');
    } else if (filter === 'pending') {
      items = items.filter((item) => item.type === 'pending');
    }

    items = [...items].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA =
          a.type === 'pending' ? a.inviteeName || a.email || '' : a.name;
        const nameB =
          b.type === 'pending' ? b.inviteeName || b.email || '' : b.name;
        return nameA.localeCompare(nameB);
      }

      if (sortBy === 'last_activity') {
        const activityA = getLastActivity(a);
        const activityB = getLastActivity(b);
        if (activityA === EMPTY_VALUE && activityB === EMPTY_VALUE) return 0;
        if (activityA === EMPTY_VALUE) return 1;
        if (activityB === EMPTY_VALUE) return -1;
        return activityB.localeCompare(activityA);
      }

      if (sortBy === 'progress') {
        const progressA = a.type === 'patient' ? getProgress(a.id) : null;
        const progressB = b.type === 'patient' ? getProgress(b.id) : null;
        if (progressA === null && progressB === null) return 0;
        if (progressA === null) return 1;
        if (progressB === null) return -1;
        return (progressB || 0) - (progressA || 0);
      }

      return 0;
    });

    return items;
  }, [doctorPatientsItems, filter, sortBy, assignedExercises, t]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('patientList.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('patientList.subtitle')}
        </Text>

        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('patientList.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.controlsRow}>
          <SegmentedControl
            options={[
              t('patientList.filterAll'),
              t('patientList.filterConfirmed'),
              t('patientList.filterPending'),
            ]}
            selectedValue={
              filter === 'all'
                ? t('patientList.filterAll')
                : filter === 'confirmed'
                  ? t('patientList.filterConfirmed')
                  : t('patientList.filterPending')
            }
            onValueChange={(value) => {
              if (value === t('patientList.filterAll')) setFilter('all');
              if (value === t('patientList.filterConfirmed')) setFilter('confirmed');
              if (value === t('patientList.filterPending')) setFilter('pending');
            }}
          />
        </View>

        <View style={styles.controlsRow}>
          <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
            {t('patientList.sortBy')}
          </Text>
          <SegmentedControl
            options={[
              t('patientList.sortName'),
              t('patientList.sortLastActivity'),
              t('patientList.sortProgress'),
            ]}
            selectedValue={
              sortBy === 'name'
                ? t('patientList.sortName')
                : sortBy === 'last_activity'
                  ? t('patientList.sortLastActivity')
                  : t('patientList.sortProgress')
            }
            onValueChange={(value) => {
              if (value === t('patientList.sortName')) setSortBy('name');
              if (value === t('patientList.sortLastActivity')) {
                setSortBy('last_activity');
              }
              if (value === t('patientList.sortProgress')) setSortBy('progress');
            }}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchPatients}
            colors={[colors.primary]}
          />
        }
        showsHorizontalScrollIndicator
      >
        <View style={[styles.table, { borderColor: colors.border }]}>
          <View
            style={[
              styles.tableHeader,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cell, styles.cellName, { color: colors.text }]}>
              {t('patientList.name')}
            </Text>
            <Text style={[styles.cell, styles.cellNif, { color: colors.text }]}>
              {t('patientList.taxId')}
            </Text>
            <Text
              style={[styles.cell, styles.cellStatus, { color: colors.text }]}
            >
              {t('patientList.status')}
            </Text>
            <Text
              style={[
                styles.cell,
                styles.cellLastActivity,
                { color: colors.text },
              ]}
            >
              {t('patientList.lastActivity')}
            </Text>
            <Text
              style={[styles.cell, styles.cellMetrics, { color: colors.text }]}
            >
              {t('patientList.latestMetrics')}
            </Text>
            <Text
              style={[styles.cell, styles.cellProgress, { color: colors.text }]}
            >
              {t('patientList.progress')}
            </Text>
            <Text
              style={[styles.cell, styles.cellAction, { color: colors.text }]}
            >
              {t('patientList.action')}
            </Text>
          </View>
          {filteredAndSortedItems.length === 0 ? (
            <View style={[styles.emptyRow, { borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('patientList.empty')}
              </Text>
            </View>
          ) : (
            filteredAndSortedItems.map((item) => {
              if (item.type === 'pending') {
                return (
                  <View
                    key={item.id}
                    style={[styles.tableRow, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[styles.cell, styles.cellName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.inviteeName || item.email}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        styles.cellNif,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {EMPTY_VALUE}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: colors.warning + '25' },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: colors.warning }]}
                      >
                        {t('patientList.pending')}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.cell,
                        styles.cellLastActivity,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {EMPTY_VALUE}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        styles.cellMetrics,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {EMPTY_VALUE}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        styles.cellProgress,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {EMPTY_VALUE}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ManageInvites')}
                      style={styles.actionBtn}
                    >
                      <Text
                        style={[styles.actionBtnText, { color: colors.primary }]}
                      >
                        {t('patientList.manage')}
                      </Text>
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
                  onPress={() =>
                    navigation.navigate('PatientDetail', {
                      patientId: item.id,
                      role: 'doctor',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.cell, styles.cellName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {patient?.name ?? item.name}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.cellNif,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.nif || EMPTY_VALUE}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.success + '20' },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: colors.success }]}>
                      {t('patientList.confirmed')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cell,
                      styles.cellLastActivity,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {getLastActivity(item)}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.cellMetrics,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {getLatestMetrics(item)}
                  </Text>
                  <Text
                    style={[styles.cell, styles.cellProgress, { color: colors.text }]}
                  >
                    {progress !== null ? `${progress}%` : EMPTY_VALUE}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('PatientDetail', {
                        patientId: item.id,
                        role: 'doctor',
                      })
                    }
                    style={styles.actionBtn}
                  >
                    <Text
                      style={[styles.actionBtnText, { color: colors.primary }]}
                    >
                      {t('patientList.open')}
                    </Text>
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

const cellWidths = {
  name: 140,
  nif: 90,
  status: 100,
  lastActivity: 110,
  metrics: 120,
  progress: 70,
  action: 70,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  controlsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: { fontSize: 14, marginRight: 8 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', minWidth: 700 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  emptyRow: { padding: 24, borderBottomWidth: 0 },
  emptyText: { fontSize: 14 },
  cell: { fontSize: 14 },
  cellName: { width: cellWidths.name, marginRight: 8 },
  cellNif: { width: cellWidths.nif, marginRight: 8 },
  cellStatus: { width: cellWidths.status, marginRight: 8 },
  cellLastActivity: { width: cellWidths.lastActivity, marginRight: 8 },
  cellMetrics: { width: cellWidths.metrics, marginRight: 8 },
  cellProgress: { width: cellWidths.progress, marginRight: 8 },
  cellAction: { width: cellWidths.action },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: cellWidths.status,
    marginRight: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  actionBtn: { width: cellWidths.action, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});

export default PatientListScreen;
