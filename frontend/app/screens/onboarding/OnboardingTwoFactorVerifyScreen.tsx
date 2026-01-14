import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingTwoFactorVerify'>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingTwoFactorVerify'>;

const OnboardingTwoFactorVerifyScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const [code, setCode] = useState('');

    const handleVerify = () => {
        if (code.length !== 6) {
            Alert.alert("Invalid Code", "Please enter a 6-digit code.");
            return;
        }

        // Sucesso Final!
        Alert.alert(
            "Success",
            "Two-Factor Authentication Enabled! Please log in.",
            [{ 
                text: "Go to Login", 
                onPress: () => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                }
            }]
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                
                {/* Header Simples com Back */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* QR Code Placeholder (Caixa Cinza com Ícone) */}
                    <View style={styles.qrContainer}>
                        <View style={styles.qrPlaceholder}>
                            <Ionicons name="layers-outline" size={48} color="#6B7280" />
                        </View>
                    </View>

                    <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Verification Code</Text>
                        <TextInput 
                            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
                            placeholder="Enter 6-digit code"
                            placeholderTextColor={colors.textSecondary}
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                        />
                    </View>

                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[styles.button, { backgroundColor: code.length === 6 ? '#0284C7' : '#93C5FD' }]}
                        onPress={handleVerify}
                        disabled={code.length !== 6}
                    >
                        <Text style={styles.buttonText}>Verify & Enable</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 16, borderBottomWidth: 1 },
    backButton: { padding: 4, marginRight: 16 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    content: { padding: 24, alignItems: 'center' },
    
    qrContainer: { marginTop: 24, marginBottom: 24 },
    qrPlaceholder: { 
        width: 160, height: 160, backgroundColor: '#F3F4F6', 
        borderRadius: 16, justifyContent: 'center', alignItems: 'center' 
    },
    
    instructionText: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 32, paddingHorizontal: 16 },
    
    inputGroup: { width: '100%', marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    input: { 
        borderWidth: 1, borderRadius: 12, height: 56, 
        fontSize: 18, paddingHorizontal: 16, letterSpacing: 2 
    },
    
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default OnboardingTwoFactorVerifyScreen;