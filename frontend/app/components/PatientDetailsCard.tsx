import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { PatientDetails } from "../types";
import { useTranslation } from "react-i18next";

const SEX_OPTIONS = [{ value: "male" }, { value: "female" }] as const;

interface PatientDetailsCardProps {
  details: PatientDetails;
  onUpdateDetails: (details: Partial<PatientDetails>) => Promise<void> | void;
  isEditable: boolean;
}

interface DetailItemProps {
  label: string;
  value: string | number;
  unit?: string;
  isEditingValue: string | number;
  isEditing: boolean;
  onChangeText?: (text: string) => void;
  keyboardType?: "default" | "numeric";
  colors: any;
}

const EMPTY_VALUE = "--";

const normalizeBackendBirthDate = (birthDate?: string): string | undefined => {
  if (!birthDate) return undefined;

  const trimmedBirthDate = birthDate.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmedBirthDate);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(trimmedBirthDate);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatBirthDateForInput = (birthDate?: string): string => {
  const normalizedBirthDate = normalizeBackendBirthDate(birthDate);
  if (!normalizedBirthDate) return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedBirthDate);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const formatBirthDateForDisplay = (birthDate?: string): string => {
  const formatted = formatBirthDateForInput(birthDate);
  return formatted || EMPTY_VALUE;
};

const normalizeBirthDateInput = (text: string): string => {
  const numbers = text.replace(/\D/g, "").slice(0, 8);

  let formatted = "";
  if (numbers.length > 0) {
    formatted = numbers.slice(0, 2);
  }
  if (numbers.length > 2) {
    formatted += `/${numbers.slice(2, 4)}`;
  }
  if (numbers.length > 4) {
    formatted += `/${numbers.slice(4, 8)}`;
  }

  return formatted;
};

const toDatabaseBirthDate = (input: string): string | undefined => {
  if (!input.trim()) return undefined;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return undefined;

  const [, day, month, year] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return undefined;
  }

  return `${year}-${month}-${day}`;
};

const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  unit = "",
  isEditingValue,
  isEditing,
  onChangeText,
  keyboardType = "default",
  colors,
}) => (
  <View style={styles.detailItem}>
    <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    {isEditing && onChangeText ? (
      <TextInput
        style={[
          styles.value,
          styles.input,
          { color: colors.text, borderBottomColor: colors.border },
        ]}
        value={
          isEditingValue === 0 || isEditingValue === "" ? "" : String(isEditingValue)
        }
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    ) : (
      <Text style={[styles.value, { color: colors.text }]}>
        {value}
        {unit}
      </Text>
    )}
  </View>
);

