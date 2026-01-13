import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PrivacyNoticeScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Privacy Notice</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    IRHIS processes personal data to provide and secure the application, support clinical workflows, and deliver patient monitoring features. Depending on how you use IRHIS, this may include:
                </Text>
                <View style={styles.bulletList}>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Account information (e.g., name, email, role, institution)</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Clinical context (e.g., your association with a doctor/institution)</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Sensor and movement data (e.g., knee/hip motion measurements) and files you upload (e.g., .zip exports)</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Technical data (e.g., device information, logs, and diagnostics for troubleshooting and security)</Text>
                </View>

                <Text style={[styles.subHeader, { color: colors.text }]}>We process data to:</Text>
                <View style={styles.bulletList}>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Provide the service and related support</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Maintain security, prevent abuse, and comply with legal obligations</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>• Improve the app’s stability and performance</Text>
                </View>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    Access to data is restricted to authorized users within the appropriate care context. We retain data only for as long as necessary for the purposes described above and applicable obligations.
                </Text>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    To exercise your rights (access, rectification, deletion, restriction, portability, or objection, where applicable), contact <Text style={{fontWeight: 'bold'}}>support@eucinovacaoportugal.com</Text>.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        justifyContent: 'flex-start',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
    subHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 8,
    },
    bulletList: {
        marginBottom: 16,
        paddingLeft: 8,
    },
    bulletItem: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 8,
    },
});

export default PrivacyNoticeScreen;