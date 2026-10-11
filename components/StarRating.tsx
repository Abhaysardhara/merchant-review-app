import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  showLabel?: boolean;
}

const LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const LABEL_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#84CC16',
  5: '#22C55E',
};

export function StarRating({
  value,
  onChange,
  size = 36,
  readonly = false,
  showLabel = true,
}: StarRatingProps) {
  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => !readonly && onChange?.(star)}
            disabled={readonly}
            activeOpacity={readonly ? 1 : 0.7}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={size}
              color={star <= value ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
      {showLabel && value > 0 && (
        <Text style={[styles.label, { color: LABEL_COLORS[value] }]}>
          {LABELS[value]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
