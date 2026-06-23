import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'BusinessDetail'>;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function BusinessDetailScreen({ route }: Props) {
  const { businessId } = route.params;
  const [data, setData] = useState<any>(null);
  const user = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    const { data } = await apiClient.get(`/businesses/${businessId}`);
    setData(data);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  // "User confirms with one tap" — calls the Google My Business
  // auto-registration endpoint (stubbed server-side until real OAuth creds
  // are configured; same one-tap UX either way).
  async function registerOnGoogleMaps() {
    try {
      const { data: result } = await apiClient.post(`/businesses/${businessId}/register-google-maps`);
      Alert.alert('Registered', 'This business is now discoverable on Google Maps.', [
        { text: 'View on Maps', onPress: () => Linking.openURL(result.maps_url) },
        { text: 'OK' },
      ]);
      load();
    } catch (err: any) {
      Alert.alert('Could not register', err.response?.data?.error ?? 'Please try again');
    }
  }

  if (!data) return null;
  const { business, photos, reviews } = data;
  const isOwner = business.user_id === user?.id;

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <ScrollView horizontal>
            {photos.map((p: any) => <Image key={p.id} source={{ uri: p.photo_url }} style={styles.photo} />)}
          </ScrollView>
          <View style={styles.body}>
            <Text style={styles.name}>{business.name} {business.is_verified && '✓'}</Text>
            <Text style={styles.description}>{business.description}</Text>
            <Text style={styles.meta}>{business.address}</Text>
            <Text style={styles.meta}>{business.contact_number}</Text>

            <Text style={styles.sectionLabel}>Working hours</Text>
            {DAYS.map((day) => {
              const hours = business.working_hours?.[day];
              return (
                <Text key={day} style={styles.hoursRow}>
                  {day.toUpperCase()}: {hours?.closed ? 'Closed' : hours ? `${hours.open} - ${hours.close}` : '—'}
                </Text>
              );
            })}

            {isOwner && !business.is_google_maps_registered && (
              <TouchableOpacity style={styles.mapsButton} onPress={registerOnGoogleMaps}>
                <Text style={styles.mapsButtonText}>Register on Google Maps</Text>
              </TouchableOpacity>
            )}
            {business.is_google_maps_registered && <Text style={styles.mapsBadge}>✓ Listed on Google Maps</Text>}

            <Text style={styles.sectionLabel}>Reviews</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.review}>
          <Text style={styles.reviewAuthor}>{item.author_name} · {'★'.repeat(item.rating)}</Text>
          {item.body && <Text>{item.body}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  photo: { width: 280, height: 200, marginRight: 4 },
  body: { padding: 16 },
  name: { fontSize: 20, fontWeight: '700' },
  description: { fontSize: 15, marginTop: 8 },
  meta: { fontSize: 14, color: '#555', marginTop: 4 },
  sectionLabel: { marginTop: 18, fontSize: 12, color: '#777', textTransform: 'uppercase' },
  hoursRow: { fontSize: 13, color: '#444', marginTop: 2 },
  mapsButton: { backgroundColor: '#1A73E8', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  mapsButtonText: { color: '#fff', fontWeight: '600' },
  mapsBadge: { color: '#1A73E8', marginTop: 12, fontWeight: '600' },
  review: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f3f3' },
  reviewAuthor: { fontWeight: '600' },
});
