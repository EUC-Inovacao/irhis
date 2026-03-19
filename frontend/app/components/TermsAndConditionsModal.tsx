import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Terms of Use')}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{t('Terms of Use')} - TwinRehabPro</Text>
          <Text style={[styles.metadata, { color: colors.textSecondary }]}>
            {t('Last updated')}
          </Text>

          <Section title={t('Who we are')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('EUC Inovação Portugal TwinRehabPro')}
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('Registered office')}: Avenida da França, n.º 256, 8.º andar, 4050-276 Porto – Portugal.
              {"\n"}{t('Contact')}: support@eucinovacaoportugal.com
            </Text>
          </Section>

          <Section title={t('Purpose of the TwinRehabPro')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('The TwinRehabPro is designed')}
            </Text>
          </Section>

          <Section title={t('Acceptance and eligibility')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('By creating an account')}
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('If you are using the TwinRehabPro')}
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('If you are a minor')}
            </Text>
          </Section>

          <Section title={t('Account registration and security')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('You must provide accurate')}
            </Text>
          </Section>

          <Section title={t('Acceptable use')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>{t('You agree not')}:</Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>{t('use the TwinRehabPro unlawfully')}</Text>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>{t('upload or share content')}</Text>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>{t("interfere with the TwinRehabPro's")}</Text>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>{t('reverse engineer')}</Text>
            </View>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('We may suspend or terminate')}
            </Text>
          </Section>

          <Section title={t('Medical disclaimer')}>
            <Text style={[styles.paragraph, { color: colors.text, fontWeight: '600' }]}>
              {t('The TwinRehabPro does not')}
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('If you have symptoms')}
            </Text>
          </Section>

          <Section title={t('Intellectual property')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('The TwinRehabPro including')}
            </Text>
          </Section>

          <Section title={t('Availability, changes and maintenance')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('We aim to keep')}
            </Text>
          </Section>

          <Section title={t('Limitation of liability')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('To the maximum extent')}
            </Text>
          </Section>

          <Section title="10. Termination">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('You may stop using the TwinRehabPro')}
            </Text>
          </Section>

          <Section title={t('Changes to these Terms')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('We may update these Terms')}
            </Text>
          </Section>

          <Section title={t('Governing law and contact')}>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              {t('Governing law: Portugal')}
              {"\n"}For questions about these Terms, contact: support@eucinovacaoportugal.com
            </Text>
          </Section>
          
          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 4,
  },
  metadata: {
    fontSize: 13,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'justify',
  },
  bulletList: {
    paddingLeft: 8,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
});

export default TermsAndConditionsModal;