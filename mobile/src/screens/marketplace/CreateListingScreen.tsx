import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ListingCategory, VisibilityLevel } from '@easysociety/shared';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import VisibilityFilterBar from '../../components/VisibilityFilterBar';
import { pickAndUploadImage } from '../../utils/uploadMedia';

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  [ListingCategory.BUY_SELL]: 'Buy/Sell',
  [ListingCategory.RENT]: 'Rent',
  [ListingCategory.SERVICES]: 'Services',
  [ListingCategory.JOBS]: 'Jobs',
  [ListingCategory.BUSINESSES]: 'Businesses',
};

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'CreateListing'>;

export default function CreateListingScreen({ navigation }: Props) {
  const [category, setCategory] = useState<ListingCategory>(ListingCategory.BUY_SELL);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>(VisibilityLevel.AREA);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  async function addPhoto() {
    try {
      const url = await pickAndUploadImage('listing');
      if (url) setPhotoUrls((prev) => [...prev, url]);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Please try again');
    }
  }

  async function submit() {
    if (title.trim().length < 3) {
      Alert.alert('Title too short', 'Add more detail to your listing title');
      return;
    }
    await apiClient.post('/marketplace/listings', {
      category, title: title.trim(), description: description.trim() || null,
      price: price ? Number(price) : null, contact_info: contactInfo.trim() || null,
      visibility_level: visibility, photo_urls: photoUrls,
    });
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {Object.values(ListingCategory).map((c) => (
          <TouchableOpacity key={c} style={[styles.categoryChip, category === c && styles.categoryChipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>{CATEGORY_LABELS[c]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />

      {category !== ListingCategory.SERVICES && (
        <>
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
        </>
      )}

      <Text style={styles.label}>Contact info</Text>
      <TextInput style={styles.input} value={contactInfo} onChangeText={setContactInfo} placeholder="Phone number" />

      <Text style={styles.label}>Photos</Text>
      <View style={styles.photoRow}>
        {photoUrls.map((url) => <Image key={url} source={{ uri: url }} style={styles.photoThumb} />)}
        <TouchableOpacity style={styles.addPhotoButton} onPress={addPhoto}>
          <Text style={styles.addPhotoButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Visible to</Text>
      <VisibilityFilterBar value={visibility} onChange={setVisibility} />

      <TouchableOpacity style={styles.submitButton} onPress={submit}>
        <Text style={styles.submitButtonText}>Post listing</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 13, color: '#555', marginTop: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  categoryChipText: { fontSize: 13 },
  categoryChipTextActive: { color: '#fff' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 70, height: 70, borderRadius: 6 },
  addPhotoButton: { width: 70, height: 70, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  addPhotoButtonText: { fontSize: 24, color: '#777' },
  submitButton: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitButtonText: { color: '#fff', fontWeight: '600' },
});
