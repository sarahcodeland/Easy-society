import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { VisibilityLevel } from '@easysociety/shared';
import { apiClient } from '../../api/client';
import VisitorTag from '../../components/VisitorTag';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';
import { speak } from '../../voice/tts';
import { useAuthStore } from '../../store/authStore';

interface AnnouncementRow {
  id: string;
  title: string;
  body: string | null;
  is_pinned: boolean;
  is_official: boolean;
  author_name?: string;
  author_role?: string;
  author_is_verified?: boolean;
  author_verified_title?: string | null;
  is_visitor?: boolean;
  visitor_location_label?: string | null;
}

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);
  const [composerVisible, setComposerVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const { user, } = useAuthStore();
  const language = user?.preferred_language ?? 'en';

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/announcements', { params: { visibility } });
    setAnnouncements(data.announcements);
  }, [visibility]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    try {
      await apiClient.post('/announcements', { title: title.trim(), body: body.trim() || null, visibility_level: visibility });
      setComposerVisible(false);
      setTitle('');
      setBody('');
      load();
    } catch (err: any) {
      Alert.alert('Could not post', err.response?.data?.error ?? 'Please try again');
    }
  }

  return (
    <View style={styles.flex}>
      <VisibilityFilterBar value={visibility} onChange={setVisibility} />
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, item.is_pinned && styles.cardPinned]}>
            {item.is_pinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
            <Text style={styles.title}>{item.title}</Text>
            {item.body && <Text style={styles.body}>{item.body}</Text>}
            <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
            <View style={styles.metaRow}>
              <Text style={styles.author}>
                {item.is_official ? '🏛 Official' : '👤 Community'} · {item.author_name}
                {item.author_is_verified && item.author_verified_title ? ` (${item.author_verified_title})` : ''}
              </Text>
              <TouchableOpacity onPress={() => speak(`${item.title}. ${item.body ?? ''}`, language)}>
                <Text style={styles.speakIcon}>🔊</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setComposerVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={composerVisible} animationType="slide">
        <View style={styles.composer}>
          <Text style={styles.composerLabel}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.composerLabel}>Body</Text>
          <TextInput style={[styles.input, styles.multiline]} value={body} onChangeText={setBody} multiline />
          <Text style={styles.note}>
            Moderators/admins post official, pinnable announcements. Regular users post to Community
            Updates (labeled as user-posted) and must have an account older than 7 days.
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={submit}>
            <Text style={styles.submitButtonText}>Post</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setComposerVisible(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cardPinned: { backgroundColor: '#FFFBEA' },
  pinnedLabel: { fontSize: 12, color: '#B8860B', fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, marginTop: 4, color: '#333' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  author: { fontSize: 12, color: '#777', flex: 1 },
  speakIcon: { fontSize: 18 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2E7D32', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
  composer: { flex: 1, padding: 16, paddingTop: 60 },
  composerLabel: { fontSize: 13, color: '#555', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  note: { fontSize: 12, color: '#777', marginTop: 16, fontStyle: 'italic' },
  submitButton: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  submitButtonText: { color: '#fff', fontWeight: '600' },
  cancelText: { textAlign: 'center', marginTop: 16, color: '#777' },
});
