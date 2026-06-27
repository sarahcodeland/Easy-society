import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingCategory } from '@easysociety/shared';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';

const { width: SW } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  brick:    '#8B2E2E',
  gold:     '#B8860B',
  green:    '#2E7D32',
  greenBg:  '#E8F5E9',
  bg:       '#FFFFFF',
  gridBg:   '#F5F5F5',
  sellerBg: '#FAFAFA',
  statsBg:  '#F8F8F8',
  divider:  '#F0F0F0',
  text:     '#1A1A1A',
  body:     '#444444',
  gray:     '#888888',
  review:   '#555555',
  border:   '#E0E0E0',
};

const IMG_H    = 220;
const CELL_GAP = 8;
const SEC_PX   = 14;
const CELL_W   = (SW - SEC_PX * 2 - CELL_GAP) / 2;

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'ListingDetail'>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Photo   { id: string; photo_url: string; order_index: number }
interface Comment { id: string; author_name: string; author_photo: string | null; body: string; created_at: string }
interface Listing {
  id: string; category: string; sub_category: string | null;
  title: string; description: string | null; price: number | null;
  contact_info: string | null; created_at: string; is_saved?: boolean;
  author_name: string | null; author_photo: string | null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 2)  return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  return `${Math.floor(h / 24)} days ago`;
}

function fmtPrice(price: number | null, category: string) {
  if (!price) return null;
  const r = `₹${price.toLocaleString('en-IN')}`;
  if (category === ListingCategory.RENT)     return `${r}/mo`;
  if (category === ListingCategory.SERVICES) return `${r}/hr`;
  if (category === ListingCategory.JOBS)     return `${r}/mo`;
  return r;
}

function fmtSub(s: string | null) {
  return s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
}

function extractPhone(info: string | null) {
  if (!info) return null;
  const m = info.match(/[\+\d][\d\s\-\.]{9,}/);
  return m ? m[0].replace(/[\s\-\.]/g, '') : null;
}

function getSpecs(listing: Listing): Array<{ label: string; value: string }> {
  const sub = fmtSub(listing.sub_category);
  switch (listing.category) {
    case ListingCategory.BUY_SELL:
      return [
        { label: 'CATEGORY',   value: sub ?? 'General' },
        { label: 'CONDITION',  value: 'Good Condition' },
        { label: 'ASSEMBLY',   value: 'Pre-assembled' },
        { label: 'NEGOTIABLE', value: 'Yes' },
      ];
    case ListingCategory.RENT:
      return [
        { label: 'TYPE',       value: sub ?? 'Property' },
        { label: 'FURNISHING', value: 'Semi-furnished' },
        { label: 'AVAILABLE',  value: 'Immediately' },
        { label: 'DEPOSIT',    value: '2 months' },
      ];
    case ListingCategory.SERVICES:
      return [
        { label: 'SERVICE',      value: sub ?? 'General' },
        { label: 'EXPERIENCE',   value: '5+ years' },
        { label: 'AVAILABILITY', value: 'Mon–Sat' },
        { label: 'AREA',         value: 'Local Area' },
      ];
    case ListingCategory.JOBS:
      return [
        { label: 'JOB TYPE',   value: sub ?? 'Full-time' },
        { label: 'EXPERIENCE', value: 'Fresher OK' },
        { label: 'OPENINGS',   value: '1 position' },
        { label: 'JOINING',    value: 'Immediately' },
      ];
    default:
      return sub ? [{ label: 'CATEGORY', value: sub }] : [];
  }
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.divider }} />;
}

function Stars({ n = 5, size = 11 }: { n?: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Ionicons key={i} name="star" size={size} color="#F4A92A" />
      ))}
    </View>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────

