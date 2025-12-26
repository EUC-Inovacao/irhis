import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeContext';
import Slider from '@react-native-community/slider';
import type { PatientFeedback } from '../types';

interface WeeklyFeedbackCardProps {
    onSubmit: (feedback: Omit<PatientFeedback, 'sessionId' | 'timestamp'>) => void;
}

const WeeklyFeedbackCard: React.FC<WeeklyFeedbackCardProps> = ({ onSubmit }) => {
    const { colors } = useTheme();
    const [pain, setPain] = useState(0);
    const [fatigue, setFatigue] = useState(0);
    const [difficulty, setDifficulty] = useState(0);
    const [comments, setComments] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = () => {
        if (comments.trim() === '') {
            Alert.alert('Feedback Required', 'Please provide some feedback before submitting.');
            return;
        }

        onSubmit({
            pain,
            fatigue,
            difficulty,
            comments
        });

        // Reset form
        setPain(0);
        setFatigue(0);
        setDifficulty(0);
        setComments('');
        setIsExpanded(false);
    };

    const renderSlider = (value: number, onValueChange: (value: number) => void, label: string, icon: string) => (
        <View style={styles.sliderContainer}>
            <View style={styles.sliderHeader}>
                <Ionicons name={icon as any} size={20} color={colors.primary} />
                <Text style={[styles.sliderLabel, { color: colors.text }]}>{label}: {value}</Text>
            </View>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={value}
                onValueChange={onValueChange}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabelText, { color: colors.textSecondary }]}>0</Text>
                <Text style={[styles.sliderLabelText, { color: colors.textSecondary }]}>10</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
                style={styles.header}
                onPress={() => setIsExpanded(!isExpanded)}
            >
                <View style={styles.headerContent}>
                    <Ionicons name="clipboard-outline" size={24} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.text }]}>Weekly Feedback</Text>
                </View>
                <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={colors.textSecondary} 
                />
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.content}>
                    {renderSlider(pain, setPain, 'Pain Level', 'bandage-outline')}
                    {renderSlider(fatigue, setFatigue, 'Fatigue Level', 'battery-half-outline')}
                    {renderSlider(difficulty, setDifficulty, 'Difficulty Level', 'barbell-outline')}

                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Personal Feedback</Text>
                        <TextInput
                            style={[styles.input, { 
                                color: colors.text,
                                backgroundColor: colors.background,
                                borderColor: colors.border
                            }]}
                            value={comments}
                            onChangeText={setComments}
                            placeholder="Share your experience this week..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitButton, { backgroundColor: colors.primary }]} 
                        onPress={handleSubmit}
                    >
                        <Text style={[styles.submitButtonText, { color: colors.white }]}>Submit Weekly Feedback</Text>
                    </TouchableOpacity>
                </View>
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
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        marginTop: 16,
    },
    sliderContainer: {
        marginBottom: 20,
    },
    sliderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sliderLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    sliderLabelText: {
        fontSize: 12,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default WeeklyFeedbackCard; 