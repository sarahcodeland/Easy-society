import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ListingCategory, VisibilityLevel } from '@easysociety/shared';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisitorTag from '../../components/VisitorTag';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';
import Card from '../../components/Card';
import { colors, radii, spacing } from '../../theme';

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.flex}>
      <FlatList
        horizontal
        data={TABS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
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
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.cardWrap} onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}>
            <Card style={styles.card}>
              {item.cover_photo_url && <Image source={{ uri: item.cover_photo_url }} style={styles.cardImage} />}
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.price != null && <Text style={styles.cardPrice}>₹{item.price}</Text>}
              {Number(item.recommendation_count) > 0 && <Text style={styles.cardRec}>★ {item.recommendation_count} recommended</Text>}
              <VisitorTag isVisitor={item.is_visitor} visitorLocationLabel={item.visitor_location_label} />
            </Card>
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
  flex: { flex: 1, backgroundColor: colors.background },
  tabBar: { flexGrow: 0 },
  tabBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.card, marginRight: spacing.sm, ...cardShadow() },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  tabTextActive: { color: colors.card },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  cardWrap: { flex: 1, margin: 6 },
  card: { padding: 10 },
  cardImage: { width: '100%', height: 100, borderRadius: 8, marginBottom: spacing.sm },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  cardPrice: { fontSize: 13.5, fontWeight: '800', color: colors.primary, marginTop: 4 },
  cardRec: { fontSize: 11, color: '#B8860B', marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: colors.card, fontSize: 28, lineHeight: 28 },
});

function cardShadow() {
  return { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 };
}
