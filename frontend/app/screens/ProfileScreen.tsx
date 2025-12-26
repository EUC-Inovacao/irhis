import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, TextInput, Alert } from 'react-native';
import { useAuth } from '@context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useHealthGoals } from '../context/HealthGoalsContext';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { goals, updateGoals, resetToDefaults } = useHealthGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

  if (!user) {
    return null;
  }

  const handleSaveGoals = async () => {
    if (tempGoals.steps < 1000 || tempGoals.steps > 50000) {
      Alert.alert('Invalid Steps', 'Steps goal must be between 1,000 and 50,000');
      return;
    }
    if (tempGoals.calories < 100 || tempGoals.calories > 2000) {
      Alert.alert('Invalid Calories', 'Calories goal must be between 100 and 2,000');
      return;
    }
    if (tempGoals.activeMinutes < 10 || tempGoals.activeMinutes > 180) {
      Alert.alert('Invalid Active Minutes', 'Active minutes goal must be between 10 and 180');
      return;
    }

    await updateGoals(tempGoals);
    setIsEditing(false);
  };

  const handleReset = async () => {
    Alert.alert(
      'Reset Goals',
      'Are you sure you want to reset your health goals to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset',
          onPress: async () => {
            await resetToDefaults();
            setTempGoals(goals);
            setIsEditing(false);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.mediumGray }]}>
            <Text style={[styles.label, { color: colors.text }]}>Name</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{user.name}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.mediumGray }]}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{user.email}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.mediumGray, borderBottomWidth: 0 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Role</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{user.role}</Text>
          </View>
        </View>

        {user.role === 'patient' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Health Goals</Text>
              {!isEditing ? (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Ionicons name="pencil" size={20} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerButtons}>
                  <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                    <Ionicons name="refresh" size={20} color={colors.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveGoals}>
                    <Ionicons name="checkmark" size={24} color={colors.success} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.mediumGray }]}>
              <Text style={[styles.label, { color: colors.text }]}>Daily Steps</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={tempGoals.steps.toString()}
                  onChangeText={(value) => setTempGoals({ ...tempGoals, steps: parseInt(value) || 0 })}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.value, { color: colors.textSecondary }]}>{goals.steps.toLocaleString()}</Text>
              )}
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.mediumGray }]}>
              <Text style={[styles.label, { color: colors.text }]}>Daily Calories</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={tempGoals.calories.toString()}
                  onChangeText={(value) => setTempGoals({ ...tempGoals, calories: parseInt(value) || 0 })}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.value, { color: colors.textSecondary }]}>{goals.calories}</Text>
              )}
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.mediumGray }]}>
              <Text style={[styles.label, { color: colors.text }]}>Active Minutes</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={tempGoals.activeMinutes.toString()}
                  onChangeText={(value) => setTempGoals({ ...tempGoals, activeMinutes: parseInt(value) || 0 })}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={[styles.value, { color: colors.textSecondary }]}>{goals.activeMinutes}</Text>
              )}
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              trackColor={{ false: colors.mediumGray, true: colors.primary }}
              thumbColor={colors.white}
              onValueChange={toggleTheme}
              value={isDark}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.notification }]} onPress={logout}>
          <Text style={[styles.buttonText, { color: colors.white }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resetButton: {
    marginRight: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 17,
  },
  value: {
    fontSize: 17,
  },
  input: {
    fontSize: 17,
    textAlign: 'right',
    minWidth: 80,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default ProfileScreen; 