import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListingCategory } from '@easysociety/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarketplaceTab = ListingCategory;

export interface MarketplaceFilters {
  sortBy: 'newest' | 'price_low' | 'price_high' | 'distance';
  // BUY/SELL
  subCategory:    string | null;
  condition:      string | null;
  priceMin:       number;
  priceMax:       number;
  negotiableOnly: boolean;
  posted:         string | null;
  // RENT
  propertyType:   string | null;
  bedrooms:       string | null;
  furnishing:     string | null;
  rentMin:        number;
  rentMax:        number;
  deposit:        string | null;
  amenities:      string[];
  available:      string | null;
  preferredTenant:string | null;
  // SERVICE
  serviceType:    string | null;
  experience:     string | null;
  priceType:      string | null;
  budgetMax:      number;
  verifiedOnly:   boolean;
  // JOB
  jobType:        string | null;
  experienceLevel:string | null;
  salaryMin:      number;
  salaryMax:      number;
  salaryType:     string | null;
  urgentOnly:     boolean;
  skills:         string;
}

export const DEFAULT_FILTERS: MarketplaceFilters = {
  sortBy: 'newest',
  subCategory: null, condition: null, priceMin: 0, priceMax: 0,
  negotiableOnly: false, posted: null,
  propertyType: null, bedrooms: null, furnishing: null,
  rentMin: 0, rentMax: 0, deposit: null, amenities: [], available: null, preferredTenant: null,
  serviceType: null, experience: null, priceType: null, budgetMax: 0, verifiedOnly: false,
  jobType: null, experienceLevel: null, salaryMin: 0, salaryMax: 0,
  salaryType: null, urgentOnly: false, skills: '',
};

export function countActiveFilters(tab: MarketplaceTab, f: MarketplaceFilters): number {
  let n = f.sortBy !== 'newest' ? 1 : 0;
  switch (tab) {
    case ListingCategory.BUY_SELL:
      if (f.subCategory) n++;
      if (f.condition) n++;
      if (f.priceMin > 0 || f.priceMax > 0) n++;
      if (f.negotiableOnly) n++;
      if (f.posted) n++;
      break;
    case ListingCategory.RENT:
      if (f.propertyType) n++;
      if (f.bedrooms) n++;
      if (f.furnishing) n++;
      if (f.rentMin > 0 || f.rentMax > 0) n++;
      if (f.deposit && f.deposit !== 'any') n++;
      if (f.amenities.length) n++;
      if (f.available) n++;
      if (f.preferredTenant && f.preferredTenant !== 'any') n++;
      break;
    case ListingCategory.SERVICES:
      if (f.serviceType) n++;
      if (f.experience) n++;
      if (f.priceType) n++;
      if (f.budgetMax > 0) n++;
      if (f.verifiedOnly) n++;
      break;
    case ListingCategory.JOBS:
      if (f.jobType) n++;
      if (f.experienceLevel) n++;
      if (f.salaryMin > 0 || f.salaryMax > 0) n++;
      if (f.salaryType) n++;
      if (f.urgentOnly) n++;
      if (f.skills.trim()) n++;
      break;
  }
  return n;
}

export function buildApiParams(tab: MarketplaceTab, f: MarketplaceFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.sortBy !== 'newest') p.sort = f.sortBy;
  switch (tab) {
    case ListingCategory.BUY_SELL:
      if (f.subCategory)    p.sub_category = f.subCategory;
      if (f.condition)      p.condition     = f.condition;
      if (f.priceMin > 0)   p.price_min     = String(f.priceMin);
      if (f.priceMax > 0)   p.price_max     = String(f.priceMax);
      if (f.negotiableOnly) p.negotiable    = 'true';
      if (f.posted)         p.posted        = f.posted;
      break;
    case ListingCategory.RENT:
      if (f.propertyType)   p.property_type  = f.propertyType;
      if (f.bedrooms)       p.bedrooms        = f.bedrooms;
      if (f.furnishing)     p.furnishing      = f.furnishing;
      if (f.rentMin > 0)    p.rent_min        = String(f.rentMin);
      if (f.rentMax > 0)    p.rent_max        = String(f.rentMax);
      if (f.deposit && f.deposit !== 'any') p.deposit = f.deposit;
      if (f.amenities.length) p.amenities     = f.amenities.join(',');
      if (f.available)      p.available       = f.available;
      if (f.preferredTenant && f.preferredTenant !== 'any') p.preferred_tenant = f.preferredTenant;
      break;
    case ListingCategory.SERVICES:
      if (f.serviceType)  p.service_type = f.serviceType;
      if (f.experience)   p.experience   = f.experience;
      if (f.priceType)    p.price_type   = f.priceType;
      if (f.budgetMax > 0) p.budget_max  = String(f.budgetMax);
      if (f.verifiedOnly) p.verified     = 'true';
      break;
    case ListingCategory.JOBS:
      if (f.jobType)         p.job_type        = f.jobType;
      if (f.experienceLevel) p.experience_level = f.experienceLevel;
      if (f.salaryMin > 0)   p.salary_min       = String(f.salaryMin);
      if (f.salaryMax > 0)   p.salary_max       = String(f.salaryMax);
      if (f.salaryType)      p.salary_type      = f.salaryType;
      if (f.urgentOnly)      p.urgent           = 'true';
      if (f.skills.trim())   p.skills           = f.skills.trim();
      break;
  }
  return p;
}

