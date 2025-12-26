import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import { useTheme } from "@theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { usePatients } from "@context/PatientContext";

interface PatientPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (patientId: string) => void;
  selectedPatientId?: string | null;
}

const PatientPickerModal: React.FC<PatientPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedPatientId,
}) => {
  const { colors } = useTheme();
  const { patients } = usePatients();
  const [searchQuery, setSearchQuery] = useState("");

  const patientList = Object.values(patients).filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (patientId: string) => {
    onSelect(patientId);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Patient
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.mediumGray,
              },
            ]}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />

          <FlatList
            data={patientList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedPatientId;
              const exerciseCount = item.recovery_process?.length || 0;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.patientItem,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + "15"
                        : colors.background,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.mediumGray,
                    },
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={styles.patientItemContent}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.purple[100] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: colors.purple[600] },
                        ]}
                      >
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </Text>
                    </View>
                    <View style={styles.patientItemInfo}>
                      <Text
                        style={[styles.patientItemName, { color: colors.text }]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.patientItemMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  No patients found
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchInput: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  patientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  patientItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  patientItemInfo: {
    flex: 1,
  },
  patientItemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  patientItemMeta: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});

export default PatientPickerModal;

