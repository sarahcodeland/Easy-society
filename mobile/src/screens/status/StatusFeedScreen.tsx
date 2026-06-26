import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { colors, spacing } from '../../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusRow {
  id: string;
  user_id: string;
  media_type: 'text' | 'photo' | 'video';
  content_url: string | null;
  text_content: string | null;
  author_name?: string;
  author_photo?: string | null;
  location_label?: string | null;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  created_at?: string;
  expires_at: string;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Story bubble ──────────────────────────────────────────────────────────────

function StoryBubble({ item, onPress }: { item: StatusRow; onPress: () => void }) {
  return (
    <TouchableOpacity style={S.storyTile} onPress={onPress} activeOpacity={0.82}>
      <View style={S.storyRing}>
        <View style={S.storyRingInner}>
          {item.media_type === 'photo' && item.content_url ? (
            <Image source={{ uri: item.content_url }} style={S.storyImage} />
          ) : item.author_photo ? (
            <Image source={{ uri: item.author_photo }} style={S.storyImage} />
          ) : (
            <Avatar name={item.author_name ?? '?'} size={54} />
          )}
        </View>
      </View>
      <Text style={S.storyLabel} numberOfLines={1}>{item.author_name}</Text>
    </TouchableOpacity>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────

function StatusCard({ item, onView }: { item: StatusRow; onView: (item: StatusRow) => void }) {
  const likeAnim = useRef(new Animated.Value(1)).current;
  const [liked, setLiked] = useState(false);

  const hasMedia = (item.media_type === 'photo' || item.media_type === 'video') && item.content_url;

  function handleLike() {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.45, duration: 110, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setLiked((v) => !v);
    apiClient.post(`/statuses/${item.id}/like`).catch(() => {});
  }

  async function handleShare() {
    await Share.share({ message: item.text_content ?? 'Check this post on Easy Society!' });
  }

  return (
    <View style={S.card}>
      {/* ── Header ── */}
      <View style={S.cardHeader}>
        {item.author_photo ? (
          <Image source={{ uri: item.author_photo }} style={S.authorPhoto} />
        ) : (
          <Avatar name={item.author_name ?? '?'} size={42} />
        )}

        <View style={S.authorBlock}>
          <Text style={S.authorName}>{item.author_name ?? 'Community Member'}</Text>
          <Text style={S.authorRole}>COMMUNITY MEMBER</Text>
          <Text style={S.authorTime}>{timeAgo(item.created_at)}</Text>
        </View>

        {item.location_label ? (
          <View style={S.locationTag}>
            <View style={S.locationDot} />
            <Text style={S.locationText} numberOfLines={1}>{item.location_label}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Media ── */}
      {hasMedia ? (
        <TouchableOpacity activeOpacity={0.92} onPress={() => onView(item)}>
          <Image
            source={{ uri: item.content_url! }}
            style={S.cardImage}
            resizeMode="cover"
          />
          {item.media_type === 'video' && (
            <View style={S.playOverlay}>
              <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.88)" />
            </View>
          )}
        </TouchableOpacity>
      ) : null}

      {/* ── Text body ── */}
      {item.text_content ? (
        <Text style={[S.bodyText, !hasMedia && S.bodyTextOnly]}>
          {item.text_content}
        </Text>
      ) : null}

      {/* ── Footer ── */}
      <View style={S.cardFooter}>
        <View style={S.reactions}>
          {/* Like */}
          <TouchableOpacity style={S.reactionBtn} onPress={handleLike} activeOpacity={0.75}>
            <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? colors.primary : colors.textSecondary}
              />
            </Animated.View>
            <Text style={S.reactionCount}>{(item.like_count ?? 0) + (liked ? 1 : 0)}</Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={S.reactionBtn} activeOpacity={0.75}>
            <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
            <Text style={S.reactionCount}>{item.comment_count ?? 0}</Text>
          </TouchableOpacity>

          {/* Forward */}
          <TouchableOpacity style={S.reactionBtn} activeOpacity={0.75}>
            <Ionicons name="arrow-redo-outline" size={19} color={colors.textSecondary} />
            <Text style={S.reactionCount}>{item.share_count ?? 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Share link */}
        <TouchableOpacity onPress={handleShare} style={S.shareBtn} activeOpacity={0.75}>
          <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<StatusStackParamList, 'StatusFeed'>;

export default function StatusFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [viewing, setViewing] = useState<StatusRow | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/statuses/feed');
    setStatuses(data.statuses ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openStory(status: StatusRow) {
    setViewing(status);
    apiClient.post(`/statuses/${status.id}/view`).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={statuses}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}

        ListHeaderComponent={
          <View>
            {/* ── Story tray — scrolls with the page, not sticky (~1/4 height) ── */}
            <FlatList
              horizontal
              data={statuses}
              keyExtractor={(item) => `story-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.storyTray}
              ListHeaderComponent={
                <TouchableOpacity
                  style={S.storyTile}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('CreateStatus')}
                >
                  <View style={S.storyAddCircle}>
                    <Ionicons name="add" size={30} color={colors.primary} />
                  </View>
                  <Text style={S.storyLabel}>Your Status</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <StoryBubble item={item} onPress={() => openStory(item)} />
              )}
            />

            {/* ── Feed section header ── */}
            <Text style={S.feedLabel}>Community Posts</Text>
          </View>
        }

        renderItem={({ item }) => (
          <StatusCard item={item} onView={openStory} />
        )}

        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="newspaper-outline" size={40} color={colors.border} />
            <Text style={S.emptyText}>No posts yet. Be the first to share!</Text>
          </View>
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[S.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => navigation.navigate('CreateStatus')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* ── Story / media viewer ── */}
      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        <TouchableOpacity style={S.viewerBg} onPress={() => setViewing(null)} activeOpacity={1}>
          {viewing?.media_type === 'photo' && viewing.content_url ? (
            <Image source={{ uri: viewing.content_url }} style={S.viewerImage} resizeMode="contain" />
          ) : (
            <View style={S.viewerTextCard}>
              <Text style={S.viewerText}>{viewing?.text_content}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Story tray
  storyTray: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  storyTile: { width: 68, alignItems: 'center' },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 3,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyImage: { width: '100%', height: '100%' },
  storyAddCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  storyLabel: {
    fontSize: 10.5,
    marginTop: 5,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Feed label
  feedLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  // Post card
  card: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#3D1F17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  authorPhoto: { width: 42, height: 42, borderRadius: 21 },
  authorBlock: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  authorRole: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginTop: 1,
  },
  authorTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 110,
  },
  locationDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  locationText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },

  // Media
  cardImage: { width: '100%', height: 230 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // Text body
  bodyText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  bodyTextOnly: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  reactions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactionCount: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  shareBtn: { padding: 4 },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },

  // Viewer modal
  viewerBg: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '100%' },
  viewerTextCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    margin: 32,
    padding: 32,
  },
  viewerText: { color: '#fff', fontSize: 22, lineHeight: 32, textAlign: 'center', fontWeight: '600' },
});
