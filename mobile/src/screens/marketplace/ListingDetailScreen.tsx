import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'ListingDetail'>;

export default function ListingDetailScreen({ route }: Props) {
  const { listingId } = route.params;
  const [data, setData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    const detail = await apiClient.get(`/marketplace/listings/${listingId}`);
    setData(detail.data);
    const c = await apiClient.get(`/marketplace/listings/${listingId}/comments`);
    setComments(c.data.comments);
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  async function recommend() {
    await apiClient.post(`/marketplace/listings/${listingId}/recommend`);
    Alert.alert('Recommended', 'This listing\'s genuineness score went up — especially useful for jobs.');
    load();
  }

  async function react(reactionType: string) {
    await apiClient.post(`/marketplace/listings/${listingId}/reactions`, { reaction_type: reactionType });
    load();
  }

  async function postComment() {
    if (!draft.trim()) return;
    await apiClient.post(`/marketplace/listings/${listingId}/comments`, { body: draft.trim() });
    setDraft('');
    load();
  }

  async function report() {
    await apiClient.post(`/marketplace/listings/${listingId}/report`, { reason: 'Reported from app' });
    Alert.alert('Reported', 'A moderator will review this listing.');
  }

  if (!data) return null;
  const { listing, photos, recommendation_count } = data;

  return (
    <FlatList
      data={comments}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <ScrollView horizontal>
            {photos.map((p: any) => <Image key={p.id} source={{ uri: p.photo_url }} style={styles.photo} />)}
          </ScrollView>
          <View style={styles.body}>
            <Text style={styles.title}>{listing.title}</Text>
            {listing.price != null && <Text style={styles.price}>₹{listing.price}</Text>}
            <Text style={styles.description}>{listing.description}</Text>
            <Text style={styles.contact}>Contact: {listing.contact_info}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => react('like')}><Text>👍 Like</Text></TouchableOpacity>
              <TouchableOpacity onPress={recommend}><Text>★ Recommend ({recommendation_count})</Text></TouchableOpacity>
              <TouchableOpacity onPress={report}><Text>Report</Text></TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>Comments</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.comment}>
          <Text style={styles.commentAuthor}>{item.author_name}</Text>
          <Text>{item.body}</Text>
        </View>
      )}
      ListFooterComponent={
        <View style={styles.composer}>
          <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Write a comment…" />
          <TouchableOpacity style={styles.submitButton} onPress={postComment}><Text style={styles.submitButtonText}>Post</Text></TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  photo: { width: 280, height: 200, marginRight: 4 },
  body: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  price: { fontSize: 18, color: '#2E7D32', marginTop: 4 },
  description: { fontSize: 15, marginTop: 8, color: '#333' },
  contact: { fontSize: 14, marginTop: 8, color: '#555' },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 14 },
  sectionLabel: { marginTop: 20, fontSize: 12, color: '#777', textTransform: 'uppercase' },
  comment: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f3f3' },
  commentAuthor: { fontWeight: '600' },
  composer: { flexDirection: 'row', padding: 16, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  submitButton: { backgroundColor: '#2E7D32', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '600' },
});
