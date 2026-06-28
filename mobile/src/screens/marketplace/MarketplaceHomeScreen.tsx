import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingCategory } from '@easysociety/shared';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { colors, spacing } from '../../theme';
import { useNavPadding } from '../../hooks/useNavPadding';
import MarketplaceFiltersModal, {
  MarketplaceFilters,
  MarketplaceTab,
  DEFAULT_FILTERS,
} from './MarketplaceFiltersModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ListingRow {
  id: string;
  category: string;
  sub_category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  contact_info: string | null;
  author_name: string | null;
  author_photo: string | null;
  cover_photo_url: string | null;
  recommendation_count: string;
  location_label: string | null;
  is_saved: boolean;
  created_at: string;
}

type TabKey = MarketplaceTab;

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: ListingCategory.BUY_SELL,  label: 'Buy / Sell',  icon: 'pricetag-outline' },
  { key: ListingCategory.RENT,      label: 'Rent',        icon: 'home-outline' },
  { key: ListingCategory.SERVICES,  label: 'Services',    icon: 'construct-outline' },
  { key: ListingCategory.JOBS,      label: 'Jobs',        icon: 'briefcase-outline' },
  { key: 'businesses',              label: 'Businesses',  icon: 'storefront-outline' },
];

const SECTION_TITLE: Record<string, string> = {
  [ListingCategory.BUY_SELL]: 'Nearby Treasures',
  [ListingCategory.RENT]:     'Available to Rent',
  [ListingCategory.SERVICES]: 'Local Experts',
  [ListingCategory.JOBS]:     'Job Openings',
};

function timeAgo(d?: string) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatPrice(p: number | null, category: string) {
  if (p == null) return null;
  const fmt = `₹${p.toLocaleString('en-IN')}`;
  if (category === ListingCategory.RENT) return `${fmt} / mo`;
  return fmt;
}

// ── Heart / Save button ───────────────────────────────────────────────────────

function SaveBtn({ listingId, saved }: { listingId: string; saved: boolean }) {
  const [isSaved, setIsSaved] = useState(saved);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function toggle() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    const next = !isSaved;
    setIsSaved(next);
    (next
      ? apiClient.post(`/marketplace/listings/${listingId}/save`)
      : apiClient.delete(`/marketplace/listings/${listingId}/save`)
    ).catch(() => setIsSaved(!next));
  }

  return (
    <TouchableOpacity style={S.heartBtn} onPress={toggle} hitSlop={6} activeOpacity={0.85}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? '#E05A5A' : colors.textSecondary} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Card: Buy / Sell ──────────────────────────────────────────────────────────

