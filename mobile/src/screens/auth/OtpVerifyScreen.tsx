import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export default function OtpVerifyScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/otp/verify', { phone_number: phoneNumber, otp });
      await setSession(data.token, data.user);
      if (data.needs_profile) {
        navigation.navigate('ProfileSetup');
      }
      // else RootNavigator switches to MainNavigator automatically once
      // token + user.location_id are both set.
    } catch (err: any) {
      Alert.alert('Verification failed', err.response?.data?.error ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('auth.enterOtp')}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="••••••"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.verify')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 24, letterSpacing: 8, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
