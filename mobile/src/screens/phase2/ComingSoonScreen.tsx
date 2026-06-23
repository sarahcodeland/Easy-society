import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'ComingSoon'>;

// Generic placeholder for every Phase 2 feature (SOS, community wallet,
// skill barter, crop doctor, village diary, mandi prices, livestock
// marketplace, loyalty system, polls/events, business verification badges,
// sponsored listings). Nav entries exist now per the scaffolding
// requirement; no logic is implemented behind them yet.
export default function ComingSoonScreen({ route }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.featureTitle}</Text>
      <Text style={styles.subtitle}>{t('common.comingSoon')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#777', marginTop: 8 },
});
