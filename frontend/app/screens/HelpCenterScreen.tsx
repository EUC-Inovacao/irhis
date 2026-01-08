import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const HelpCenterScreen = ({ navigation }: any) => {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Help Center</Text>
            </View>
            <View style={styles.content}>
                <Text style={{ color: colors.textSecondary }}>Feature under construction (IRHIS-25)</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },
    backButton: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default HelpCenterScreen;