import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VISIBILITY_LEVEL_ORDER, VisibilityLevel } from '@easysociety/shared';
import { colors, radii } from '../theme';
import { useLocationStore } from '../store/locationStore';
import LocationPickerModal from './LocationPickerModal';

const LABELS: Record<VisibilityLevel, string> = {
  [VisibilityLevel.AREA]: 'My Area',
  [VisibilityLevel.MANDAL]: 'Mandal',
  [VisibilityLevel.DISTRICT]: 'District',
  [VisibilityLevel.STATE]: 'State',
  [VisibilityLevel.NATIONAL]: 'All India',
};

export default function VisibilityFilterBar() {
  const { activeLocationName, visibilityLevel, setVisibilityLevel } = useLocationStore();
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.locationRow} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
        <Ionicons name="location-sharp" size={12} color={colors.primary} />
        <Text style={styles.locationName} numberOfLines={1}>
          {activeLocationName || 'My Area'}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {VISIBILITY_LEVEL_ORDER.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.chip, visibilityLevel === level && styles.chipActive]}
            onPress={() => setVisibilityLevel(level)}
          >
            <Text style={[styles.chipText, visibilityLevel === level && styles.chipTextActive]}>
              {LABELS[level]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <LocationPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, paddingTop: 6, paddingBottom: 2 },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingBottom: 4,
  },
  locationName: { fontSize: 11.5, fontWeight: '700', color: colors.primary },
  chipRow: { flexGrow: 0, paddingHorizontal: 10, paddingBottom: 8 },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.card },
});
