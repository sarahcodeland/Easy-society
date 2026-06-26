import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Location } from '@easysociety/shared';
import { AuthStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import LocationCascadePicker from './LocationCascadePicker';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);

  // Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Personal
  const [name, setName] = useState('');

  // Location cascade
  const [state, setState] = useState<Location | null>(null);
  const [district, setDistrict] = useState<Location | null>(null);
  const [city, setCity] = useState<Location | null>(null);
  const [mandal, setMandal] = useState<Location | null>(null);
  const [area, setArea] = useState<Location | null>(null);

  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter your full name');
      return;
    }
    if (!area) {
      Alert.alert('Missing location', 'Select your area to continue');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        location_id: area.id,
        preferred_language: i18n.language,
      });
      await setSession(data.token, data.user);
      // needs_profile is false — RootNavigator switches to MainNavigator automatically
    } catch (err: any) {
      Alert.alert('Registration failed', err.response?.data?.error ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🏠</Text>
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join your local community</Text>

        {/* ── Account details ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>

        <Text style={styles.label}>{t('auth.email')}</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>{t('auth.password')}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Min. 8 characters"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* ── Personal details ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>

        <Text style={styles.label}>{t('auth.yourName')}</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* ── Location ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>📍 LOCATION</Text>

        <LocationCascadePicker
          label={t('auth.selectState')}
          parentId={null}
          value={state}
          onChange={(loc) => {
            setState(loc);
            setDistrict(null);
            setCity(null);
            setMandal(null);
            setArea(null);
          }}
        />
        <LocationCascadePicker
          label={t('auth.selectDistrict')}
          parentId={state?.id ?? null}
          disabled={!state}
          value={district}
          onChange={(loc) => {
            setDistrict(loc);
            setCity(null);
            setMandal(null);
            setArea(null);
          }}
        />
        <LocationCascadePicker
          label={t('auth.selectCity')}
          parentId={district?.id ?? null}
          disabled={!district}
          value={city}
          onChange={(loc) => {
            setCity(loc);
            setMandal(null);
            setArea(null);
          }}
        />
        <LocationCascadePicker
          label={t('auth.selectMandal')}
          parentId={city?.id ?? null}
          disabled={!city}
          value={mandal}
          onChange={(loc) => {
            setMandal(loc);
            setArea(null);
          }}
        />
        <LocationCascadePicker
          label={t('auth.selectArea')}
          parentId={mandal?.id ?? null}
          disabled={!mandal}
          value={area}
          onChange={setArea}
        />

        <View style={styles.submitWrap}>
          <PrimaryButton title={t('auth.register')} onPress={handleRegister} loading={loading} />
        </View>

        <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.switchText}>{t('auth.switchToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, paddingBottom: 40 },
  logoCircle: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginTop: spacing.lg, marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 26 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center', color: colors.textSecondary, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 11.5, fontWeight: '800', color: colors.primary,
    marginTop: spacing.lg, marginBottom: spacing.md, letterSpacing: 0.5,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    borderRadius: radii.input, padding: 12, fontSize: 14,
    color: colors.textPrimary, marginBottom: spacing.lg,
  },
  submitWrap: { marginTop: spacing.md },
  switchRow: { marginTop: spacing.md, alignItems: 'center', paddingBottom: 8 },
  switchText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
