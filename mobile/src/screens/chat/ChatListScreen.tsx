import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import { colors, spacing } from '../../theme';
import { useNavPadding } from '../../hooks/useNavPadding';

interface ChatGroupRow {
  id: string;
  location_id: string;
  name: string;
  is_moderator: boolean;
  joined_at: string;
}

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen({ navigation }: Props) {
  const navPadding = useNavPadding();
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
      style={styles.flex}
      data={groups}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: navPadding }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListEmptyComponent={<Text style={styles.empty}>No chat groups yet — finish your profile setup to join your area group.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('ChatRoom', { groupId: item.id, groupName: item.name })}
        >
          <Avatar name={item.name} size={44} />
          <View style={styles.rowInfo}>
            <Text style={styles.groupName}>{item.name}</Text>
          </View>
          {item.is_moderator && <Badge label="Moderator" />}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { backgroundColor: colors.background },
  row: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card },
  rowInfo: { flex: 1, marginLeft: spacing.md },
  groupName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
});
