import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext'; // Importação essencial
import ProgressStepper from '../../components/ProgressStepper';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingPrivacy'>;

const PrivacyTermsScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    
    // Pegamos user e setUser do AuthContext para gerenciar o estado global
    const { user, setUser } = useAuth(); 
    
    const [isChecked, setIsChecked] = useState(false);
    const [loading, setLoading] = useState(false);

    // FUNÇÃO DE ACEITE: Atualiza o Active no estado global
    const handleAcceptTerms = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Se tiver chamada de API para persistir no banco, coloque aqui.
            // Ex: await api.patch(`/users/${user.id}`, { Active: 1 });

            // Atualiza o contexto local. 
            // O AppNavigator lerá 'Active: 1' e trocará a tela para a Home automaticamente.
            setUser({
                ...user,
                Active: 1,
            });
            
        } catch (error) {
            console.error("Error activating user:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Terms</Text>
            </View>

            <View style={styles.content}>
                <ProgressStepper currentStep={1} totalSteps={4} />

                <View style={[styles.termsBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={true}>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            Effective Date: August 1, 2025{'\n'}
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            Welcome to TwinRehab. By registering and using this application, whether as a patient or a healthcare professional, you agree to the following Terms and Conditions, which govern your access to and use of the platform, including the processing of personal and health-related data in accordance with applicable European laws (GDPR).
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            All users understand and accept that personal data, including sensitive health data such as symptoms, medical history, clinical notes, and communications, will be collected and processed within the platform.
                        </Text>
                        
                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            Healthcare professionals agree to maintain strict confidentiality, to only access patient data when clinically justified, and to comply fully with GDPR obligations.
                        </Text>
                        
                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            By clicking "Accept" and registering, you confirm that you have read, understood, and agreed to these Terms and Conditions.
                        </Text>
                    </ScrollView>
                </View>

                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsChecked(!isChecked)}>
                    <View style={[styles.checkbox, { backgroundColor: isChecked ? colors.primary : 'transparent', borderColor: colors.text }]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                        I have read and agree to the Privacy Notice and Terms of Service
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: isChecked ? colors.primary : '#E0E0E0' }]} 
                    onPress={handleAcceptTerms}
                    disabled={!isChecked || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={[styles.buttonText, { color: isChecked ? 'white' : '#A0A0A0' }]}>
                            Accept & Start
                        </Text>
                    )}
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
    content: { flex: 1, padding: 24 },
    termsBox: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
    date: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
    paragraph: { fontSize: 14, lineHeight: 20, textAlign: 'justify', marginBottom: 12 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    checkbox: { width: 20, height: 20, borderWidth: 1, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
    checkboxLabel: { fontSize: 14, flex: 1 },
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontWeight: 'bold', fontSize: 16 },
});

export default PrivacyTermsScreen;