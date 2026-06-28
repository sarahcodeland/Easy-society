import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
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
import { MoreStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme';
import { useNavPadding } from '../../hooks/useNavPadding';

// ── Font sizes — change here to affect the whole screen ─────────────────────
const F = { label: 9, meta: 10, caption: 11, body: 12, md: 13, title: 14, sub: 22 };

const BR = '#8B2E2E';

type Props = NativeStackScreenProps<MoreStackParamList, 'CommunityMembers'>;

const FILTERS = [
  { key: 'all',       label: 'All Residents'   },
  { key: 'active',    label: 'Recently Active' },
  { key: 'verified',  label: 'Verified'        },
  { key: 'helpful',   label: 'Most Helpful'    },
  { key: 'neighbors', label: 'Neighbors'       },
] as const;

type FilterKey = typeof FILTERS[number]['key'];

interface Member {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  area_name: string | null;
  is_verified: boolean;
  last_active_at: string;
  answers_count: number;
  helpful_count: number;
  listings_count: number;
}

function recentlyActive(iso: string) {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function MemberCard({
  item,
  onPress,
  onChat,
}: {
  item: Member;
  onPress: () => void;
  onChat: () => void;
}) {
  const active = recentlyActive(item.last_active_at);
  return (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.8}>
      <View style={S.avatarWrap}>
        {item.profile_photo_url ? (
          <Image source={{ uri: item.profile_photo_url }} style={S.avatarImg} />
        ) : (
          <Avatar name={item.full_name} size={46} />
        )}
        {active && <View style={S.activeDot} />}
      </View>

      <View style={S.cardInfo}>
        <View style={S.nameRow}>
          <Text style={S.name} numberOfLines={1}>{item.full_name}</Text>
          {item.is_verified && (
            <View style={S.verifiedPill}>
              <Text style={S.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
        {!!item.area_name && (
          <Text style={S.area} numberOfLines={1}>{item.area_name}</Text>
        )}
        <View style={S.statsRow}>
          <Text style={S.stat}>📝 {item.answers_count}</Text>
          <Text style={S.statDot}>·</Text>
          <Text style={S.stat}>👍 {item.helpful_count}</Text>
          <Text style={S.statDot}>·</Text>
          <Text style={S.stat}>🛍 {item.listings_count}</Text>
        </View>
      </View>

      <TouchableOpacity style={S.chatBtn} onPress={onChat} hitSlop={8} activeOpacity={0.8}>
        <Ionicons name="chatbubble-outline" size={16} color={BR} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function CommunityMembersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [search, setSearch]       = useState('');
  const [members, setMembers]     = useState<Member[]>([]);
  const [page, setPage]           = useState(0);
  const [hasMore, setHasMore]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navPadding = useNavPadding();
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(pageNum = 0, isRefresh = false, q = search, f = filter) {
    if (pageNum === 0) isRefresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string, string> = { filter: f, page: String(pageNum) };
      if (q.trim()) params.search = q.trim();
      const { data } = await apiClient.get('/community/members', { params });
      setMembers((prev) => pageNum === 0 ? data.members : [...prev, ...data.members]);
      setPage(pageNum);
      setHasMore(data.has_more);
    } catch {
      // empty state handles it
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { void load(0, false, '', filter); }, [filter]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { void load(0, false, search, filter); }, 380);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  return (
    <View style={[S.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={S.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Community Members</Text>
        <TouchableOpacity hitSlop={8} style={S.iconBtn}>
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sub-header */}
      <View style={S.subHeader}>
        <Text style={S.locationLabel}>JUBILEE HILLS</Text>
        <Text style={S.subTitle}>Meet your neighbors</Text>
      </View>

      {/* Search */}
      <View style={S.searchBar}>
        <Ionicons name="search-outline" size={16} color="#999" />
        <TextInput
          style={S.searchInput}
          placeholder="Search names, road, area..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.pillsContent}
        style={S.pillsRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[S.pill, filter === f.key && S.pillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[S.pillText, filter === f.key && S.pillTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={S.loader} color={BR} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { void load(0, true); }}
              tintColor={BR}
            />
          }
          contentContainerStyle={[S.listContent, { paddingBottom: navPadding }]}
          renderItem={({ item }) => (
            <MemberCard
              item={item}
              onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
              onChat={() => navigation.navigate('UserProfile', { userId: item.id })}
            />
          )}
          ListEmptyComponent={
            <Text style={S.emptyText}>No members found in your area.</Text>
          }
          ListFooterComponent={
            members.length > 0 ? (
              <View style={S.footer}>
                {hasMore ? (
                  <TouchableOpacity
                    style={S.showMoreBtn}
                    onPress={() => { void load(page + 1); }}
                    disabled={loadingMore}
                    activeOpacity={0.8}
                  >
                    {loadingMore
                      ? <ActivityIndicator size="small" color="#444" />
                      : <Text style={S.showMoreText}>Show more neighbors</Text>}
                  </TouchableOpacity>
                ) : (
                  <Text style={S.endText}>You've seen everyone nearby!</Text>
                )}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, height: 46,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: F.title, fontWeight: '700', color: colors.textPrimary,
  },

  subHeader: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  locationLabel: { fontSize: F.label, fontWeight: '800', color: BR, letterSpacing: 1 },
  subTitle: { fontSize: F.sub, fontWeight: '700', color: '#1A1A1A', marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, borderRadius: 100, borderWidth: 1, borderColor: '#E0E0E0',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: F.md, color: colors.textPrimary, padding: 0 },

  pillsRow: { maxHeight: 40 },
  pillsContent: { paddingHorizontal: 16, paddingBottom: 6, gap: 6, alignItems: 'center' },
  pill: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: BR, borderColor: BR },
  pillText: { fontSize: F.caption, fontWeight: '600', color: '#666' },
  pillTextActive: { color: '#fff' },

  loader: { marginTop: 48 },
  listContent: { paddingTop: 6 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 12, marginBottom: 8, marginHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },

  avatarWrap: { marginRight: 10 },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  activeDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#3AA35A', borderWidth: 2, borderColor: '#fff',
  },

  cardInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  name: { fontSize: F.title, fontWeight: '700', color: '#1A1A1A', flexShrink: 1 },
  verifiedPill: {
    backgroundColor: '#E8F5E9', borderRadius: 100,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  verifiedText: { fontSize: F.label + 1, fontWeight: '700', color: '#2E7D32' },

  area: { fontSize: F.body, color: '#888' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  stat: { fontSize: F.caption, color: '#666' },
  statDot: { fontSize: F.caption, color: '#ccc' },

  chatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#F0E0E0',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },

  footer: { paddingVertical: 10, alignItems: 'center' },
  showMoreBtn: {
    height: 44, borderRadius: 100, backgroundColor: '#F0F0F0',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, marginHorizontal: 32,
  },
  showMoreText: { fontSize: F.md, fontWeight: '700', color: '#444' },
  endText: { fontSize: F.caption, color: colors.textSecondary },

  emptyText: {
    textAlign: 'center', marginTop: 48, fontSize: F.md, color: colors.textSecondary,
  },
});
