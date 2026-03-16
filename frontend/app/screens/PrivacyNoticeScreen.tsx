import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const PrivacyNoticeScreen = () => {
    const { t, i18n } = useTranslation();
    const { colors } = useTheme();
    const navigation = useNavigation();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('Privacy Notice')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.paragraph, { color: colors.text }]}>
                    {t('IRHIS Privacy')}
                </Text>
                <View style={styles.bulletList}>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Account information')}</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Clinical context')}</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Sensor and movement data')}</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Technical data')}</Text>
                </View>

                <Text style={[styles.subHeader, { color: colors.text }]}>{t('We process data')}</Text>
                <View style={styles.bulletList}>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Provide Service')}</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Maintain security')}</Text>
                    <Text style={[styles.bulletItem, { color: colors.text }]}>{t('Improve app')}</Text>
                </View>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    {t('Access data')}
                </Text>

                <Text style={[styles.paragraph, { color: colors.text }]}>
                    {t('Exercise rights')} <Text style={{fontWeight: 'bold'}}>support@eucinovacaoportugal.com</Text>.
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
        fontSize: 18,
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