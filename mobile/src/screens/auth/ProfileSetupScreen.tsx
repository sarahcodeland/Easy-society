import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Location } from '@easysociety/shared';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import LocationCascadePicker from './LocationCascadePicker';

export default function ProfileSetupScreen() {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [state, setState] = useState<Location | null>(null);
  const [district, setDistrict] = useState<Location | null>(null);
  const [city, setCity] = useState<Location | null>(null);
  const [mandal, setMandal] = useState<Location | null>(null);
  const [area, setArea] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);

  async function handleFinish() {
    if (!name.trim() || !area) {
      Alert.alert('Incomplete', 'Enter your name and select your area to continue');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.put('/auth/profile', {
        name: name.trim(),
        location_id: area.id,
        preferred_language: i18n.language,
      });
      await updateUser(data.user);
      // RootNavigator switches to MainNavigator automatically once
      // user.location_id is set.
    } catch (err: any) {
      Alert.alert('Could not save profile', err.response?.data?.error ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>{t('auth.yourName')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

      <LocationCascadePicker
        label={t('auth.selectState')}
        parentId={null}
        value={state}
        onChange={(loc) => { setState(loc); setDistrict(null); setCity(null); setMandal(null); setArea(null); }}
      />
      <LocationCascadePicker
        label={t('auth.selectDistrict')}
        parentId={state?.id ?? null}
        disabled={!state}
        value={district}
        onChange={(loc) => { setDistrict(loc); setCity(null); setMandal(null); setArea(null); }}
      />
      <LocationCascadePicker
        label={t('auth.selectCity')}
        parentId={district?.id ?? null}
        disabled={!district}
        value={city}
        onChange={(loc) => { setCity(loc); setMandal(null); setArea(null); }}
      />
      <LocationCascadePicker
        label={t('auth.selectMandal')}
        parentId={city?.id ?? null}
        disabled={!city}
        value={mandal}
        onChange={(loc) => { setMandal(loc); setArea(null); }}
      />
      <LocationCascadePicker
        label={t('auth.selectArea')}
        parentId={mandal?.id ?? null}
        disabled={!mandal}
        value={area}
        onChange={setArea}
      />

      <TouchableOpacity style={styles.button} onPress={handleFinish} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.finishSetup')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  label: { fontSize: 14, color: '#555', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
