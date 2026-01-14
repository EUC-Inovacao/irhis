import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import ProgressStepper from '../../components/ProgressStepper';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingTwoFactor'>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingTwoFactor'>;

const OnboardingTwoFactorScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { token } = route.params || { token: '' };

    const handleEnable = () => {
        navigation.navigate('OnboardingTwoFactorVerify', { token });
    };

    const handleSkip = () => {
        Alert.alert("Success", "Account created successfully.", [{ text: "Go to Login", onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            
            {/* HEADER COM SETA */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <ProgressStepper currentStep={4} totalSteps={4} />

                <View style={styles.iconCircle}>
                    <Ionicons name="lock-closed" size={40} color="#0284C7" />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Secure Your Account</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Add an extra layer of security with two-factor authentication
                </Text>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Why enable 2FA:</Text>
                    <Text style={styles.infoItem}>• Protects your sensitive health data</Text>
                    <Text style={styles.infoItem}>• Prevents unauthorized access</Text>
                    <Text style={styles.infoItem}>• Required for compliance in some regions</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleEnable}>
                    <Text style={styles.primaryButtonText}>Enable Two-Factor Auth</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                    <Text style={styles.secondaryButtonText}>Skip for Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 16, borderBottomWidth: 1 },
    backButton: { padding: 4, marginRight: 16 }, // Espaçamento da seta
    headerTitle: { fontSize: 18, fontWeight: '600' },
    content: { padding: 24, alignItems: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 },
    infoBox: { width: '100%', backgroundColor: '#BFDBFE', padding: 16, borderRadius: 12 },
    infoTitle: { color: '#1E3A8A', fontWeight: 'bold', marginBottom: 4 },
    infoItem: { color: '#1E3A8A', marginBottom: 2 },
    footer: { padding: 24 },
    primaryButton: { backgroundColor: '#0284C7', height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    primaryButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    secondaryButton: { alignItems: 'center', padding: 8 },
    secondaryButtonText: { color: '#6B7280', fontWeight: 'bold' },
});

export default OnboardingTwoFactorScreen;