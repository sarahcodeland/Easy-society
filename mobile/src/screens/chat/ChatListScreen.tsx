import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';

interface ChatGroupRow {
  id: string;
  location_id: string;
  name: string;
  is_moderator: boolean;
  joined_at: string;
}

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/chat/groups/mine');
    setGroups(data.groups);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      data={groups}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListEmptyComponent={<Text style={styles.empty}>No chat groups yet — finish your profile setup to join your area group.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('ChatRoom', { groupId: item.id, groupName: item.name })}
        >
          <Text style={styles.groupName}>{item.name}</Text>
          {item.is_moderator && <Text style={styles.modBadge}>Moderator</Text>}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  groupName: { fontSize: 16 },
  modBadge: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  empty: { padding: 24, textAlign: 'center', color: '#777' },
});
