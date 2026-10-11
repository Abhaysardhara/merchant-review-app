import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ScrollView } from 'react-native';
import type { Language } from '../types';
import { LANGUAGE_OPTIONS } from '../services/aiService';

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (lang: Language) => void;
}

export function LanguageSelector({ selected, onSelect }: LanguageSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const isActive = option.code === selected;
        return (
          <TouchableOpacity
            key={option.code}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(option.code)}
            activeOpacity={0.75}
          >
            <Text style={styles.flag}>{option.flag}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {option.nativeLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  flag: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
