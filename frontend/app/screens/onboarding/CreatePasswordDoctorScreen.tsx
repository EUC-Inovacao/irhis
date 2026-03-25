import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import PasswordRequirementsCard from '../../components/PasswordRequirementsCard';
import { getPasswordValidationState } from '../../utils/passwordValidation';

type NavProp = StackNavigationProp<RootStackParamList, 'CreatePasswordDoctor'>;
type RouteProps = RouteProp<RootStackParamList, 'CreatePasswordDoctor'>;

const CreatePasswordDoctorScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProps>();
    const { token } = route.params;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const validation = getPasswordValidationState(password, confirmPassword);

    const handleFinish = () => {
        // Fluxo do Doutor termina aqui e vai para o Login
        Alert.alert("Success", "Doctor account activated!", [{ 
            text: "Go to Login", 
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) 
        }]);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Activate Account</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}> 
                        <Ionicons name="medkit" size={40} color={colors.primary} />
                    </View>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Welcome, Doctor</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Please set a secure password to activate your professional account.
                </Text>

                {/* PASSWORD INPUT */}
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput style={[styles.input, { color: colors.text }]} secureTextEntry={!showPassword} placeholder="********" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* CONFIRM PASSWORD INPUT */}
                <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput style={[styles.input, { color: colors.text }]} secureTextEntry={!showConfirmPassword} placeholder="********" placeholderTextColor={colors.textSecondary} value={confirmPassword} onChangeText={setConfirmPassword} />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <PasswordRequirementsCard validation={validation} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.button, { backgroundColor: validation.isValid ? colors.primary : '#93C5FD' }]} onPress={validation.isValid ? handleFinish : undefined} disabled={!validation.isValid}>
                    <Text style={styles.buttonText}>Activate Account</Text>
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
    content: { padding: 24 },
    iconContainer: { alignItems: 'center', marginBottom: 16 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
    label: { fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, height: 50, paddingHorizontal: 16, marginBottom: 16 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    eyeIcon: { padding: 4 },
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
export default CreatePasswordDoctorScreen;