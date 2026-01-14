import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import ProgressStepper from '../../components/ProgressStepper';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingPrivacy'>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingPrivacy'>;

const PrivacyTermsScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const [isChecked, setIsChecked] = useState(false);
    const { token } = route.params;

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Header igual ao Figma */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Terms</Text>
            </View>

            <View style={styles.content}>
                {/* Passo 1 de 4 */}
                <ProgressStepper currentStep={1} totalSteps={4} />

                {/* Caixa de Texto com o TEXTO OFICIAL */}
                <View style={[styles.termsBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={true} indicatorStyle="black">
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            Effective Date: August 1, 2025{'\n'}
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            Welcome to TwinRehab. By registering and using this application, whether as a patient or a healthcare professional, you agree to the following Terms and Conditions, which govern your access to and use of the platform, including the processing of personal and health-related data in accordance with applicable European laws, including the General Data Protection Regulation (GDPR). If you do not agree to these terms, you must not use the app.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            TwinRehab is a digital health platform intended to facilitate the secure collection, management, and exchange of health information between patients and licensed healthcare professionals. By signing up, patients confirm that they are at least 18 years old, or have obtained legal consent from a parent or guardian if underage. Healthcare professionals confirm that they are legally authorized and licensed to provide medical care within their jurisdiction and agree to use the platform exclusively for legitimate clinical purposes, in line with medical ethics and applicable law.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            All users understand and accept that personal data, including sensitive health data such as symptoms, medical history, clinical notes, and communications, will be collected and processed within the platform. This processing is based on the user's explicit consent, in accordance with Article 9(2)(a) of the GDPR. The data will be used strictly for the delivery of healthcare-related services, operational improvement of the platform, secure communication between patients and professionals, and as otherwise required by law. The platform does not sell user data or use it for advertising purposes. Access to patient data is strictly limited to healthcare professionals involved in the patient's care, and only where appropriate consent has been given or where legally required. Healthcare professionals agree to maintain strict confidentiality, to only access patient data when clinically justified, and to comply fully with GDPR obligations and any relevant national regulations.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            All users are responsible for the accuracy of the information they provide and for keeping their login credentials secure. Any unauthorized use of an account or suspected data breach must be reported to TwinRehab support immediately. The platform uses industry-standard security measures, including encryption and secure data storage, to protect personal information. However, no system can guarantee absolute security, and by using the app, users acknowledge and accept this risk.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            In accordance with the GDPR, all users have the right to access their data, request correction or deletion, restrict or object to processing, and request data portability. Users may also withdraw consent at any time, which will not affect the lawfulness of data processing prior to withdrawal. Patients and professionals can delete their accounts at any time through the app or by contacting support. Upon account deletion, all associated personal data will be permanently erased unless we are legally required to retain it.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            Healthcare professionals using the platform are solely responsible for ensuring that their use of the service complies with all legal, ethical, and professional obligations, including but not limited to appropriate licensing, clinical responsibility, patient safety, and data protection. Misuse of the platform or use for non-clinical or unlawful purposes may result in immediate termination of access and potential legal consequences.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            TwinRehab reserves the right to modify these Terms and Conditions at any time. Significant changes will be communicated through the app or via email. Continued use of the service after such changes constitutes your acceptance of the revised terms.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            If you have any questions or concerns about these Terms, your rights, or how your data is handled, you may contact us at TwinRehab, Avenida da França, n.º 256, 8.º andar, 4050-276 Porto – Portugal, or via email at manuele.vancin@eucinovacaoportugal.com.
                        </Text>

                        <Text style={[styles.paragraph, { color: colors.text }]}>
                            By clicking "Accept" and registering, you confirm that you have read, understood, and agreed to these Terms and Conditions, and you consent to the collection and processing of your personal and health-related data as described.
                        </Text>
                    </ScrollView>
                </View>

                {/* Checkbox em baixo */}
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsChecked(!isChecked)}>
                    <View style={[styles.checkbox, { backgroundColor: isChecked ? 'black' : 'transparent', borderColor: colors.text }]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                        I have read and agree to the Privacy Notice and Terms of Service
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Botão Continue */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: isChecked ? '#2563EB' : '#E0E0E0' }]} 
                    onPress={() => navigation.navigate('OnboardingLegal', { token })}
                    disabled={!isChecked}
                >
                    <Text style={[styles.buttonText, { color: isChecked ? 'white' : '#A0A0A0' }]}>Continue</Text>
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
    
    // Estilo da Caixa de Texto (Borda Arredondada)
    termsBox: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
    
    date: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
    paragraph: { fontSize: 14, lineHeight: 20, textAlign: 'justify', marginBottom: 12 },
    
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    checkbox: { width: 20, height: 20, borderWidth: 1, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
    checkboxLabel: { fontSize: 14, flex: 1 },
    
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontWeight: 'bold', fontSize: 16 },
});

export default PrivacyTermsScreen;