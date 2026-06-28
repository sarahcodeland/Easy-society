import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { colors } from '../../theme';
import { useNavPadding } from '../../hooks/useNavPadding';

const BRICK = '#8B2E2E';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionRow {
  id: string;
  title: string;
  body: string | null;
  author_name?: string;
  vote_score: string;
  recommendation_count: string;
  answer_count: string;
  is_resolved?: boolean;
  created_at?: string;
  media_urls?: string[];
}

type TabKey = 'recent' | 'trending';
type Props  = NativeStackScreenProps<QaStackParamList, 'QuestionFeed'>;

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(d?: string) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({
  item, isHelpful, onPress, onHelpful,
}: {
  item: QuestionRow;
  isHelpful: boolean;
  onPress: () => void;
  onHelpful: () => void;
}) {
  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const [viewing, setViewing] = useState(false);
  const helpfulCount = Number(item.recommendation_count) + (isHelpful ? 1 : 0);
  const hasImage     = (item.media_urls?.length ?? 0) > 0;
  const imageUrl     = item.media_urls?.[0] ?? '';

  function handleHelpful() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.22, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 90, useNativeDriver: true }),
    ]).start();
    onHelpful();
  }

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [S.card, pressed && { opacity: 0.9 }]}
      >
        {/* Row 1 — user row */}
        <View style={S.metaRow}>
          <Avatar name={item.author_name ?? '?'} size={30} />
          <Text style={S.authorName} numberOfLines={1}>
            {item.author_name ?? 'Community Member'}
          </Text>
          <View style={S.metaDot} />
          <Text style={S.timeText}>{timeAgo(item.created_at)}</Text>
          {item.is_resolved && (
            <View style={S.solvedPill}>
              <Text style={S.solvedText}>✓ Solved</Text>
            </View>
          )}
        </View>

        {/* Row 2 — title */}
        <Text style={S.titleText} numberOfLines={2}>{item.title}</Text>

        {/* Row 3 — image (only if present, no placeholder) */}
        {hasImage && (
          <TouchableOpacity
            style={S.imgWrap}
            activeOpacity={0.92}
            onPress={() => setViewing(true)}
          >
            <Image source={{ uri: imageUrl }} style={S.cardImg} resizeMode="cover" />
          </TouchableOpacity>
        )}

        {/* Row 4 — body preview */}
        {!!item.body && (
          <Text style={S.previewText} numberOfLines={2}>{item.body}</Text>
        )}

        {/* Row 5 — bottom bar */}
        <View style={S.bottomBar}>
          <View style={S.answerRow}>
            <Ionicons name="chatbubble-outline" size={13} color="#AAA" />
            <Text style={S.answerText}>
              {item.answer_count} {Number(item.answer_count) === 1 ? 'answer' : 'answers'}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[S.helpfulBtn, isHelpful && S.helpfulBtnActive]}
              onPress={handleHelpful}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isHelpful ? 'thumbs-up' : 'thumbs-up-outline'}
                size={13}
                color={isHelpful ? '#fff' : '#666'}
              />
              <Text style={[S.helpfulText, isHelpful && S.helpfulTextActive]}>
                Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Pressable>

      {/* Fullscreen image viewer */}
      <Modal
        visible={viewing}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewing(false)}
      >
        <TouchableOpacity
          style={S.viewer}
          activeOpacity={1}
          onPress={() => setViewing(false)}
        >
          <Image source={{ uri: imageUrl }} style={S.viewerImg} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function QuestionFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const navPadding = useNavPadding();
  const [questions, setQuestions]   = useState<QuestionRow[]>([]);
  const [tab, setTab]               = useState<TabKey>('recent');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [helpful, setHelpful]       = useState<Set<string>>(new Set());

  const load = useCallback(async (t: TabKey) => {
    try {
      const { data } = await apiClient.get('/qa/questions', {
        params: { sort: t === 'trending' ? 'top' : 'recent' },
      });
      setQuestions(data.questions ?? []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [load, tab]));

  function toggleHelpful(id: string) {
    setHelpful(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    apiClient.post('/qa/recommendations', { target_id: id, target_type: 'question' }).catch(() => {});
  }

  const filtered = search.trim()
    ? questions.filter(q =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.body?.toLowerCase().includes(search.toLowerCase())
      )
    : questions;

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>

      {/* ── Header: title + toggle ── */}
      <View style={S.header}>
        <Text style={S.headerTitle}>Q&A</Text>
        <View style={S.toggleRow}>
          {(['recent', 'trending'] as TabKey[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[S.toggleBtn, tab === t && S.toggleBtnActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[S.toggleText, tab === t && S.toggleTextActive]}>
                {t === 'recent' ? 'Recent' : 'Trending'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={S.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#BBB" />
        <TextInput
          style={S.searchInput}
          placeholder="Search questions…"
          placeholderTextColor="#C0C0C0"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#CCC" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Feed ── */}
      <FlatList
        data={filtered}
        keyExtractor={q => q.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: navPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(tab);
              setRefreshing(false);
            }}
            tintColor={BRICK}
          />
        }
        renderItem={({ item }) => (
          <QuestionCard
            item={item}
            isHelpful={helpful.has(item.id)}
            onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}
            onHelpful={() => toggleHelpful(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={S.emptyText}>
              {search
                ? 'No questions match your search.'
                : 'No questions yet. Ask the first one!'}
            </Text>
          </View>
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[S.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => navigation.navigate('AskQuestion')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  // ── Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleBtn:   { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100 },
  toggleBtnActive:  { backgroundColor: BRICK },
  toggleText:       { fontSize: 12, fontWeight: '600', color: '#999' },
  toggleTextActive: { color: '#fff' },

  // ── Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A1A', paddingVertical: 0 },

  // ── Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Row 1 — user row
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  authorName: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', flexShrink: 1 },
  metaDot:    { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CCC' },
  timeText:   { fontSize: 11, color: '#999' },
  solvedPill: {
    marginLeft: 4,
    backgroundColor: '#E8F5E9', borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  solvedText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },

  // Row 2 — title
  titleText: {
    fontSize: 16, fontWeight: '800', color: '#1A1A1A',
    lineHeight: 22, marginBottom: 6,
  },

  // Row 3 — image
  imgWrap: {
    width: '100%', height: 180,
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 6,
  },
  cardImg: { width: '100%', height: '100%' },

  // Row 4 — body preview
  previewText: {
    fontSize: 12, color: BRICK, lineHeight: 17,
    marginBottom: 8,
  },

  // Row 5 — bottom bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F2F2F2', paddingTop: 8,
  },
  answerRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  answerText: { fontSize: 11, color: '#888' },
  helpfulBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10,
  },
  helpfulBtnActive: { backgroundColor: BRICK, borderColor: BRICK },
  helpfulText:      { fontSize: 11, fontWeight: '700', color: '#444' },
  helpfulTextActive:{ color: '#fff' },

  // ── Fullscreen viewer
  viewer:    { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '100%' },

  // ── Empty state
  empty:     { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },

  // ── FAB
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: BRICK,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRICK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
});
