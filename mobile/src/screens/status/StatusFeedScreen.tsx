import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import { colors, spacing } from '../../theme';

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
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tray}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addTile} onPress={createTextStatus}>
            <View style={styles.addCircle}>
              <Text style={styles.addTileText}>+</Text>
            </View>
            <Text style={styles.tileAuthor} numberOfLines={1}>Your Status</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tile} onPress={() => openStatus(item)}>
            <View style={styles.ring}>
              <View style={styles.ringInner}>
                {item.media_type === 'photo' && item.content_url ? (
                  <Image source={{ uri: item.content_url }} style={styles.tileImage} />
                ) : (
                  <Avatar name={item.author_name ?? '?'} size={54} />
                )}
              </View>
            </View>
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
  flex: { flex: 1, backgroundColor: colors.background },
  tray: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  addTile: { width: 64, marginRight: spacing.md, alignItems: 'center' },
  addCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#CFC4B8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  addTileText: { fontSize: 24, color: colors.textMuted },
  tile: { width: 64, marginRight: spacing.md, alignItems: 'center' },
  ring: { width: 58, height: 58, borderRadius: 29, padding: 2.5, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: '100%', height: '100%', borderRadius: 27, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileImage: { width: '100%', height: '100%' },
  tileAuthor: { fontSize: 10.5, marginTop: 5, color: colors.textSecondary, fontWeight: '600' },
  viewer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerText: { color: '#fff', fontSize: 22, padding: 24, textAlign: 'center' },
});
