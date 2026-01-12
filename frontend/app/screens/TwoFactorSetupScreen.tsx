import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const TwoFactorSetupScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Two-Factor Authentication</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Ícone do Cadeado */}
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}> 
                        <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
                    </View>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Secure Your Account</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Add an extra layer of security with two-factor authentication
                </Text>

                {/* Caixa Azul de Info */}
                <View style={[styles.infoBox, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                    <Text style={[styles.infoTitle, { color: '#0369A1' }]}>Why enable 2FA:</Text>
                    <View style={styles.bulletPoint}>
                        <Text style={[styles.bullet, { color: '#0369A1' }]}>•</Text>
                        <Text style={[styles.infoText, { color: '#075985' }]}>Protects your sensitive health data</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={[styles.bullet, { color: '#0369A1' }]}>•</Text>
                        <Text style={[styles.infoText, { color: '#075985' }]}>Prevents unauthorized access</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={[styles.bullet, { color: '#0369A1' }]}>•</Text>
                        <Text style={[styles.infoText, { color: '#075985' }]}>Required for compliance in some regions</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Footer com Botões */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    onPress={() => alert("Flow continues to QR Code...")} // Aqui ligarias ao próximo ecrã se existisse
                >
                    <Text style={styles.primaryButtonText}>Enable Two-Factor Auth</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Skip for Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    content: { padding: 24, alignItems: 'center' },
    iconContainer: { marginVertical: 32 },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    description: { fontSize: 16, textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 },
    infoBox: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    infoTitle: { fontWeight: 'bold', marginBottom: 8 },
    bulletPoint: { flexDirection: 'row', marginBottom: 4 },
    bullet: { marginRight: 8, fontWeight: 'bold' },
    infoText: { flex: 1 },
    footer: { padding: 24, borderTopWidth: 1 },
    primaryButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    secondaryButton: { alignItems: 'center', padding: 8 },
    secondaryButtonText: { fontWeight: '600' },
});

export default TwoFactorSetupScreen;