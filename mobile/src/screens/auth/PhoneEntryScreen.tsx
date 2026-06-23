import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { apiClient } from '../../api/client';
import LanguagePicker from './LanguagePicker';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export default function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!/^\+?[0-9]{10,15}$/.test(phoneNumber)) {
      Alert.alert('Invalid number', 'Enter a valid mobile number');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/otp/request', { phone_number: phoneNumber });
      navigation.navigate('OtpVerify', { phoneNumber });
    } catch (err: any) {
      Alert.alert('Could not send OTP', err.response?.data?.error ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LanguagePicker />
      <Text style={styles.title}>EasySociety</Text>
      <Text style={styles.label}>{t('auth.enterPhone')}</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="+91XXXXXXXXXX"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        maxLength={15}
      />
      <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.sendOtp')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#2E7D32', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
