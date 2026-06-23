import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ListingCategory, VisibilityLevel } from '@easysociety/shared';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisitorTag from '../../components/VisitorTag';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';

const TABS: { key: ListingCategory | 'businesses_directory'; label: string }[] = [
  { key: ListingCategory.BUY_SELL, label: 'Buy/Sell' },
  { key: ListingCategory.RENT, label: 'Rent' },
  { key: ListingCategory.SERVICES, label: 'Services' },
  { key: ListingCategory.JOBS, label: 'Jobs' },
  { key: 'businesses_directory', label: 'Businesses' },
];

interface ListingRow {
  id: string;
  title: string;
  price: number | null;
  cover_photo_url: string | null;
  recommendation_count: string;
  is_visitor?: boolean;
  visitor_location_label?: string | null;
}

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'MarketplaceHome'>;

export default function MarketplaceHomeScreen({ navigation }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]['key']>(ListingCategory.BUY_SELL);
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);
  const [listings, setListings] = useState<ListingRow[]>([]);

  const load = useCallback(async () => {
    if (tab === 'businesses_directory') return;
    const { data } = await apiClient.get('/marketplace/listings', { params: { category: tab, visibility } });
    setListings(data.listings);
  }, [tab, visibility]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.flex}>
      <FlatList
        horizontal
        data={TABS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, tab === item.key && styles.tabActive]}
            onPress={() => {
              if (item.key === 'businesses_directory') {
                navigation.navigate('BusinessDirectory');
              } else {
                setTab(item.key);
              }
            }}
          >
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <VisibilityFilterBar value={visibility} onChange={setVisibility} />

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}>
            {item.cover_photo_url && <Image source={{ uri: item.cover_photo_url }} style={styles.cardImage} />}
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.price != null && <Text style={styles.cardPrice}>₹{item.price}</Text>}
            {Number(item.recommendation_count) > 0 && <Text style={styles.cardRec}>★ {item.recommendation_count} recommended</Text>}
            <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateListing')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabBar: { flexGrow: 0, padding: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#eee', marginRight: 8 },
  tabActive: { backgroundColor: '#2E7D32' },
  tabText: { color: '#333' },
  tabTextActive: { color: '#fff' },
  card: { flex: 1, margin: 6, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  cardImage: { width: '100%', height: 100, borderRadius: 6, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardPrice: { fontSize: 14, color: '#2E7D32', marginTop: 4 },
  cardRec: { fontSize: 11, color: '#B8860B', marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2E7D32', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
});
