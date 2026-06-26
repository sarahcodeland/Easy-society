import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import LanguagePicker from './LanguagePicker';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await apiClient.post(endpoint, { email: email.trim().toLowerCase(), password });
      await setSession(data.token, data.user);
      if (data.needs_profile) {
        navigation.navigate('ProfileSetup');
      }
    } catch (err: any) {
      Alert.alert(
        mode === 'login' ? 'Sign in failed' : 'Registration failed',
        err.response?.data?.error ?? 'Please try again',
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <View style={styles.container}>
      <LanguagePicker />
      <View style={styles.logoCircle}>
        <Text style={styles.logoEmoji}>🏠</Text>
      </View>
      <Text style={styles.title}>Easy Society</Text>

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
        placeholder="••••••••"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'register' && (
        <>
          <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </>
      )}

      <PrimaryButton
        title={mode === 'login' ? t('auth.login') : t('auth.register')}
        onPress={handleSubmit}
        loading={loading}
      />

      <TouchableOpacity style={styles.switchRow} onPress={toggleMode}>
        <Text style={styles.switchText}>
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  logoCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  logoEmoji: { fontSize: 26 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: colors.primary, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  input: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radii.input, padding: 12, fontSize: 14, color: colors.textPrimary, marginBottom: spacing.lg },
  switchRow: { marginTop: spacing.md, alignItems: 'center' },
  switchText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
