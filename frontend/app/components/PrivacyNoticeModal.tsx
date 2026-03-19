import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface PrivacyNoticeModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ visible, onClose, onAccept }) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [hasConsented, setHasConsented] = useState(false);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const Bullet = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
      <Text style={[styles.bulletText, { color: colors.text }]}>{children}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Privacy Notice')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{t('Privacy Notice')} - TwinRehabPro</Text>
          <Text style={[styles.metadata, { color: colors.textSecondary }]}>
            {t('Last updated')}
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            {t('This Privacy Notice')}
          </Text>

          <View style={[styles.infoBox, { backgroundColor: colors.border + '40' }]}>
            <Text style={[styles.paragraph, { color: colors.text, marginBottom: 4 }]}>
              <Text style={{ fontWeight: '700' }}>{t('Controller')}:</Text> EUC Inovação Portugal, Avenida da França, n.º 256, 8.º andar, Porto, Portugal.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>{t('Contact')}:</Text> privacy@eucinovacaoportugal.com
            </Text>
          </View>

          <Section title={t('Categories of data')}>
            <Bullet>{t('Account and contact')}</Bullet>
            <Bullet>{t('TwinRehabPro usage')}</Bullet>
            <Bullet>{t('Rehabilitation and health-related')}</Bullet>
            <Bullet>{t('Support communications')}</Bullet>
          </Section>

          <Section title={t('Purposes and legal bases')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('We process data to manage')}
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('Legal bases')}<Text style={{fontWeight: '700'}}>{t('Explicit Consent')}</Text> {t('for health data')}
            </Text>
          </Section>

          <Section title={t('Explicit consent for health data')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('Where the TwinRehabPro')}
            </Text>
          </Section>

          <Section title={t('Sharing of data')}>
            <Bullet>{t('With service providers')}</Bullet>
            <Bullet>{t('With healthcare professionals')}</Bullet>
            <Bullet>{t('With public authorities')}</Bullet>
            <Text style={[styles.paragraph, { color: colors.text, marginTop: 8 }]}>{t('We do not sell')}</Text>
          </Section>

          <Section title="8. Your rights">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              You may request access, rectification, erasure, and portability of your data. You also have the right to lodge a complaint with the CNPD (Portugal).
            </Text>
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeButton: { padding: 4 },
  content: { flex: 1, paddingHorizontal: 20 },
  mainTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 24, marginBottom: 4 },
  metadata: { fontSize: 13, marginBottom: 20, fontStyle: 'italic' },
  infoBox: { padding: 12, borderRadius: 8, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 22, textAlign: 'justify' },
  bulletRow: { flexDirection: 'row', marginBottom: 6, paddingLeft: 4 },
  bulletPoint: { fontSize: 18, marginRight: 8, lineHeight: 22 },
  bulletText: { fontSize: 15, lineHeight: 22, flex: 1 },
  footer: { paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  consentText: { fontSize: 14, marginLeft: 10, flex: 1, lineHeight: 20 },
  acceptButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: { fontSize: 16, fontWeight: '600' },
});

export default PrivacyNoticeModal;