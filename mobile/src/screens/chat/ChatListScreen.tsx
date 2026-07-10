import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import { colors, spacing } from '../../theme';
import { useNavPadding } from '../../hooks/useNavPadding';
import { useLocationStore } from '../../store/locationStore';

interface ChatGroupRow {
  id: string;
  location_id: string;
  name: string;
  is_moderator: boolean;
  joined_at: string | null;
  is_member: boolean;
}

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const navPadding = useNavPadding();
  const { activeLocationId, visibilityLevel } = useLocationStore();
  const [groups, setGroups] = useState<ChatGroupRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/chat/groups/mine', {
      params: { location_id: activeLocationId, visibility_level: visibilityLevel },
    });
    setGroups(data.groups);
  }, [activeLocationId, visibilityLevel]);

  useEffect(() => {
    load();
  }, [load]);

  async function openGroup(group: ChatGroupRow) {
    if (!group.is_member) {
      setJoiningId(group.id);
      try {
        await apiClient.post(`/chat/groups/${group.id}/join`);
      } catch {
        setJoiningId(null);
        return;
      }
      setJoiningId(null);
    }
    navigation.navigate('ChatRoom', { groupId: group.id, groupName: group.name });
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={groups}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: navPadding }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListEmptyComponent={<Text style={styles.empty}>No chat groups yet — finish your profile setup to join your area group.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => openGroup(item)}
          disabled={joiningId === item.id}
        >
          <Avatar name={item.name} size={44} />
          <View style={styles.rowInfo}>
            <Text style={styles.groupName}>{item.name}</Text>
          </View>
          {item.is_moderator && <Badge label="Moderator" />}
          {!item.is_member && (
            <View style={styles.joinPill}>
              <Text style={styles.joinPillText}>
                {joiningId === item.id ? 'Joining…' : 'Join'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  row: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card },
  rowInfo: { flex: 1, marginLeft: spacing.md },
  groupName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
  joinPill: {
    backgroundColor: colors.primary, borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  joinPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
