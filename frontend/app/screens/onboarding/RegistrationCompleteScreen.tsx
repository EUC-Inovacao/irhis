import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import type { User } from '../../types';
import { useAuth } from '../../context/AuthContext';

type RouteProps = RouteProp<RootStackParamList, 'RegistrationComplete'>;

const RegistrationCompleteScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { completeSignupWithInvite } = useAuth();
  const { token, user: apiUser } = route.params;

  const handleContinue = async () => {
    const user: User = {
      id: apiUser.id,
      email: apiUser.email,
      name: apiUser.name,
      role: (apiUser.role?.toLowerCase() === 'doctor' ? 'doctor' : 'patient') as 'patient' | 'doctor',
    };
    await completeSignupWithInvite(token, user);
    // Navigator will re-render and show authenticated stack; no need to navigate.
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.card }]}>
          <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Registration complete</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Your account was created successfully. Press Continue to access the app.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 40, paddingHorizontal: 16 },
  button: { width: '100%', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default RegistrationCompleteScreen;