// ── Config ────────────────────────────────────────────────────────────────────

const BR = '#8B2E2E';

const CATEGORY_TABS = [
  { key: ListingCategory.BUY_SELL,   label: 'Buy & Sell' },
  { key: ListingCategory.RENT,       label: 'Rent' },
  { key: ListingCategory.SERVICES,   label: 'Services' },
  { key: ListingCategory.JOBS,       label: 'Jobs' },
  { key: ListingCategory.BUSINESSES, label: 'Business' },
] as const;

const SUBCATEGORIES   = [{ key: 'mobile', label: 'Mobile' }, { key: 'bike', label: 'Bike' }, { key: 'car', label: 'Car' }, { key: 'furniture', label: 'Furniture' }, { key: 'electronics', label: 'Electronics' }, { key: 'land', label: 'Land' }, { key: 'agricultural_equipment', label: 'Agricultural' }];
const CONDITIONS      = [{ key: 'new', label: 'New' }, { key: 'like_new', label: 'Like New' }, { key: 'used', label: 'Used' }, { key: 'refurbished', label: 'Refurbished' }];
const POSTED_OPTS     = [{ key: 'today', label: 'Today' }, { key: 'this_week', label: 'This Week' }, { key: 'this_month', label: 'This Month' }];

const PROPERTY_TYPES  = [{ key: 'house', label: 'House' }, { key: 'room', label: 'Room' }, { key: 'apartment', label: 'Apartment' }, { key: 'shop', label: 'Shop' }, { key: 'office', label: 'Office' }];
const BHK_OPTS        = [{ key: '1', label: '1 BHK' }, { key: '2', label: '2 BHK' }, { key: '3', label: '3 BHK' }, { key: '4', label: '4+ BHK' }];
const FURNISHING_OPTS = [{ key: 'unfurnished', label: 'Unfurnished' }, { key: 'semi', label: 'Semi' }, { key: 'fully', label: 'Fully' }];
const DEPOSIT_OPTS    = [{ key: 'any', label: 'Any' }, { key: '1_month', label: '1 Month' }, { key: '2_months', label: '2 Months' }, { key: '3_plus', label: '3+' }];
const AMENITY_OPTS    = [{ key: 'parking', label: 'Parking' }, { key: 'wifi', label: 'WiFi' }, { key: 'water', label: 'Water' }, { key: 'ac', label: 'AC' }, { key: 'lift', label: 'Lift' }];
const AVAILABLE_OPTS  = [{ key: 'immediately', label: 'Immediately' }, { key: 'this_month', label: 'This Month' }, { key: 'next_month', label: 'Next Month' }];
const TENANT_OPTS     = [{ key: 'any', label: 'Any' }, { key: 'family', label: 'Family' }, { key: 'bachelor', label: 'Bachelor' }, { key: 'female', label: 'Female' }];

const SERVICE_TYPES   = [{ key: 'electrician', label: 'Electrician' }, { key: 'plumber', label: 'Plumber' }, { key: 'tutor', label: 'Tutor' }, { key: 'driver', label: 'Driver' }, { key: 'mechanic', label: 'Mechanic' }, { key: 'carpenter', label: 'Carpenter' }, { key: 'photographer', label: 'Photographer' }, { key: 'cook', label: 'Cook' }];
const EXP_OPTS        = [{ key: '0_1', label: '0–1 yr' }, { key: '1_3', label: '1–3 yrs' }, { key: '3_5', label: '3–5 yrs' }, { key: '5_plus', label: '5+ yrs' }];
const PRICE_TYPE_OPTS = [{ key: 'per_hour', label: 'Per Hour' }, { key: 'per_day', label: 'Per Day' }, { key: 'per_job', label: 'Per Job' }, { key: 'monthly', label: 'Monthly' }];