const PatientDetailsCard: React.FC<PatientDetailsCardProps> = ({
  details,
  onUpdateDetails,
  isEditable,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editableDetails, setEditableDetails] = useState<any>(details);
  const [showSexPicker, setShowSexPicker] = useState(false);

  useEffect(() => {
    setEditableDetails({
      ...details,
      birthDateInput: formatBirthDateForInput(details.birthDate),
      height: details.height && details.height > 0 ? details.height * 100 : "",
    });
  }, [details]);

  const updateField = useCallback((field: string, value: any) => {
    setEditableDetails((prev: any) => {
      let nextValue =
        value !== null && value !== undefined ? String(value) : "";

      if (field === "weight" || field === "height") {
        nextValue = nextValue.replace(",", ".");
      } else if (field === "birthDateInput") {
        nextValue = normalizeBirthDateInput(nextValue);
      }

      const nextState = { ...prev, [field]: nextValue };

      const weight = parseFloat(String(nextState.weight || 0));
      const height = parseFloat(String(nextState.height || 0));
      if (weight > 0 && height > 0) {
        const heightInMeters = height / 100;
        nextState.bmi = weight / (heightInMeters * heightInMeters);
      }

      return nextState;
    });
  }, []);

  const handleSave = async () => {
    const weight = parseFloat(String(editableDetails.weight)) || 0;
    const heightCm = parseFloat(String(editableDetails.height)) || 0;
    const height = heightCm > 0 ? heightCm / 100 : 0;
    const bmi = Number(editableDetails.bmi) || 0;
    const birthDate = toDatabaseBirthDate(editableDetails.birthDateInput);

    if (editableDetails.birthDateInput?.trim() && !birthDate) {
      Alert.alert(
        t("patientDetailsCard.invalidBirthDateTitle"),
        t("patientDetailsCard.invalidBirthDateMessage")
      );
      return;
    }

    const finalData: Partial<PatientDetails> = {
      birthDate,
      sex: editableDetails.sex,
      weight,
      height,
      bmi,
      clinicalInfo: editableDetails.clinicalInfo ?? "",
      medicalHistory: editableDetails.medicalHistory,
    };

    try {
      await Promise.resolve(onUpdateDetails(finalData));
      setIsEditing(false);
    } catch (error) {
      // Keep the form open when the save fails.
    }
  };

  const handleCancel = () => {
    setEditableDetails({
      ...details,
      birthDateInput: formatBirthDateForInput(details.birthDate),
      height: details.height && details.height > 0 ? details.height * 100 : "",
    });
    setIsEditing(false);
  };

  const displayBmi = (value: unknown) => {
    const num = parseFloat(String(value));
    return num > 0 ? num.toFixed(1) : EMPTY_VALUE;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("patientDetailsCard.title")}
        </Text>
        {isEditable && !isEditing && (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.detailsGrid}>
        <DetailItem
          label={t("patientDetailsCard.age")}
          value={details.age || EMPTY_VALUE}
          isEditingValue={details.age || ""}
          isEditing={false}
          colors={colors}
        />
        <DetailItem
          label={t("patientDetailsCard.birthDate")}
          value={formatBirthDateForDisplay(details.birthDate)}
          isEditingValue={editableDetails.birthDateInput ?? ""}
          isEditing={isEditing}
          onChangeText={(text) => updateField("birthDateInput", text)}
          keyboardType="numeric"
          colors={colors}
        />
        <View style={styles.detailItem}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("patientDetailsCard.sex")}
          </Text>
          {isEditing ? (
            <TouchableOpacity
              style={[
                styles.sexButton,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => setShowSexPicker(true)}
            >
              <Text style={[styles.value, { color: colors.text }]}>
                {SEX_OPTIONS.find(
                  (option) =>
                    option.value === (editableDetails.sex || "").toLowerCase()
                )?.value
                  ? t(
                      `patientDetailsCard.${
                        SEX_OPTIONS.find(
                          (option) =>
                            option.value ===
                            (editableDetails.sex || "").toLowerCase()
                        )?.value
                      }`
                    )
                  :
                  (editableDetails.sex || t("patientDetailsCard.select"))}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.value, { color: colors.text }]}>
              {SEX_OPTIONS.find(
                (option) => option.value === (details.sex || "").toLowerCase()
              )?.value
                ? t(
                    `patientDetailsCard.${
                      SEX_OPTIONS.find(
                        (option) =>
                          option.value === (details.sex || "").toLowerCase()
                      )?.value
                    }`
                  )
                : details.sex || EMPTY_VALUE}
            </Text>
          )}
        </View>
        <DetailItem
          label={t("patientDetailsCard.height")}
          value={details.height && details.height > 0 ? details.height * 100 : EMPTY_VALUE}
          unit=" cm"
          isEditingValue={editableDetails.height ?? ""}
          isEditing={isEditing}
          onChangeText={(text) => updateField("height", text)}
          keyboardType="numeric"
          colors={colors}
        />
        <DetailItem
          label={t("patientDetailsCard.weight")}
          value={details.weight || EMPTY_VALUE}
          unit=" kg"
          isEditingValue={editableDetails.weight ?? ""}
          isEditing={isEditing}
          onChangeText={(text) => updateField("weight", text)}
          keyboardType="numeric"
          colors={colors}
        />
        <DetailItem
          label={t("patientDetailsCard.bmi")}
          value={displayBmi(isEditing ? editableDetails.bmi : details.bmi)}
          isEditingValue=""
          isEditing={false}
          colors={colors}
        />
      </View>

      {isEditing ? (
        <>
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
            {t("patientDetailsCard.clinicalInfo")}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.mediumGray,
              },
            ]}
            value={editableDetails.clinicalInfo}
            onChangeText={(text) => updateField("clinicalInfo", text)}
            multiline
            placeholder={t("patientDetailsCard.addInfoPlaceholder")}
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {t("patientDetailsCard.cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: colors.white }]}>
                {t("patientDetailsCard.saveChanges")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.infoSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("patientDetailsCard.clinicalInfo")}
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {details.clinicalInfo || EMPTY_VALUE}
          </Text>
        </View>
      )}

      <Modal visible={showSexPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSexPicker(false)}
        >
          <View
            style={[styles.sexPickerModal, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.sexPickerTitle, { color: colors.text }]}>
              {t("patientDetailsCard.selectSex")}
            </Text>
            {SEX_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sexPickerOption,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  updateField("sex", option.value);
                  setShowSexPicker(false);
                }}
              >
                <Text
                  style={[styles.sexPickerOptionText, { color: colors.text }]}
                >
                  {t(`patientDetailsCard.${option.value}`)}
                </Text>
                {(editableDetails.sex || "").toLowerCase() === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailItem: {
    width: "48%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  sexButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sexPickerModal: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 12,
    padding: 20,
  },
  sexPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  sexPickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sexPickerOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  infoSection: {
    marginTop: 16,
  },
  textInput: {
    minHeight: 100,
    textAlignVertical: "top",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
});

export default PatientDetailsCard;
