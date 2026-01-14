import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    const { token } = route.params;

    const RadioOption = ({ id, title, description }: any) => {
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

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Legal Basis</Text>
            </View>

            <View style={styles.content}>
                <ProgressStepper currentStep={2} totalSteps={4} />

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

                {/* Info Box Azul */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        <Text style={{fontWeight: 'bold'}}>Information:</Text> Your selection will be recorded with a timestamp for compliance purposes.
                    </Text>
                </View>
            </View>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: selection ? '#0284C7' : '#93C5FD' }]}
                    onPress={() => selection && navigation.navigate('OnboardingPassword', { token, legalBasis: selection })}
                    disabled={!selection}
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
    content: { flex: 1, padding: 24 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    subtitle: { fontSize: 14, marginBottom: 24 },
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