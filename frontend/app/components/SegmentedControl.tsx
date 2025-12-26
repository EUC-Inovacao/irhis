import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@theme/ThemeContext';

interface SegmentedControlProps {
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, selectedValue, onValueChange }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.mediumGray, borderColor: colors.darkGray }]}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.segment,
            selectedValue === option ? { backgroundColor: colors.card, shadowColor: colors.black } : {},
          ]}
          onPress={() => onValueChange(option)}
        >
          <Text style={[styles.text, { color: selectedValue === option ? colors.text : colors.textSecondary }]}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SegmentedControl; 