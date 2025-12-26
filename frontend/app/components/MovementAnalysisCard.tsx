import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as movementService from '@services/movementService';
import { exportMovementAnalysisPDF } from '@services/pdfExportService';
import SegmentedControl from './SegmentedControl';
import DataVisualization from './DataVisualization';

interface MovementAnalysisCardProps {
    patientId: string;
}

interface AnalysisResult {
    exerciseType: 'Squat' | 'Leg Knee Extension';
    jointAngles: number[];
    metrics: {
        repetitionCount: number;
        maxFlexionAngle: number;
        maxExtensionAngle: number;
        centerOfMass?: {
            dominantSide: 'left' | 'right';
            distribution: {
                left: number;
                right: number;
            };
        };
    };
}

const MovementAnalysisCard: React.FC<MovementAnalysisCardProps> = ({ patientId }) => {
    const { colors } = useTheme();
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<'Squat' | 'Leg Knee Extension'>('Squat');

    const handleExerciseChange = (value: string) => {
        setSelectedExercise(value as 'Squat' | 'Leg Knee Extension');
    };

    const handleFileUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/zip',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets?.[0]) {
                setIsLoading(true);
                const analysis = await movementService.analyzeMovementData(result.assets[0].uri, selectedExercise);
                setAnalysisResult(analysis as AnalysisResult);
            }
        } catch (error) {
            console.error('Failed to analyze movement data:', error);
            Alert.alert('Error', 'Could not analyze the provided file.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Movement Analysis</Text>
            </View>

            <SegmentedControl
                options={['Squat', 'Leg Knee Extension']}
                selectedValue={selectedExercise}
                onValueChange={handleExerciseChange}
            />

            <TouchableOpacity 
                style={[styles.uploadButton, { backgroundColor: colors.primary }]} 
                onPress={handleFileUpload}
                disabled={isLoading}
            >
                <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
                <Text style={[styles.buttonText, { color: colors.white }]}>
                    {isLoading ? 'Analyzing...' : 'Upload & Analyze Data'}
                </Text>
            </TouchableOpacity>

            {analysisResult && (
                <>
                    <DataVisualization analysisResult={analysisResult} />
                    
                    <TouchableOpacity 
                        style={[styles.exportButton, { backgroundColor: colors.primary }]} 
                        onPress={async () => {
                            try {
                                await exportMovementAnalysisPDF(analysisResult);
                            } catch (error) {
                                Alert.alert('Error', 'Failed to export PDF report. Please try again.');
                            }
                        }}
                    >
                        <Ionicons name="download-outline" size={20} color={colors.white} />
                        <Text style={[styles.buttonText, { color: colors.white }]}>
                            Export Report
                        </Text>
                    </TouchableOpacity>
                </>
            )}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        marginTop: 16,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    resultsContainer: {
        marginTop: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
});

export default MovementAnalysisCard; 