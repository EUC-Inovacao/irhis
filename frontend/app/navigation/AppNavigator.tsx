import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackHeaderProps } from '@react-navigation/stack';

import { useTheme } from '@theme/ThemeContext';
import { useAuth } from '@context/AuthContext';

import LoginScreen from '@screens/LoginScreen';
import SignupScreen from '@screens/SignupScreen';
import PatientHomeScreen from '@screens/PatientHomeScreen';
import DoctorHomeScreen from '@screens/DoctorHomeScreen';
import PatientDetailScreen from '@screens/PatientDetailScreen';
import SessionDetailScreen from '@screens/SessionDetailScreen';
import ExerciseDetailScreen from '@screens/ExerciseDetailScreen';
import ExerciseHistoryScreen from '@screens/ExerciseHistoryScreen';
import ExerciseHistoryDetailScreen from '@screens/ExerciseHistoryDetailScreen';
import ProfileScreen from '@screens/ProfileScreen';
import MovellaScreen from '@screens/MovellaScreen';
import CreatePatientScreen from '@screens/CreatePatientScreen';
import CreateAccountScreen from '@screens/CreateAccountScreen';
import ManageInvitesScreen from '@screens/ManageInvitesScreen';
import PatientListScreen from '@screens/PatientListScreen';
import BleConnectionScreen from '@screens/BleConnectionScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import TwoFactorSetupScreen from '../screens/TwoFactorSetupScreen';
import PrivacyNoticeScreen from '../screens/PrivacyNoticeScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import AboutScreen from '../screens/AboutScreen';
import type { RootStackParamList } from '../types';

import TokenEntryScreen from '../screens/onboarding/TokenEntryScreen';
import TokenInvalidScreen from '../screens/onboarding/TokenInvalidScreen';
import PrivacyTermsScreen from '../screens/onboarding/PrivacyTermsScreen';
import LegalBasisScreen from '../screens/onboarding/LegalBasisScreen';
import CreatePasswordOnboardingScreen from '../screens/onboarding/CreatePasswordOnboardingScreen';
import OnboardingTwoFactorScreen from '../screens/onboarding/OnboardingTwoFactorScreen';
import OnboardingTwoFactorVerifyScreen from '../screens/onboarding/OnboardingTwoFactorVerifyScreen';
import CreatePasswordDoctorScreen from '../screens/onboarding/CreatePasswordDoctorScreen';
import RegistrationCompleteScreen from '../screens/onboarding/RegistrationCompleteScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const CustomHeader: React.FC<StackHeaderProps> = ({ navigation, route, options }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const title = options.headerTitle?.toString() || route.name;

  return (
    <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {navigation.canGoBack() && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {/* MUDANÇA: Usar primary + '15' para fundo claro, e primary para o texto */}
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const PatientTabNavigator = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.darkGray,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="My Exercises"
        component={PatientHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={ExerciseHistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Live Session"
        component={MovellaScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="recording-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const DoctorTabNavigator = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.darkGray,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="Patients"
        component={DoctorHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Live Session"
        component={MovellaScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="recording-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { colors, isDark } = useTheme(); 
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navigationTheme = isDark ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
  } : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={user ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          header: (props) => <CustomHeader {...props} />, 
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={user.role === 'doctor' ? DoctorTabNavigator : PatientTabNavigator}
              options={{ 
                headerTitle: user.role === 'doctor' ? 'Clinical Dashboard' : 'My Dashboard'
              }}
            />
            <Stack.Screen
              name="PatientDetail"
              component={PatientDetailScreen}
              options={{
                headerTitle: 'Patient Details',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="SessionDetail"
              component={SessionDetailScreen}
              options={{
                headerTitle: 'Session Details',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="ExerciseDetail"
              component={ExerciseDetailScreen}
              options={{
                headerTitle: 'Exercise',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="ExerciseHistoryDetail"
              component={ExerciseHistoryDetailScreen}
              options={{
                headerTitle: 'Session Detail',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="CreatePatient"
              component={CreatePatientScreen}
              options={{
                headerTitle: 'Add New Patient',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="InvitePatient"
              component={CreateAccountScreen}
              options={{
                headerTitle: 'Create Account',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="ManageInvites"
              component={ManageInvitesScreen}
              options={{
                headerTitle: 'Manage Invites',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="PatientList"
              component={PatientListScreen}
              options={{
                headerTitle: 'Patient List',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: 'Profile',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="BleConnection"
              component={BleConnectionScreen}
              options={{
                headerTitle: 'Connect Sensors',
                headerBackTitle: 'Back',
              }}
            />
            {/* Novas Rotas da Task IRHIS-25 */}
            <Stack.Screen 
              name="ChangePassword" 
              component={ChangePasswordScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="TwoFactorSetup" 
              component={TwoFactorSetupScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="PrivacyNotice" 
              component={PrivacyNoticeScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="HelpCenter" 
              component={HelpCenterScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="About" 
              component={AboutScreen} 
              options={{ headerShown: false }} 
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InvitePatient"
              component={CreateAccountScreen}
              options={{ headerShown: false }}
            />
            {/* NOVAS ROTAS ONBOARDING */}
            <Stack.Screen
              name="TokenEntry"
              component={TokenEntryScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TokenInvalid"
              component={TokenInvalidScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OnboardingPrivacy"
              component={PrivacyTermsScreen}
              options={{ headerShown: false }}
              />
            <Stack.Screen
              name="OnboardingLegal"
              component={LegalBasisScreen}
              options={{ headerShown: false }}
              />
            <Stack.Screen
              name="OnboardingPassword"
              component={CreatePasswordOnboardingScreen}
              options={{ headerShown: false }}
              />
            <Stack.Screen
              name="OnboardingTwoFactor"
              component={OnboardingTwoFactorScreen}
              options={{ headerShown: false }}
              />
            <Stack.Screen
              name="OnboardingTwoFactorVerify"
              component={OnboardingTwoFactorVerifyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreatePasswordDoctor"
              component={CreatePasswordDoctorScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RegistrationComplete"
              component={RegistrationCompleteScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSafeArea: {
    width: '100%',
    zIndex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatarButton: {
    padding: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppNavigator; 