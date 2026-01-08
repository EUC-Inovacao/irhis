import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const AboutScreen = ({ navigation }: any) => {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>About</Text>
            </View>

            <View style={styles.content}>
                
                <Image source={require('../../assets/logo.png')} style={styles.logo} />

                <Text style={[styles.appName, { color: colors.text }]}>IRHIS</Text>
                <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0 (Beta)</Text>

                <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
                    <Text style={[styles.description, { color: colors.text }]}>
                        Integrated Rehabilitation Health Information System
                    </Text>
                    <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                        This application is designed to help patients and doctors manage rehabilitation processes efficiently using advanced sensor technology.
                    </Text>
                </View>

                <Text style={[styles.footer, { color: colors.textSecondary }]}>
                    © 2026 EUC Inovação. All rights reserved.
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1 
    },
    backButton: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { 
        flex: 1, 
        alignItems: 'center', 
        padding: 24,
        paddingTop: 40
    },
    logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 24,
  },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
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
    footer: {
        fontSize: 12,
        position: 'absolute',
        bottom: 40,
    }
});

export default AboutScreen;