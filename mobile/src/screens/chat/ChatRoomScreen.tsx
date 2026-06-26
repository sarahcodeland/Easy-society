import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getChatSocket } from '../../api/socket';
import VisitorTag from '../../components/VisitorTag';
import Avatar from '../../components/Avatar';
import { startListening, stopListening } from '../../voice/speechToText';
import { colors, radii, spacing, shadow } from '../../theme';

interface ChatMessageRow {
  id: string;
  sender_user_id: string | null;
  sender_name?: string;
  message_type: 'text' | 'image' | 'voice';
  content: string | null;
  reply_to_message_id: string | null;
  is_deleted: boolean;
  created_at: string;
  is_visitor?: boolean;
  visitor_location_label?: string | null;
}

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatRoomScreen({ route, navigation }: Props) {
  const { groupId, groupName } = route.params;
  const { t, i18n } = useTranslation();
  const { token, user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null);
  const [listening, setListening] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const listRef = useRef<FlatList>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    apiClient.get(`/chat/groups/${groupId}/messages`).then(({ data }) => setMessages(data.messages));
  }, [groupId]);

  useEffect(() => {
    if (!token) return;
    const socket = getChatSocket(token);
    socket.emit('group:join', groupId);
    const onNew = (msg: ChatMessageRow) => setMessages((prev) => [...prev, msg]);
    const onPresence = ({ count }: { count: number }) => setOnlineCount(count);
    socket.on('message:new', onNew);
    socket.on('presence:count', onPresence);
    return () => {
      socket.off('message:new', onNew);
      socket.off('presence:count', onPresence);
      socket.emit('group:leave', groupId);
    };
  }, [groupId, token]);

  function sendMessage(messageType: 'text' | 'image' | 'voice', content: string) {
    if (!token || !content.trim()) return;
    const socket = getChatSocket(token);
    socket.emit(
      'message:send',
      { group_id: groupId, message_type: messageType, content, reply_to_message_id: replyTo?.id ?? null },
      (err: string | undefined) => {
        if (err) Alert.alert('Could not send', err);
      },
    );
    setDraft('');
    setReplyTo(null);
  }

  function handleMicPress() {
    if (listening) {
      stopListening();
      setListening(false);
      return;
    }
    setListening(true);
    startListening(
      i18n.language,
      (text) => { setDraft(text); setListening(false); },
      () => {
        setListening(false);
        Alert.alert('Voice input unavailable', "Voice-to-text isn't supported in this build yet.");
      },
    );
  }

  async function reportMessage(messageId: string) {
    if (Alert.prompt) {
      Alert.prompt('Report message', 'Reason', async (reason) => {
        if (!reason) return;
        await apiClient.post(`/chat/messages/${messageId}/report`, { reason });
        Alert.alert('Reported', 'Thanks — a moderator will review this.');
      });
    } else {
      Alert.alert('Reported', 'Reporting requires the native prompt (iOS).');
    }
  }

  async function blockSender(senderId: string | null) {
    if (!senderId) return;
    await apiClient.post(`/users/${senderId}/block`);
    Alert.alert('Blocked', 'You will no longer see content from this user.');
  }

  const renderMessage = ({ item }: { item: ChatMessageRow }) => {
    const isMine = item.sender_user_id === user?.id;

    if (item.is_deleted) {
      return (
        <View style={styles.deletedRow}>
          <Text style={styles.deletedText}>Message removed by moderator</Text>
        </View>
      );
    }

    return (
      <Pressable
        onLongPress={() =>
          Alert.alert(item.sender_name ?? 'Message', undefined, [
            { text: t('common.report'), onPress: () => reportMessage(item.id) },
            { text: t('common.block'), onPress: () => blockSender(item.sender_user_id), style: 'destructive' },
            { text: 'Reply', onPress: () => setReplyTo(item) },
            { text: t('common.cancel'), style: 'cancel' },
          ])
        }
        style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
      >
        {!isMine && (
          <View style={styles.avatarWrapper}>
            <Avatar name={item.sender_name ?? '?'} size={32} />
          </View>
        )}

        <View style={[styles.bubbleColumn, isMine && styles.bubbleColumnMine]}>
          {!isMine && (
            <>
              <Text style={styles.senderName}>{item.sender_name}</Text>
              {item.is_visitor && (
                <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
              )}
            </>
          )}

          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {item.message_type === 'image' && item.content ? (
              <Image source={{ uri: item.content }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                {item.content}
              </Text>
            )}
          </View>

          <View style={[styles.metaRow, isMine && styles.metaRowMine]}>
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
            {isMine && (
              <Ionicons name="checkmark-done" size={13} color={colors.primary} />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerGroupName} numberOfLines={1}>{groupName}</Text>
          {onlineCount > 0 && (
            <Text style={styles.headerOnline}>{onlineCount} members online</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} hitSlop={8}>
            <Feather name="search" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Avatar name={user?.name ?? 'Me'} size={32} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
        />

        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyAccent} />
            <Text style={styles.replyText} numberOfLines={1}>
              Replying to {replyTo.sender_name}: {replyTo.content}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.composerOuter}>
          <View style={styles.composer}>
            <TouchableOpacity style={styles.composerIconBtn}>
              <Feather name="plus" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.composerIconBtn}>
              <Feather name="image" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${groupName}..`}
              placeholderTextColor={colors.textMuted}
              multiline
              returnKeyType="default"
            />

            <TouchableOpacity
              onPress={() => sendMessage('text', draft)}
              style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
              disabled={!draft.trim()}
            >
              <Ionicons name="send" size={17} color="#FFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 4, marginRight: 6 },
  headerCenter: { flex: 1 },
  headerGroupName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  headerOnline: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIconBtn: { padding: 4 },

  // ── Message list ─────────────────────────────────────────────────────────
  listContent: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.md },

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '84%',
  },
  bubbleRowTheirs: { alignSelf: 'flex-start' },
  bubbleRowMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  avatarWrapper: { marginRight: spacing.sm, alignSelf: 'flex-end' },

  bubbleColumn: { flexShrink: 1 },
  bubbleColumnMine: { alignItems: 'flex-end' },

  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 3,
    marginLeft: 2,
  },

  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    overflow: 'hidden',
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    ...shadow,
  },

  messageText: { fontSize: 13.5, color: colors.textPrimary, lineHeight: 19 },
  messageTextMine: { color: '#FFFFFF' },

  imagePreview: { width: 200, height: 148, borderRadius: 10 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    marginLeft: 4,
  },
  metaRowMine: { justifyContent: 'flex-end', marginRight: 4 },
  timestamp: { fontSize: 10, color: colors.textMuted },

  deletedRow: { alignSelf: 'center', marginVertical: spacing.xs },
  deletedText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

  // ── Reply banner ─────────────────────────────────────────────────────────
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginBottom: 4,
    borderRadius: radii.input,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingRight: 10,
  },
  replyAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  replyText: { flex: 1, fontSize: 12, color: colors.textSecondary },

  // ── Composer ─────────────────────────────────────────────────────────────
  composerOuter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 6,
    ...shadow,
  },
  composerIconBtn: { padding: 7 },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    maxHeight: 100,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendButtonDisabled: { backgroundColor: colors.border },
});