function Gallery({ photos, isPremium }: { photos: Photo[]; isPremium: boolean }) {
  const [idx, setIdx] = useState(0);

  if (!photos.length) {
    return (
      <View style={D.galleryPh}>
        <Ionicons name="image-outline" size={44} color="rgba(255,255,255,0.35)" />
      </View>
    );
  }

  return (
    <View style={{ height: IMG_H }}>
      <FlatList
        data={photos}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={p => p.id}
        onMomentumScrollEnd={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / SW))}
        renderItem={({ item }) => (
          <Image source={{ uri: item.photo_url }} style={{ width: SW, height: IMG_H }} resizeMode="cover" />
        )}
      />

      {isPremium && (
        <View style={D.premiumBadge}>
          <Text style={D.premiumText}>Premium Listing</Text>
        </View>
      )}

      {photos.length > 1 && (
        <View style={D.countPill}>
          <Text style={D.countText}>{idx + 1}/{photos.length}</Text>
        </View>
      )}

      {photos.length > 1 && (
        <View style={D.dotsRow}>
          {photos.map((_, i) => (
            <View key={i} style={[D.dot, i === idx && D.dotOn]} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const insets = useSafeAreaInsets();

  const [data, setData]         = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saved, setSaved]       = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft]       = useState('');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    try {
      const [detail, c] = await Promise.all([
        apiClient.get(`/marketplace/listings/${listingId}`),
        apiClient.get(`/marketplace/listings/${listingId}/comments`),
      ]);
      setData(detail.data);
      setSaved(detail.data.listing?.is_saved ?? false);
      setComments(c.data.comments ?? []);
    } catch {}
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      await apiClient.post(`/marketplace/listings/${listingId}/save`);
    } catch {
      setSaved(!next);
    }
  }

  async function postComment() {
    if (!draft.trim()) return;
    try {
      await apiClient.post(`/marketplace/listings/${listingId}/comments`, { body: draft.trim() });
      setDraft('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error ?? 'Could not post comment.');
    }
  }

  if (!data) return <View style={[D.screen, { paddingTop: insets.top }]} />;

  const { listing, photos, recommendation_count: recCount } = data as {
    listing: Listing; photos: Photo[]; recommendation_count: number;
  };

  const phone     = extractPhone(listing.contact_info);
  const price     = fmtPrice(listing.price, listing.category);
  const specs     = getSpecs(listing);
  const isPremium = recCount >= 3;

  return (
    <View style={[D.screen, { paddingTop: insets.top }]}>

      {/* ── Sticky header ── */}
      <View style={D.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={D.hBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={D.hTitle} numberOfLines={1}>Listing Details</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={D.hBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={21} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={D.hBtn} onPress={toggleSave} hitSlop={8}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={21}
              color={saved ? C.brick : C.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Gallery */}
        <Gallery photos={photos} isPremium={isPremium} />

        {/* ── Price + title ── */}
        <View style={D.sec}>
          <View style={D.titleRow}>
            <Text style={D.titleText} numberOfLines={2}>{listing.title}</Text>
            {price != null && <Text style={D.priceText}>{price}</Text>}
          </View>
          {listing.price != null && (
            <View style={{ marginTop: 5 }}>
              <View style={D.negPill}><Text style={D.negText}>NEGOTIABLE</Text></View>
            </View>
          )}
          <View style={D.metaRow}>
            <Text style={D.metaTxt}>📍 Kukatpally, 0.8km</Text>
            <Text style={D.metaTxt}> · </Text>
            <Text style={D.metaTxt}>🕐 Posted {timeAgo(listing.created_at)}</Text>
          </View>
        </View>

        <Divider />

        {/* ── Key details grid ── */}
        {specs.length > 0 && (
          <>
            <View style={D.sec}>
              <View style={D.grid}>
                {specs.slice(0, 4).map((s, i) => (
                  <View key={i} style={D.cell}>
                    <Text style={D.cellLabel}>{s.label}</Text>
                    <Text style={D.cellVal} numberOfLines={2}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Divider />
          </>
        )}

        {/* ── Description ── */}
        {!!listing.description && (
          <>
            <View style={D.sec}>
              <Text style={D.secLabel}>Description</Text>
              <Text style={D.descText} numberOfLines={expanded ? undefined : 3}>
                {listing.description}
              </Text>
              <TouchableOpacity onPress={() => setExpanded(v => !v)}>
                <Text style={D.readMore}>{expanded ? 'Read less' : 'Read more'}</Text>
              </TouchableOpacity>
            </View>
            <Divider />
          </>
        )}

        {/* ── Seller information ── */}
        <View style={D.sec}>
          <View style={D.sellerCard}>
            <View style={D.sellerRow}>
              {listing.author_photo ? (
                <Image source={{ uri: listing.author_photo }} style={D.sellerAva} />
              ) : (
                <Avatar name={listing.author_name ?? '?'} size={40} />
              )}
              <View style={{ flex: 1 }}>
                <View style={D.sellerNameRow}>
                  <Text style={D.sellerName} numberOfLines={1}>
                    {listing.author_name ?? 'Community Member'}
                  </Text>
                  <View style={D.verBadge}><Text style={D.verText}>Verified Resident</Text></View>
                </View>
              </View>
              <TouchableOpacity>
                <Text style={D.viewProfile}>View Profile</Text>
              </TouchableOpacity>
            </View>
            <View style={D.sellerRating}>
              <Stars size={12} />
              <Text style={D.sellerRatingTxt}>4.8 (24 reviews)</Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* ── Community reviews ── */}
        <View style={D.sec}>
          <View style={D.reviewsHead}>
            <Text style={D.secLabel}>Community Reviews</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="star" size={12} color="#F4A92A" />
              <Text style={D.ratingTxt}>4.8 (24)</Text>
              <Text style={D.viewAll}> · View All</Text>
            </View>
          </View>

          {comments.slice(0, 2).map((c, i) => (
            <View key={c.id} style={[D.reviewCard, i > 0 && { marginTop: 8 }]}>
              <View style={D.reviewTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  {c.author_photo ? (
                    <Image source={{ uri: c.author_photo }} style={D.reviewAva} />
                  ) : (
                    <Avatar name={c.author_name ?? '?'} size={32} />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={D.reviewName} numberOfLines={1}>{c.author_name}</Text>
                      <Stars size={10} />
                    </View>
                  </View>
                </View>
                <Text style={D.reviewTime}>{timeAgo(c.created_at)}</Text>
              </View>
              <Text style={D.reviewBody} numberOfLines={2}>{c.body}</Text>
            </View>
          ))}

          {comments.length === 0 && (
            <Text style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>No reviews yet.</Text>
          )}
        </View>

        <Divider />

        {/* ── Seller stats bar ── */}
        <View style={D.statsBar}>
          <Text style={D.statsTxt}>✅  {Math.max(recCount, 10)}+ successful sales in this village</Text>
        </View>

        <Divider />

        {/* ── Leave feedback ── */}
        <View style={D.sec}>
          <Text style={D.secLabel}>Leave Feedback</Text>
          <View style={D.composerRow}>
            <TextInput
              style={D.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Share your experience…"
              placeholderTextColor={C.gray}
              multiline
            />
            <TouchableOpacity
              style={[D.sendBtn, { opacity: draft.trim() ? 1 : 0.38 }]}
              onPress={postComment}
              disabled={!draft.trim()}
            >
              <Ionicons name="send" size={17} color={C.brick} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* ── Fixed CTA bar ── */}
      <View style={[D.ctaBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={D.callBtn}
          onPress={phone ? () => Linking.openURL(`tel:${phone}`) : undefined}
          activeOpacity={0.8}
        >
          <Text style={D.callTxt}>📞  Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={D.chatBtn} activeOpacity={0.8}>
          <Text style={D.chatTxt}>💬  Chat</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const D = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, paddingHorizontal: 6,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },
  hBtn:   { padding: 8 },
  hTitle: {
    flex: 1, textAlign: 'center', marginHorizontal: 4,
    fontSize: 16, fontWeight: '700', color: C.text,
  },

  // ── Gallery
  galleryPh: {
    width: SW, height: IMG_H,
    backgroundColor: '#C5A898', alignItems: 'center', justifyContent: 'center',
  },
  premiumBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: C.gold, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  premiumText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  countPill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  countText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  dotsRow: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { width: 14, backgroundColor: '#fff' },

  // ── Section
  sec:      { paddingHorizontal: SEC_PX, paddingVertical: 10 },
  secLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8 },

  // ── Title + price
  titleRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  titleText: { flex: 1, fontSize: 18, fontWeight: '700', color: C.text, lineHeight: 24 },
  priceText: { fontSize: 20, fontWeight: '800', color: C.brick, flexShrink: 0 },
  negPill:   { alignSelf: 'flex-start', backgroundColor: C.greenBg, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  negText:   { fontSize: 10, fontWeight: '700', color: C.green },
  metaRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaTxt:   { fontSize: 12, color: C.gray },

  // ── Details grid
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP },
  cell:      { width: CELL_W, backgroundColor: C.gridBg, borderRadius: 8, padding: 10 },
  cellLabel: { fontSize: 9, fontWeight: '700', color: C.gray, letterSpacing: 0.5, marginBottom: 3 },
  cellVal:   { fontSize: 13, fontWeight: '700', color: C.text },

  // ── Description
  descText: { fontSize: 13, color: C.body, lineHeight: 19 },
  readMore:  { fontSize: 12, fontWeight: '600', color: C.brick, marginTop: 4 },

  // ── Seller card
  sellerCard:     { backgroundColor: C.sellerBg, borderRadius: 10, padding: 12 },
  sellerRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sellerAva:      { width: 40, height: 40, borderRadius: 20 },
  sellerNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sellerName:     { fontSize: 13, fontWeight: '700', color: C.text, flexShrink: 1 },
  verBadge:       { backgroundColor: C.greenBg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  verText:        { fontSize: 9, fontWeight: '700', color: C.green },
  viewProfile:    { fontSize: 12, fontWeight: '600', color: C.brick },
  sellerRating:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  sellerRatingTxt:{ fontSize: 12, color: C.gray },

  // ── Reviews
  reviewsHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ratingTxt:    { fontSize: 12, color: C.gray },
  viewAll:      { fontSize: 12, fontWeight: '600', color: C.brick },
  reviewCard:   {},
  reviewTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  reviewAva:    { width: 32, height: 32, borderRadius: 16 },
  reviewName:   { fontSize: 12, fontWeight: '700', color: C.text, flexShrink: 1 },
  reviewTime:   { fontSize: 11, color: C.gray },
  reviewBody:   { fontSize: 12, color: C.review, lineHeight: 17, marginLeft: 38 },

  // ── Stats bar
  statsBar: { backgroundColor: C.statsBg, paddingVertical: 10, alignItems: 'center' },
  statsTxt: { fontSize: 12, color: C.gray },

  // ── Feedback composer
  composerRow:   { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  composerInput: {
    flex: 1, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: C.text, minHeight: 40, maxHeight: 90,
    backgroundColor: C.sellerBg, textAlignVertical: 'top',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.brick,
  },

  // ── CTA bar
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCDCDC',
  },
  callBtn: {
    flex: 1, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.brick,
    alignItems: 'center', justifyContent: 'center',
  },
  callTxt: { fontSize: 15, fontWeight: '700', color: C.brick },
  chatBtn: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: C.brick, alignItems: 'center', justifyContent: 'center',
  },
  chatTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
