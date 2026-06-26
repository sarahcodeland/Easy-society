import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '../context/SidebarContext';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';

export default function AppHeader() {
  const { open } = useSidebar();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        {/* Hamburger */}
        <Pressable
          onPress={open}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          hitSlop={8}
        >
          <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
        </Pressable>

        {/* Community name */}
        <View style={styles.center}>
          <Text style={styles.communityName} numberOfLines={1}>
            My Community
          </Text>
          <Text style={styles.subtitle}>Village</Text>
        </View>

        {/* Bell + Avatar */}
        <View style={styles.rightSlot}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: colors.card,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  communityName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
