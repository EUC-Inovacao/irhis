import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { createInvite } from '../services/doctorService';
import { usePatients } from '../context/PatientContext';
import api from '../services/api';

// Invite link uses same backend as API
const INVITE_LINK_BASE = api.defaults.baseURL || 'https://irhis-api.azurewebsites.net';

const InvitePatientScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { fetchPatients } = usePatients();
  const [inviteeName, setInviteeName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{ token: string; email: string; inviteeName: string; expiresAt?: string } | null>(null);

  const handleSubmit = async () => {
    const name = inviteeName.trim();
    const emailTrim = email.trim();
    if (!name || !emailTrim) {
      setError('Name and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      setError('Please enter a valid email.');
      return;
    }
    setError(null);
    setLoading(true);
    setCreatedInvite(null);
    try {
      const res = await createInvite({ email: emailTrim, inviteeName: name, role: 'Patient' });
      await fetchPatients();
      setCreatedInvite({
        token: res.token,
        email: res.email,
        inviteeName: res.inviteeName,
        expiresAt: res.expiresAt,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create invite.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!createdInvite?.token) return;
    try {
      await Clipboard.setStringAsync(createdInvite.token);
      Alert.alert('Copied', 'Token copied to clipboard. You can paste it in a message or email to the patient.');
    } catch {
      Alert.alert('Error', 'Failed to copy token.');
    }
  };

  const handleCopyLink = async () => {
    if (!createdInvite?.token) return;
    const link = `${INVITE_LINK_BASE}/signup?token=${encodeURIComponent(createdInvite.token)}`;
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert('Copied', 'Invite link copied. You can paste it in a message or email to the patient.');
    } catch {
      Alert.alert('Error', 'Failed to copy link.');
    }
  };

  const handleDone = () => {
    setCreatedInvite(null);
    navigation.goBack();
  };

  if (createdInvite) {
    const inviteLink = `${INVITE_LINK_BASE}/signup?token=${encodeURIComponent(createdInvite.token)}`;
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={48} color="#16A34A" style={styles.successIcon} />
            <Text style={[styles.successTitle, { color: colors.text }]}>Invite created successfully</Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Share the token or link with the patient so they can register in the app. The token is valid for 24 hours.
            </Text>
            <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>Token</Text>
            <Text selectable style={[styles.tokenValue, { color: colors.text }]}>{createdInvite.token}</Text>
            <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.primary }]} onPress={handleCopyToken}>
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.copyButtonText}>Copy token</Text>
            </TouchableOpacity>
            <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>Invite link</Text>
            <Text selectable numberOfLines={2} style={[styles.linkValue, { color: colors.text }]}>{inviteLink}</Text>
            <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.primary }]} onPress={handleCopyLink}>
              <Ionicons name="link-outline" size={20} color="#fff" />
              <Text style={styles.copyButtonText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneButton, { borderColor: colors.border }]} onPress={handleDone}>
              <Text style={[styles.doneButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Invite Patient</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the patient's name and email. An invite will be created with a token valid for 24 hours.
          </Text>
          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Patient name"
            placeholderTextColor={colors.textSecondary}
            value={inviteeName}
            onChangeText={setInviteeName}
            autoCapitalize="words"
          />
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="email@exemplo.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Invite'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14, marginBottom: 12 },
  button: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successBox: { padding: 24, borderRadius: 12, borderWidth: 1 },
  successIcon: { alignSelf: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  successSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  tokenLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  tokenValue: { fontSize: 14, fontFamily: 'monospace', marginBottom: 12 },
  linkValue: { fontSize: 12, marginBottom: 12 },
  copyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 8, marginBottom: 16 },
  copyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  doneButton: { borderWidth: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  doneButtonText: { fontSize: 16, fontWeight: '600' },
});

export default InvitePatientScreen;
