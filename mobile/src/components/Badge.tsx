import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  label: string;
  variant?: 'success' | 'warning';
}

export default function Badge({ label, variant = 'success' }: Props) {
  const isSuccess = variant === 'success';
  return (
    <View style={[styles.badge, { backgroundColor: isSuccess ? colors.successBg : colors.warningBg }]}>
      <Text style={[styles.text, { color: isSuccess ? colors.success : colors.warningText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});
