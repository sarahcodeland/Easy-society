import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { disconnectChatSocket } from '../../api/socket';
import { useNavPadding } from '../../hooks/useNavPadding';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreMenu'>;

const LIVE_ITEMS: { label: string; screen: keyof MoreStackParamList }[] = [
  { label: 'Community Members', screen: 'CommunityMembers' },
  { label: 'Weather', screen: 'Weather' },
  { label: 'Government Schemes', screen: 'Schemes' },
  { label: 'Notifications', screen: 'Notifications' },
];

// Phase 2 features per the product spec — scaffolded as "Coming soon" nav
// entries only, no logic behind them yet.
const PHASE_2_ITEMS = [
  'SOS Emergency Button',
  'Community Wallet / Fund',
  'Skill Barter System',
  'Crop Doctor',
  'Village Memory / Diary',
  'Mandi Prices',
  'Cattle / Livestock Marketplace',
  'Business Loyalty Program',
  'Polls & Events',
  'Business Verification Badges',
  'Sponsored Listings',
];

export default function MoreMenuScreen({ navigation }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const navPadding = useNavPadding();

  return (
    <FlatList
      data={[...LIVE_ITEMS.map((i) => ({ ...i, isPhase2: false })), ...PHASE_2_ITEMS.map((label) => ({ label, screen: 'ComingSoon' as const, isPhase2: true }))]}
      keyExtractor={(item) => item.label}
      contentContainerStyle={{ paddingBottom: navPadding }}
      ListFooterComponent={
        <TouchableOpacity
          style={styles.logout}
          onPress={() => Alert.alert('Log out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: () => { disconnectChatSocket(); logout(); } },
          ])}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            item.screen === 'ComingSoon'
              ? navigation.navigate('ComingSoon', { featureTitle: item.label })
              : navigation.navigate(item.screen as 'Weather' | 'Schemes' | 'Notifications' | 'CommunityMembers')
          }
        >
          <Text style={styles.label}>{item.label}</Text>
          {item.isPhase2 && <Text style={styles.badge}>Soon</Text>}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: 16 },
  badge: { fontSize: 11, color: '#999', backgroundColor: '#f2f2f2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  logout: { padding: 16, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#b00020', fontWeight: '600' },
});
