import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface ProgressStepperProps {
    currentStep: number; // 1, 2, 3 ou 4
    totalSteps: number;
}

const ProgressStepper = ({ currentStep, totalSteps = 4 }: ProgressStepperProps) => {
    const { colors } = useTheme();

    const renderStep = (step: number) => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        const isFuture = step > currentStep;

        let backgroundColor = isFuture ? '#E5E7EB' : '#0284C7'; // Cinza ou Azul
        if (isCurrent) backgroundColor = '#0284C7';

        return (
            <View style={styles.stepWrapper} key={step}>
                <View style={[styles.circle, { backgroundColor }]}>
                    {isCompleted ? (
                        <Ionicons name="checkmark" size={16} color="white" />
                    ) : (
                        <Text style={[styles.stepText, { color: isFuture ? '#9CA3AF' : 'white' }]}>
                            {step}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.stepsContainer}>
                {[1, 2, 3, 4].map((step, index) => (
                    <React.Fragment key={step}>
                        {renderStep(step)}
                        {/* Linha de conexão (não desenha após o último passo) */}
                        {index < totalSteps - 1 && (
                            <View style={[
                                styles.line, 
                                { backgroundColor: step < currentStep ? '#0284C7' : '#E5E7EB' }
                            ]} />
                        )}
                    </React.Fragment>
                ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
                Step {currentStep} of {totalSteps}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
    stepsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    stepWrapper: { alignItems: 'center', justifyContent: 'center' },
    circle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    stepText: { fontWeight: 'bold', fontSize: 14 },
    line: {
        width: 40,
        height: 2,
        marginHorizontal: -2,
        zIndex: 1,
    },
    label: { fontSize: 12 },
});

export default ProgressStepper;