import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TermsAndConditionsModal from "../components/TermsAndConditionsModal";
import PrivacyNoticeModal from '@components/PrivacyNoticeModal';
import * as RemoteAuth from '../services/auth';

// TEMPORARY: both patients and doctors receive generated internal access codes
// until the dedicated identity flow is introduced.
const TEMPORARY_STUDY_ACCESS_FLOW = true;

const CreateAccountScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasUpperCase, setHasUpperCase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    setHasMinLength(password.length >= 8);
    setHasUpperCase(/[A-Z]/.test(password));
    setHasNumber(/[0-9]/.test(password));
    setPasswordsMatch(password.length > 0 && password === confirmPassword);
  }, [password, confirmPassword]);

  const isValidPassword = hasMinLength && hasUpperCase && hasNumber && passwordsMatch;

  const Requirement = ({ label, met }: { label: string; met: boolean }) => (
    <View style={styles.requirementRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? colors.success : colors.textSecondary}
      />
      <Text style={[styles.requirementText, { color: met ? colors.text : colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (!hasMinLength) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!hasUpperCase) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }

    if (!hasNumber) {
      setError('Password must contain at least one number.');
      return;
    }
    
    if (!acceptedTerms) {
        setError('You must accept the terms and conditions to continue.');
        return;
    }

        if (!acceptedPrivacy) {
        setError('You must accept the privacy notice to continue.');
        return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      // TEMPORARY: do not auto-login after signup, otherwise the screen changes
      // before the generated access code alert can be acknowledged by the user.
      const createdUser = (await RemoteAuth.signup('', '', password, role)).user;
      const generatedCode = createdUser.accessCode || createdUser.patientCode;
      setLoading(false);

      if (generatedCode) {
        Alert.alert(
          role === 'doctor' ? 'Doctor created' : 'Patient created',
          `Access code: ${generatedCode}\n\nUse this code with the chosen password to sign in.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setPassword('');
                setConfirmPassword('');
                setError(null);
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Login');
                }
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (err: any) {
      const rawMsg = err.message || 'Failed to create account. Please try again.';
      const msg =
        rawMsg === 'Missing required fields'
          ? 'The account could not be created. Please check the required information and try again.'
          : rawMsg;
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {TEMPORARY_STUDY_ACCESS_FLOW
              ? 'Patients and doctors receive generated internal access codes in this temporary flow.'
              : 'Create a new account. Choose whether you\'re a doctor or patient.'}
          </Text>

          {/* Role Selection */}
          <Text style={[styles.label, { color: colors.text }]}>Account Type</Text>
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
                Patient
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
                Doctor
              </Text>
            </TouchableOpacity>
          </View>

          {TEMPORARY_STUDY_ACCESS_FLOW && (
            <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Temporary Access Code</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {role === 'doctor'
                  ? 'A non-sensitive doctor access code will be generated automatically using a different pattern from the patient code.'
                  : 'A non-sensitive patient access code will be generated automatically using a different pattern from the doctor code.'}
              </Text>
            </View>
          )}

          {/* Password Input */}
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter password (min. 8 characters)"
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
          <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Confirm password"
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

          <View style={[styles.rulesContainer, { backgroundColor: colors.info + '15', borderColor: colors.info + '30' }]}>
            <Text style={[styles.rulesTitle, { color: colors.info }]}>Password requirements:</Text>
            <Requirement label="At least 8 characters" met={hasMinLength} />
            <Requirement label="One uppercase letter" met={hasUpperCase} />
            <Requirement label="One number" met={hasNumber} />
            <Requirement label="Passwords match" met={passwordsMatch} />
          </View>

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
                    I accept the{' '}
                    <Text style={{ color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => setShowTermsModal(true)}>
                      Terms and Conditions
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
                    I accept the{' '}
                    <Text style={{ color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }} 
                          onPress={() => setShowPrivacyModal(true)}>
                      Privacy Notice & Consent
                    </Text>
                  </Text>
                </TouchableOpacity>
            </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: (!acceptedTerms || !acceptedPrivacy || !isValidPassword || loading) ? 0.6 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading || !acceptedTerms || !acceptedPrivacy || !isValidPassword}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
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
  infoCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  infoText: { fontSize: 14, lineHeight: 20 },
  rulesContainer: { marginTop: 8, marginBottom: 8, padding: 16, borderRadius: 12, borderWidth: 1 },
  rulesTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  requirementText: { fontSize: 14 },
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
