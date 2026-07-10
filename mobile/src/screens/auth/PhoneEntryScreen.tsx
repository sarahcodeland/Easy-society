import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      await setSession(data.token, data.user);
      if (data.needs_profile) {
        navigation.navigate('ProfileSetup');
      }
    } catch (err: any) {
      Alert.alert('Sign in failed', err.response?.data?.error ?? 'Please try again');
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
        <Text style={styles.title}>Easy Society</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

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

        <PrimaryButton title={t('auth.login')} onPress={handleLogin} loading={loading} />

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => navigation.navigate('ChooseLanguage', { next: 'SignUp' })}
        >
          <Text style={styles.switchText}>{t('auth.switchToRegister')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logoCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  logoEmoji: { fontSize: 26 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center', color: colors.textSecondary, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  input: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radii.input, padding: 12, fontSize: 14, color: colors.textPrimary, marginBottom: spacing.lg },
  switchRow: { marginTop: spacing.md, alignItems: 'center' },
  switchText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
