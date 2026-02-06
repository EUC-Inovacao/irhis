import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePatients } from '@context/PatientContext';
import { getUnassignedPatients, assignPatientToDoctor, createNewPatient } from "@services/patientService";
import type { Patient } from '../types';

const CreatePatientScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { assignPatient, fetchPatients } = usePatients();
    const [unassignedPatients, setUnassignedPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    
    // Form fields for creating new patient
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [sex, setSex] = useState<'male' | 'female'>('male');
    
    // Format date of birth as DD/MM/YYYY while typing
    const formatBirthDate = (text: string) => {
        // Remove all non-numeric characters
        const numbers = text.replace(/\D/g, '');
        
        // Limit to 8 digits (DDMMYYYY)
        const limitedNumbers = numbers.slice(0, 8);
        
        // Format as DD/MM/YYYY
        let formatted = '';
        if (limitedNumbers.length > 0) {
            formatted = limitedNumbers.slice(0, 2);
        }
        if (limitedNumbers.length > 2) {
            formatted += '/' + limitedNumbers.slice(2, 4);
        }
        if (limitedNumbers.length > 4) {
            formatted += '/' + limitedNumbers.slice(4, 8);
        }
        
        return formatted;
    };
    
    const handleBirthDateChange = (text: string) => {
        const formatted = formatBirthDate(text);
        setBirthDate(formatted);
    };
    
    // Convert DD/MM/YYYY to YYYY-MM-DD format for database
    const convertToDatabaseFormat = (dateStr: string): string => {
        // Remove slashes and extract parts
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            // Validate lengths
            if (day.length === 2 && month.length === 2 && year.length === 4) {
                return `${year}-${month}-${day}`;
            }
        }
        // If already in YYYY-MM-DD format, return as is
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        // If format is invalid, try to parse
        return dateStr;
    };
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    // BMI will be calculated automatically
    const [occupation, setOccupation] = useState<'white' | 'blue' | ''>('');
    const [education, setEducation] = useState('');
    const [affectedRightKnee, setAffectedRightKnee] = useState(false);
    const [affectedLeftKnee, setAffectedLeftKnee] = useState(false);
    const [affectedRightHip, setAffectedRightHip] = useState(false);
    const [affectedLeftHip, setAffectedLeftHip] = useState(false);
    const [medicalHistory, setMedicalHistory] = useState('');
    const [timeAfterSymptoms, setTimeAfterSymptoms] = useState('');
    const [legDominance, setLegDominance] = useState<'dominant' | 'non-dominant'>('dominant');
    const [contralateralJointAffect, setContralateralJointAffect] = useState(false);
    const [physicallyActive, setPhysicallyActive] = useState(false);
    const [coMorbiditiesNMS, setCoMorbiditiesNMS] = useState(false);
    const [coMorbiditiesSystemic, setCoMorbiditiesSystemic] = useState(false);

    const fetchUnassignedPatients = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUnassignedPatients();
            setUnassignedPatients(data);
        } catch (error) {
            console.error('Failed to fetch unassigned patients:', error);
            Alert.alert('Error', 'Failed to fetch unassigned patients.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnassignedPatients();
    }, [fetchUnassignedPatients]);
    
    const handleAssignPatient = async (patientId: string) => {
        try {
            await assignPatient(patientId);
            Alert.alert('Success', 'Patient assigned successfully.');
            fetchUnassignedPatients(); // Refresh the list
            fetchPatients(); // Refresh doctor's patient list
        } catch (error) {
            Alert.alert('Error', 'Failed to assign patient.');
        }
    };

    const handleCreatePatient = async () => {
        const nameTrim = name.trim();
        const birthDateTrim = birthDate.trim();
        
        // Validate required fields
        if (!nameTrim) {
            Alert.alert('Required', 'Patient name is required.');
            return;
        }
        
        if (!birthDateTrim) {
            Alert.alert('Required', 'Birth date is required.');
            return;
        }
        
        // Convert DD/MM/YYYY to YYYY-MM-DD format for database
        const birthDateForDB = convertToDatabaseFormat(birthDateTrim);
        
        // Validate date format
        if (!birthDateForDB.match(/^\d{4}-\d{2}-\d{2}$/)) {
            Alert.alert('Invalid Date', 'Please enter a valid date in DD/MM/YYYY format.');
            return;
        }
        
        // Validate at least one joint is affected
        if (!affectedRightKnee && !affectedLeftKnee && !affectedRightHip && !affectedLeftHip) {
            Alert.alert('Required', 'Please select at least one affected joint.');
            return;
        }
        
        setCreating(true);
        try {
            await createNewPatient({
                name: nameTrim,
                email: email.trim() || undefined,
                birthDate: birthDateForDB,
                sex,
                weight: weight ? parseFloat(weight) : undefined,
                height: height ? parseFloat(height) : undefined,
                // Calculate BMI automatically
                bmi: (() => {
                    const w = weight ? parseFloat(weight) : undefined;
                    const h = height ? parseFloat(height) : undefined;
                    if (w && h && h > 0) {
                        return w / Math.pow(h / 100, 2);
                    }
                    return undefined;
                })(),
                occupation: occupation ? occupation as 'white' | 'blue' : undefined,
                education: education ? parseInt(education) : undefined,
                affectedRightKnee,
                affectedLeftKnee,
                affectedRightHip,
                affectedLeftHip,
                medicalHistory: medicalHistory.trim() || undefined,
                timeAfterSymptoms: timeAfterSymptoms ? parseInt(timeAfterSymptoms) : undefined,
                legDominance,
                contralateralJointAffect,
                physicallyActive,
                coMorbiditiesNMS,
                coMorbiditiesSystemic,
            });
            
            Alert.alert('Success', 'Patient created and assigned successfully.');
            setShowCreateModal(false);
            // Reset all fields
            setName('');
            setEmail('');
            setBirthDate('');
            setSex('male');
            setWeight('');
            setHeight('');
            setOccupation('');
            setEducation('');
            setAffectedRightKnee(false);
            setAffectedLeftKnee(false);
            setAffectedRightHip(false);
            setAffectedLeftHip(false);
            setMedicalHistory('');
            setTimeAfterSymptoms('');
            setLegDominance('dominant');
            setContralateralJointAffect(false);
            setPhysicallyActive(false);
            setCoMorbiditiesNMS(false);
            setCoMorbiditiesSystemic(false);
            fetchUnassignedPatients(); // Refresh the list
            fetchPatients(); // Refresh doctor's patient list
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create patient.');
        } finally {
            setCreating(false);
        }
    };

    const renderPatientItem = ({ item }: { item: Patient }) => (
        <View style={[styles.patientCard, { backgroundColor: colors.card }]}>
            <View style={styles.patientInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {item.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                </View>
                <View style={styles.patientDetails}>
                    <Text style={[styles.patientName, { color: colors.text }]}>{item.name}</Text>
                    {item.id && item.id.includes('@') && (
                        <Text style={[styles.patientEmail, { color: colors.textSecondary }]}>
                            {item.id}
                        </Text>
                    )}
                </View>
            </View>
            <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAssignPatient(item.id)}
            >
                <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Add Patient</Text>
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.createButtonText}>Create New</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={unassignedPatients}
                renderItem={renderPatientItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.container}
                ListHeaderComponent={() => (
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Unassigned Patients
                    </Text>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>No unassigned patients</Text>
                        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                            Create a new patient or wait for patients to register
                        </Text>
                    </View>
                }
            />

            {/* Create Patient Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Patient</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Enter patient name"
                                placeholderTextColor={colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Email (Optional)</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="email@example.com"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Date of Birth *</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={colors.textSecondary}
                                value={birthDate}
                                onChangeText={handleBirthDateChange}
                                keyboardType="number-pad"
                                maxLength={10} // DD/MM/YYYY = 10 characters
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Sex *</Text>
                            <View style={styles.radioGroup}>
                                <TouchableOpacity
                                    style={[styles.radioButton, sex === 'male' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => setSex('male')}
                                >
                                    <Text style={[styles.radioText, sex === 'male' && { color: colors.primary }]}>Male</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.radioButton, sex === 'female' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => setSex('female')}
                                >
                                    <Text style={[styles.radioText, sex === 'female' && { color: colors.primary }]}>Female</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: colors.text }]}>Weight (kg) - Optional</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Enter weight"
                                placeholderTextColor={colors.textSecondary}
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="decimal-pad"
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Height (cm) - Optional</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Enter height"
                                placeholderTextColor={colors.textSecondary}
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="decimal-pad"
                            />

                            {(weight && height && parseFloat(height) > 0) && (
                                <View style={[styles.bmiContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                                    <Text style={[styles.bmiLabel, { color: colors.textSecondary }]}>Calculated BMI:</Text>
                                    <Text style={[styles.bmiValue, { color: colors.primary }]}>
                                        {(() => {
                                            const w = parseFloat(weight);
                                            const h = parseFloat(height);
                                            if (w && h > 0) {
                                                const calculated = w / Math.pow(h / 100, 2);
                                                return calculated.toFixed(1);
                                            }
                                            return 'N/A';
                                        })()}
                                    </Text>
                                </View>
                            )}

                            <Text style={[styles.label, { color: colors.text }]}>Occupation - Optional</Text>
                            <View style={styles.radioGroup}>
                                <TouchableOpacity
                                    style={[styles.radioButton, occupation === 'white' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => setOccupation('white')}
                                >
                                    <Text style={[styles.radioText, occupation === 'white' && { color: colors.primary }]}>White Collar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.radioButton, occupation === 'blue' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => setOccupation('blue')}
                                >
                                    <Text style={[styles.radioText, occupation === 'blue' && { color: colors.primary }]}>Blue Collar</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: colors.text }]}>Education (years) - Optional</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Enter years of education"
                                placeholderTextColor={colors.textSecondary}
                                value={education}
                                onChangeText={setEducation}
                                keyboardType="number-pad"
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Affected Joints *</Text>
                            <View style={styles.checkboxGroup}>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setAffectedRightKnee(!affectedRightKnee)}
                                >
                                    <Ionicons
                                        name={affectedRightKnee ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={affectedRightKnee ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Right Knee</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setAffectedLeftKnee(!affectedLeftKnee)}
                                >
                                    <Ionicons
                                        name={affectedLeftKnee ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={affectedLeftKnee ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Left Knee</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setAffectedRightHip(!affectedRightHip)}
                                >
                                    <Ionicons
                                        name={affectedRightHip ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={affectedRightHip ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Right Hip</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setAffectedLeftHip(!affectedLeftHip)}
                                >
                                    <Ionicons
                                        name={affectedLeftHip ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={affectedLeftHip ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Left Hip</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: colors.text }]}>Medical History - Optional</Text>
                            <TextInput
                                style={[styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Enter medical history"
                                placeholderTextColor={colors.textSecondary}
                                value={medicalHistory}
                                onChangeText={setMedicalHistory}
                                multiline
                                numberOfLines={4}
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Time After Symptoms (days) - Optional</Text>
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                                placeholder="Enter days"
                                placeholderTextColor={colors.textSecondary}
                                value={timeAfterSymptoms}
                                onChangeText={setTimeAfterSymptoms}
                                keyboardType="number-pad"
                            />

                            <Text style={[styles.label, { color: colors.text }]}>Leg Dominance *</Text>
                            <View style={styles.radioGroup}>
                                <TouchableOpacity
                                    style={[styles.radioButton, legDominance === 'dominant' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => setLegDominance('dominant')}
                                >
                                    <Text style={[styles.radioText, legDominance === 'dominant' && { color: colors.primary }]}>Dominant</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.radioButton, legDominance === 'non-dominant' && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                                    onPress={() => setLegDominance('non-dominant')}
                                >
                                    <Text style={[styles.radioText, legDominance === 'non-dominant' && { color: colors.primary }]}>Non-Dominant</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.label, { color: colors.text }]}>Additional Information</Text>
                            <View style={styles.checkboxGroup}>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setContralateralJointAffect(!contralateralJointAffect)}
                                >
                                    <Ionicons
                                        name={contralateralJointAffect ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={contralateralJointAffect ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Contralateral Joint Affect</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setPhysicallyActive(!physicallyActive)}
                                >
                                    <Ionicons
                                        name={physicallyActive ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={physicallyActive ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Physically Active</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setCoMorbiditiesNMS(!coMorbiditiesNMS)}
                                >
                                    <Ionicons
                                        name={coMorbiditiesNMS ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={coMorbiditiesNMS ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Co-morbidities NMS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setCoMorbiditiesSystemic(!coMorbiditiesSystemic)}
                                >
                                    <Ionicons
                                        name={coMorbiditiesSystemic ? "checkbox" : "checkbox-outline"}
                                        size={24}
                                        color={coMorbiditiesSystemic ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={[styles.checkboxLabel, { color: colors.text }]}>Co-morbidities Systemic</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.cancelButton, { borderColor: colors.border }]}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                onPress={handleCreatePatient}
                                disabled={creating || !name.trim() || !birthDate.trim() || (!affectedRightKnee && !affectedLeftKnee && !affectedRightHip && !affectedLeftHip)}
                            >
                                {creating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Create Patient</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    container: {
        padding: 16,
        paddingTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    patientCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    patientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
    },
    patientDetails: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '600',
    },
    patientEmail: {
        fontSize: 14,
        marginTop: 2,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
        paddingHorizontal: 32,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },
    cancelButton: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 1,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    radioButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#ddd',
    },
    radioText: {
        fontSize: 16,
        fontWeight: '600',
    },
    checkboxGroup: {
        marginBottom: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    checkboxLabel: {
        fontSize: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    bmiContainer: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bmiLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    bmiValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CreatePatientScreen;
