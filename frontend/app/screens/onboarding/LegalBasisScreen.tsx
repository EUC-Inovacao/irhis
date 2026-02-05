import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import ProgressStepper from '../../components/ProgressStepper';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingLegal'>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingLegal'>;

const LegalBasisScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const [selection, setSelection] = useState<'consent' | 'secrecy' | null>(null);
    const [consentChecked, setConsentChecked] = useState(false);
    const [nif, setNif] = useState('');
    const { token, role, inviteeName, email, acceptedTermsAt } = route.params;
    const isPatient = role === 'patient';

    const RadioOption = ({ id, title, description }: { id: 'consent' | 'secrecy'; title: string; description: string }) => {
        const isSelected = selection === id;
        return (
            <TouchableOpacity 
                style={[
                    styles.optionCard, 
                    { 
                        borderColor: isSelected ? '#3B82F6' : '#E5E7EB',
                        backgroundColor: isSelected ? '#DBEAFE' : 'transparent' 
                    }
                ]}
                onPress={() => setSelection(id)}
            >
                <View style={styles.radioRow}>
                    <Ionicons 
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={isSelected ? '#2563EB' : colors.text} 
                    />
                    <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{description}</Text>
            </TouchableOpacity>
        );
    };

    const goToPassword = () => {
        const base = { token, acceptedTermsAt, role, inviteeName, email };
        if (isPatient) {
            if (!consentChecked || !nif.trim()) return;
            navigation.navigate('OnboardingPassword', {
                ...base,
                consentClinicalDataAt: new Date().toISOString(),
                nif: nif.trim(),
            });
        } else {
            if (!selection) return;
            navigation.navigate('OnboardingPassword', { ...base, legalBasis: selection });
        }
    };

    const canContinue = isPatient ? consentChecked && nif.trim().length > 0 : !!selection;

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {isPatient ? 'Consent for Clinical Data' : 'Legal Basis'}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <ProgressStepper currentStep={2} totalSteps={4} />

                {isPatient ? (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Consent for Clinical Data</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            To register as a patient, you must consent to processing of your clinical data and provide your Tax ID.
                        </Text>

                        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setConsentChecked(!consentChecked)}>
                            <View style={[styles.checkbox, { backgroundColor: consentChecked ? '#2563EB' : 'transparent', borderColor: colors.border }]}>
                                {consentChecked && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                                I consent to the processing of my clinical data for movement analysis and clinical monitoring purposes, as described in the privacy policy.
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: colors.text }]}>Tax ID (required)</Text>
                        <TextInput 
                            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                            placeholder="Ex: 123456789"
                            placeholderTextColor={colors.textSecondary}
                            value={nif}
                            onChangeText={setNif}
                            keyboardType="number-pad"
                            maxLength={9}
                        />
                    </>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Processing Basis</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Please select the legal basis for processing your health data
                        </Text>

                        <RadioOption 
                            id="consent" 
                            title="Consent" 
                            description="I freely give my consent for processing my health data for motion analysis purposes. I can withdraw this consent at any time."
                        />
                        <RadioOption 
                            id="secrecy" 
                            title="Healthcare Under Professional Secrecy" 
                            description="Data processing is necessary for healthcare treatment under professional secrecy obligations, as part of my medical care."
                        />
                    </>
                )}

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        <Text style={{fontWeight: 'bold'}}>Information:</Text> Your selection will be recorded with a timestamp for compliance purposes.
                    </Text>
                </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: canContinue ? '#0284C7' : '#93C5FD' }]}
                    onPress={goToPassword}
                    disabled={!canContinue}
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
    content: { flex: 1, padding: 24, paddingBottom: 100 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    subtitle: { fontSize: 14, marginBottom: 24 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    checkbox: { width: 22, height: 22, borderWidth: 1, marginRight: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    checkboxLabel: { fontSize: 14, flex: 1 },
    label: { fontWeight: '600', marginBottom: 8, fontSize: 14 },
    input: { borderWidth: 1, borderRadius: 8, height: 48, paddingHorizontal: 16, marginBottom: 16, fontSize: 16 },
    optionCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    optionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
    optionDesc: { fontSize: 14, lineHeight: 20, marginLeft: 36 },
    infoBox: { backgroundColor: '#BFDBFE', padding: 16, borderRadius: 8, marginTop: 8 },
    infoText: { color: '#1E3A8A', fontSize: 13, lineHeight: 18 },
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
export default LegalBasisScreen;