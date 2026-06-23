import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';

type Props = NativeStackScreenProps<MarketplaceStackParamList, 'CreateBusiness'>;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function CreateBusinessScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    Object.fromEntries(DAYS.map((d) => [d, { open: '09:00', close: '18:00', closed: false }])),
  );

  function setDayClosed(day: string, closed: boolean) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], closed } }));
  }

  async function submit() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the business name');
      return;
    }
    await apiClient.post('/businesses', {
      name: name.trim(), description: description.trim() || null, category: category.trim() || null,
      address: address.trim() || null, contact_number: contactNumber.trim() || null, working_hours: hours,
    });
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Business name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Grocery, Tailor, Clinic" />
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Address</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />
      <Text style={styles.label}>Contact number</Text>
      <TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />

      <Text style={styles.label}>Working hours</Text>
      {DAYS.map((day) => (
        <View key={day} style={styles.dayRow}>
          <Text style={styles.dayLabel}>{day.toUpperCase()}</Text>
          <Switch value={!hours[day].closed} onValueChange={(open) => setDayClosed(day, !open)} />
          <Text style={styles.dayHours}>{hours[day].closed ? 'Closed' : `${hours[day].open} - ${hours[day].close}`}</Text>
        </View>
      ))}

      <Text style={styles.note}>
        After saving, you can register this business on Google Maps with one tap from its profile page —
        no need to use Google's own console.
      </Text>

      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Save business</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 13, color: '#555', marginTop: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  dayLabel: { width: 40, fontSize: 13 },
  dayHours: { fontSize: 13, color: '#555' },
  note: { fontSize: 12, color: '#777', marginTop: 16, fontStyle: 'italic' },
  button: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
