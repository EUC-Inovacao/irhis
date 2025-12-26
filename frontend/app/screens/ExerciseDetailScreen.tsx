import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../theme/ThemeContext';

const ExerciseDetailScreen = ({ route, navigation }: any) => {
    const { colors } = useTheme();
    const { exercise } = route.params;

    const handleComplete = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <View style={styles.container}>
                <Text style={[styles.title, { color: colors.text }]}>{exercise.name}</Text>
                
                <View style={[styles.animationContainer, { backgroundColor: colors.card }]}>
                    <LottieView
                        source={require('../assets/animations/exercise-placeholder.json')}
                        autoPlay
                        loop
                        style={styles.lottie}
                    />
                </View>

                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Follow the animation to perform the exercise correctly. Focus on maintaining good form and a steady pace.
                </Text>

                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: colors.primary }]} 
                    onPress={handleComplete}
                >
                    <Text style={[styles.buttonText, { color: colors.white }]}>Mark as Complete</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                    <Text style={[styles.closeButtonText, { color: colors.primary }]}>Close</Text>
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
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
    },
    animationContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    lottie: {
        width: 250,
        height: 250,
    },
    description: {
        fontSize: 17,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 'auto',
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '600',
    },
    closeButton: {
         marginTop: 12,
         padding: 10,
    },
    closeButtonText: {
        fontSize: 16,
    }
});

export default ExerciseDetailScreen; 