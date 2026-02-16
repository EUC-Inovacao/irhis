import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({ visible, onClose }) => {
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
            Terms of Use
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>TERMS OF USE - TwinRehabPro</Text>
          <Text style={[styles.metadata, { color: colors.textSecondary }]}>
            Last updated: August 1, 2025 | Version: v1.0
          </Text>

          <Section title="1. Who we are">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              EUC Inovação Portugal provides the TwinRehabPro application and related services.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              Registered office: Avenida da França, n.º 256, 8.º andar, 4050-276 Porto – Portugal.
              {"\n"}Contact: support@eucinovacaoportugal.com
            </Text>
          </Section>

          <Section title="2. Purpose of the TwinRehabPro">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              The TwinRehabPro is designed to support rehabilitation and related monitoring activities, as described within the TwinRehabPro. The TwinRehabPro must be used only for its intended purposes and in accordance with these Terms.
            </Text>
          </Section>

          <Section title="3. Acceptance and eligibility">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              By creating an account or using the TwinRehabPro, you confirm that you have read and accepted these Terms.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              If you are using the TwinRehabPro on behalf of an organisation, you confirm that you have authority to bind that organisation.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              If you are a minor, you may use the TwinRehabPro only if permitted by applicable law and with any required consent from a parent/legal guardian.
            </Text>
          </Section>

          <Section title="4. Account registration and security">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              You must provide accurate, complete and up-to-date information when registering and keep your credentials confidential. You are responsible for all activity carried out through your account.
            </Text>
          </Section>

          <Section title="5. Acceptable use">
            <Text style={[styles.paragraph, { color: colors.text }]}>You agree not to:</Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>• use the TwinRehabPro unlawfully or in a way that infringes third-party rights;</Text>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>• upload or share content that is harmful, defamatory, abusive, or illegal;</Text>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>• interfere with the TwinRehabPro's operation, attempt unauthorised access, or bypass security measures;</Text>
              <Text style={[styles.bulletPoint, { color: colors.text }]}>• reverse engineer, copy, modify, distribute or commercially exploit the TwinRehabPro except as permitted by law or expressly authorised in writing.</Text>
            </View>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              We may suspend or terminate access for violations, security concerns, or legal requirements.
            </Text>
          </Section>

          <Section title="6. Medical disclaimer">
            <Text style={[styles.paragraph, { color: colors.text, fontWeight: '600' }]}>
              The TwinRehabPro does not provide medical diagnosis and does not replace professional medical advice, diagnosis or treatment.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              If you have symptoms requiring urgent attention, contact emergency services or a qualified healthcare professional immediately.
            </Text>
          </Section>

          <Section title="7. Intellectual property">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              The TwinRehabPro, including its software, design, trademarks, logos and content, is owned by or licensed to the EUC Inovação Portugal and is protected by intellectual property laws.
            </Text>
          </Section>

          <Section title="8. Availability, changes and maintenance">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              We aim to keep the TwinRehabPro available, but we do not guarantee uninterrupted or error-free operation. We may update, modify or discontinue any part of the TwinRehabPro for technical, security, legal or operational reasons.
            </Text>
          </Section>

          <Section title="9. Limitation of liability">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              To the maximum extent permitted by law, we are not liable for indirect or consequential losses, loss of data, loss of profits, or business interruption arising from your use of (or inability to use) the TwinRehabPro.
            </Text>
          </Section>

          <Section title="10. Termination">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              You may stop using the TwinRehabPro at any time. We may suspend or terminate your access if you breach these Terms, misuse the TwinRehabPro, or if required for security or legal reasons.
            </Text>
          </Section>

          <Section title="11. Changes to these Terms">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              We may update these Terms from time to time. Where required, we will notify you in the TwinRehabPro and request re-acceptance. Continued use after the effective date means you accept the updated Terms.
            </Text>
          </Section>

          <Section title="12. Governing law and contact">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              Governing law: Portugal.
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