const JOB_TYPE_OPTS   = [{ key: 'full_time', label: 'Full-time' }, { key: 'part_time', label: 'Part-time' }, { key: 'daily_wage', label: 'Daily Wage' }, { key: 'contract', label: 'Contract' }];
const EXP_LEVEL_OPTS  = [{ key: 'fresher', label: 'Fresher' }, { key: '1_2', label: '1–2 yrs' }, { key: '3_5', label: '3–5 yrs' }, { key: 'expert', label: 'Expert' }];
const SALARY_TYPE_OPTS = [{ key: 'monthly', label: 'Monthly' }, { key: 'daily', label: 'Daily' }, { key: 'hourly', label: 'Hourly' }];

const SORT_OPTIONS: { key: MarketplaceFilters['sortBy']; label: string; icon: string }[] = [
  { key: 'newest',     label: 'Newest First',      icon: 'time-outline' },
  { key: 'price_low',  label: 'Price Low to High', icon: 'trending-up-outline' },
  { key: 'price_high', label: 'Price High to Low', icon: 'trending-down-outline' },
  { key: 'distance',   label: 'Nearest First',     icon: 'navigate-outline' },
];

// ── Primitives ────────────────────────────────────────────────────────────────

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={F.sec}>
      <Text style={F.secTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chips({
  options, value, onSelect,
}: { options: { key: string; label: string }[]; value: string | null; onSelect: (k: string | null) => void }) {
  return (
    <View style={F.chips}>
      {options.map(o => {
        const on = value === o.key;
        return (
          <TouchableOpacity key={o.key} style={[F.chip, on && F.chipOn]} onPress={() => onSelect(on ? null : o.key)} activeOpacity={0.75}>
            <Text style={[F.chipTxt, on && F.chipTxtOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChips({
  options, values, onToggle,
}: { options: { key: string; label: string }[]; values: string[]; onToggle: (k: string) => void }) {
  return (
    <View style={F.chips}>
      {options.map(o => {
        const on = values.includes(o.key);
        return (
          <TouchableOpacity key={o.key} style={[F.chip, on && F.chipOn]} onPress={() => onToggle(o.key)} activeOpacity={0.75}>
            <Text style={[F.chipTxt, on && F.chipTxtOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DualInput({
  minVal, maxVal, phMin, phMax, onMin, onMax,
}: { minVal: number; maxVal: number; phMin: string; phMax: string; onMin: (v: number) => void; onMax: (v: number) => void }) {
  return (
    <View style={F.dualRow}>
      <TextInput style={F.numInput} keyboardType="numeric" value={minVal === 0 ? '' : String(minVal)} placeholder={phMin} placeholderTextColor="#bbb" onChangeText={t => onMin(Number(t.replace(/\D/g, '')) || 0)} />
      <Text style={F.dualSep}>–</Text>
      <TextInput style={F.numInput} keyboardType="numeric" value={maxVal === 0 ? '' : String(maxVal)} placeholder={phMax} placeholderTextColor="#bbb" onChangeText={t => onMax(Number(t.replace(/\D/g, '')) || 0)} />
    </View>
  );
}

function TogRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={F.togRow}>
      <Text style={F.togLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} thumbColor="#fff" trackColor={{ false: '#ddd', true: BR }} style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
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
  const [f, setF]     = useState<MarketplaceFilters>(propFilters);

  useEffect(() => {
    if (visible) { setTab(activeTab); setF({ ...propFilters }); }
  }, [visible]);

  const up  = (patch: Partial<MarketplaceFilters>) => setF(prev => ({ ...prev, ...patch }));
  const tog = (key: string) => up({ amenities: f.amenities.includes(key) ? f.amenities.filter(k => k !== key) : [...f.amenities, key] });

  function handleTabChange(newTab: MarketplaceTab) {
    setTab(newTab);
    setF({ ...DEFAULT_FILTERS, sortBy: f.sortBy });
  }

  const n = countActiveFilters(tab, f);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={F.safe}>

        {/* ── Header ── */}
        <View style={F.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={{ width: 28 }}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={F.headerTitle}>Filters{n > 0 ? ` (${n})` : ''}</Text>
          <TouchableOpacity onPress={() => setF({ ...DEFAULT_FILTERS })} hitSlop={12}>
            <Text style={F.clearTxt}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* ── Category tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={F.tabsRow} style={F.tabsWrap}>
          {CATEGORY_TABS.map(t => {
            const on = tab === t.key;
            return (
              <TouchableOpacity key={t.key} style={[F.tab, on && F.tabOn]} onPress={() => handleTabChange(t.key as MarketplaceTab)} activeOpacity={0.75}>
                <Text style={[F.tabTxt, on && F.tabTxtOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={F.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── BUY/SELL ─────────────────────────────────────────────── */}
            {tab === ListingCategory.BUY_SELL && <>
              <Sec title="Subcategory">
                <Chips options={SUBCATEGORIES} value={f.subCategory} onSelect={v => up({ subCategory: v })} />
              </Sec>
              <Sec title="Condition">
                <Chips options={CONDITIONS} value={f.condition} onSelect={v => up({ condition: v })} />
              </Sec>
              <Sec title="Price Range">
                <DualInput minVal={f.priceMin} maxVal={f.priceMax} phMin="₹ Min" phMax="₹ 5,00,000" onMin={v => up({ priceMin: v })} onMax={v => up({ priceMax: v })} />
              </Sec>
              <Sec title="Other">
                <TogRow label="Negotiable Only" value={f.negotiableOnly} onToggle={() => up({ negotiableOnly: !f.negotiableOnly })} />
              </Sec>
              <Sec title="Posted">
                <Chips options={POSTED_OPTS} value={f.posted} onSelect={v => up({ posted: v })} />
              </Sec>
            </>}

            {/* ── RENT ─────────────────────────────────────────────────── */}
            {tab === ListingCategory.RENT && <>
              <Sec title="Property Type">
                <Chips options={PROPERTY_TYPES} value={f.propertyType} onSelect={v => up({ propertyType: v, bedrooms: null })} />
              </Sec>
              {f.propertyType !== 'shop' && f.propertyType !== 'office' && (
                <Sec title="BHK">
                  <Chips options={BHK_OPTS} value={f.bedrooms} onSelect={v => up({ bedrooms: v })} />
                </Sec>
              )}
              <Sec title="Furnishing">
                <Chips options={FURNISHING_OPTS} value={f.furnishing} onSelect={v => up({ furnishing: v })} />
              </Sec>
              <Sec title="Monthly Budget">
                <DualInput minVal={f.rentMin} maxVal={f.rentMax} phMin="₹ Min" phMax="₹ 50,000" onMin={v => up({ rentMin: v })} onMax={v => up({ rentMax: v })} />
              </Sec>
              <Sec title="Deposit">
                <Chips options={DEPOSIT_OPTS} value={f.deposit} onSelect={v => up({ deposit: v })} />
              </Sec>
              <Sec title="Amenities">
                <MultiChips options={AMENITY_OPTS} values={f.amenities} onToggle={tog} />
              </Sec>
              <Sec title="Availability">
                <Chips options={AVAILABLE_OPTS} value={f.available} onSelect={v => up({ available: v })} />
              </Sec>
              <Sec title="Preferred Tenant">
                <Chips options={TENANT_OPTS} value={f.preferredTenant} onSelect={v => up({ preferredTenant: v })} />
              </Sec>
            </>}

            {/* ── SERVICES ─────────────────────────────────────────────── */}
            {tab === ListingCategory.SERVICES && <>
              <Sec title="Service Type">
                <Chips options={SERVICE_TYPES} value={f.serviceType} onSelect={v => up({ serviceType: v })} />
              </Sec>
              <Sec title="Experience">
                <Chips options={EXP_OPTS} value={f.experience} onSelect={v => up({ experience: v })} />
              </Sec>
              <Sec title="Price Type">
                <Chips options={PRICE_TYPE_OPTS} value={f.priceType} onSelect={v => up({ priceType: v })} />
              </Sec>
              <Sec title="Max Budget">
                <TextInput style={[F.numInput, { marginTop: 4, width: '50%' }]} keyboardType="numeric" value={f.budgetMax === 0 ? '' : String(f.budgetMax)} placeholder="₹ 10,000" placeholderTextColor="#bbb" onChangeText={t => up({ budgetMax: Number(t.replace(/\D/g, '')) || 0 })} />
              </Sec>
              <Sec title="Other">
                <TogRow label="Verified Providers Only" value={f.verifiedOnly} onToggle={() => up({ verifiedOnly: !f.verifiedOnly })} />
              </Sec>
            </>}

            {/* ── JOBS ─────────────────────────────────────────────────── */}
            {tab === ListingCategory.JOBS && <>
              <Sec title="Job Type">
                <Chips options={JOB_TYPE_OPTS} value={f.jobType} onSelect={v => up({ jobType: v })} />
              </Sec>
              <Sec title="Experience Level">
                <Chips options={EXP_LEVEL_OPTS} value={f.experienceLevel} onSelect={v => up({ experienceLevel: v })} />
              </Sec>
              <Sec title="Salary Range">
                <DualInput minVal={f.salaryMin} maxVal={f.salaryMax} phMin="₹ Min" phMax="₹ 1,00,000" onMin={v => up({ salaryMin: v })} onMax={v => up({ salaryMax: v })} />
              </Sec>
              <Sec title="Salary Type">
                <Chips options={SALARY_TYPE_OPTS} value={f.salaryType} onSelect={v => up({ salaryType: v })} />
              </Sec>
              <Sec title="Other">
                <TogRow label="Urgent Openings Only" value={f.urgentOnly} onToggle={() => up({ urgentOnly: !f.urgentOnly })} />
              </Sec>
              <Sec title="Skills">
                <TextInput style={[F.numInput, { marginTop: 4 }]} value={f.skills} onChangeText={t => up({ skills: t })} placeholder="e.g. driving, cooking, stitching" placeholderTextColor="#bbb" />
              </Sec>
            </>}

            {/* ── BUSINESSES ───────────────────────────────────────────── */}
            {tab === ListingCategory.BUSINESSES && (
              <View style={{ paddingHorizontal: 16, paddingTop: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 }}>
                  Business listings are browsed by location.{'\n'}Use search to find specific businesses.
                </Text>
              </View>
            )}

            {/* ── Sort By (shared) ─────────────────────────────────────── */}
            {tab !== ListingCategory.BUSINESSES && (
              <Sec title="Sort By">
                {SORT_OPTIONS.map(opt => {
                  const on = f.sortBy === opt.key;
                  return (
                    <TouchableOpacity key={opt.key} style={F.sortRow} onPress={() => up({ sortBy: opt.key })} activeOpacity={0.7}>
                      <Ionicons name={opt.icon as any} size={14} color={on ? BR : '#aaa'} style={{ marginRight: 8 }} />
                      <Text style={[F.sortLbl, on && F.sortLblOn]}>{opt.label}</Text>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={15} color={on ? BR : '#ccc'} />
                    </TouchableOpacity>
                  );
                })}
              </Sec>
            )}

          </ScrollView>

          {/* ── Apply ── */}
          <View style={F.footer}>
            <TouchableOpacity style={F.applyBtn} onPress={() => onApply(tab, f)} activeOpacity={0.88}>
              <Text style={F.applyTxt}>Apply Filters{n > 0 ? ` (${n})` : ''}</Text>
              <Ionicons name="options-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  clearTxt:    { fontSize: 11, fontWeight: '700', color: BR },

  tabsWrap: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0', maxHeight: 40 },
  tabsRow:  { paddingHorizontal: 12, paddingVertical: 7, gap: 6, alignItems: 'center' },
  tab:    { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 100, borderWidth: 1.2, borderColor: '#E0E0E0', backgroundColor: '#fff' },
  tabOn:  { backgroundColor: BR, borderColor: BR },
  tabTxt: { fontSize: 11, fontWeight: '600', color: '#666' },
  tabTxtOn: { color: '#fff' },

  body: { paddingBottom: 12 },

  sec:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  secTitle: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 0.4, marginBottom: 7, textTransform: 'uppercase' },

  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1.2, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA' },
  chipOn:   { backgroundColor: BR, borderColor: BR },
  chipTxt:  { fontSize: 11, fontWeight: '600', color: '#555' },
  chipTxtOn:{ color: '#fff' },

  dualRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  numInput: { flex: 1, borderWidth: 1.2, borderColor: '#E0E0E0', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  dualSep:  { fontSize: 12, color: '#bbb' },

  togRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  togLabel: { fontSize: 12, fontWeight: '600', color: '#333' },

  sortRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  sortLbl:   { flex: 1, fontSize: 12, color: '#888', fontWeight: '500' },
  sortLblOn: { color: '#1A1A1A', fontWeight: '700' },

  footer:   { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#fff' },
  applyBtn: { backgroundColor: BR, borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  applyTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
