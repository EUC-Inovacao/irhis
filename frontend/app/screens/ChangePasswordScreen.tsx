import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const ChangePasswordScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [hasMinLength, setHasMinLength] = useState(false);
    const [hasUpperCase, setHasUpperCase] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(false);

    useEffect(() => {
        setHasMinLength(password.length >= 8);
        setHasUpperCase(/[A-Z]/.test(password));
        setHasNumber(/[0-9]/.test(password));
        setPasswordsMatch(password.length > 0 && password === confirmPassword);
    }, [password, confirmPassword]);

    const isValid = hasMinLength && hasUpperCase && hasNumber && passwordsMatch;

    const handleSave = () => {
        if (isValid) {
            Alert.alert("Success", "Password updated successfully.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        }
    };

    const Requirement = ({ label, met }: { label: string, met: boolean }) => (
        <View style={styles.requirementRow}>
            <Ionicons name={met ? "checkmark-circle" : "ellipse-outline"} size={16} color={met ? colors.success : colors.textSecondary} />
            <Text style={[styles.requirementText, { color: met ? colors.text : colors.textSecondary }]}>{label}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            
            <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.navTitle, { color: colors.text }]}>Create a New Password</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.contentHeader}>
                    <Text style={[styles.title, { color: colors.text }]}>Create a New Password</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Create a secure password for your account.
                    </Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput 
                            style={[styles.input, { color: colors.text }]} 
                            value={password} 
                            onChangeText={setPassword} 
                            placeholder="Enter password" 
                            placeholderTextColor={colors.textSecondary} 
                            secureTextEntry={!showPassword} 
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput 
                            style={[styles.input, { color: colors.text }]} 
                            value={confirmPassword} 
                            onChangeText={setConfirmPassword} 
                            placeholder="Confirm password" 
                            placeholderTextColor={colors.textSecondary} 
                            secureTextEntry={!showConfirm} 
                        />
                        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                            <Ionicons name={showConfirm ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.rulesContainer, { backgroundColor: colors.info + '15', borderColor: colors.info + '30' }]}>
                    <Text style={[styles.rulesTitle, { color: colors.info }]}>Password requirements:</Text>
                    <Requirement label="At least 8 characters" met={hasMinLength} />
                    <Requirement label="One uppercase letter" met={hasUpperCase} />
                    <Requirement label="One number" met={hasNumber} />
                    <Requirement label="Passwords match" met={passwordsMatch} />
                </View>

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: isValid ? colors.primary : colors.border }]} 
                    onPress={handleSave} 
                    disabled={!isValid}
                >
                    <Text style={styles.buttonText}>Continue</Text>
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
    rulesContainer: {
        marginTop: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    rulesTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    requirementText: {
        fontSize: 14,
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