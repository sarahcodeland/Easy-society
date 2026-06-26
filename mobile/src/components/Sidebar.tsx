import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '../context/SidebarContext';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.8, 320);

type NavItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
};

type Section = {
  title: string;
  items: NavItem[];
};

export default function Sidebar() {
  const { isOpen, close } = useSidebar();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 300,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIsVisible(false);
      });
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    user?.role === 'admin' ? 'Admin' : user?.role === 'moderator' ? 'Moderator' : 'Resident';

  const sections: Section[] = [
    {
      title: 'PERSONAL',
      items: [
        { icon: 'person-outline', label: 'My Profile' },
        { icon: 'stats-chart-outline', label: 'My Activity' },
        { icon: 'bookmark-outline', label: 'Saved Posts' },
        { icon: 'bag-handle-outline', label: 'My Orders / Listings' },
      ],
    },
    {
      title: 'COMMUNITY',
      items: [
        { icon: 'document-text-outline', label: 'Community Guidelines' },
        { icon: 'location-outline', label: 'Switch Community' },
        { icon: 'people-outline', label: 'Invite Neighbors' },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        { icon: 'settings-outline', label: 'Settings' },
        { icon: 'help-circle-outline', label: 'Help & Support' },
        { icon: 'information-circle-outline', label: 'About Easy Society' },
      ],
    },
  ];

  return (
    <>
      {/* Dimming backdrop — tap to close */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Drawer — shadow wrapper keeps elevation visible with rounded corners */}
      <Animated.View style={[styles.drawerShadow, { transform: [{ translateX }] }]}>
        <View style={styles.drawer}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 32 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Profile header ───────────────────────────────────────── */}
            <View style={styles.profileSection}>
              <View style={styles.logoBox}>
                <Text style={styles.logoEmoji}>🏠</Text>
              </View>

              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>

              <Text style={styles.userName}>{user?.name ?? 'User'}</Text>

              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>

              <Text style={styles.locationLabel}>My Community</Text>
            </View>

            <View style={styles.divider} />

            {/* ── Navigation sections ───────────────────────────────────── */}
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => (
                  <Pressable
                    key={item.label}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed,
                    ]}
                    onPress={() => { close(); item.onPress?.(); }}
                  >
                    {({ pressed }) => (
                      <>
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={pressed ? colors.primaryDark : colors.primary}
                        />
                        <Text style={[styles.menuLabel, pressed && styles.menuLabelPressed]}>
                          {item.label}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}

            <View style={styles.divider} />

            {/* ── Logout ───────────────────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={async () => { close(); await logout(); }}
            >
              {({ pressed }) => (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color={pressed ? colors.textSecondary : '#a09890'}
                  />
                  <Text style={[styles.menuLabel, styles.logoutLabel]}>Sign out</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 41, 38, 0.55)',
    zIndex: 90,
  },
  drawerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 100,
    shadowColor: '#2D2926',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
  },
  drawer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },

  /* Profile */
  profileSection: {
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 26 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  roleBadge: {
    backgroundColor: '#FBF2EB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* Layout */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },

  /* Menu items */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  menuItemPressed: {
    backgroundColor: '#FBF2EB',
    transform: [{ scale: 0.97 }],
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  menuLabelPressed: {
    color: colors.primaryDark,
  },
  logoutLabel: {
    color: colors.textSecondary,
  },
});
