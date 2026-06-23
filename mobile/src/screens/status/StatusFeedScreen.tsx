import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiClient } from '../../api/client';

interface StatusRow {
  id: string;
  user_id: string;
  media_type: 'text' | 'photo' | 'video';
  content_url: string | null;
  text_content: string | null;
  author_name?: string;
  expires_at: string;
}

// Instagram-style story tray: thumbnail row, tap to view full-screen,
// auto-expires after 24h server-side (the feed query already filters those
// out — see backend GET /statuses/feed).
export default function StatusFeedScreen() {
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [active, setActive] = useState<StatusRow | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/statuses/feed');
    setStatuses(data.statuses);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openStatus(status: StatusRow) {
    setActive(status);
    await apiClient.post(`/statuses/${status.id}/view`);
  }

  async function createTextStatus() {
    Alert.prompt?.('Share a status', 'What\'s happening?', async (text) => {
      if (!text) return;
      await apiClient.post('/statuses', { media_type: 'text', text_content: text });
      load();
    }) ?? Alert.alert('Status composer', 'Wire a text-input modal for Android here; iOS uses Alert.prompt.');
  }

  return (
    <View style={styles.flex}>
      <FlatList
        horizontal
        data={statuses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tray}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addTile} onPress={createTextStatus}>
            <Text style={styles.addTileText}>+</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tile} onPress={() => openStatus(item)}>
            {item.media_type === 'photo' && item.content_url ? (
              <Image source={{ uri: item.content_url }} style={styles.tileImage} />
            ) : (
              <View style={styles.textTile}>
                <Text numberOfLines={3} style={styles.textTileText}>{item.text_content}</Text>
              </View>
            )}
            <Text style={styles.tileAuthor} numberOfLines={1}>{item.author_name}</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!active} animationType="fade" onRequestClose={() => setActive(null)}>
        <TouchableOpacity style={styles.viewer} onPress={() => setActive(null)}>
          {active?.media_type === 'photo' && active.content_url ? (
            <Image source={{ uri: active.content_url }} style={styles.viewerImage} resizeMode="contain" />
          ) : (
            <Text style={styles.viewerText}>{active?.text_content}</Text>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tray: { padding: 10 },
  addTile: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  addTileText: { fontSize: 28, color: '#2E7D32' },
  tile: { width: 70, marginRight: 10, alignItems: 'center' },
  tileImage: { width: 70, height: 70, borderRadius: 35 },
  textTile: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', padding: 4 },
  textTileText: { color: '#fff', fontSize: 10, textAlign: 'center' },
  tileAuthor: { fontSize: 10, marginTop: 4 },
  viewer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerText: { color: '#fff', fontSize: 22, padding: 24, textAlign: 'center' },
});
