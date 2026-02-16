import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyNoticeModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ visible, onClose, onAccept }) => {
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Notice</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>PRIVACY NOTICE - TwinRehabPro</Text>
          <Text style={[styles.metadata, { color: colors.textSecondary }]}>
            Last updated: August 1, 2025 | Version: v1.0
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            This Privacy Notice explains how EUC Inovação Portugal processes personal data when you use the TwinRehabPro App.
          </Text>

          <View style={[styles.infoBox, { backgroundColor: colors.border + '40' }]}>
            <Text style={[styles.paragraph, { color: colors.text, marginBottom: 4 }]}>
              <Text style={{ fontWeight: '700' }}>Controller:</Text> EUC Inovação Portugal, Avenida da França, n.º 256, 8.º andar, Porto, Portugal.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Contact:</Text> privacy@eucinovacaoportugal.com
            </Text>
          </View>

          <Section title="1. Categories of data we process">
            <Bullet>Account and contact data (e.g., name, email, phone);</Bullet>
            <Bullet>TwinRehabPro usage and technical data (e.g., log data, device identifiers);</Bullet>
            <Bullet>Rehabilitation and health-related data (special category data);</Bullet>
            <Bullet>Support communications (messages and attachments).</Bullet>
          </Section>

          <Section title="2. Purposes and legal bases">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              We process data to manage your account, deliver rehabilitation features, provide support, maintain security, and improve the TwinRehabPro.
            </Text>
            <Text style={[styles.paragraph, { color: colors.text }]}>
              Legal bases: Performance of a contract (Art. 6(1)(b)), Legal obligations (Art. 6(1)(c)), and <Text style={{fontWeight: '700'}}>Explicit Consent (Art. 9(2)(a))</Text> for health data.
            </Text>
          </Section>

          <Section title="3. Explicit consent for health data">
            <Text style={[styles.paragraph, { color: colors.text }]}>
              Where the TwinRehabPro processes your health data, you will be asked to provide explicit consent. You may withdraw it at any time, though this may limit features.
            </Text>
          </Section>

          <Section title="4. Sharing of data">
            <Bullet>With service providers (hosting, support);</Bullet>
            <Bullet>With healthcare professionals authorized by you;</Bullet>
            <Bullet>With public authorities where required by law.</Bullet>
            <Text style={[styles.paragraph, { color: colors.text, marginTop: 8 }]}>We do not sell personal data.</Text>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
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