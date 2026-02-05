import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type NavProp = StackNavigationProp<RootStackParamList, 'TokenInvalid'>;
type RouteProps = RouteProp<RootStackParamList, 'TokenInvalid'>;

const reasonMessages: Record<string, { title: string; message: string }> = {
  invalid: {
    title: 'Invalid token',
    message: 'The token you entered is not valid. Check and try again or request a new invite.',
  },
  expired: {
    title: 'Token expired',
    message: 'This invite has expired. Ask your doctor or administrator for a new invite.',
  },
  already_used: {
    title: 'Token already used',
    message: 'This invite was already used to complete registration. If you already have an account, sign in.',
  },
  unavailable: {
    title: 'Service unavailable',
    message: 'Could not validate the token. Try again later.',
  },
  error: {
    title: 'Error',
    message: 'An error occurred while validating the token. Try again.',
  },
};

const TokenInvalidScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { reason } = route.params;
  const { title, message } = reasonMessages[reason] || reasonMessages.invalid;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.card }]}>
          <Ionicons name="warning-outline" size={64} color="#DC2626" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('TokenEntry')}
        >
          <Text style={styles.buttonText}>Enter another token</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buttonSecondary, { borderColor: colors.border }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.buttonSecondaryText, { color: colors.text }]}>I already have an account — Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 },
  button: { width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonSecondary: { width: '100%', height: 52, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  buttonSecondaryText: { fontSize: 16, fontWeight: '600' },
});

export default TokenInvalidScreen;
