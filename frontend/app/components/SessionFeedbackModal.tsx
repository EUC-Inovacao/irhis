import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { createFeedback } from '../services/feedbackService';

interface SessionFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  sessionId: string;
  patientId: string;
}

const SessionFeedbackModal: React.FC<SessionFeedbackModalProps> = ({
  visible,
  onClose,
  onSubmit,
  sessionId,
  patientId,
}) => {
  const { colors } = useTheme();
  const [pain, setPain] = useState(5);
  const [fatigue, setFatigue] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await createFeedback(patientId, {
        sessionId,
        timestamp: new Date().toISOString(),
        pain: Math.round(pain),
        fatigue: Math.round(fatigue),
        difficulty: Math.round(difficulty),
        comments: comments.trim() || undefined,
      });

      // Reset form
      setPain(5);
      setFatigue(5);
      setDifficulty(5);
      setComments('');

      if (onSubmit) {
        onSubmit();
      }
      onClose();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Reset form
    setPain(5);
    setFatigue(5);
    setDifficulty(5);
    setComments('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Session Feedback
            </Text>
            <TouchableOpacity onPress={handleSkip}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Please rate your experience during this exercise session.
            </Text>

            {/* Pain Rating */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <Ionicons name="bandage-outline" size={24} color="#FF6B6B" />
                <Text style={[styles.ratingLabel, { color: colors.text }]}>
                  Pain Level
                </Text>
                <Text style={[styles.ratingValue, { color: colors.primary }]}>
                  {Math.round(pain)}/10
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={pain}
                onValueChange={setPain}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.gray[300]}
                thumbTintColor={colors.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                  No Pain
                </Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                  Severe Pain
                </Text>
              </View>
            </View>

            {/* Fatigue Rating */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <Ionicons name="battery-half-outline" size={24} color={colors.warning} />
                <Text style={[styles.ratingLabel, { color: colors.text }]}>
                  Fatigue Level
                </Text>
                <Text style={[styles.ratingValue, { color: colors.primary }]}>
                  {Math.round(fatigue)}/10
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={fatigue}
                onValueChange={setFatigue}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.gray[300]}
                thumbTintColor={colors.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                  Not Tired
                </Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                  Very Tired
                </Text>
              </View>
            </View>

            {/* Difficulty Rating */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingHeader}>
                <Ionicons name="barbell-outline" size={24} color={colors.primary} />
                <Text style={[styles.ratingLabel, { color: colors.text }]}>
                  Difficulty Level
                </Text>
                <Text style={[styles.ratingValue, { color: colors.primary }]}>
                  {Math.round(difficulty)}/10
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={difficulty}
                onValueChange={setDifficulty}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.gray[300]}
                thumbTintColor={colors.primary}
              />
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                  Very Easy
                </Text>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
                  Very Hard
                </Text>
              </View>
            </View>

            {/* Comments */}
            <View style={styles.commentsSection}>
              <Text style={[styles.commentsLabel, { color: colors.text }]}>
                Additional Comments (Optional)
              </Text>
              <TextInput
                style={[
                  styles.commentsInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Share any additional thoughts about this session..."
                placeholderTextColor={colors.textSecondary}
                value={comments}
                onChangeText={setComments}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton, { borderColor: colors.border }]}
              onPress={handleSkip}
              disabled={submitting}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={[styles.submitButtonText, { color: colors.white }]}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    maxHeight: 500,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  ratingSection: {
    marginBottom: 32,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ratingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentsInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    // backgroundColor set via style prop
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SessionFeedbackModal;
