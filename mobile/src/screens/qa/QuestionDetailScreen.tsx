import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import { QaStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { colors, radii, spacing } from '../../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionDetail {
  id: string;
  title: string;
  body: string | null;
  author_name?: string;
  vote_score: string;
  recommendation_count: string;
  answer_count: string;
  media_urls?: string[];
  created_at?: string;
  is_anonymous?: boolean;
}

interface AnswerRow {
  id: string;
  body: string;
  author_name?: string;
  vote_score: string;
  recommendation_count: string;
  media_urls?: string[];
  created_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isVideo(url: string) {
  return /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(url);
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

// ── Media strip ───────────────────────────────────────────────────────────────

function MediaStrip({ urls }: { urls: string[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!urls || urls.length === 0) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mediaStrip}
        contentContainerStyle={styles.mediaStripContent}
      >
        {urls.map((url, i) => {
          const video = isVideo(url);
          return (
            <TouchableOpacity
              key={i}
              style={styles.mediaTile}
              activeOpacity={0.85}
              onPress={() => video ? Linking.openURL(url) : setLightboxUrl(url)}
            >
              {video ? (
                <View style={styles.videoTile}>
                  <Ionicons name="videocam" size={28} color={colors.textSecondary} />
                  <Text style={styles.videoLabel}>Video</Text>
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={10} color="#fff" />
                  </View>
                </View>
              ) : (
                <Image source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Full-screen image lightbox */}
      <Modal
        visible={!!lightboxUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUrl(null)}
      >
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUrl(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
          {lightboxUrl && (
            <Image
              source={{ uri: lightboxUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<QaStackParamList, 'QuestionDetail'>;

export default function QuestionDetailScreen({ route, navigation }: Props) {
  const { questionId } = route.params;
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await apiClient.get(`/qa/questions/${questionId}`);
    setQuestion(data.question);
    setAnswers(data.answers);
  }, [questionId]);

  useEffect(() => { load(); }, [load]);

  async function submitAnswer() {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/qa/questions/${questionId}/answers`, { body: draft.trim() });
      setDraft('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(targetId: string, targetType: 'question' | 'answer', voteType: 'upvote' | 'downvote') {
    try {
      await apiClient.post('/qa/votes', { target_id: targetId, target_type: targetType, vote_type: voteType });
      load();
    } catch {}
  }

  async function recommend(targetId: string, targetType: 'question' | 'answer') {
    try {
      await apiClient.post('/qa/recommendations', { target_id: targetId, target_type: targetType });
      Alert.alert('Marked helpful', 'This adds to its credibility score.');
      load();
    } catch {}
  }

  if (!question) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Scrollable question + answers — flex:1 so composer stays at bottom */}
      <FlatList
        style={styles.flex}
        data={answers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"

        // ── Question block ────────────────────────────────────────────────
        ListHeaderComponent={
          <View style={styles.questionCard}>
            {/* Author row */}
            <View style={styles.authorRow}>
              <Avatar name={question.author_name ?? '?'} size={38} />
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>
                  {question.is_anonymous ? 'Anonymous' : (question.author_name ?? 'Community Member')}
                </Text>
                <Text style={styles.timeAgo}>{timeAgo(question.created_at)}</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.questionTitle}>{question.title}</Text>

            {/* Body */}
            {question.body ? (
              <Text style={styles.questionBody}>{question.body}</Text>
            ) : null}

            {/* ── Media ── */}
            {question.media_urls && question.media_urls.length > 0 && (
              <MediaStrip urls={question.media_urls} />
            )}

            {/* Vote / recommend toolbar */}
            <View style={styles.toolbar}>
              <View style={styles.voteRow}>
                <Pressable
                  style={({ pressed }) => [styles.voteBtn, pressed && styles.voteBtnPressed]}
                  onPress={() => vote(question.id, 'question', 'upvote')}
                >
                  <Ionicons name="arrow-up-outline" size={16} color={colors.success} />
                  <Text style={styles.voteScore}>{question.vote_score}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.voteBtn, pressed && styles.voteBtnPressed]}
                  onPress={() => vote(question.id, 'question', 'downvote')}
                >
                  <Ionicons name="arrow-down-outline" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [styles.recommendBtn, pressed && styles.recommendBtnPressed]}
                onPress={() => recommend(question.id, 'question')}
              >
                <Ionicons name="star-outline" size={14} color={colors.primary} />
                <Text style={styles.recommendText}>
                  Helpful ({question.recommendation_count})
                </Text>
              </Pressable>
            </View>

            {/* Answers count header */}
            <View style={styles.answersDivider}>
              <Text style={styles.answersLabel}>
                {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
              </Text>
            </View>
          </View>
        }

        // ── Answer cards ──────────────────────────────────────────────────
        renderItem={({ item }) => (
          <View style={styles.answerCard}>
            <View style={styles.authorRow}>
              <Avatar name={item.author_name ?? '?'} size={34} />
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>{item.author_name ?? 'Community Member'}</Text>
                <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
              </View>
            </View>

            <Text style={styles.answerBody}>{item.body}</Text>

            {/* ── Answer media ── */}
            {item.media_urls && item.media_urls.length > 0 && (
              <MediaStrip urls={item.media_urls} />
            )}

            <View style={styles.toolbar}>
              <View style={styles.voteRow}>
                <Pressable
                  style={({ pressed }) => [styles.voteBtn, pressed && styles.voteBtnPressed]}
                  onPress={() => vote(item.id, 'answer', 'upvote')}
                >
                  <Ionicons name="arrow-up-outline" size={15} color={colors.success} />
                  <Text style={styles.voteScore}>{item.vote_score}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.voteBtn, pressed && styles.voteBtnPressed]}
                  onPress={() => vote(item.id, 'answer', 'downvote')}
                >
                  <Ionicons name="arrow-down-outline" size={15} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [styles.recommendBtn, pressed && styles.recommendBtnPressed]}
                onPress={() => recommend(item.id, 'answer')}
              >
                <Ionicons name="star-outline" size={13} color={colors.primary} />
                <Text style={styles.recommendText}>Helpful ({item.recommendation_count})</Text>
              </Pressable>
            </View>
          </View>
        )}

        ListEmptyComponent={
          <View style={styles.noAnswers}>
            <Ionicons name="chatbubble-outline" size={32} color={colors.border} />
            <Text style={styles.noAnswersText}>No answers yet. Be the first to help!</Text>
          </View>
        }
      />

      {/* ── Composer — fixed below the list, above the keyboard ─────────── */}
      <View style={[styles.composerBar, { paddingBottom: insets.bottom || spacing.md }]}>
        <TextInput
          style={styles.composerInput}
          placeholder="Write your answer…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={submitAnswer}
          disabled={!draft.trim() || submitting}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  listContent: { paddingBottom: 32 },

  /* Question card */
  questionCard: {
    backgroundColor: '#fff',
    margin: spacing.lg,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },
  timeAgo: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  questionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 26, marginBottom: spacing.sm },
  questionBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.md },

  /* Media strip */
  mediaStrip: { marginBottom: spacing.md },
  mediaStripContent: { gap: spacing.sm, paddingRight: spacing.sm },
  mediaTile: {
    width: 140,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaImage: { width: '100%', height: '100%' },
  videoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    gap: 4,
  },
  videoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  playBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Lightbox */
  lightboxBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxClose: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  lightboxImage: { width: '100%', height: '80%' },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  voteRow: { flexDirection: 'row', gap: spacing.sm },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: colors.card,
  },
  voteBtnPressed: { opacity: 0.7 },
  voteScore: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  recommendBtnPressed: { backgroundColor: '#FBF2EB' },
  recommendText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  /* Answers divider */
  answersDivider: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  answersLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },

  /* Answer card */
  answerCard: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  answerBody: { fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginBottom: spacing.sm },

  /* Empty */
  noAnswers: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  noAnswersText: { fontSize: 13.5, color: colors.textSecondary, textAlign: 'center' },

  /* Composer bar — sits outside FlatList so KAV can track it */
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
