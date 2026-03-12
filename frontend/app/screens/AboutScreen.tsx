import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const AboutScreen = () => {
    const { t, i18n } = useTranslation();
    const { colors } = useTheme();
    const navigation = useNavigation();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('About')}</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Image source={require('../../assets/logo.png')} style={styles.logo} />
                    <Text style={[styles.appName, { color: colors.text }]}>IRHIS</Text>
                    <Text style={[styles.version, { color: colors.textSecondary }]}>{t('Version')}</Text>
                </View>

                <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
                    <Text style={[styles.description, { color: colors.text }]}>
                        {t('Integrated Text')}
                    </Text>
                    <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                        {t('App purpose')}
                    </Text>
                </View>

                <View style={styles.footerContainer}>
                    <Text style={[styles.footer, { color: colors.textSecondary }]}>
                        {t('EUC Rights')}
                    </Text>
                </View>
            </View>
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
        flex: 1,
        padding: 24,
        paddingTop: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 120,
        height: 120,
        resizeMode: "contain",
        marginBottom: 16,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    version: {
        fontSize: 16,
        marginBottom: 40,
    },
    infoContainer: {
        padding: 20,
        borderRadius: 12,
        width: '100%',
        marginBottom: 40,
    },
    description: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtext: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    footerContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    footer: {
        fontSize: 12,
        marginBottom: 16,
    }
});

export default AboutScreen;