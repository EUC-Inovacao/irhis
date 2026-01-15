import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

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
    const [hasMinLength, setHasMinLength] = useState(false);
    const [hasUpperCase, setHasUpperCase] = useState(false);
    const [hasNumber, setHasNumber] = useState(false);

    useEffect(() => {
        setHasMinLength(password.length >= 8);
        setHasUpperCase(/[A-Z]/.test(password));
        setHasNumber(/[0-9]/.test(password));
    }, [password]);

    const isValid = hasMinLength && hasUpperCase && hasNumber && (password === confirmPassword) && password.length > 0;

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

                <View style={styles.requirementsBox}>
                    <Text style={styles.reqTitle}>Password requirements:</Text>
                    <View style={styles.reqItem}><Ionicons name="checkmark" size={14} color={hasMinLength ? '#16A34A' : '#6B7280'} /><Text style={[styles.reqText, { color: hasMinLength ? '#16A34A' : '#6B7280' }]}>At least 8 characters</Text></View>
                    <View style={styles.reqItem}><Ionicons name="checkmark" size={14} color={hasUpperCase ? '#16A34A' : '#6B7280'} /><Text style={[styles.reqText, { color: hasUpperCase ? '#16A34A' : '#6B7280' }]}>One uppercase letter</Text></View>
                    <View style={styles.reqItem}><Ionicons name="checkmark" size={14} color={hasNumber ? '#16A34A' : '#6B7280'} /><Text style={[styles.reqText, { color: hasNumber ? '#16A34A' : '#6B7280' }]}>One number</Text></View>
                </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.button, { backgroundColor: isValid ? colors.primary : '#93C5FD' }]} onPress={isValid ? handleFinish : undefined} disabled={!isValid}>
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
    requirementsBox: { backgroundColor: '#BFDBFE', padding: 16, borderRadius: 8, marginTop: 8 },
    reqTitle: { color: '#1E3A8A', marginBottom: 8, fontWeight: 'bold', fontSize: 14 },
    reqItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    reqText: { marginLeft: 8, fontSize: 13 },
    footer: { padding: 24, borderTopWidth: 1 },
    button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
export default CreatePasswordDoctorScreen;