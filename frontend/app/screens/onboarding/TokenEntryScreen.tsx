import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'TokenEntry'>;

const TokenEntryScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<NavigationProp>();
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleContinue = () => {
        if (token.length < 6) {
            Alert.alert("Invalid Token", "Please enter a valid invitation token.");
            return;
        }
        setIsLoading(true);
        // Simulação de validação
        setTimeout(() => {
            setIsLoading(false);
            navigation.navigate('OnboardingPrivacy', { token: token });
        }, 1000);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                
                {/* Header Simples "Sign Up" como no Figma */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Sign Up</Text>
                    <View style={{ width: 24 }} /> 
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    
                    {/* 1. LOGÓTIPO (Igual ao Figma) */}
                    <View style={styles.logoContainer}>
                         <Image 
                            source={require('../../../assets/logo.png')} 
                            style={styles.logo}
                        />
                    </View>

                    {/* 2. TEXTOS (Welcome to IRHIS) */}
                    <Text style={[styles.title, { color: colors.text }]}>Welcome to IRHIS</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Enter your invitation token to get started
                    </Text>

                    {/* 3. INPUT (Centralizado) */}
                    <View style={styles.formContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Invitation Token</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                placeholderTextColor={colors.textSecondary}
                                value={token}
                                onChangeText={setToken}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                textAlign="center" // Texto no meio como no Figma
                            />
                        </View>
                    </View>

                    {/* 4. CAIXA DE DICA AZUL */}
                    <View style={[
                        styles.tipContainer, 
                        { 
                            backgroundColor: isDark ? '#1e3a8a' : '#BFDBFE', // Azul escuro no dark mode, azul claro no light
                            borderColor: isDark ? '#3b82f6' : '#93C5FD' 
                        }
                    ]}>
                        <Ionicons name="bulb-outline" size={20} color={isDark ? '#93C5FD' : '#2563EB'} style={{ marginRight: 12 }} />
                        <Text style={[styles.tipText, { color: isDark ? '#DBEAFE' : '#1E40AF' }]}>
                            <Text style={{ fontWeight: 'bold' }}>Tip: </Text>
                            Your admin should have sent you an invitation email with a token.
                        </Text>
                    </View>

                </ScrollView>

                {/* BOTÃO NO FUNDO */}
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity 
                        style={[styles.button, { backgroundColor: token.length > 0 ? colors.primary : colors.border }]}
                        onPress={handleContinue}
                        disabled={token.length === 0 || isLoading}
                    >
                        <Text style={styles.buttonText}>{isLoading ? "Verifying..." : "Continue"}</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 16, borderBottomWidth: 1 },
    backButton: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    
    content: { padding: 24, paddingBottom: 100, alignItems: 'center' }, // paddingBottom extra para o botão não tapar
    
    logoContainer: { marginBottom: 24, marginTop: 20 },
    logo: { width: 100, height: 100, resizeMode: 'contain' },
    
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 },
    
    formContainer: { width: '100%', marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderRadius: 12, 
        paddingHorizontal: 16, 
        height: 56 
    },
    input: { flex: 1, fontSize: 18, fontWeight: '600', letterSpacing: 1 }, // letterSpacing para ficar estilo código
    
    tipContainer: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
        alignItems: 'flex-start' // Alinha o ícone com o topo do texto
    },
    tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
    
    footer: { padding: 24, borderTopWidth: 1, position: 'absolute', bottom: 0, width: '100%' },
    button: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default TokenEntryScreen;