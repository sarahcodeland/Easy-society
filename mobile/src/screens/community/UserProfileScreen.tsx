import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import Avatar from '../../components/Avatar';
import { colors } from '../../theme';

// ── Font sizes — change here to affect the whole screen ─────────────────────
const F = { label: 9, meta: 10, caption: 11, body: 12, md: 13, title: 14, sub: 18, xl: 20 };

const BR = '#8B2E2E';

type Props = NativeStackScreenProps<MoreStackParamList, 'UserProfile'>;
type Tab = 'listings' | 'answers' | 'about';

interface UserProfile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  is_verified: boolean;
  created_at: string;
  area_name: string | null;
  answers_count: number;
  helpful_count: number;
  listings_count: number;
}

interface Listing {
  id: string;
  title: string;
  price: number | null;
  category: string;
  created_at: string;
  cover_photo: string | null;
}

interface Answer {
  id: string;
  body: string;
  created_at: string;
  question_title: string;
  question_id: string;
  helpful_count: number;
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

function memberSince(iso: string): string {
  return `Member since ${new Date(iso).toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ListingsTab({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return <Text style={P.emptyText}>No listings yet.</Text>;
  }
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
                <View style={[P.gridImg, P.gridImgEmpty]}>
                  <Ionicons name="image-outline" size={22} color="#ccc" />
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

function AnswersTab({ answers }: { answers: Answer[] }) {
  if (answers.length === 0) {
    return <Text style={P.emptyText}>No answers yet.</Text>;
  }
  return (
    <View style={P.answersWrap}>
      {answers.map((a) => (
        <View key={a.id} style={P.answerCard}>
          <Text style={P.answerQ} numberOfLines={2}>{a.question_title}</Text>
          <Text style={P.answerBody} numberOfLines={2}>{a.body}</Text>
          <View style={P.answerFoot}>
            <Text style={P.answerHelpful}>👍 {a.helpful_count}</Text>
            <Text style={P.answerAge}>{daysAgo(a.created_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function AboutTab({ profile, skills }: { profile: UserProfile; skills: string[] }) {
  const rows = [
    { icon: '📍', label: 'Area',          value: profile.area_name ?? '—' },
    { icon: '📅', label: 'Member since',  value: memberSince(profile.created_at) },
    { icon: '🏘',  label: 'Locality',     value: profile.area_name ?? '—' },
    ...(skills.length > 0
      ? [{ icon: '🔧', label: 'Skills', value: skills.join(', ') }]
      : []),
  ];
  return (
    <View style={P.aboutWrap}>
      {rows.map((r) => (
        <View key={r.label} style={P.aboutRow}>
          <Text style={P.aboutIcon}>{r.icon}</Text>
          <Text style={P.aboutLabel}>{r.label}</Text>
          <Text style={P.aboutValue} numberOfLines={2}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();

  const [tab, setTab]           = useState<Tab>('listings');
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [answers, setAnswers]   = useState<Answer[]>([]);
  const [skills, setSkills]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get(`/users/${userId}/profile`);
        setProfile(data.user);
        setListings(data.listings);
        setAnswers(data.answers);
        setSkills(data.skills);
      } catch {
        // empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <View style={[P.flex, P.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={BR} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[P.flex, P.centered, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={P.backFallback}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={P.errorText}>Member not found.</Text>
      </View>
    );
  }

  return (
    <View style={P.flex}>
      {/* Fixed top bar — brick red continues into hero below */}
      <View style={[P.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={P.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={P.topBarTitle}>Profile</Text>
        <TouchableOpacity hitSlop={8} style={P.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 78 + 60 }}
      >
        {/* Hero */}
        <View style={P.hero}>
          <View style={P.avatarRing}>
            {profile.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={P.avatarImg} />
            ) : (
              <Avatar name={profile.full_name} size={72} />
            )}
          </View>
          <Text style={P.heroName}>{profile.full_name}</Text>
          {profile.is_verified && (
            <View style={P.verifiedPill}>
              <Text style={P.verifiedText}>✓ Verified Resident</Text>
            </View>
          )}
          <Text style={P.heroMeta}>
            {profile.area_name ? `${profile.area_name}  ·  ` : ''}{memberSince(profile.created_at)}
          </Text>
        </View>

        {/* Stats card — floats up over hero with negative margin */}
        <View style={P.statsCard}>
          <View style={P.statCol}>
            <Text style={P.statNum}>{profile.answers_count}</Text>
            <Text style={P.statLabel}>Answers</Text>
          </View>
          <View style={P.statDivider} />
          <View style={P.statCol}>
            <Text style={P.statNum}>{profile.helpful_count}</Text>
            <Text style={P.statLabel}>Helpful</Text>
          </View>
          <View style={P.statDivider} />
          <View style={P.statCol}>
            <Text style={P.statNum}>{profile.listings_count}</Text>
            <Text style={P.statLabel}>Listings</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={P.tabBar}>
          {(['listings', 'answers', 'about'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={P.tab}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[P.tabText, tab === t && P.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
              {tab === t && <View style={P.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {tab === 'listings' && <ListingsTab listings={listings} />}
        {tab === 'answers'  && <AnswersTab  answers={answers}   />}
        {tab === 'about'    && <AboutTab    profile={profile} skills={skills} />}
      </ScrollView>

      {/* Fixed bottom CTA — sits above the floating nav bar (62px height + 16px gap + insets) */}
      <View style={[P.bottomBar, { bottom: insets.bottom + 78 }]}>
        <TouchableOpacity
          style={P.ctaBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CommunityMembers')}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
          <Text style={P.ctaText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const P = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  backFallback: { position: 'absolute', top: 16, left: 16 },
  errorText: { fontSize: F.md, color: colors.textSecondary, marginTop: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BR, paddingHorizontal: 10, paddingBottom: 10,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: {
    flex: 1, textAlign: 'center',
    fontSize: F.title, fontWeight: '700', color: '#fff',
  },

  hero: {
    backgroundColor: BR,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32,
    alignItems: 'center',
  },
  avatarRing: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 3, borderColor: '#fff',
    overflow: 'hidden', marginBottom: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 72, height: 72 },
  heroName: { fontSize: F.xl, fontWeight: '700', color: '#fff', textAlign: 'center' },
  verifiedPill: {
    marginTop: 5, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  verifiedText: { fontSize: F.meta, fontWeight: '700', color: '#fff' },
  heroMeta: {
    marginTop: 5, fontSize: F.body,
    color: 'rgba(255,255,255,0.75)', textAlign: 'center',
  },

  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14,
    marginTop: -20, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: F.sub, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: F.caption, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#eee' },

  tabBar: {
    flexDirection: 'row', marginTop: 14,
    marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { fontSize: F.md, fontWeight: '700', color: '#999' },
  tabTextActive: { color: BR },
  tabUnderline: {
    position: 'absolute', bottom: -1, height: 2,
    width: '60%', backgroundColor: BR, borderRadius: 1,
  },

  // Listings grid
  gridWrap: { padding: 10 },
  gridRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  gridCard: { flex: 1 },
  gridImg: { width: '100%', height: 90, borderRadius: 10, marginBottom: 4 },
  gridImgEmpty: {
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
  },
  gridTitle: { fontSize: F.body, fontWeight: '700', color: '#1A1A1A' },
  gridPrice: { fontSize: F.body, fontWeight: '700', color: BR, marginTop: 1 },
  gridAge: { fontSize: F.meta, color: '#999', marginTop: 1 },

  // Answers list
  answersWrap: { padding: 10, gap: 8 },
  answerCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  answerQ: { fontSize: F.md, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  answerBody: { fontSize: F.body, color: '#666', lineHeight: 17, marginBottom: 5 },
  answerFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerHelpful: { fontSize: F.caption, color: BR, fontWeight: '600' },
  answerAge: { fontSize: F.meta, color: '#999' },

  // About
  aboutWrap: { padding: 14, gap: 2 },
  aboutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  aboutIcon: { fontSize: F.title, width: 22, textAlign: 'center' },
  aboutLabel: { fontSize: F.md, color: '#888', width: 90 },
  aboutValue: { flex: 1, fontSize: F.md, color: '#1A1A1A', fontWeight: '500' },

  // Bottom CTA
  bottomBar: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: BR, height: 44, borderRadius: 12,
  },
  ctaText: { fontSize: F.title, fontWeight: '700', color: '#fff' },

  emptyText: {
    textAlign: 'center', padding: 32, fontSize: F.md, color: colors.textSecondary,
  },
});
