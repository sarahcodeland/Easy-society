import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListingCategory } from '@easysociety/shared';
import { colors, spacing } from '../../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarketplaceTab = ListingCategory;

export interface MarketplaceFilters {
  minPrice: number;
  maxPrice: number;
  maxDistance: number;
  sortBy: 'newest' | 'price_low' | 'price_high' | 'distance';
  // rent
  propertyTypes: string[];
  furnishing: string[];
  // services
  serviceTypes: string[];
  minRating: number | null;
  // jobs
  jobTypes: string[];
  experience: string[];
}

export const DEFAULT_FILTERS: MarketplaceFilters = {
  minPrice: 0,
  maxPrice: 100000,
  maxDistance: 15,
  sortBy: 'newest',
  propertyTypes: [],
  furnishing: [],
  serviceTypes: [],
  minRating: null,
  jobTypes: [],
  experience: [],
};

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORY_TABS: { key: MarketplaceTab; label: string }[] = [
  { key: ListingCategory.BUY_SELL,   label: 'Buy & Sell' },
  { key: ListingCategory.RENT,       label: 'Rent' },
  { key: ListingCategory.SERVICES,   label: 'Services' },
  { key: ListingCategory.JOBS,       label: 'Jobs' },
  { key: ListingCategory.BUSINESSES, label: 'Businesses' },
];

