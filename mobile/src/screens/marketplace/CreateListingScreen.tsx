import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisibilityLevel } from '@easysociety/shared';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { colors, spacing, radii } from '../../theme';
import DateTimePickerField from '../../components/DateTimePickerField';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'CreateListing'>;

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <View style={U.stepRow}>
      <View style={U.stepBadge}><Text style={U.stepNum}>{n}</Text></View>
      <Text style={U.stepLabel}>{title}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={U.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={[U.input, style]} placeholderTextColor={colors.textMuted} {...props} />;
}

function MultilineInput({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  return <TextInput style={[U.input, U.multiline, style]} placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" {...props} />;
}

function ChipSelect<T extends string>({
  options, value, onSelect,
}: { options: { key: T; label: string }[]; value: T | null; onSelect: (v: T) => void }) {
  return (
    <View style={U.chipWrap}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[U.chip, active && U.chipActive]}
            onPress={() => onSelect(o.key)}
            activeOpacity={0.8}
          >
            <Text style={[U.chipText, active && U.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChip<T extends string>({
  options, values, onToggle,
}: { options: { key: T; label: string }[]; values: T[]; onToggle: (v: T) => void }) {
  return (
    <View style={U.chipWrap}>
      {options.map((o) => {
        const active = values.includes(o.key);
        return (
          <TouchableOpacity
            key={o.key}
            style={[U.chip, active && U.chipActive]}
            onPress={() => onToggle(o.key)}
            activeOpacity={0.8}
          >
            <Text style={[U.chipText, active && U.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Photo picker section ──────────────────────────────────────────────────────

function PhotoSection({
  photos, onAdd, onRemove,
}: { photos: string[]; onAdd: () => void; onRemove: (i: number) => void }) {
  return (
    <View style={U.photoRow}>
      {photos.map((uri, i) => (
        <View key={i} style={U.photoThumb}>
          <Image source={{ uri }} style={U.photoImg} resizeMode="cover" />
          <TouchableOpacity style={U.photoRemove} onPress={() => onRemove(i)} hitSlop={4}>
            <Ionicons name="close" size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
      {photos.length < 5 && (
        <TouchableOpacity style={U.photoAdd} onPress={onAdd} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
          <Text style={U.photoAddText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Category-specific field groups ────────────────────────────────────────────

const BUY_SELL_SUBCATS = [
  { key: 'mobile', label: 'Mobile' }, { key: 'bike', label: 'Bike' },
  { key: 'car', label: 'Car' }, { key: 'furniture', label: 'Furniture' },
  { key: 'electronics', label: 'Electronics' }, { key: 'land', label: 'Land' },
  { key: 'agricultural_equipment', label: 'Agri Equipment' },
];
const CONDITIONS = [
  { key: 'new', label: 'New' }, { key: 'like_new', label: 'Like New' },
  { key: 'used', label: 'Used' }, { key: 'refurbished', label: 'Refurbished' },
];
const PRICE_TYPES_SELL = [
  { key: 'fixed', label: 'Fixed' }, { key: 'negotiable', label: 'Negotiable' }, { key: 'free', label: 'Free' },
];

function BuySellFields({ d, set }: { d: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <Field label="Category">
        <ChipSelect options={BUY_SELL_SUBCATS} value={d.subcategory} onSelect={(v) => set('subcategory', v)} />
      </Field>
      <Field label="Condition">
        <ChipSelect options={CONDITIONS} value={d.condition} onSelect={(v) => set('condition', v)} />
      </Field>
      <Field label="Brand">
        <Input placeholder="e.g. Samsung, Honda, Apple" value={d.brand ?? ''} onChangeText={(v) => set('brand', v)} />
      </Field>
      <Field label="Model / Variant">
        <Input placeholder="e.g. Galaxy S22, Activa 6G" value={d.model ?? ''} onChangeText={(v) => set('model', v)} />
      </Field>
      <Field label="Year of Purchase">
        <Input placeholder="e.g. 2022" value={d.year ?? ''} onChangeText={(v) => set('year', v)} keyboardType="numeric" />
      </Field>
      <Field label="Price Type">
        <ChipSelect options={PRICE_TYPES_SELL} value={d.price_type ?? 'fixed'} onSelect={(v) => set('price_type', v)} />
      </Field>
    </>
  );
}

const PROPERTY_TYPES = [
  { key: 'house', label: 'House' }, { key: 'room', label: 'Room' },
  { key: 'apartment', label: 'Apartment' }, { key: 'shop', label: 'Shop' },
  { key: 'office', label: 'Office' }, { key: 'agricultural_land', label: 'Agri Land' },
  { key: 'vehicle', label: 'Vehicle' },
];
const BEDROOMS = [{ key: '1', label: '1' }, { key: '2', label: '2' }, { key: '3', label: '3' }, { key: '4+', label: '4+' }];
const FURNISHING = [
  { key: 'unfurnished', label: 'Unfurnished' },
  { key: 'semi_furnished', label: 'Semi-Furnished' },
  { key: 'fully_furnished', label: 'Fully Furnished' },
];
const TENANT_PREF = [
  { key: 'any', label: 'Any' }, { key: 'family', label: 'Family' },
  { key: 'bachelor', label: 'Bachelor' }, { key: 'female', label: 'Female' },
];
const AMENITIES_RENT = [
  { key: 'parking', label: 'Parking' }, { key: 'water', label: 'Water' },
  { key: 'wifi', label: 'WiFi' }, { key: 'ac', label: 'AC' },
  { key: 'generator', label: 'Generator' }, { key: 'lift', label: 'Lift' },
  { key: 'security', label: 'Security' },
];


function RentFields({ d, set }: { d: any; set: (k: string, v: any) => void }) {
  function toggleAmenity(a: string) {
    const cur: string[] = d.amenities ?? [];
    set('amenities', cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]);
  }
  return (
    <>
      <Field label="Property Type">
        <ChipSelect options={PROPERTY_TYPES} value={d.property_type} onSelect={(v) => set('property_type', v)} />
      </Field>
      <Field label="Bedrooms">
        <ChipSelect options={BEDROOMS} value={d.bedrooms} onSelect={(v) => set('bedrooms', v)} />
      </Field>
      <Field label="Furnishing">
        <ChipSelect options={FURNISHING} value={d.furnishing} onSelect={(v) => set('furnishing', v)} />
      </Field>
      <Field label="Monthly Rent (₹)">
        <Input placeholder="e.g. 12,000" value={d.rent ?? ''} onChangeText={(v) => set('rent', v)} keyboardType="numeric" />
      </Field>
      <Field label="Security Deposit (₹)">
        <Input placeholder="e.g. 50,000" value={d.deposit_amount ?? ''} onChangeText={(v) => set('deposit_amount', v)} keyboardType="numeric" />
      </Field>
      <Field label="Available From">
        <DateTimePickerField
          value={d.available_from ?? ''}
          onChange={(iso) => set('available_from', iso)}
          label="Available From"
          minimumDate={new Date()}
        />
      </Field>
      <Field label="Preferred Tenant">
        <ChipSelect options={TENANT_PREF} value={d.preferred_tenant ?? 'any'} onSelect={(v) => set('preferred_tenant', v)} />
      </Field>
      <Field label="Amenities Included">
        <MultiChip options={AMENITIES_RENT} values={d.amenities ?? []} onToggle={toggleAmenity} />
      </Field>
    </>
  );
}

const SERVICE_TYPES = [
  { key: 'electrician', label: 'Electrician' }, { key: 'plumber', label: 'Plumber' },
  { key: 'mechanic', label: 'Mechanic' }, { key: 'carpenter', label: 'Carpenter' },
  { key: 'painter', label: 'Painter' }, { key: 'driver', label: 'Driver' },
  { key: 'photographer', label: 'Photographer' }, { key: 'tutor', label: 'Tutor' },
  { key: 'computer_technician', label: 'Computer Tech' },
  { key: 'tailor', label: 'Tailor' }, { key: 'cook', label: 'Cook' },
];
const SERVICE_PRICE_TYPES = [
  { key: 'per_hour', label: 'Per Hour' }, { key: 'per_day', label: 'Per Day' },
  { key: 'per_job', label: 'Per Job' }, { key: 'monthly', label: 'Monthly' },
];

function ServiceFields({ d, set }: { d: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <Field label="Service Type">
        <ChipSelect options={SERVICE_TYPES} value={d.service_type} onSelect={(v) => set('service_type', v)} />
      </Field>
      <Field label="Charge Per">
        <ChipSelect options={SERVICE_PRICE_TYPES} value={d.price_type} onSelect={(v) => set('price_type', v)} />
      </Field>
      <Field label="Years of Experience">
        <Input placeholder="e.g. 5" value={d.experience_years ?? ''} onChangeText={(v) => set('experience_years', v)} keyboardType="numeric" />
      </Field>
      <Field label="Working Hours">
        <Input placeholder="e.g. 9 AM – 6 PM, Mon–Sat" value={d.availability ?? ''} onChangeText={(v) => set('availability', v)} />
      </Field>
      <Field label="Areas You Cover">
        <Input placeholder="e.g. KPHB, Kukatpally, Miyapur" value={d.area_coverage ?? ''} onChangeText={(v) => set('area_coverage', v)} />
      </Field>
    </>
  );
}

const JOB_TYPES = [
  { key: 'full_time', label: 'Full-time' }, { key: 'part_time', label: 'Part-time' },
  { key: 'daily_wage', label: 'Daily Wage' }, { key: 'contract', label: 'Contract' },
];
const EXP_LEVELS = [
  { key: 'fresher', label: 'Fresher' }, { key: '1_2_years', label: '1–2 Yrs' },
  { key: '3_5_years', label: '3–5 Yrs' }, { key: 'expert', label: 'Expert' },
];
const SALARY_TYPES = [
  { key: 'monthly', label: 'Monthly' }, { key: 'daily', label: 'Daily' }, { key: 'hourly', label: 'Hourly' },
];
const GENDER_PREF = [
  { key: 'any', label: 'Any' }, { key: 'male', label: 'Male' }, { key: 'female', label: 'Female' },
];

function JobFields({ d, set }: { d: any; set: (k: string, v: any) => void }) {
  const [skillInput, setSkillInput] = useState('');
  function addSkill() {
    const s = skillInput.trim();
    if (!s) return;
    set('skills_required', [...(d.skills_required ?? []), s]);
    setSkillInput('');
  }
  function removeSkill(i: number) {
    set('skills_required', (d.skills_required ?? []).filter((_: string, idx: number) => idx !== i));
  }
  return (
    <>
      <Field label="Company / Employer">
        <Input placeholder="e.g. Zomato Logistics" value={d.company_name ?? ''} onChangeText={(v) => set('company_name', v)} />
      </Field>
      <Field label="Job Type">
        <ChipSelect options={JOB_TYPES} value={d.job_type} onSelect={(v) => set('job_type', v)} />
      </Field>
      <Field label="Experience Required">
        <ChipSelect options={EXP_LEVELS} value={d.experience_level} onSelect={(v) => set('experience_level', v)} />
      </Field>
      <Field label="Salary Type">
        <ChipSelect options={SALARY_TYPES} value={d.salary_type ?? 'monthly'} onSelect={(v) => set('salary_type', v)} />
      </Field>
      <Field label="Salary Range (₹)">
        <View style={U.salaryRow}>
          <Input
            style={{ flex: 1, marginBottom: 0 }}
            placeholder="Min"
            value={d.salary_min ?? ''}
            onChangeText={(v) => set('salary_min', v)}
            keyboardType="numeric"
          />
          <Text style={U.salarySep}>to</Text>
          <Input
            style={{ flex: 1, marginBottom: 0 }}
            placeholder="Max"
            value={d.salary_max ?? ''}
            onChangeText={(v) => set('salary_max', v)}
            keyboardType="numeric"
          />
        </View>
      </Field>
      <Field label="Number of Openings">
        <Input placeholder="e.g. 2" value={String(d.openings ?? '')} onChangeText={(v) => set('openings', v)} keyboardType="numeric" />
      </Field>
      <Field label="Gender Preference">
        <ChipSelect options={GENDER_PREF} value={d.gender_preference ?? 'any'} onSelect={(v) => set('gender_preference', v)} />
      </Field>
      <View style={U.urgentRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={U.fieldLabel}>Immediate Joiner Needed</Text>
          <Text style={U.urgentSub}>Mark this to attract candidates available right away</Text>
        </View>
        <Switch
          value={d.is_urgent ?? false}
          onValueChange={(v) => set('is_urgent', v)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
      <Field label="Skills Required">
        <View style={U.skillInputRow}>
          <TextInput
            style={[U.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Type a skill and press +"
            placeholderTextColor={colors.textMuted}
            value={skillInput}
            onChangeText={setSkillInput}
            onSubmitEditing={addSkill}
            returnKeyType="done"
          />
          <TouchableOpacity style={U.skillAddBtn} onPress={addSkill}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {(d.skills_required ?? []).length > 0 && (
          <View style={U.chipWrap}>
            {(d.skills_required as string[]).map((s, i) => (
              <TouchableOpacity key={i} style={U.chipActive} onPress={() => removeSkill(i)}>
                <Text style={U.chipTextActive}>{s}  ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Field>
    </>
  );
}

const BIZ_CATS = [
  { key: 'medical_shop', label: 'Medical Shop' }, { key: 'restaurant', label: 'Restaurant' },
  { key: 'grocery', label: 'Grocery' }, { key: 'salon', label: 'Salon' },
  { key: 'hardware', label: 'Hardware' }, { key: 'mobile_shop', label: 'Mobile Shop' },
];
const BIZ_AMENITIES = [
  { key: 'parking', label: 'Parking' }, { key: 'home_delivery', label: 'Home Delivery' }, { key: 'upi_accepted', label: 'UPI Accepted' },
];

function BusinessFields({ d, set }: { d: any; set: (k: string, v: any) => void }) {
  function toggleAmenity(a: string) {
    const cur: string[] = d.amenities ?? [];
    set('amenities', cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]);
  }
  return (
    <>
      <Field label="Business Name">
        <Input placeholder="e.g. Ravi General Store" value={d.business_name ?? ''} onChangeText={(v) => set('business_name', v)} />
      </Field>
      <Field label="Business Category">
        <ChipSelect options={BIZ_CATS} value={d.business_category} onSelect={(v) => set('business_category', v)} />
      </Field>
      <Field label="Address">
        <MultilineInput placeholder="Full address with landmark" value={d.address ?? ''} onChangeText={(v) => set('address', v)} />
      </Field>
      <Field label="Established Year">
        <Input placeholder="e.g. 2010" value={d.established_year ?? ''} onChangeText={(v) => set('established_year', v)} keyboardType="numeric" />
      </Field>
      <Field label="Website (optional)">
        <Input placeholder="https://..." value={d.website ?? ''} onChangeText={(v) => set('website', v)} keyboardType="url" autoCapitalize="none" />
      </Field>
      <Field label="Facilities Available">
        <MultiChip options={BIZ_AMENITIES} values={d.amenities ?? []} onToggle={toggleAmenity} />
      </Field>
    </>
  );
}

// ── Category tab config ───────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: 'buy_sell',   label: 'Buy / Sell', icon: 'pricetag-outline',   activeIcon: 'pricetag' },
  { key: 'rent',       label: 'Rent',       icon: 'home-outline',       activeIcon: 'home' },
  { key: 'services',   label: 'Services',   icon: 'construct-outline',  activeIcon: 'construct' },
  { key: 'jobs',       label: 'Jobs',       icon: 'briefcase-outline',  activeIcon: 'briefcase' },
  { key: 'businesses', label: 'Business',   icon: 'storefront-outline', activeIcon: 'storefront' },
] as const;

type CategoryKey = typeof CATEGORY_TABS[number]['key'];

const CATEGORY_CONFIG: Record<CategoryKey, { title: string; showPhotos: boolean; showPrice: boolean; pricePlaceholder: string }> = {
  buy_sell:   { title: 'Post Item for Sale',  showPhotos: true,  showPrice: true,  pricePlaceholder: 'e.g. 5,000' },
  rent:       { title: 'Post Rental Listing', showPhotos: true,  showPrice: false, pricePlaceholder: '' },
  services:   { title: 'Offer a Service',     showPhotos: true,  showPrice: true,  pricePlaceholder: 'e.g. 500' },
  jobs:       { title: 'Post a Job',          showPhotos: false, showPrice: false, pricePlaceholder: '' },
  businesses: { title: 'List Your Business',  showPhotos: true,  showPrice: false, pricePlaceholder: '' },
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreateListingScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const initialCategory = (route.params?.category ?? 'buy_sell') as CategoryKey;
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(initialCategory);
  const cfg = CATEGORY_CONFIG[activeCategory];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; mime: string }[]>([]);
  const [details, setDetails] = useState<Record<string, any>>({});
  const [posting, setPosting] = useState(false);

  function switchCategory(key: CategoryKey) {
    setActiveCategory(key);
    setDetails({});
    setPhotos([]);
    setPrice('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function setDetail(key: string, value: any) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow media library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.88 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPhotos((p) => [...p, { uri: a.uri, mime: a.mimeType ?? 'image/jpeg' }].slice(0, 5));
    }
  }

  async function submit() {
    if (title.trim().length < 3) { Alert.alert('Title too short', 'Add a more descriptive title.'); return; }
    setPosting(true);
    try {
      const photoUrls: string[] = [];
      for (const p of photos) {
        const { data: presigned } = await apiClient.post('/storage/presigned-upload', { prefix: 'listing', content_type: p.mime });
        const blob = await (await fetch(p.uri)).blob();
        await fetch(presigned.uploadUrl, { method: 'PUT', headers: { 'Content-Type': p.mime }, body: blob });
        photoUrls.push(presigned.publicUrl);
      }

      const body: Record<string, any> = {
        category: activeCategory,
        title: title.trim(),
        description: description.trim() || null,
        contact_info: contactInfo.trim() || null,
        visibility_level: VisibilityLevel.AREA,
        photo_urls: photoUrls,
        details,
      };

      if (activeCategory === 'rent') {
        body.price = details.rent ? Number(details.rent) : null;
      } else if (price) {
        body.price = Number(price);
      }

      if (activeCategory === 'jobs') {
        body.sub_category = details.job_type ?? null;
      }

      await apiClient.post('/marketplace/listings', body);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Could not post', err.response?.data?.error ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[U.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Single top bar: back button + tabs in one row ── */}
      <View style={U.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={U.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={U.tabRow}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          {CATEGORY_TABS.map((t) => {
            const active = activeCategory === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[U.tabPill, active && U.tabPillActive]}
                onPress={() => switchCategory(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={(active ? t.activeIcon : t.icon) as any}
                  size={14}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text style={[U.tabText, active && U.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[U.body, { paddingBottom: insets.bottom + 94 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photos ── */}
        {cfg.showPhotos && (
          <>
            <SectionHeader n={1} title="Add Photos" />
            <View style={U.card}>
              <PhotoSection
                photos={photos.map((p) => p.uri)}
                onAdd={pickPhoto}
                onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))}
              />
              <Text style={U.photoHint}>First photo will be the cover · Max 5</Text>
            </View>
          </>
        )}

        {/* ── Title ── */}
        <SectionHeader n={cfg.showPhotos ? 2 : 1} title="Basic Details" />
        <View style={U.card}>
          <Field label={activeCategory === 'jobs' ? 'Job Title' : activeCategory === 'businesses' ? 'Listing Title' : 'Title'}>
            <Input
              placeholder={
                activeCategory === 'jobs'      ? 'e.g. Delivery Executive' :
                activeCategory === 'rent'      ? 'e.g. 2 BHK Independent House' :
                activeCategory === 'services'  ? 'e.g. Expert Electrician Available' :
                activeCategory === 'businesses'? 'e.g. Ravi General Store' :
                'e.g. iPhone 13 – 128GB'
              }
              value={title}
              onChangeText={setTitle}
            />
          </Field>

          {/* ── Category-specific fields ── */}
          {activeCategory === 'buy_sell'   && <BuySellFields d={details} set={setDetail} />}
          {activeCategory === 'rent'       && <RentFields    d={details} set={setDetail} />}
          {activeCategory === 'services'   && <ServiceFields d={details} set={setDetail} />}
          {activeCategory === 'jobs'       && <JobFields     d={details} set={setDetail} />}
          {activeCategory === 'businesses' && <BusinessFields d={details} set={setDetail} />}

          {cfg.showPrice && (
            <Field label="Price (₹)">
              <Input placeholder={cfg.pricePlaceholder} value={price} onChangeText={setPrice} keyboardType="numeric" />
            </Field>
          )}
        </View>

        {/* ── Description ── */}
        <SectionHeader n={cfg.showPhotos ? 3 : 2} title="Description" />
        <View style={U.card}>
          <MultilineInput
            placeholder="Add more details to attract the right people…"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* ── Contact ── */}
        <SectionHeader n={cfg.showPhotos ? 4 : 3} title="Contact Info" />
        <View style={U.card}>
          <Input placeholder="Phone number or WhatsApp" value={contactInfo} onChangeText={setContactInfo} keyboardType="phone-pad" />
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[U.submitBtn, posting && U.submitDisabled]}
          onPress={submit}
          disabled={posting}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={U.submitText}>{posting ? 'Posting…' : 'Post Listing  →'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const U = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 10, paddingRight: 6, height: 46,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  tabRow: { gap: 5, alignItems: 'center', paddingRight: 10 },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100,
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
  },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },

  body: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 36 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  stepBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 10, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },

  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: colors.textSecondary,
    marginBottom: 4, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.input,
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 13,
    color: colors.textPrimary, backgroundColor: '#fff', marginBottom: 5,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },

  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  salarySep: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 },
  chip: {
    flexShrink: 0, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 100, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.card,
  },
  chipActive: { flexShrink: 0, backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { fontSize: 12, fontWeight: '600', color: '#fff' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  photoThumb: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 3, right: 3,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 64, height: 64, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.card,
  },
  photoAddText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  photoHint: { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  urgentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radii.input,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 5,
  },
  urgentSub: { fontSize: 10, color: colors.textMuted, marginTop: 1 },

  skillInputRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  skillAddBtn: {
    width: 38, height: 38, borderRadius: 8,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 100,
    paddingVertical: 11, marginTop: 10,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
