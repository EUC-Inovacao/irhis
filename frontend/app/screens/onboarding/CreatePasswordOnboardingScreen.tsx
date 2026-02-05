import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, User } from '../../types';
import ProgressStepper from '../../components/ProgressStepper';
import { completeSignup } from '../../services/inviteService';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingPassword'>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingPassword'>;

const CreatePasswordOnboardingScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { token, acceptedTermsAt, consentClinicalDataAt, nif } = route.params;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Estados para controlar a visibilidade
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [hasMinLength, setHasMinLength] = useState(false);
    const [hasUpperCase, setHasUpperCase] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setHasMinLength(password.length >= 8);
        setHasUpperCase(/[A-Z]/.test(password));
        setHasNumber(/[0-9]/.test(password));
    }, [password]);

    const isValid = hasMinLength && hasUpperCase && hasNumber && (password === confirmPassword) && password.length > 0;

    const handleSubmit = async () => {
        if (!isValid || isSubmitting) return;
        setErrorMessage(null);
        setIsSubmitting(true);
        try {
            const payload = {
                token,
                password,
                acceptedTermsAt,
                ...(consentClinicalDataAt && { consentClinicalDataAt }),
                ...(nif && { nif }),
            };
            const result = await completeSignup(payload);
            const user: User = {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: (result.user.role?.toLowerCase() === 'doctor' ? 'doctor' : 'patient') as 'patient' | 'doctor',
            };
            navigation.navigate('RegistrationComplete', { token: result.token, user });
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Failed to complete registration. Try again.';
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Create Password</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <ProgressStepper currentStep={3} totalSteps={4} />

                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Create a secure password for your account
                </Text>

                {/* PASSWORD INPUT */}
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput 
                        style={[styles.input, { color: colors.text }]}
                        secureTextEntry={!showPassword}
                        placeholder="********"
                        placeholderTextColor={colors.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons 
                            name={showPassword ? "eye-outline" : "eye-off-outline"} 
                            size={20} 
                            color={colors.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>

                {/* CONFIRM PASSWORD INPUT */}
                <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput 
                        style={[styles.input, { color: colors.text }]}
                        secureTextEntry={!showConfirmPassword}
                        placeholder="********"
                        placeholderTextColor={colors.textSecondary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        <Ionicons 
                            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                            size={20} 
                            color={colors.textSecondary} 
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.requirementsBox}>
                    <Text style={styles.reqTitle}>Password requirements:</Text>
                    <View style={styles.reqItem}>
                        <Ionicons name="checkmark" size={14} color={hasMinLength ? '#16A34A' : '#6B7280'} />
                        <Text style={[styles.reqText, { color: hasMinLength ? '#16A34A' : '#6B7280' }]}>At least 8 characters</Text>
                    </View>
                    <View style={styles.reqItem}>
                        <Ionicons name="checkmark" size={14} color={hasUpperCase ? '#16A34A' : '#6B7280'} />
                        <Text style={[styles.reqText, { color: hasUpperCase ? '#16A34A' : '#6B7280' }]}>One uppercase letter</Text>
                    </View>
                    <View style={styles.reqItem}>
                        <Ionicons name="checkmark" size={14} color={hasNumber ? '#16A34A' : '#6B7280'} />
                        <Text style={[styles.reqText, { color: hasNumber ? '#16A34A' : '#6B7280' }]}>One number</Text>
                    </View>
                </View>

                {errorMessage ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color="#DC2626" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: isValid && !isSubmitting ? '#0284C7' : '#93C5FD' }]}
                    onPress={handleSubmit}
                    disabled={!isValid || isSubmitting}
                >
                    <Text style={styles.buttonText}>{isSubmitting ? 'A concluir...' : 'Concluir registo'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    content: { padding: 24 },
    description: { marginBottom: 24, fontSize: 14 },
    label: { fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
    
    // ATUALIZADO: Container para Input + Ícone
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderRadius: 8, 
        height: 50, 
        paddingHorizontal: 16, 
        marginBottom: 16 
    },
    input: { flex: 1, fontSize: 16, height: '100%' },
    eyeIcon: { padding: 4 },

    requirementsBox: { backgroundColor: '#BFDBFE', padding: 16, borderRadius: 8, marginTop: 8 },
    reqTitle: { color: '#1E3A8A', marginBottom: 8, fontWeight: 'bold', fontSize: 14 },
    reqItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    reqText: { marginLeft: 8, fontSize: 13 },
    errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginTop: 16, gap: 8 },
    errorText: { color: '#DC2626', fontSize: 14, flex: 1 },
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
export default CreatePasswordOnboardingScreen;