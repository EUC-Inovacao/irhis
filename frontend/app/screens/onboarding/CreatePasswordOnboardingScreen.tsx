import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import ProgressStepper from '../../components/ProgressStepper';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingPassword'>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingPassword'>;

const CreatePasswordOnboardingScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { token, legalBasis } = route.params;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hasMinLength, setHasMinLength] = useState(false);
    const [hasUpperCase, setHasUpperCase] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);

    useEffect(() => {
        setHasMinLength(password.length >= 8);
        setHasUpperCase(/[A-Z]/.test(password));
        setHasNumber(/[0-9]/.test(password));
    }, [password]);

    const isValid = hasMinLength && hasUpperCase && hasNumber && (password === confirmPassword) && password.length > 0;

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

                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <TextInput 
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    secureTextEntry
                    placeholder="********"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                />

                <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                <TextInput 
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    secureTextEntry
                    placeholder="********"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

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
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: isValid ? '#0284C7' : '#93C5FD' }]}
                    onPress={() => isValid && navigation.navigate('OnboardingTwoFactor', { token })}
                    disabled={!isValid}
                >
                    <Text style={styles.buttonText}>Continue</Text>
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
    input: { borderWidth: 1, borderRadius: 8, height: 50, paddingHorizontal: 16, marginBottom: 16, fontSize: 16 },
    requirementsBox: { backgroundColor: '#BFDBFE', padding: 16, borderRadius: 8, marginTop: 8 },
    reqTitle: { color: '#1E3A8A', marginBottom: 8, fontWeight: 'bold', fontSize: 14 },
    reqItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    reqText: { marginLeft: 8, fontSize: 13 },
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
export default CreatePasswordOnboardingScreen;