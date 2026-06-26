import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
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
import { VisibilityLevel } from '@easysociety/shared';
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';
import Avatar from '../../components/Avatar';
import VisitorTag from '../../components/VisitorTag';
import { colors, spacing } from '../../theme';

interface QuestionRow {
  id: string;
  title: string;
  body: string | null;
  author_name?: string;
  vote_score: string;
  recommendation_count: string;
  answer_count: string;
  is_visitor?: boolean;
  visitor_location_label?: string | null;
  created_at?: string;
  media_urls?: string[];
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Q&A Card ────────────────────────────────────────────────────────────────

interface CardProps {
  item: QuestionRow;
  isHelpful: boolean;
  onPress: () => void;
  onHelpful: () => void;
}

function QuestionCard({ item, isHelpful, onPress, onHelpful }: CardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function animateHelpful() {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onHelpful();
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Header — avatar + meta + visitor badge */}
      <View style={styles.cardHeader}>
        <Avatar name={item.author_name ?? '?'} size={40} />
        <View style={styles.metaBlock}>
          <Text style={styles.authorName}>{item.author_name ?? 'Community Member'}</Text>
          {item.created_at ? (
            <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
          ) : null}
        </View>
        {item.is_visitor && (
          <View style={styles.visitorBadge}>
            <Text style={styles.visitorBadgeText}>VISITOR</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <Text style={styles.questionTitle} numberOfLines={2}>{item.title}</Text>
      {item.body ? (
        <Text style={styles.questionSnippet} numberOfLines={3}>{item.body}</Text>
      ) : null}
      {item.is_visitor && item.visitor_location_label ? (
        <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
      ) : null}

      {/* Media thumbnails */}
      {item.media_urls && item.media_urls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaRow}
          contentContainerStyle={styles.mediaRowContent}
        >
          {item.media_urls.map((url, i) => {
            const isVideo = /\.(mp4|mov|avi|webm|m4v)$/i.test(url);
            return (
              <View key={i} style={styles.mediaTile}>
                {isVideo ? (
                  <View style={styles.videoTile}>
                    <Ionicons name="videocam" size={20} color={colors.textSecondary} />
                  </View>
                ) : (
                  <Image source={{ uri: url }} style={styles.mediaThumb} resizeMode="cover" />
                )}
                {isVideo && (
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={8} color="#fff" />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Footer toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.answerCountRow}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
          <Text style={styles.answerCountText}>
            {item.answer_count} {Number(item.answer_count) === 1 ? 'answer' : 'answers'}
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.helpfulPill, isHelpful && styles.helpfulPillActive]}
            onPress={animateHelpful}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isHelpful ? 'thumbs-up' : 'thumbs-up-outline'}
              size={13}
              color={isHelpful ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.helpfulText, isHelpful && styles.helpfulTextActive]}>
              Helpful {Number(item.recommendation_count) > 0 ? `(${item.recommendation_count})` : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ── Hero CTA ─────────────────────────────────────────────────────────────────

function HeroCTA({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.heroCta}>
      <Text style={styles.heroTitle}>Got a question for the neighbors?</Text>
      <Text style={styles.heroSubtitle}>Join the conversation and get answers from your community.</Text>
      <TouchableOpacity style={styles.heroBtn} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="add-circle-outline" size={16} color="#fff" />
        <Text style={styles.heroBtnText}>Ask a Question</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<QaStackParamList, 'QuestionFeed'>;

export default function QuestionFeedScreen({ navigation }: Props) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [helpful, setHelpful] = useState<Set<string>>(new Set());

  const load = useCallback(async (level: VisibilityLevel) => {
    const { data } = await apiClient.get('/qa/questions', { params: { visibility: level } });
    setQuestions(data.questions);
  }, []);

  useFocusEffect(useCallback(() => {
    load(visibility);
  }, [load, visibility]));

  function toggleHelpful(id: string) {
    setHelpful((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = search.trim()
    ? questions.filter(
        (q) =>
          q.title.toLowerCase().includes(search.toLowerCase()) ||
          q.body?.toLowerCase().includes(search.toLowerCase()),
      )
    : questions;

  return (
    <View style={styles.flex}>
      {/* Sticky search bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions…"
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(visibility);
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <VisibilityFilterBar value={visibility} onChange={(l) => { setVisibility(l); load(l); }} />
            <View style={styles.heroPad}>
              <HeroCTA onPress={() => navigation.navigate('AskQuestion')} />
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>
              {search ? 'No questions match your search.' : 'No questions yet. Be the first to ask!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <QuestionCard
            item={item}
            isHelpful={helpful.has(item.id)}
            onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}
            onHelpful={() => toggleHelpful(item.id)}
          />
        )}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  /* Search */
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  /* Hero CTA */
  heroPad: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  heroCta: {
    backgroundColor: '#FBF2EB',
    borderRadius: 24,
    padding: spacing.lg,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  heroBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Feed */
  listContent: { paddingBottom: 32 },
  separator: { height: spacing.md },

  /* Card */
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#FBF2EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  metaBlock: { flex: 1 },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  visitorBadge: {
    backgroundColor: '#f1f1f1',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visitorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  /* Content */
  questionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 6,
  },
  questionSnippet: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },

  /* Media strip in card */
  mediaRow: { marginBottom: spacing.sm },
  mediaRowContent: { gap: spacing.sm },
  mediaTile: {
    width: 80,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaThumb: { width: '100%', height: '100%' },
  videoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  playBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  answerCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  answerCountText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  helpfulPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  helpfulPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#FBF2EB',
  },
  helpfulText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  helpfulTextActive: {
    color: colors.primary,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
