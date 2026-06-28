import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useNavPadding } from '../../hooks/useNavPadding';

interface BusinessRow {
  id: string;
  name: string;
  category: string | null;
  is_verified: boolean;
  is_google_maps_registered: boolean;
  cover_photo_url: string | null;
  avg_rating: string;
}

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'BusinessDirectory'>;

export default function BusinessDirectoryScreen({ navigation }: Props) {
  const navPadding = useNavPadding();
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);

  const load = useCallback(async () => {
    const { data } = await apiClient.get('/businesses');
    setBusinesses(data.businesses);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.flex}>
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: navPadding }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}>
            {item.cover_photo_url && <Image source={{ uri: item.cover_photo_url }} style={styles.thumb} />}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name} {item.is_verified && '✓'}</Text>
              <Text style={styles.meta}>{item.category} · ★{Number(item.avg_rating).toFixed(1)}</Text>
              {item.is_google_maps_registered && <Text style={styles.mapsBadge}>On Google Maps</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateBusiness')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  thumb: { width: 56, height: 56, borderRadius: 8, marginRight: 12 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#777', marginTop: 2 },
  mapsBadge: { fontSize: 11, color: '#1A73E8', marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2E7D32', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
});
