import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";
import PrivacyNoticeModal from '@components/PrivacyNoticeModal';
import { useTranslation } from 'react-i18next';

const CreateAccountScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const formatBirthDate = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 8);
    
    let formatted = '';
    if (limitedNumbers.length > 0) {
      formatted = limitedNumbers.slice(0, 2);
    }
    if (limitedNumbers.length > 2) {
      formatted += '/' + limitedNumbers.slice(2, 4);
    }
    if (limitedNumbers.length > 4) {
      formatted += '/' + limitedNumbers.slice(4, 8);
    }
    return formatted;
  };
  
  const handleBirthDateChange = (text: string) => {
    const formatted = formatBirthDate(text);
    setBirthDate(formatted);
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD format for database
  const convertToDatabaseFormat = (dateStr: string): string => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day.length === 2 && month.length === 2 && year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    return dateStr;
  };

  const handleSubmit = async () => {
    const nameTrim = name.trim();
    const emailTrim = email.trim();
    const birthDateTrim = birthDate.trim();
    
    // Validation
    if (!nameTrim || !emailTrim || !password || !confirmPassword) {
      setError(t('createAccount.allFieldsRequired'));
      return;
    }
    
    // For patients, birth date is required
    if (role === 'patient' && !birthDateTrim) {
        setError(t('createAccount.birthDateRequired'));
        return;
      }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrim)) {
        setError(t('createAccount.invalidEmail'));
        return;
      }

    if (password.length < 6) {
      setError(t('createAccount.passwordMinLength'));
                return;
      }
    
    if (!acceptedTerms) {
        setError(t('createAccount.termsRequired'));
        return;
    }

        if (!acceptedPrivacy) {
        setError(t('createAccount.privacyRequired'));
        return;
    }
    
    if (password !== confirmPassword) {
      setError(t('createAccount.passwordMismatch'));
      return;
    }
    
    // Validate birth date format for patients
    if (role === 'patient') {
      const birthDateForDB = convertToDatabaseFormat(birthDateTrim);
      if (!birthDateForDB.match(/^\d{4}-\d{2}-\d{2}$/)) {
        setError(t('createAccount.invalidDate'));
        return;
      }
    }

    setError(null);
    setLoading(true);
    
    try {
      // Create account using remote signup (AuthContext handles user/token + storage)
      await signup(nameTrim, emailTrim, password, role);
      
      // AppNavigator will automatically switch to authenticated stack when user state changes
      // No manual navigation needed - the navigator re-renders based on user state
    } catch (err: any) {
      const msg = err.message || t('createAccount.createFailed');
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>{t('createAccount.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('createAccount.subtitle')}
          </Text>

          {/* Role Selection */}
          <Text style={[styles.label, { color: colors.text }]}>{t('createAccount.accountType')}</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'patient' && { backgroundColor: colors.primary, borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => setRole('patient')}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={role === 'patient' ? '#fff' : colors.text}
              />
              <Text style={[styles.roleButtonText, { color: role === 'patient' ? '#fff' : colors.text }]}>
                {t('common.patient')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'doctor' && { backgroundColor: colors.primary, borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setRole('doctor');
                setAcceptedTerms(false); 
              }}
            >
              <Ionicons
                name="medical-outline"
                size={24}
                color={role === 'doctor' ? '#fff' : colors.text}
              />
              <Text style={[styles.roleButtonText, { color: role === 'doctor' ? '#fff' : colors.text }]}>
                {t('common.doctor')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <Text style={[styles.label, { color: colors.text }]}>{t('common.fullName')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder={t('createAccount.namePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          {/* Email Input */}
          <Text style={[styles.label, { color: colors.text }]}>{t('common.email')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder={t('createAccount.emailPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Password Input */}
          <Text style={[styles.label, { color: colors.text }]}>{t('common.password')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder={t('createAccount.passwordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <Text style={[styles.label, { color: colors.text }]}>{t('common.confirmPassword')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder={t('createAccount.confirmPasswordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Birth Date Input - Only for Patients */}
          {role === 'patient' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>{t('createAccount.birthDateLabel')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder={t('createAccount.birthDatePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={birthDate}
                onChangeText={handleBirthDateChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </>
          )}

          <View style={styles.termsWrapper}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <View style={[styles.checkbox, { 
                      backgroundColor: acceptedTerms ? colors.primary : 'transparent',
                      borderColor: colors.primary 
                  }]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                    {t('createAccount.acceptPrefix')}{' '}
                    <Text style={{ color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => setShowTermsModal(true)}>
                      {t('common.termsAndConditions')}
                    </Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkboxContainer, { marginTop: 12 }]}
                  onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
                >
                  <View style={[styles.checkbox, { 
                      backgroundColor: acceptedPrivacy ? colors.primary : 'transparent',
                      borderColor: colors.primary 
                  }]}>
                    {acceptedPrivacy && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                    {t('createAccount.acceptPrefix')}{' '}
                    <Text style={{ color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }} 
                          onPress={() => setShowPrivacyModal(true)}>
                      {t('common.privacyNoticeConsent')}
                    </Text>
                  </Text>
                </TouchableOpacity>
            </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, opacity: (!acceptedTerms || !acceptedPrivacy) ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? t('createAccount.buttonLoading') : t('common.createAccount')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <TermsAndConditionsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} />

      <PrivacyNoticeModal visible={showPrivacyModal} onClose={() => setShowPrivacyModal(false)}
        onAccept={() => {
          setAcceptedPrivacy(true);
          setShowPrivacyModal(false);
        }}/>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24, color: '#666' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
    marginRight: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: { color: '#DC2626', fontSize: 14, marginBottom: 12 },
  button: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  termsWrapper: { marginTop: 8, marginBottom: 16 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  termsText: { fontSize: 14, flex: 1 },
});

export default CreateAccountScreen;
