import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

// Definir o tipo de navegação para este ecrã
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = () => {
    const { colors, isDark, toggleTheme } = useTheme(); 
    const { user, logout } = useAuth(); // Nota: Confirma se a tua função de sair se chama 'logout' ou 'signOut' no AuthContext
    const navigation = useNavigation<ProfileScreenNavigationProp>();

    // Estado local para simular o 2FA 
    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
    
    // Estado local para Dark Mode (caso o ThemeContext não tenha toggleTheme exposto ainda)
    const [isDarkModeLocal, setIsDarkModeLocal] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Sign Out", 
                    style: "destructive", 
                    onPress: () => logout ? logout() : console.log("Logout function missing") 
                }
            ]
        );
    };

    const handleToggleTheme = () => {
        if (toggleTheme) {
            toggleTheme();
        } else {
            setIsDarkModeLocal(!isDarkModeLocal);
        }
    };

    const handle2FA = (value: boolean) => {
        if (value) {
            Alert.alert("Two-Factor Authentication", "This would open the 2FA setup flow.");
            setIsTwoFactorEnabled(true);
        } else {
            Alert.alert(
                "Disable 2FA", 
                "Are you sure? This will lower your account security.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Disable", style: "destructive", onPress: () => setIsTwoFactorEnabled(false) }
                ]
            );
        }
    };

    // Componente auxiliar para as linhas de menu
    const MenuItem = ({ icon, label, onPress, isDestructive = false, showChevron = true, valueElement }: any) => (
        <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.border }]} 
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.menuItemLeft}>
                {icon && <Ionicons name={icon} size={22} color={isDestructive ? colors.error : colors.text} style={{ marginRight: 12 }} />}
                <Text style={[
                    styles.menuItemLabel, 
                    { color: isDestructive ? colors.error : colors.text }
                ]}>
                    {label}
                </Text>
            </View>
            <View style={styles.menuItemRight}>
                {valueElement}
                {showChevron && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            
            {/* 1. CARTÃO DE PERFIL */}
            <View style={[styles.profileCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {user?.name?.charAt(0) || 'U'}
                    </Text>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User Name'}</Text>
                    <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                        {user?.role === 'doctor' ? 'Healthcare Provider' : 'Patient'}
                    </Text>
                    <View style={styles.institutionRow}>
                         <Text style={[styles.institutionText, { color: colors.textSecondary }]}>
                            Joined Dec 2025 • IRHIS Clinic
                        </Text>
                    </View>
                </View>
            </View>

            {/* 2. SECÇÃO: ACCOUNT */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
            <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                <MenuItem 
                    label="Change Password" 
                    icon="lock-closed-outline"
                    onPress={() => navigation.navigate('ChangePassword')}
                />
                <MenuItem 
                    label="Two-Factor Authentication" 
                    icon="shield-checkmark-outline"
                    showChevron={false}
                    valueElement={
                        <Switch 
                            value={isTwoFactorEnabled} 
                            onValueChange={handle2FA}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    }
                />
            </View>

            {/* 3. SECÇÃO: PRIVACY */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Privacy & Compliance</Text>
            <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                <MenuItem 
                    label="Privacy Notice" 
                    icon="document-text-outline"
                    onPress={() => navigation.navigate('PrivacyNotice')}
                />
            </View>

            {/* 4. SECÇÃO: SUPPORT & ABOUT */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
            <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                <MenuItem 
                    label="Help Center" 
                    icon="help-buoy-outline"
                    onPress={() => navigation.navigate('HelpCenter')}
                />
                <MenuItem 
                    label="About" 
                    icon="information-circle-outline"
                    valueElement={<Text style={{ color: colors.textSecondary, marginRight: 8 }}>v1.0.0</Text>}
                    onPress={() => navigation.navigate('About')}
                />
            </View>

            {/* 5. SECÇÃO: APPEARANCE */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
            <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
                <MenuItem 
                    label="Dark Mode" 
                    icon="moon-outline"
                    showChevron={false}
                    valueElement={
                        <Switch 
                            value={toggleTheme ? isDark : isDarkModeLocal} 
                            onValueChange={handleToggleTheme}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    }
                />
            </View>

            {/* 6. LOGOUT */}
            <TouchableOpacity 
                style={[styles.logoutButton, { borderColor: colors.error }]} 
                onPress={handleSignOut}
            >
                <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} /> 
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    profileCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        marginBottom: 4,
    },
    institutionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    institutionText: {
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        opacity: 0.7,
    },
    sectionContainer: {
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemLabel: {
        fontSize: 16,
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoutButton: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ProfileScreen;