function BuySellCard({ item, onPress }: { item: ListingRow; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [S.card, pressed && S.cardPressed]}
      onPress={onPress}
    >
      <View style={S.imageWrap}>
        {item.cover_photo_url ? (
          <Image source={{ uri: item.cover_photo_url }} style={S.cardImage} resizeMode="cover" />
        ) : (
          <View style={[S.cardImage, S.imagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <SaveBtn listingId={item.id} saved={item.is_saved} />
        {item.location_label ? (
          <View style={S.distBadge}>
            <Ionicons name="location-sharp" size={10} color="#fff" />
            <Text style={S.distText}>{item.location_label}</Text>
          </View>
        ) : null}
      </View>

      <View style={S.cardBody}>
        <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
        {formatPrice(item.price, item.category) && (
          <Text style={S.cardPrice}>{formatPrice(item.price, item.category)}</Text>
        )}
        <View style={S.cardFooter}>
          <Text style={S.cardTime}>{timeAgo(item.created_at)}</Text>
          <View style={S.actionRow}>
            {item.contact_info && (
              <TouchableOpacity
                style={S.actionBtn}
                onPress={() => Linking.openURL(`tel:${item.contact_info}`)}
                hitSlop={4}
              >
                <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={S.actionBtn} onPress={onPress} hitSlop={4}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Card: Rent ────────────────────────────────────────────────────────────────

function RentCard({ item, onPress }: { item: ListingRow; onPress: () => void }) {
  const sub = item.sub_category ?? '';
  const meta = [
    sub && sub.replace(/_/g, ' '),
  ].filter(Boolean);

  return (
    <Pressable style={({ pressed }) => [S.card, pressed && S.cardPressed]} onPress={onPress}>
      <View style={S.imageWrap}>
        {item.cover_photo_url ? (
          <Image source={{ uri: item.cover_photo_url }} style={S.cardImage} resizeMode="cover" />
        ) : (
          <View style={[S.cardImage, S.imagePlaceholder]}>
            <Ionicons name="home-outline" size={32} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <SaveBtn listingId={item.id} saved={item.is_saved} />
        {item.location_label && (
          <View style={S.distBadge}>
            <Ionicons name="location-sharp" size={10} color="#fff" />
            <Text style={S.distText}>{item.location_label}</Text>
          </View>
        )}
      </View>
      <View style={S.cardBody}>
        <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
        {meta.length > 0 && (
          <View style={S.metaRow}>
            <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
            <Text style={S.metaText}>{meta.join(' · ')}</Text>
          </View>
        )}
        {formatPrice(item.price, item.category) && (
          <Text style={S.cardPrice}>{formatPrice(item.price, item.category)}</Text>
        )}
        <Text style={S.cardTime}>{timeAgo(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

// ── Card: Service ─────────────────────────────────────────────────────────────

function ServiceCard({ item, onPress }: { item: ListingRow; onPress: () => void }) {
  const rec = Number(item.recommendation_count);
  return (
    <Pressable style={({ pressed }) => [S.serviceCard, pressed && S.cardPressed]} onPress={onPress}>
      <View style={S.serviceHeader}>
        {item.author_photo ? (
          <Image source={{ uri: item.author_photo }} style={S.serviceAvatar} />
        ) : (
          <Avatar name={item.author_name ?? '?'} size={52} />
        )}
        <View style={S.serviceInfo}>
          <Text style={S.serviceName} numberOfLines={1}>{item.author_name ?? 'Provider'}</Text>
          <Text style={S.serviceType} numberOfLines={1}>
            {item.sub_category?.replace(/_/g, ' ') ?? item.title}
          </Text>
          {rec > 0 && (
            <View style={S.ratingRow}>
              <Ionicons name="star" size={12} color="#F4A92A" />
              <Text style={S.ratingText}>{rec} helpful</Text>
            </View>
          )}
        </View>
        <SaveBtn listingId={item.id} saved={item.is_saved} />
      </View>

      {item.description ? (
        <Text style={S.serviceDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={S.serviceFooter}>
        {formatPrice(item.price, item.category) && (
          <Text style={S.cardPrice}>{formatPrice(item.price, item.category)}</Text>
        )}
        <TouchableOpacity style={S.portfolioBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={S.portfolioBtnText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

// ── Card: Job ─────────────────────────────────────────────────────────────────

function JobCard({ item, onPress }: { item: ListingRow; onPress: () => void }) {
  const sub = item.sub_category?.replace(/_/g, ' ');
  return (
    <Pressable style={({ pressed }) => [S.jobCard, pressed && S.cardPressed]} onPress={onPress}>
      <View style={S.jobHeader}>
        <View style={S.jobIconBox}>
          <Ionicons name="briefcase" size={22} color={colors.primary} />
        </View>
        <View style={S.jobInfo}>
          <Text style={S.jobTitle} numberOfLines={2}>{item.title}</Text>
          {item.author_name && <Text style={S.jobCompany}>{item.author_name}</Text>}
        </View>
        <SaveBtn listingId={item.id} saved={item.is_saved} />
      </View>

      <View style={S.jobTags}>
        {sub && <View style={S.tag}><Text style={S.tagText}>{sub}</Text></View>}
        {item.location_label && (
          <View style={S.tag}>
            <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
            <Text style={S.tagText}>{item.location_label}</Text>
          </View>
        )}
      </View>

      {formatPrice(item.price, item.category) && (
        <View style={S.salaryBadge}>
          <Ionicons name="cash-outline" size={13} color="#3A7A3A" />
          <Text style={S.salaryText}>{formatPrice(item.price, item.category)}</Text>
        </View>
      )}

      <Text style={S.cardTime}>{timeAgo(item.created_at)}</Text>
    </Pressable>
  );
}

// ── Just Posted thumbnail ─────────────────────────────────────────────────────

function JustPostedThumb({ item, onPress }: { item: ListingRow; onPress: () => void }) {
  return (
    <TouchableOpacity style={S.thumb} onPress={onPress} activeOpacity={0.82}>
      <View style={S.thumbImgBox}>
        {item.cover_photo_url ? (
          <Image source={{ uri: item.cover_photo_url }} style={S.thumbImg} resizeMode="cover" />
        ) : (
          <View style={[S.thumbImg, S.thumbPlaceholder]}>
            <Ionicons name="pricetag-outline" size={18} color="rgba(255,255,255,0.4)" />
          </View>
        )}
      </View>
      <Text style={S.thumbLabel} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );
}

// ── Local Services promo CTA ──────────────────────────────────────────────────

function LocalServicesCTA({ onPress }: { onPress: () => void }) {
  return (
    <View style={S.ctaCard}>
      <View style={S.ctaContent}>
        <Text style={S.ctaTitle}>Need a Hand Locally?</Text>
        <Text style={S.ctaBody}>
          Discover trusted neighbors offering gardening, tutoring, cleaning, and technical help within your area.
        </Text>
        <TouchableOpacity style={S.ctaBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={S.ctaBtnText}>Browse Services</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <View style={S.empty}>
      <Ionicons name="search-outline" size={44} color={colors.border} />
      <Text style={S.emptyTitle}>No listings found</Text>
      <Text style={S.emptyBody}>Try a different category or expand your area.</Text>
      <TouchableOpacity style={S.emptyBtn} onPress={onClear} activeOpacity={0.85}>
        <Text style={S.emptyBtnText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MarketplaceHome'>;

export default function MarketplaceHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const navPadding = useNavPadding();
  const [activeTab, setActiveTab] = useState<TabKey>(ListingCategory.BUY_SELL);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [recent, setRecent] = useState<ListingRow[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    apiClient.get('/marketplace/listings')
      .then(({ data }) => setRecent((data.listings ?? []).slice(0, 10)))
      .catch(() => {});
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.minPrice > 0 || filters.maxPrice < 100000) n++;
    if (filters.maxDistance !== DEFAULT_FILTERS.maxDistance) n++;
    if (filters.sortBy !== 'newest') n++;
    if (filters.propertyTypes.length) n++;
    if (filters.furnishing.length) n++;
    if (filters.serviceTypes.length) n++;
    if (filters.minRating) n++;
    if (filters.jobTypes.length) n++;
    if (filters.experience.length) n++;
    return n;
  }, [filters]);

  const loadTab = useCallback(async () => {
    if (activeTab === ListingCategory.BUSINESSES) return;
    try {
      const params: Record<string, unknown> = { category: activeTab };
      if (filters.minPrice > 0) params.min_price = filters.minPrice;
      if (filters.maxPrice < 100000) params.max_price = filters.maxPrice;
      if (filters.sortBy !== 'newest') params.sort = filters.sortBy;
      if (activeTab === ListingCategory.RENT) {
        if (filters.propertyTypes.length) params.property_types = filters.propertyTypes.join(',');
        if (filters.furnishing.length) params.furnishing = filters.furnishing.join(',');
      }
      if (activeTab === ListingCategory.SERVICES) {
        if (filters.serviceTypes.length) params.service_types = filters.serviceTypes.join(',');
        if (filters.minRating) params.min_rating = filters.minRating;
      }
      if (activeTab === ListingCategory.JOBS) {
        if (filters.jobTypes.length) params.job_types = filters.jobTypes.join(',');
        if (filters.experience.length) params.experience = filters.experience.join(',');
      }
      const { data } = await apiClient.get('/marketplace/listings', { params });
      setListings(data.listings ?? []);
    } catch {}
  }, [activeTab, filters]);

  useFocusEffect(useCallback(() => { loadTab(); }, [loadTab]));

  const filtered = search.trim()
    ? listings.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : listings;

  function goToListing(id: string) {
    navigation.navigate('ListingDetail', { listingId: id });
  }

  function renderCard(item: ListingRow) {
    const onPress = () => goToListing(item.id);
    if (item.category === ListingCategory.RENT) return <RentCard item={item} onPress={onPress} />;
    if (item.category === ListingCategory.SERVICES) return <ServiceCard item={item} onPress={onPress} />;
    if (item.category === ListingCategory.JOBS) return <JobCard item={item} onPress={onPress} />;
    return <BuySellCard item={item} onPress={onPress} />;
  }

  const ListHeader = (
    <View>
      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={S.headerLocation}>📍 Your Community</Text>
          <Text style={S.headerTitle}>Marketplace</Text>
        </View>
        <TouchableOpacity style={S.bellBtn} hitSlop={8}>
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Search + Filter ── */}
      <View style={S.searchRow}>
        <View style={S.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={S.searchInput}
            placeholder="Search marketplace…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={S.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          {activeFilterCount > 0 && (
            <View style={S.filterBadge}>
              <Text style={S.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Just Posted ── */}
      {recent.length > 0 && (
        <View>
          <Text style={S.sectionLabel}>JUST POSTED</Text>
          <FlatList
            horizontal
            data={recent}
            keyExtractor={(r) => `recent-${r.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.thumbRow}
            renderItem={({ item }) => (
              <JustPostedThumb item={item} onPress={() => goToListing(item.id)} />
            )}
          />
        </View>
      )}

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.tabRow}
        style={S.tabScroll}
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[S.tabPill, active && S.tabPillActive]}
              onPress={() => {
                if (t.key === 'businesses') {
                  navigation.navigate('BusinessDirectory');
                } else {
                  setActiveTab(t.key);
                  setSearch('');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={t.icon as any}
                size={15}
                color={active ? '#fff' : colors.textSecondary}
              />
              <Text style={[S.tabText, active && S.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Section heading ── */}
      {activeTab !== 'businesses' && (
        <View style={S.sectionRow}>
          <Text style={S.sectionTitle}>{SECTION_TITLE[activeTab] ?? 'Listings'}</Text>
          <TouchableOpacity hitSlop={8}>
            <Text style={S.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={S.flex}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[S.listContent, { paddingBottom: navPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => renderCard(item)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          activeTab !== 'businesses' ? (
            <EmptyState onClear={() => setSearch('')} />
          ) : null
        }
        ListFooterComponent={
          activeTab !== ListingCategory.SERVICES ? (
            <LocalServicesCTA onPress={() => setActiveTab(ListingCategory.SERVICES)} />
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[S.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => navigation.navigate('CreateListing', { category: activeTab === 'businesses' ? 'businesses' : activeTab })}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <MarketplaceFiltersModal
        visible={showFilters}
        activeTab={activeTab}
        filters={filters}
        onApply={(newTab, newFilters) => {
          setActiveTab(newTab);
          setFilters(newFilters);
          setSearch('');
          setShowFilters(false);
        }}
        onClose={() => setShowFilters(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  headerLocation: { fontSize: 11.5, color: colors.textSecondary, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 1 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },

  // Search
  searchRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: spacing.md,
    paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  // Just Posted
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  thumbRow: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },
  thumb: { width: 72, alignItems: 'center' },
  thumbImgBox: {
    width: 64, height: 64, borderRadius: 16, overflow: 'hidden',
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#C5A898' },
  thumbLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'center', fontWeight: '600' },

  // Category tabs
  tabScroll: { flexGrow: 0 },
  tabRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 100, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tabPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },

  // Section heading
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  viewAll: { fontSize: 12.5, fontWeight: '700', color: colors.primary },

  // Card shell
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3D1F17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardPressed: { opacity: 0.95, transform: [{ scale: 0.985 }] },

  // Image area (4:3)
  imageWrap: { width: '100%', aspectRatio: 4 / 3, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: '#C5A898', alignItems: 'center', justifyContent: 'center' },

  // Overlays
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  distBadge: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  distText: { fontSize: 10.5, color: '#fff', fontWeight: '600' },

  // Card content
  cardBody: { padding: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardPrice: { fontSize: 17, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  cardTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 12, color: colors.textSecondary },

  // Service card
  serviceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: '#3D1F17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  serviceAvatar: { width: 52, height: 52, borderRadius: 26 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  serviceType: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#B8860B' },
  serviceDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.sm },
  serviceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  portfolioBtn: {
    backgroundColor: colors.card, borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1.5, borderColor: colors.border,
  },
  portfolioBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary },

  // Job card
  jobCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: '#3D1F17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  jobIconBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#FBF2EB', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  jobCompany: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  jobTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.card, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  tagText: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
  salaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EDFAED', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: spacing.xs,
  },
  salaryText: { fontSize: 13, fontWeight: '700', color: '#3A7A3A' },

  // Local Services CTA
  ctaCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 20,
    overflow: 'hidden',
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaContent: {},
  ctaTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  ctaBody: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19, marginBottom: spacing.md },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100,
    alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  ctaBtnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  emptyBody: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing.sm, backgroundColor: colors.primary,
    borderRadius: 100, paddingHorizontal: 24, paddingVertical: 11,
  },
  emptyBtnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
});
