import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../theme/ThemeContext';

const LogbookScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [pain, setPain] = useState(5);
    const [discomfort, setDiscomfort] = useState(5);
    const [tiredness, setTiredness] = useState(5);
    const [strength, setStrength] = useState(5);

    const handleSave = () => {
        Alert.alert(
            "Log Saved",
            `Pain: ${pain}\nDiscomfort: ${discomfort}\nTiredness: ${tiredness}\nStrength: ${strength}`,
            [{ text: "OK", onPress: () => navigation.goBack() }]
        );
    };

    const renderSlider = (label: string, value: number, onValueChange: (value: number) => void) => (
        <View style={styles.sliderContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{label}: {value}</Text>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={value}
                onValueChange={onValueChange}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.mediumGray}
                thumbTintColor={colors.primary}
            />
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.container}>
                <Text style={[styles.title, { color: colors.text }]}>Log Your Week</Text>
                
                {renderSlider("Pain", pain, setPain)}
                {renderSlider("Discomfort", discomfort, setDiscomfort)}
                {renderSlider("Tiredness", tiredness, setTiredness)}
                {renderSlider("Strength", strength, setStrength)}

                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSave}>
                    <Text style={[styles.buttonText, { color: colors.white }]}>Save Log</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    sliderContainer: {
        marginBottom: 25,
    },
    label: {
        fontSize: 18,
        marginBottom: 10,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 'auto', 
        marginBottom: 20,
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '600',
    },
});

export default LogbookScreen; 