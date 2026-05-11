import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import { Ionicons } from '@expo/vector-icons';
import { getDoctorInvites, resendInvite, revokeInvite, type InviteListItem } from '../services/doctorService';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const ManageInvitesScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { fetchPatients } = usePatients();
  const [invites, setInvites] = useState<InviteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadInvites = useCallback(async (isRefresh = false) => {
    if (!user || user.role !== 'doctor') return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getDoctorInvites(user.id);
      setInvites(res.items || []);
    } catch (err) {
      console.error('Failed to load invites:', err);
      setInvites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites])
  );

  const handleResend = async (inv: InviteListItem) => {
    if (actioningId) return;
    setActioningId(inv.id);
    try {
      await resendInvite(inv.id);
      await loadInvites(true);
      Alert.alert(t('manageInvites.inviteResentTitle'), t('manageInvites.inviteResentMessage'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.error || err.message || t('manageInvites.failedResend'));
    } finally {
      setActioningId(null);
    }
  };

  const handleRevoke = (inv: InviteListItem) => {
    Alert.alert(
      t('manageInvites.revokeTitle'),
      t('manageInvites.revokeMessage', { name: inv.inviteeName || inv.email }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('manageInvites.revoke'),
          style: 'destructive',
          onPress: async () => {
            if (actioningId) return;
            setActioningId(inv.id);
            try {
              await revokeInvite(inv.id);
              await fetchPatients();
              await loadInvites(true);
            } catch (err: any) {
              Alert.alert(t('common.error'), err.response?.data?.error || err.message || t('manageInvites.failedRevoke'));
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  if (loading && invites.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('manageInvites.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('manageInvites.subtitle')}
        </Text>
      </View>
      <FlatList
        data={invites.filter((i) => i.status === 'Pending')}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInvites(true)} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="mail-open-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('manageInvites.noPending')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardMain}>
              <Text style={[styles.cardName, { color: colors.text }]}>{item.inviteeName || item.email}</Text>
              <Text style={[styles.cardEmail, { color: colors.textSecondary }]}>{item.email}</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{t('manageInvites.tokenExpires')}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}
                onPress={() => handleResend(item)}
                disabled={!!actioningId}
              >
                {actioningId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t('manageInvites.resend')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleRevoke(item)}
                disabled={!!actioningId}
              >
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>{t('manageInvites.revoke')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 8 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardMain: { marginBottom: 12 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardEmail: { fontSize: 14, marginTop: 4 },
  cardMeta: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});

export default ManageInvitesScreen;
