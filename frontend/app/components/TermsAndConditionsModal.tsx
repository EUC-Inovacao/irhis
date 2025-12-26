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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Terms and Conditions
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.effectiveDate, { color: colors.textSecondary }]}>
            Effective Date: August 1, 2025
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            Welcome to TwinRehab. By registering and using this application, whether as a patient or a healthcare professional, you agree to the following Terms and Conditions, which govern your access to and use of the platform, including the processing of personal and health-related data in accordance with applicable European laws, including the General Data Protection Regulation (GDPR). If you do not agree to these terms, you must not use the app.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            TwinRehab is a digital health platform intended to facilitate the secure collection, management, and exchange of health information between patients and licensed healthcare professionals. By signing up, patients confirm that they are at least 18 years old, or have obtained legal consent from a parent or guardian if underage. Healthcare professionals confirm that they are legally authorized and licensed to provide medical care within their jurisdiction and agree to use the platform exclusively for legitimate clinical purposes, in line with medical ethics and applicable law.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            All users understand and accept that personal data, including sensitive health data such as symptoms, medical history, clinical notes, and communications, will be collected and processed within the platform. This processing is based on the user's explicit consent, in accordance with Article 9(2)(a) of the GDPR. The data will be used strictly for the delivery of healthcare-related services, operational improvement of the platform, secure communication between patients and professionals, and as otherwise required by law. The platform does not sell user data or use it for advertising purposes. Access to patient data is strictly limited to healthcare professionals involved in the patient's care, and only where appropriate consent has been given or where legally required. Healthcare professionals agree to maintain strict confidentiality, to only access patient data when clinically justified, and to comply fully with GDPR obligations and any relevant national regulations.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            All users are responsible for the accuracy of the information they provide and for keeping their login credentials secure. Any unauthorized use of an account or suspected data breach must be reported to TwinRehab support immediately. The platform uses industry-standard security measures, including encryption and secure data storage, to protect personal information. However, no system can guarantee absolute security, and by using the app, users acknowledge and accept this risk.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            In accordance with the GDPR, all users have the right to access their data, request correction or deletion, restrict or object to processing, and request data portability. Users may also withdraw consent at any time, which will not affect the lawfulness of data processing prior to withdrawal. Patients and professionals can delete their accounts at any time through the app or by contacting support. Upon account deletion, all associated personal data will be permanently erased unless we are legally required to retain it.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            Healthcare professionals using the platform are solely responsible for ensuring that their use of the service complies with all legal, ethical, and professional obligations, including but not limited to appropriate licensing, clinical responsibility, patient safety, and data protection. Misuse of the platform or use for non-clinical or unlawful purposes may result in immediate termination of access and potential legal consequences.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            TwinRehab reserves the right to modify these Terms and Conditions at any time. Significant changes will be communicated through the app or via email. Continued use of the service after such changes constitutes your acceptance of the revised terms.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            If you have any questions or concerns about these Terms, your rights, or how your data is handled, you may contact us at TwinRehab, Avenida da França, n.º 256, 8.º andar, 4050-276 Porto – Portugal, or via email at manuele.vancin@eucinovacaoportugal.com.
          </Text>

          <Text style={[styles.paragraph, { color: colors.text }]}>
            By clicking "Accept" and registering, you confirm that you have read, understood, and agreed to these Terms and Conditions, and you consent to the collection and processing of your personal and health-related data as described.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
        </View>
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
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  effectiveDate: {
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'justify',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  acceptButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TermsAndConditionsModal; 