const PROPERTY_TYPES   = [{ key: 'house', label: 'House' }, { key: 'room', label: 'Room' }, { key: 'shop', label: 'Shop' }, { key: 'flat', label: 'Flat' }];
const FURNISHING       = [{ key: 'fully_furnished', label: 'Fully Furnished' }, { key: 'semi_furnished', label: 'Semi-Furnished' }, { key: 'unfurnished', label: 'Unfurnished' }];
const SERVICE_TYPES    = [{ key: 'electrician', label: 'Electrician' }, { key: 'plumber', label: 'Plumber' }, { key: 'carpenter', label: 'Carpenter' }, { key: 'mechanic', label: 'Mechanic' }, { key: 'cleaning', label: 'Cleaning' }];
const JOB_TYPES        = [{ key: 'full_time', label: 'Full-time' }, { key: 'part_time', label: 'Part-time' }, { key: 'daily_wage', label: 'Daily Wage' }, { key: 'contract', label: 'Contract' }];
const EXPERIENCE       = [{ key: 'fresher', label: 'Fresher' }, { key: '1_2_years', label: '1–2 Years' }, { key: '5_plus_years', label: '5+ Years' }];
const SORT_OPTIONS: { key: MarketplaceFilters['sortBy']; label: string; icon: string }[] = [
  { key: 'newest',     label: 'Newest First',        icon: 'time-outline' },
  { key: 'price_low',  label: 'Price Low to High',   icon: 'trending-up-outline' },
  { key: 'price_high', label: 'Price High to Low',   icon: 'trending-down-outline' },
  { key: 'distance',   label: 'Distance Nearest',    icon: 'navigate-outline' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(v: number) {
  return `₹${v.toLocaleString('en-IN')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <View style={F.section}>
      <View style={F.sectionHead}>
        <Text style={F.sectionTitle}>{title}</Text>
        {right ? <Text style={F.sectionRight}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ChipGroup({
  options, selected, onToggle,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <View style={F.chipRow}>
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <TouchableOpacity key={o.key} style={[F.chip, on && F.chipOn]} onPress={() => onToggle(o.key)} activeOpacity={0.75}>
            <Text style={[F.chipText, on && F.chipTextOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DistanceSlider({ value, onValueChange }: { value: number; onValueChange: (v: number) => void }) {
  const MAX = 50;
  const [trackWidth, setTrackWidth] = useState(1);
  const trackLeft = useRef(0);
  const pct = Math.max(0, Math.min(1, value / MAX));

  function update(pageX: number) {
    const x = pageX - trackLeft.current;
    onValueChange(Math.round(Math.max(0, Math.min(MAX, (x / Math.max(trackWidth, 1)) * MAX))));
  }

  return (
    <View style={{ marginTop: 6, marginBottom: 2 }}>
      <View
        style={F.sliderHit}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          trackLeft.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
          update(e.nativeEvent.pageX);
        }}
        onResponderMove={(e) => update(e.nativeEvent.pageX)}
      >
        <View style={F.sliderTrack} />
        <View style={[F.sliderFill, { width: `${pct * 100}%` as any }]} />
        <View style={[F.sliderThumb, { left: `${pct * 100}%` as any }]} />
      </View>
      <View style={F.sliderLabels}>
        <Text style={F.sliderLabel}>0km</Text>
        <Text style={F.sliderLabel}>25km</Text>
        <Text style={F.sliderLabel}>50km</Text>
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  activeTab: MarketplaceTab;
  filters: MarketplaceFilters;
  onApply: (tab: MarketplaceTab, filters: MarketplaceFilters) => void;
  onClose: () => void;
}

export default function MarketplaceFiltersModal({ visible, activeTab, filters: propFilters, onApply, onClose }: Props) {
  const [tab, setTab] = useState<MarketplaceTab>(activeTab);
  const [f, setF] = useState<MarketplaceFilters>(propFilters);

  // Reset local state each time the modal opens
  useEffect(() => {
    if (visible) {
      setTab(activeTab);
      setF({ ...propFilters });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const up = (patch: Partial<MarketplaceFilters>) => setF((prev) => ({ ...prev, ...patch }));

  function toggle(field: keyof MarketplaceFilters, key: string) {
    const cur = f[field] as string[];
    up({ [field]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
  }

  const priceLabel = `${formatPrice(f.minPrice)} – ${f.maxPrice >= 100000 ? '₹1,00,000+' : formatPrice(f.maxPrice)}`;
  const isBusiness = tab === ListingCategory.BUSINESSES;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={F.safe}>

        {/* ── Header ── */}
        <View style={F.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={F.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={F.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={() => setF({ ...DEFAULT_FILTERS })} hitSlop={12}>
            <Text style={F.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={F.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Categories ── */}
            <Section title="Categories">
              <View style={F.chipRow}>
                {CATEGORY_TABS.map((t) => {
                  const on = tab === t.key;
                  return (
                    <TouchableOpacity key={t.key} style={[F.chip, on && F.chipOn]} onPress={() => setTab(t.key)} activeOpacity={0.75}>
                      <Text style={[F.chipText, on && F.chipTextOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            {/* ── Rent: Property Type ── */}
            {tab === ListingCategory.RENT && (
              <Section title="Property Type">
                <ChipGroup options={PROPERTY_TYPES} selected={f.propertyTypes} onToggle={(k) => toggle('propertyTypes', k)} />
              </Section>
            )}

            {/* ── Services: Service Type ── */}
            {tab === ListingCategory.SERVICES && (
              <Section title="Service Type">
                <ChipGroup options={SERVICE_TYPES} selected={f.serviceTypes} onToggle={(k) => toggle('serviceTypes', k)} />
              </Section>
            )}

            {/* ── Jobs: Job Type ── */}
            {tab === ListingCategory.JOBS && (
              <Section title="Job Type">
                <ChipGroup options={JOB_TYPES} selected={f.jobTypes} onToggle={(k) => toggle('jobTypes', k)} />
              </Section>
            )}

            {/* ── Price / Budget (all except Businesses) ── */}
            {!isBusiness && (
              <Section title={tab === ListingCategory.SERVICES ? 'Budget / hr' : 'Price Range'} right={priceLabel}>
                <View style={F.priceRow}>
                  <View style={F.priceBox}>
                    <Text style={F.priceBoxLabel}>MIN PRICE</Text>
                    <TextInput
                      style={F.priceInput}
                      keyboardType="numeric"
                      value={f.minPrice === 0 ? '' : String(f.minPrice)}
                      placeholder="₹ 0"
                      placeholderTextColor={colors.textMuted}
                      onChangeText={(t) => up({ minPrice: Number(t.replace(/\D/g, '')) || 0 })}
                    />
                  </View>
                  <View style={F.priceBox}>
                    <Text style={F.priceBoxLabel}>MAX PRICE</Text>
                    <TextInput
                      style={F.priceInput}
                      keyboardType="numeric"
                      value={f.maxPrice >= 100000 ? '' : String(f.maxPrice)}
                      placeholder="₹ 1,00,000"
                      placeholderTextColor={colors.textMuted}
                      onChangeText={(t) => up({ maxPrice: Number(t.replace(/\D/g, '')) || 100000 })}
                    />
                  </View>
                </View>
              </Section>
            )}

            {/* ── Rent: Furnishing ── */}
            {tab === ListingCategory.RENT && (
              <Section title="Furnishing">
                <ChipGroup options={FURNISHING} selected={f.furnishing} onToggle={(k) => toggle('furnishing', k)} />
              </Section>
            )}

            {/* ── Services: Rating ── */}
            {tab === ListingCategory.SERVICES && (
              <Section title="Rating">
                <View style={F.chipRow}>
                  {[{ key: 4, label: '4★+' }, { key: 3, label: '3★+' }].map((r) => {
                    const on = f.minRating === r.key;
                    return (
                      <TouchableOpacity key={r.key} style={[F.chip, on && F.chipOn]} onPress={() => up({ minRating: on ? null : r.key })} activeOpacity={0.75}>
                        <Text style={[F.chipText, on && F.chipTextOn]}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Section>
            )}

            {/* ── Jobs: Experience / Salary Range ── */}
            {tab === ListingCategory.JOBS && (
              <Section title="Salary Range">
                <ChipGroup options={EXPERIENCE} selected={f.experience} onToggle={(k) => toggle('experience', k)} />
              </Section>
            )}

            {/* ── Distance ── */}
            {!isBusiness && (
              <Section title="Distance Nearby" right={`${f.maxDistance}km`}>
                <DistanceSlider value={f.maxDistance} onValueChange={(v) => up({ maxDistance: v })} />
              </Section>
            )}

            {/* ── Sort By ── */}
            <Section title="Sort By">
              {SORT_OPTIONS.map((opt) => {
                const on = f.sortBy === opt.key;
                return (
                  <TouchableOpacity key={opt.key} style={F.sortRow} onPress={() => up({ sortBy: opt.key })} activeOpacity={0.7}>
                    <Ionicons name={opt.icon as any} size={18} color={on ? colors.primary : colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={[F.sortLabel, on && F.sortLabelOn]}>{opt.label}</Text>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </Section>

          </ScrollView>

          {/* ── Apply ── */}
          <View style={F.footer}>
            <TouchableOpacity style={F.applyBtn} onPress={() => onApply(tab, f)} activeOpacity={0.88}>
              <Text style={F.applyText}>Apply Filters</Text>
              <Ionicons name="options-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 32 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  resetText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  body: { paddingBottom: 24 },

  section: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  sectionRight: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: '#fff' },

  priceRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  priceBox: { flex: 1 },
  priceBoxLabel: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  priceInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 14, color: colors.textPrimary, backgroundColor: '#fff',
  },

  // Slider
  sliderHit: { height: 32, justifyContent: 'center', position: 'relative' },
  sliderTrack: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: '#E1D8D2', borderRadius: 2 },
  sliderFill: { position: 'absolute', left: 0, height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  sliderThumb: {
    position: 'absolute', top: 4, marginLeft: -12,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 2, borderColor: colors.primary,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sliderLabel: { fontSize: 10.5, color: colors.textMuted },

  sortRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sortLabel: { flex: 1, fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  sortLabelOn: { color: colors.textPrimary, fontWeight: '700' },

  footer: {
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  applyBtn: {
    backgroundColor: colors.primary, borderRadius: 12, padding: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  applyText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
