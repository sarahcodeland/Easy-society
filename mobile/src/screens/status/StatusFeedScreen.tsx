import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import { useNavPadding } from '../../hooks/useNavPadding';

const { width: SW } = Dimensions.get('window');
const CARD_MX = 16;
const CARD_W  = SW - CARD_MX * 2;
const CARD_H  = 320;

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusRow {
  id: string; user_id: string;
  media_type: 'text' | 'photo' | 'video';
  content_url: string | null; text_content: string | null;
  author_name?: string; author_photo?: string | null;
  location_label?: string | null;
  like_count?: number; comment_count?: number; repost_count?: number;
  created_at?: string; expires_at: string;
}

type Props = NativeStackScreenProps<StatusStackParamList, 'StatusFeed'>;

// ── Utilities ─────────────────────────────────────────────────────────────────

function hoursLeft(expiresAt: string) {
  const h = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3600000);
  return h > 1 ? `${h}h left` : '< 1h left';
}

// ── Status Card ───────────────────────────────────────────────────────────────

function StatusCard({ item, onView }: { item: StatusRow; onView: (s: StatusRow) => void }) {
  const likeAnim = useRef(new Animated.Value(1)).current;
  const [liked, setLiked] = useState(false);

  const hasMedia = (item.media_type === 'photo' || item.media_type === 'video') && !!item.content_url;

  function handleLike() {
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.55, duration: 100, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1,    duration: 90,  useNativeDriver: true }),
    ]).start();
    const next = !liked;
    setLiked(next);
    const req = next
      ? apiClient.post(`/statuses/${item.id}/like`)
      : apiClient.delete(`/statuses/${item.id}/like`);
    req.catch(() => {});
  }

  function handleShare() {
    Share.share({ message: item.text_content ?? 'Check this out on Easy Society!' }).catch(() => {});
  }

  return (
    <TouchableOpacity
      style={S.card}
      activeOpacity={0.97}
      onPress={() => hasMedia && onView(item)}
    >
      {/* ── Background ── */}
      {hasMedia ? (
        <Image
          source={{ uri: item.content_url! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, S.textBg]}>
          <Text style={S.textBgContent} numberOfLines={6}>{item.text_content}</Text>
        </View>
      )}

      {/* Subtle full-card tint */}
      <View style={[StyleSheet.absoluteFillObject, S.tint]} pointerEvents="none" />

      {/* Bottom darkening overlay for text/actions readability */}
      <View style={S.bottomGrad} pointerEvents="none" />

      {/* ── Top row: user pill + timer ── */}
      <View style={S.topRow}>
        <View style={S.userPill}>
          {item.author_photo ? (
            <Image source={{ uri: item.author_photo }} style={S.pillImg} />
          ) : (
            <View style={S.pillImgFallback}>
              <Text style={S.pillLetter}>{(item.author_name ?? '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flexShrink: 1 }}>
            <Text style={S.pillName} numberOfLines={1}>{item.author_name ?? 'Community'}</Text>
            <Text style={S.pillArea}>COMMUNITY MEMBER</Text>
          </View>
        </View>

        <View style={S.timerPill}>
          <Ionicons name="time-outline" size={11} color="#fff" />
          <Text style={S.timerText}>{hoursLeft(item.expires_at)}</Text>
        </View>
      </View>

      {/* ── Bottom row: text + actions ── */}
      <View style={S.bottomRow}>
        {hasMedia && !!item.text_content && (
          <Text style={S.cardText} numberOfLines={3}>{item.text_content}</Text>
        )}

        <View style={S.actionBar}>
          {/* Left: like / comment / repost */}
          <View style={S.actionGroup}>
            <TouchableOpacity style={S.actionBtn} onPress={handleLike} activeOpacity={0.72}>
              <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={21}
                  color={liked ? '#FF5B7A' : '#fff'}
                />
              </Animated.View>
              <Text style={S.actionCount}>{(item.like_count ?? 0) + (liked ? 1 : 0)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={S.actionBtn} activeOpacity={0.72}>
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={S.actionCount}>{item.comment_count ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={S.actionBtn} activeOpacity={0.72}>
              <Ionicons name="repeat-outline" size={22} color="#fff" />
              <Text style={S.actionCount}>{item.repost_count ?? 0}</Text>
            </TouchableOpacity>
          </View>

          {/* Right: share */}
          <TouchableOpacity style={S.actionBtn} onPress={handleShare} activeOpacity={0.72}>
            <Ionicons name="arrow-redo-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video play indicator */}
      {item.media_type === 'video' && hasMedia && (
        <View style={S.playOverlay} pointerEvents="none">
          <Ionicons name="play-circle" size={46} color="rgba(255,255,255,0.85)" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StatusFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const navPadding = useNavPadding();
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [viewing, setViewing]   = useState<StatusRow | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/statuses/feed');
      setStatuses(data.statuses ?? []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[S.screen, { paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={S.topBar}>
        <Text style={S.topBarTitle}>Easy Society</Text>
        <View style={S.topBarRight}>
          <TouchableOpacity style={S.iconBtn}>
            <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Avatar name="Me" size={34} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Feed ── */}
      <FlatList
        data={statuses}
        keyExtractor={(s) => s.id}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={[S.list, { paddingBottom: navPadding }]}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        renderItem={({ item }) => (
          <StatusCard item={item} onView={setViewing} />
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="sunny-outline" size={44} color={colors.border} />
            <Text style={S.emptyTitle}>No statuses yet</Text>
            <Text style={S.emptyBody}>Be the first to share what's happening in your village.</Text>
          </View>
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[S.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => navigation.navigate('CreateStatus')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Full-screen media viewer ── */}
      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        <TouchableOpacity style={S.viewerBg} onPress={() => setViewing(null)} activeOpacity={1}>
          {viewing?.media_type === 'photo' && viewing.content_url ? (
            <Image source={{ uri: viewing.content_url }} style={S.viewerImg} resizeMode="contain" />
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
  screen: { flex: 1, backgroundColor: colors.background },

  // ── Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  topBarTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: -0.4 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4 },

  // ── Feed list
  list: {
    paddingHorizontal: CARD_MX,
    paddingTop: spacing.sm,
    paddingBottom: 130,
  },

  // ── Card
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#C5A898',
    shadowColor: '#3D1F17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 16, elevation: 5,
  },

  // Card backgrounds
  tint: { backgroundColor: 'rgba(0,0,0,0.10)' },
  bottomGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: CARD_H * 0.60,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  textBg: {
    backgroundColor: '#1B3A2D',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  textBgContent: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 36, letterSpacing: 2,
  },

  // ── Top row
  topRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  userPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 100, paddingLeft: 4, paddingRight: 10, paddingVertical: 5,
    maxWidth: CARD_W * 0.62,
  },
  pillImg: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#fff' },
  pillImgFallback: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#fff',
    backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center',
  },
  pillLetter: { fontSize: 12, fontWeight: '800', color: '#fff' },
  pillName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  pillArea: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, marginTop: 1 },

  timerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#8B2E2E',
    borderRadius: 100, paddingHorizontal: 9, paddingVertical: 5,
  },
  timerText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // ── Bottom row
  bottomRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, gap: 8,
  },
  cardText: {
    fontSize: 13, fontWeight: '600', color: '#fff',
    lineHeight: 18, marginBottom: 8,
  },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  // Video play
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Empty state
  empty: { paddingTop: 80, alignItems: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // ── FAB
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },

  // ── Media viewer
  viewerBg: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '100%' },
  viewerTextCard: {
    backgroundColor: colors.primary, borderRadius: 20,
    margin: 32, padding: 32,
  },
  viewerText: {
    color: '#fff', fontSize: 22, lineHeight: 32,
    textAlign: 'center', fontWeight: '600',
  },
});
