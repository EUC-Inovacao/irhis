import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@theme/ThemeContext';
import { AppLanguageCode, SUPPORTED_LANGUAGES } from '../i18n/languages';

interface LanguageSelectorModalProps {
  visible: boolean;
  selectedLanguage: AppLanguageCode;
  title: string;
  onClose: () => void;
  onSelectLanguage: (language: AppLanguageCode) => void;
}

const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  visible,
  selectedLanguage,
  title,
  onClose,
  onSelectLanguage,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.black,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {SUPPORTED_LANGUAGES.map((language) => {
            const isSelected = language.code === selectedLanguage;

            return (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.option,
                  { borderBottomColor: colors.border },
                  isSelected && { backgroundColor: `${colors.primary}14` },
                ]}
                onPress={() => onSelectLanguage(language.code)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {language.label}
                  </Text>
                </View>

                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={22}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LanguageSelectorModal;
