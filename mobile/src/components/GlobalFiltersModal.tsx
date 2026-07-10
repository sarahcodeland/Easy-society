import React, { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VISIBILITY_LEVEL_ORDER, VisibilityLevel } from '@easysociety/shared';
import { colors, radii, spacing } from '../theme';
import { useLocationStore } from '../store/locationStore';
import LocationPickerModal from './LocationPickerModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LABELS: Record<VisibilityLevel, string> = {
  [VisibilityLevel.AREA]: 'My Area',
  [VisibilityLevel.CITY]: 'City',
  [VisibilityLevel.DISTRICT]: 'District',
  [VisibilityLevel.STATE]: 'State',
  [VisibilityLevel.NATIONAL]: 'All India',
};

const DESCRIPTIONS: Record<VisibilityLevel, string> = {
  [VisibilityLevel.AREA]: 'Only your village or neighborhood',
  [VisibilityLevel.CITY]: 'Your city / sub-district',
  [VisibilityLevel.DISTRICT]: 'Your whole district',
  [VisibilityLevel.STATE]: 'Everything in your state',
  [VisibilityLevel.NATIONAL]: 'Everywhere in the country',
};

// Applies to every feed across the app (Chat, Q&A, Status, Marketplace,
// Announcements) — one place to set which area you're seeing content from.
export default function GlobalFiltersModal({ visible, onClose }: Props) {
  const { activeLocationName, visibilityLevel, setVisibilityLevel } = useLocationStore();
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={S.safe}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={S.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={S.body}>
          <Text style={S.sectionLabel}>LOCATION</Text>
          <TouchableOpacity
            style={S.locationRow}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="location-sharp" size={16} color={colors.primary} />
            <Text style={S.locationName} numberOfLines={1}>
              {activeLocationName || 'My Area'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={S.sectionLabel}>SHOW CONTENT FROM</Text>
          {VISIBILITY_LEVEL_ORDER.map((level) => {
            const active = visibilityLevel === level;
            return (
              <TouchableOpacity
                key={level}
                style={[S.levelRow, active && S.levelRowActive]}
                onPress={() => setVisibilityLevel(level)}
                activeOpacity={0.75}
              >
                <View style={S.levelText}>
                  <Text style={[S.levelLabel, active && S.levelLabelActive]}>{LABELS[level]}</Text>
                  <Text style={S.levelDesc}>{DESCRIPTIONS[level]}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={S.doneBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={S.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <LocationPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} />
    </Modal>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  closeBtn: { padding: 4 },

  body: { padding: spacing.lg, flex: 1 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6,
    marginBottom: spacing.sm, marginTop: spacing.lg,
  },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radii.card,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  locationName: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.textPrimary },

  levelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderRadius: radii.card, borderWidth: 1.5, borderColor: colors.border,
    marginBottom: spacing.sm, backgroundColor: '#fff',
  },
  levelRowActive: { borderColor: colors.primary, backgroundColor: colors.card },
  levelText: {},
  levelLabel: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary },
  levelLabelActive: { color: colors.primary },
  levelDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  doneBtn: {
    margin: spacing.lg, backgroundColor: colors.primary,
    borderRadius: radii.button, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
