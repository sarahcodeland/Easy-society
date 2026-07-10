import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Floating nav bar: 62px height + 16px gap from bottom + 16px breathing room = 94
// Combined with the device's own safe-area bottom inset (home indicator on newer phones).
// Use this as paddingBottom on any ScrollView or FlatList inside the tab navigator
// so the nav bar never covers the last item.
export function useNavPadding(): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + 94;
}
