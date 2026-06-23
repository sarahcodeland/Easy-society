import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiClient } from '../../api/client';

interface NotificationRow {
  id: string;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/notifications');
    setNotifications(data.notifications);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await apiClient.post(`/notifications/${id}/read`);
    load();
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.row, !item.is_read && styles.unread]} onPress={() => markRead(item.id)}>
          <Text style={styles.type}>{item.type.replace('_', ' ')}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unread: { backgroundColor: '#F0F8F0' },
  type: { fontSize: 15, textTransform: 'capitalize' },
  time: { fontSize: 12, color: '#999', marginTop: 4 },
  empty: { padding: 24, textAlign: 'center', color: '#777' },
});
