import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { VISIBILITY_LEVEL_ORDER, VisibilityLevel } from '@easysociety/shared';

const LABELS: Record<VisibilityLevel, string> = {
  [VisibilityLevel.AREA]: 'My Area',
  [VisibilityLevel.MANDAL]: 'Mandal',
  [VisibilityLevel.DISTRICT]: 'District',
  [VisibilityLevel.STATE]: 'State',
  [VisibilityLevel.NATIONAL]: 'All India',
};

interface Props {
  value: VisibilityLevel;
  onChange: (level: VisibilityLevel) => void;
}

// Default area visibility, expandable to mandal/district/state/national —
// used identically by Q&A, marketplace, and announcements feeds.
export default function VisibilityFilterBar({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {VISIBILITY_LEVEL_ORDER.map((level) => (
        <TouchableOpacity
          key={level}
          style={[styles.chip, value === level && styles.chipActive]}
          onPress={() => onChange(level)}
        >
          <Text style={[styles.chipText, value === level && styles.chipTextActive]}>{LABELS[level]}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff' },
});
