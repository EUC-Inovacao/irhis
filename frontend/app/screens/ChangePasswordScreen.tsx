import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import PasswordRequirementsCard from '../components/PasswordRequirementsCard';
import { changePassword } from '../services/auth';
import { getPasswordValidationState } from '../utils/passwordValidation';

const ChangePasswordScreen = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const navigation = useNavigation();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const validation = getPasswordValidationState(password, confirmPassword);

    const handleSave = async () => {
        if (!validation.isValid || saving) {
            return;
        }

        try {
            setSaving(true);
            await changePassword(password);
            Alert.alert(
                t("common.success"),
                t("changePassword.updatedSuccess"),
                [{ text: "OK", onPress: () => navigation.goBack() }],
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : t("changePassword.updateFailed");
            Alert.alert(t("common.error"), message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            
            <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.navTitle, { color: colors.text }]}>{t("changePassword.title")}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.contentHeader}>
                    <Text style={[styles.title, { color: colors.text }]}>{t("changePassword.title")}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {t("changePassword.subtitle")}
                    </Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>{t("common.password")}</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput 
                            style={[styles.input, { color: colors.text }]} 
                            value={password} 
                            onChangeText={setPassword} 
                            placeholder={t("changePassword.passwordPlaceholder")} 
                            placeholderTextColor={colors.textSecondary} 
                            secureTextEntry={!showPassword} 
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>{t("common.confirmPassword")}</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput 
                            style={[styles.input, { color: colors.text }]} 
                            value={confirmPassword} 
                            onChangeText={setConfirmPassword} 
                            placeholder={t("changePassword.confirmPasswordPlaceholder")} 
                            placeholderTextColor={colors.textSecondary} 
                            secureTextEntry={!showConfirm} 
                        />
                        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                            <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <PasswordRequirementsCard validation={validation} />

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: validation.isValid && !saving ? colors.primary : colors.border }]} 
                    onPress={handleSave} 
                    disabled={!validation.isValid || saving}
                >
                    <Text style={styles.buttonText}>
                        {saving ? t("changePassword.updating") : t("common.continue")}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    navHeader: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 8,
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    container: {
        padding: 24,
    },
    contentHeader: {
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 16,
        marginRight: 10,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ChangePasswordScreen;
