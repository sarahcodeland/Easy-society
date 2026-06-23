import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getChatSocket } from '../../api/socket';
import VisitorTag from '../../components/VisitorTag';
import { startListening, stopListening } from '../../voice/speechToText';

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

export default function ChatRoomScreen({ route }: Props) {
  const { groupId } = route.params;
  const { t, i18n } = useTranslation();
  const { token, user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null);
  const [listening, setListening] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    apiClient.get(`/chat/groups/${groupId}/messages`).then(({ data }) => setMessages(data.messages));
  }, [groupId]);

  useEffect(() => {
    if (!token) return;
    const socket = getChatSocket(token);
    socket.emit('group:join', groupId);
    const onNew = (msg: ChatMessageRow) => setMessages((prev) => [...prev, msg]);
    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
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
      () => setListening(false),
    );
  }

  async function reportMessage(messageId: string) {
    Alert.prompt?.('Report message', 'Reason', async (reason) => {
      if (!reason) return;
      await apiClient.post(`/chat/messages/${messageId}/report`, { reason });
      Alert.alert('Reported', 'Thanks — a moderator will review this.');
    }) ?? Alert.alert('Reported', 'Reporting requires the native prompt (iOS) — wire an Android modal here.');
  }

  async function blockSender(senderId: string | null) {
    if (!senderId) return;
    await apiClient.post(`/users/${senderId}/block`);
    Alert.alert('Blocked', 'You will no longer see content from this user.');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMine = item.sender_user_id === user?.id;
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
              style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
            >
              {!isMine && <Text style={styles.senderName}>{item.sender_name}</Text>}
              <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
              {item.is_deleted ? (
                <Text style={styles.deletedText}>Message removed by moderator</Text>
              ) : item.message_type === 'text' ? (
                <Text style={styles.messageText}>{item.content}</Text>
              ) : (
                <Text style={styles.messageText}>[{item.message_type}] {item.content}</Text>
              )}
            </Pressable>
          );
        }}
      />

      {replyTo && (
        <View style={styles.replyBar}>
          <Text style={styles.replyText} numberOfLines={1}>Replying to: {replyTo.content}</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}><Text>✕</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.composer}>
        <TouchableOpacity onPress={handleMicPress} style={styles.micButton}>
          <Text>{listening ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message"
        />
        <TouchableOpacity onPress={() => sendMessage('text', draft)} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>{t('common.send')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bubble: { marginHorizontal: 10, marginVertical: 4, padding: 10, borderRadius: 10, maxWidth: '80%' },
  bubbleMine: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#eee' },
  senderName: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  messageText: { fontSize: 15 },
  deletedText: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0f0f0', padding: 8, marginHorizontal: 10, borderRadius: 6 },
  replyText: { flex: 1, color: '#555' },
  composer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  micButton: { padding: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 6 },
  sendButton: { backgroundColor: '#2E7D32', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
