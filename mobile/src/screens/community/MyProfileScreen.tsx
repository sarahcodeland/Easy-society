import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme';
import { pickAndUploadImage } from '../../utils/uploadMedia';

const F = { label: 9, meta: 10, caption: 11, body: 12, title: 14, sub: 18, xl: 20 };
const BR = '#8B2E2E';

type Props = NativeStackScreenProps<MoreStackParamList, 'MyProfile'>;
type ProfileTab = 'posts' | 'qa' | 'status' | 'businesses' | 'activity';

interface MyProfile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  is_verified: boolean;
  role: 'resident' | 'moderator' | 'admin';
  created_at: string;
  area_name: string | null;
}

interface MyStats {
  recommendations: number;
  questions: number;
  answers: number;
  listings: number;
  businesses: number;
}

interface Listing {
  id: string;
  title: string;
  price: number | null;
  category: string;
  created_at: string;
  cover_photo: string | null;
}

interface Question {
  id: string;
  title: string;
  created_at: string;
  answers_count: number;
}

interface Answer {
  id: string;
  body: string;
  created_at: string;
  question_title: string;
  helpful_count: number;
}

interface Status {
  id: string;
  text_content: string | null;
  content_url: string | null;
  created_at: string;
  expires_at: string;
}

interface Business {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
  logo_url: string | null;
}

interface ActivityItem {
  id: string;
  type: 'listing' | 'question' | 'answer' | 'status' | 'business' | 'recommendation';
  title: string;
  subtitle?: string;
  created_at: string;
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return 'Today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${Math.floor(d / 365)}y ago`;
}

function memberSince(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

// ── Tab helpers ───────────────────────────────────────────────────────────────

function Empty({ text }: { text: string }) {
  return <Text style={P.emptyText}>{text}</Text>;
}

function PostsTab({ listings }: { listings: Listing[] }) {
  if (!listings.length) return <Empty text="No listings yet." />;
  const rows: Listing[][] = [];
  for (let i = 0; i < listings.length; i += 2) rows.push(listings.slice(i, i + 2));
  return (
    <View style={P.gridWrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={P.gridRow}>
          {row.map((item) => (
            <View key={item.id} style={P.gridCard}>
              {item.cover_photo ? (
                <Image source={{ uri: item.cover_photo }} style={P.gridImg} resizeMode="cover" />
              ) : (
                <View style={[P.gridImg, P.gridEmpty]}>
                  <Ionicons name="image-outline" size={18} color="#ccc" />
                </View>
              )}
              <Text style={P.gridTitle} numberOfLines={1}>{item.title}</Text>
              {item.price != null && (
                <Text style={P.gridPrice}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
              )}
              <Text style={P.gridAge}>{daysAgo(item.created_at)}</Text>
            </View>
          ))}
          {row.length === 1 && <View style={P.gridCard} />}
        </View>
      ))}
    </View>
  );
}

