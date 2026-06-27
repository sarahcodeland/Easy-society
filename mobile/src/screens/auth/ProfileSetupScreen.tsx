import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Location } from '@easysociety/shared';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import LocationCascadePicker from './LocationCascadePicker';
import GoogleLocationPicker from '../../components/GoogleLocationPicker';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radii, spacing } from '../../theme';

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
      <Text style={styles.titleHeading}>Create Account</Text>
      <Text style={styles.subHeading}>Start your community journey today.</Text>

      <Text style={styles.label}>{t('auth.yourName')}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.textMuted} />

      <Text style={styles.sectionLabel}>📍 LOCATION DETAILS</Text>

      <GoogleLocationPicker
        onResolved={(h) => {
          setState(h.state);
          setDistrict(h.district);
          setCity(h.city);
          setMandal(h.mandal);
          setArea(h.area);
        }}
      />

      <Text style={styles.manualHint}>Or select manually:</Text>

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

      <View style={styles.submitButton}>
        <PrimaryButton title={t('auth.finishSetup')} onPress={handleFinish} loading={loading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, backgroundColor: colors.background },
  titleHeading: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  subHeading: { fontSize: 12.5, color: colors.textSecondary, marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  sectionLabel: { fontSize: 11.5, fontWeight: '800', color: colors.primary, marginVertical: spacing.md, letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radii.input, padding: 12, fontSize: 14, color: colors.textPrimary, marginBottom: spacing.lg },
  submitButton: { marginTop: spacing.sm, marginBottom: 40 },
  manualHint: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: 4 },
});
