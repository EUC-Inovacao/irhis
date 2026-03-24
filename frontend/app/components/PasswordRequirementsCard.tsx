import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme/ThemeContext';
import { PasswordValidationState } from '../utils/passwordValidation';

interface PasswordRequirementsCardProps {
  validation: PasswordValidationState;
  showMatchRequirement?: boolean;
}

interface RequirementItemProps {
  label: string;
  met: boolean;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ label, met }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.requirementRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? colors.success : colors.textSecondary}
      />
      <Text
        style={[
          styles.requirementText,
          { color: met ? colors.text : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const PasswordRequirementsCard: React.FC<PasswordRequirementsCardProps> = ({
  validation,
  showMatchRequirement = true,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.rulesContainer,
        {
          backgroundColor: `${colors.info}15`,
          borderColor: `${colors.info}30`,
        },
      ]}
    >
      <Text style={[styles.rulesTitle, { color: colors.info }]}>
        {t('changePassword.requirementsTitle')}
      </Text>
      <RequirementItem
        label={t('changePassword.reqMin8')}
        met={validation.hasMinLength}
      />
      <RequirementItem
        label={t('changePassword.reqUpper')}
        met={validation.hasUpperCase}
      />
      <RequirementItem
        label={t('changePassword.reqNumber')}
        met={validation.hasNumber}
      />
      {showMatchRequirement && (
        <RequirementItem
          label={t('changePassword.reqMatch')}
          met={validation.passwordsMatch}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rulesContainer: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  requirementText: {
    fontSize: 14,
  },
});

export default PasswordRequirementsCard;