function QaTab({ questions, answers }: { questions: Question[]; answers: Answer[] }) {
  if (!questions.length && !answers.length) return <Empty text="No Q&A activity yet." />;
  return (
    <View style={P.listWrap}>
      {questions.length > 0 && (
        <>
          <Text style={P.sectionLabel}>ASKED ({questions.length})</Text>
          {questions.map((q) => (
            <View key={q.id} style={P.listCard}>
              <Text style={P.listTitle} numberOfLines={2}>{q.title}</Text>
              <View style={P.listFoot}>
                <Text style={P.listMeta}>{q.answers_count} answers</Text>
                <Text style={P.listAge}>{daysAgo(q.created_at)}</Text>
              </View>
            </View>
          ))}
        </>
      )}
      {answers.length > 0 && (
        <>
          <Text style={[P.sectionLabel, answers.length > 0 && questions.length > 0 && { marginTop: 8 }]}>
            ANSWERED ({answers.length})
          </Text>
          {answers.map((a) => (
            <View key={a.id} style={P.listCard}>
              <Text style={P.listSub} numberOfLines={1}>{a.question_title}</Text>
              <Text style={P.listBody} numberOfLines={2}>{a.body}</Text>
              <View style={P.listFoot}>
                <Text style={P.listMeta}>👍 {a.helpful_count}</Text>
                <Text style={P.listAge}>{daysAgo(a.created_at)}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function StatusTab({ statuses }: { statuses: Status[] }) {
  if (!statuses.length) return <Empty text="No statuses yet." />;
  const now = Date.now();
  const rows: Status[][] = [];
  for (let i = 0; i < statuses.length; i += 2) rows.push(statuses.slice(i, i + 2));
  return (
    <View style={P.gridWrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={P.gridRow}>
          {row.map((s) => {
            const active = new Date(s.expires_at).getTime() > now;
            return (
              <View key={s.id} style={P.gridCard}>
                {s.content_url ? (
                  <Image source={{ uri: s.content_url }} style={P.gridImg} resizeMode="cover" />
                ) : (
                  <View style={[P.gridImg, P.statusBg]}>
                    <Text style={P.statusTxt} numberOfLines={3}>{s.text_content}</Text>
                  </View>
                )}
                <View style={P.statusFootRow}>
                  <View style={[P.statusPill, active ? P.pillActive : P.pillExpired]}>
                    <Text style={[P.pillTxt, active ? P.pillActiveTxt : P.pillExpiredTxt]}>
                      {active ? 'Active' : 'Expired'}
                    </Text>
                  </View>
                  <Text style={P.gridAge}>{daysAgo(s.created_at)}</Text>
                </View>
              </View>
            );
          })}
          {row.length === 1 && <View style={P.gridCard} />}
        </View>
      ))}
    </View>
  );
}

function BusinessesTab({ businesses }: { businesses: Business[] }) {
  if (!businesses.length) return <Empty text="No businesses created yet." />;
  return (
    <View style={P.listWrap}>
      {businesses.map((b) => (
        <View key={b.id} style={[P.listCard, P.bizRow]}>
          {b.logo_url ? (
            <Image source={{ uri: b.logo_url }} style={P.bizLogo} />
          ) : (
            <View style={P.bizLogoEmpty}>
              <Ionicons name="briefcase-outline" size={15} color={BR} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={P.listTitle} numberOfLines={1}>{b.name}</Text>
            {b.category && <Text style={P.listMeta}>{b.category}</Text>}
          </View>
          <Text style={P.listAge}>{daysAgo(b.created_at)}</Text>
        </View>
      ))}
    </View>
  );
}

const ACT_ICON: Record<ActivityItem['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  listing: 'storefront-outline',
  question: 'help-circle-outline',
  answer: 'chatbubble-ellipses-outline',
  status: 'sunny-outline',
  business: 'briefcase-outline',
  recommendation: 'star-outline',
};

const ACT_LABEL: Record<ActivityItem['type'], string> = {
  listing: 'Posted listing',
  question: 'Asked',
  answer: 'Answered',
  status: 'Posted status',
  business: 'Created business',
  recommendation: 'Received rec',
};

function ActivityTab({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <Empty text="No activity yet." />;
  return (
    <View style={P.listWrap}>
      {items.map((item) => (
        <View key={`${item.type}-${item.id}`} style={[P.listCard, P.actRow]}>
          <View style={P.actIcon}>
            <Ionicons name={ACT_ICON[item.type]} size={14} color={BR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={P.actLabel}>{ACT_LABEL[item.type]}</Text>
            <Text style={P.listTitle} numberOfLines={1}>{item.title}</Text>
            {item.subtitle && <Text style={P.listMeta} numberOfLines={1}>{item.subtitle}</Text>}
          </View>
          <Text style={P.listAge}>{daysAgo(item.created_at)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const STAT_MAP: { key: keyof MyStats; label: string; tab: ProfileTab }[] = [
  { key: 'recommendations', label: 'Recs', tab: 'activity' },
  { key: 'questions',       label: 'Qs',   tab: 'qa' },
  { key: 'answers',         label: 'Ans',  tab: 'qa' },
  { key: 'listings',        label: 'Posts', tab: 'posts' },
  { key: 'businesses',      label: 'Biz',  tab: 'businesses' },
];

const TAB_LIST: { key: ProfileTab; label: string }[] = [
  { key: 'posts',      label: 'Posts' },
  { key: 'qa',         label: 'Q&A' },
  { key: 'status',     label: 'Status' },
  { key: 'businesses', label: 'Biz' },
  { key: 'activity',   label: 'Activity' },
];

export default function MyProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [tab, setTab]               = useState<ProfileTab>('posts');
  const [profile, setProfile]       = useState<MyProfile | null>(null);
  const [stats, setStats]           = useState<MyStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [listings,  setListings]  = useState<Listing[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers,   setAnswers]   = useState<Answer[]>([]);
  const [statuses,  setStatuses]  = useState<Status[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activity,  setActivity]  = useState<ActivityItem[]>([]);

  const loadedTabs = useRef<Set<ProfileTab>>(new Set());

  const fetchProfile = useCallback(async () => {
    try {
      const [{ data: me }, { data: st }] = await Promise.all([
        apiClient.get('/users/me'),
        apiClient.get('/users/me/stats'),
      ]);
      setProfile(me);
      setStats(st);
    } catch {}
  }, []);

  const fetchTab = useCallback(async (t: ProfileTab) => {
    setTabLoading(true);
    try {
      switch (t) {
        case 'posts': {
          const { data } = await apiClient.get('/users/me/listings');
          setListings(data);
          break;
        }
        case 'qa': {
          const [{ data: qs }, { data: as_ }] = await Promise.all([
            apiClient.get('/users/me/questions'),
            apiClient.get('/users/me/answers'),
          ]);
          setQuestions(qs);
          setAnswers(as_);
          break;
        }
        case 'status': {
          const { data } = await apiClient.get('/users/me/statuses');
          setStatuses(data);
          break;
        }
        case 'businesses': {
          const { data } = await apiClient.get('/users/me/businesses');
          setBusinesses(data);
          break;
        }
        case 'activity': {
          const { data } = await apiClient.get('/users/me/activity');
          setActivity(data);
          break;
        }
      }
    } catch {} finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchProfile();
      setLoadingProfile(false);
    })();
    loadedTabs.current.add('posts');
    fetchTab('posts');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTab = (t: ProfileTab) => {
    setTab(t);
    if (!loadedTabs.current.has(t)) {
      loadedTabs.current.add(t);
      fetchTab(t);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadedTabs.current.delete(tab);
    await Promise.all([fetchProfile(), fetchTab(tab)]);
    loadedTabs.current.add(tab);
    setRefreshing(false);
  }, [tab, fetchProfile, fetchTab]);

  const handleAvatarPress = async () => {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const url = await pickAndUploadImage('profile');
      if (url) {
        await apiClient.patch('/users/me', { profile_photo_url: url });
        setProfile((p) => p ? { ...p, profile_photo_url: url } : p);
        if (user) updateUser({ ...user, profile_photo_url: url });
      }
    } catch {} finally {
      setUploadingPhoto(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[P.flex, P.centered]}>
        <ActivityIndicator color={BR} />
      </View>
    );
  }

  const displayName = profile?.full_name ?? user?.name ?? 'My Profile';
  const photoUrl    = profile?.profile_photo_url ?? user?.profile_photo_url ?? null;

  return (
    <View style={P.flex}>
      {/* Fixed top bar */}
      <View style={P.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={P.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={P.topBarTitle}>My Profile</Text>
        <View style={P.iconBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 78 + 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BR]} tintColor={BR} />
        }
      >
        {/* Hero */}
        <View style={P.hero}>
          <TouchableOpacity onPress={handleAvatarPress} style={P.avatarRing} activeOpacity={0.82}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={P.avatarImg} />
            ) : (
              <Avatar name={displayName} size={72} />
            )}
            <View style={P.cameraOverlay}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={11} color="#fff" />}
            </View>
          </TouchableOpacity>

          <Text style={P.heroName}>{displayName}</Text>

          {profile?.role && profile.role !== 'resident' && (
            <View style={P.rolePill}>
              <Text style={P.rolePillText}>
                {profile.role === 'admin' ? '⚙ Admin' : '🛡 Mod'}
              </Text>
            </View>
          )}

          <View style={P.metaRow}>
            {profile?.area_name && (
              <>
                <Ionicons name="location-outline" size={9} color="rgba(255,255,255,0.7)" />
                <Text style={P.metaTxt}>{profile.area_name}</Text>
                <Text style={P.dot}>·</Text>
              </>
            )}
            {profile?.is_verified && (
              <>
                <Ionicons name="checkmark-circle" size={9} color="rgba(255,255,255,0.9)" />
                <Text style={P.metaTxt}>Verified</Text>
                <Text style={P.dot}>·</Text>
              </>
            )}
            {profile && <Text style={P.metaTxt}>Since {memberSince(profile.created_at)}</Text>}
          </View>

          <TouchableOpacity style={P.editBtn} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={11} color={BR} />
            <Text style={P.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats card */}
        <View style={P.statsCard}>
          {STAT_MAP.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <View style={P.statDiv} />}
              <TouchableOpacity style={P.statCol} onPress={() => selectTab(s.tab)} activeOpacity={0.7}>
                <Text style={P.statNum}>{stats?.[s.key] ?? 0}</Text>
                <Text style={P.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Tab bar */}
        <View style={P.tabBar}>
          {TAB_LIST.map((t) => (
            <TouchableOpacity key={t.key} style={P.tab} onPress={() => selectTab(t.key)} activeOpacity={0.8}>
              <Text style={[P.tabTxt, tab === t.key && P.tabTxtActive]}>{t.label}</Text>
              {tab === t.key && <View style={P.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {tabLoading ? (
          <ActivityIndicator color={BR} style={{ marginTop: 24 }} />
        ) : (
          <>
            {tab === 'posts'      && <PostsTab      listings={listings} />}
            {tab === 'qa'         && <QaTab         questions={questions} answers={answers} />}
            {tab === 'status'     && <StatusTab     statuses={statuses} />}
            {tab === 'businesses' && <BusinessesTab businesses={businesses} />}
            {tab === 'activity'   && <ActivityTab   items={activity} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const P = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BR, paddingHorizontal: 10, paddingBottom: 10,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: F.title, fontWeight: '700', color: '#fff' },

  hero: {
    backgroundColor: BR,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 26,
    alignItems: 'center',
  },
  avatarRing: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden', marginBottom: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 74, height: 74 },
  cameraOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 20, backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: F.xl, fontWeight: '700', color: '#fff', marginBottom: 3 },
  rolePill: {
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 5,
  },
  rolePillText: { fontSize: F.caption, fontWeight: '700', color: '#fff' },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginBottom: 10, flexWrap: 'wrap', justifyContent: 'center',
  },
  metaTxt: { fontSize: F.meta, color: 'rgba(255,255,255,0.8)' },
  dot: { fontSize: F.meta, color: 'rgba(255,255,255,0.45)' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  editBtnText: { fontSize: F.caption, fontWeight: '700', color: BR },

  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 12,
    marginTop: -16, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  statCol: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  statNum: { fontSize: F.sub, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: F.label, color: '#888', marginTop: 1 },
  statDiv: { width: 1, height: 24, backgroundColor: '#eee' },

  tabBar: {
    flexDirection: 'row', marginTop: 12,
    marginHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7 },
  tabTxt: { fontSize: F.caption, fontWeight: '700', color: '#999' },
  tabTxtActive: { color: BR },
  tabUnderline: {
    position: 'absolute', bottom: -1, height: 2,
    width: '70%', backgroundColor: BR, borderRadius: 1,
  },

  // Grid — posts + status
  gridWrap: { padding: 10 },
  gridRow: { flexDirection: 'row', gap: 7, marginBottom: 7 },
  gridCard: { flex: 1 },
  gridImg: { width: '100%', height: 80, borderRadius: 8, marginBottom: 3 },
  gridEmpty: { backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  gridTitle: { fontSize: F.body, fontWeight: '700', color: '#1A1A1A' },
  gridPrice: { fontSize: F.body, fontWeight: '700', color: BR, marginTop: 1 },
  gridAge: { fontSize: F.label, color: '#999', marginTop: 1 },

  // Status grid extras
  statusBg: { backgroundColor: BR, padding: 7, justifyContent: 'center' },
  statusTxt: { fontSize: F.caption, color: '#fff', fontWeight: '500' },
  statusFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  statusPill: { borderRadius: 100, paddingHorizontal: 5, paddingVertical: 1 },
  pillActive: { backgroundColor: '#EEF1E9' },
  pillExpired: { backgroundColor: '#F0F0F0' },
  pillTxt: { fontSize: F.label, fontWeight: '700' },
  pillActiveTxt: { color: '#7A846A' },
  pillExpiredTxt: { color: '#999' },

  // List — qa + businesses + activity
  listWrap: { padding: 10, gap: 6 },
  sectionLabel: {
    fontSize: F.label, fontWeight: '800', color: '#999',
    letterSpacing: 0.8, marginBottom: 4, paddingHorizontal: 2,
  },
  listCard: {
    backgroundColor: '#fff', borderRadius: 8, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  listTitle: { fontSize: F.body, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  listSub: { fontSize: F.caption, color: '#888', marginBottom: 3 },
  listBody: { fontSize: F.body, color: '#666', lineHeight: 16, marginBottom: 4 },
  listFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listMeta: { fontSize: F.caption, color: '#888' },
  listAge: { fontSize: F.label, color: '#999' },

  // Business
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bizLogo: { width: 34, height: 34, borderRadius: 7 },
  bizLogoEmpty: {
    width: 34, height: 34, borderRadius: 7,
    backgroundColor: '#FBF2EB', alignItems: 'center', justifyContent: 'center',
  },

  // Activity
  actRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  actIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FBF2EB', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  actLabel: { fontSize: F.label, color: '#999', fontWeight: '600', marginBottom: 1 },

  emptyText: { textAlign: 'center', padding: 32, fontSize: F.body, color: colors.textSecondary },
});
