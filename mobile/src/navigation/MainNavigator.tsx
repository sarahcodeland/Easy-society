import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList, ChatStackParamList, QaStackParamList, StatusStackParamList, MarketplaceStackParamList, MoreStackParamList } from './types';
import { colors, spacing, shadow } from '../theme';
import { SidebarProvider } from '../context/SidebarContext';
import AppHeader from '../components/AppHeader';
import Sidebar from '../components/Sidebar';

import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';

import QuestionFeedScreen from '../screens/qa/QuestionFeedScreen';
import QuestionDetailScreen from '../screens/qa/QuestionDetailScreen';
import AskQuestionScreen from '../screens/qa/AskQuestionScreen';

import StatusFeedScreen from '../screens/status/StatusFeedScreen';
import CreateStatusScreen from '../screens/status/CreateStatusScreen';

import MarketplaceHomeScreen from '../screens/marketplace/MarketplaceHomeScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import BusinessDirectoryScreen from '../screens/business/BusinessDirectoryScreen';
import BusinessDetailScreen from '../screens/business/BusinessDetailScreen';
import CreateBusinessScreen from '../screens/business/CreateBusinessScreen';

import AnnouncementsScreen from '../screens/announcements/AnnouncementsScreen';

import MoreMenuScreen from '../screens/more/MoreMenuScreen';
import WeatherScreen from '../screens/weather/WeatherScreen';
import SchemesScreen from '../screens/schemes/SchemesScreen';
import NotificationsScreen from '../screens/more/NotificationsScreen';
import ComingSoonScreen from '../screens/phase2/ComingSoonScreen';
import CommunityMembersScreen from '../screens/community/CommunityMembersScreen';
import UserProfileScreen from '../screens/community/UserProfileScreen';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const QaStack = createNativeStackNavigator<QaStackParamList>();
const StatusStack = createNativeStackNavigator<StatusStackParamList>();
const MarketplaceStack = createNativeStackNavigator<MarketplaceStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { icon: TabIconName; label: string }> = {
  ChatTab:          { icon: 'chatbubble-outline',  label: 'Chat'   },
  QaTab:            { icon: 'help-circle-outline', label: 'Q&A'    },
  StatusTab:        { icon: 'sunny-outline',        label: 'Status' },
  MarketplaceTab:   { icon: 'storefront-outline',  label: 'Market' },
  AnnouncementsTab: { icon: 'megaphone-outline',   label: 'News'   },
};

const VISIBLE_TABS = ['ChatTab', 'QaTab', 'StatusTab', 'MarketplaceTab', 'AnnouncementsTab'];

const ACTIVE_FLEX   = 2.5;
const INACTIVE_FLEX = 1;

// ── Single tab button ─────────────────────────────────────────────────────────
// Receives isFocused and cross-fades between bare icon (inactive) and pill (active).
// No absolute positioning — pill lives in normal flow inside the flex-animated slot.

function TabButton({
  isFocused, cfg, onPress, accessibilityLabel,
}: {
  isFocused: boolean;
  cfg: { icon: TabIconName; label: string };
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const opacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isFocused, opacity]);

  const iconOpacity = opacity.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <TouchableOpacity
      style={T.tab}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel ?? cfg.label}
    >
      {/* Bare icon — rendered at all times, fades to 0 when active */}
      <Animated.View style={[StyleSheet.absoluteFill, T.centered, { opacity: iconOpacity }]}>
        <Ionicons name={cfg.icon} size={26} color="rgba(255,255,255,0.45)" />
      </Animated.View>

      {/* Pill — in normal flow (not absolute), fades in when active.
          The parent Animated.View expands its flex so the pill always has room. */}
      <Animated.View style={[T.pill, { opacity }]}>
        <Ionicons name={cfg.icon} size={20} color="#fff" />
        <Text style={T.pillLabel} numberOfLines={1}>{cfg.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Floating tab bar ──────────────────────────────────────────────────────────

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter(r => VISIBLE_TABS.includes(r.name));

  // One Animated.Value per visible tab — drives the flex of each slot.
  // useNativeDriver:false is required because flex is a layout property.
  const flexAnims = useRef(
    visibleRoutes.map(route => {
      const globalIdx = state.routes.findIndex(r => r.key === route.key);
      return new Animated.Value(state.index === globalIdx ? ACTIVE_FLEX : INACTIVE_FLEX);
    })
  ).current;

  useEffect(() => {
    Animated.parallel(
      visibleRoutes.map((route, i) => {
        const globalIdx = state.routes.findIndex(r => r.key === route.key);
        return Animated.timing(flexAnims[i], {
          toValue: state.index === globalIdx ? ACTIVE_FLEX : INACTIVE_FLEX,
          duration: 250,
          useNativeDriver: false,
        });
      })
    ).start();
  // flexAnims is stable (created once in useRef); visibleRoutes is stable too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  return (
    <View style={T.wrapper} pointerEvents="box-none">
      {/* Shadow carrier — must NOT have overflow:hidden or iOS clips the shadow */}
      <View style={[T.barWrap, { bottom: insets.bottom + 16 }]}>
        {/* Inner row — overflow:hidden keeps rounded corners clean */}
        <View style={T.barInner}>
          {visibleRoutes.map((route, i) => {
            const globalIdx = state.routes.findIndex(r => r.key === route.key);
            const isFocused = state.index === globalIdx;
            const cfg = TAB_CONFIG[route.name];

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
            };

            return (
              // Flex-animated slot — expands for active, contracts for inactive
              <Animated.View key={route.key} style={{ flex: flexAnims[i] }}>
                <TabButton
                  isFocused={isFocused}
                  cfg={cfg}
                  onPress={onPress}
                  accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
                />
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const T = StyleSheet.create({
  // Zero-height wrapper — floats over screen content without taking layout space
  wrapper: {
    height: 0,
    overflow: 'visible',
    zIndex: 999,
    elevation: 24,
  },

  // Shadow layer — position:absolute, borderRadius matches pill shape
  barWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 62,
    borderRadius: 100,
    backgroundColor: 'rgba(61, 31, 23, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
  },

  // Row container with overflow:hidden so rounded corners clip any child content
  barInner: {
    flex: 1,
    height: 62,
    borderRadius: 100,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Each tab fills its Animated.View slot fully
  tab: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Helper: center content in absoluteFill
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active pill — in normal layout flow, centered by parent tab's alignItems
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B2E2E',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },

  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── Stack navigators ─────────────────────────────────────────────────────────

const HEADERLESS = { headerShown: false } as const;

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator screenOptions={HEADERLESS}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </ChatStack.Navigator>
  );
}

function StatusStackNavigator() {
  return (
    <StatusStack.Navigator screenOptions={HEADERLESS}>
      <StatusStack.Screen name="StatusFeed" component={StatusFeedScreen} />
      <StatusStack.Screen name="CreateStatus" component={CreateStatusScreen} />
    </StatusStack.Navigator>
  );
}

function QaStackNavigator() {
  return (
    <QaStack.Navigator screenOptions={HEADERLESS}>
      <QaStack.Screen name="QuestionFeed" component={QuestionFeedScreen} />
      <QaStack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
      <QaStack.Screen name="AskQuestion" component={AskQuestionScreen} />
    </QaStack.Navigator>
  );
}

function MarketplaceStackNavigator() {
  return (
    <MarketplaceStack.Navigator screenOptions={HEADERLESS}>
      <MarketplaceStack.Screen name="MarketplaceHome" component={MarketplaceHomeScreen} />
      <MarketplaceStack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <MarketplaceStack.Screen name="CreateListing" component={CreateListingScreen} />
      <MarketplaceStack.Screen name="BusinessDirectory" component={BusinessDirectoryScreen} />
      <MarketplaceStack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
      <MarketplaceStack.Screen name="CreateBusiness" component={CreateBusinessScreen} />
    </MarketplaceStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={HEADERLESS}>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <MoreStack.Screen name="Weather" component={WeatherScreen} />
      <MoreStack.Screen name="Schemes" component={SchemesScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStack.Screen name="ComingSoon" component={ComingSoonScreen} />
      <MoreStack.Screen name="CommunityMembers" component={CommunityMembersScreen} />
      <MoreStack.Screen name="UserProfile" component={UserProfileScreen} />
    </MoreStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="ChatTab" component={ChatStackNavigator} />
      <Tabs.Screen name="QaTab" component={QaStackNavigator} />
      <Tabs.Screen name="StatusTab" component={StatusStackNavigator} />
      <Tabs.Screen name="MarketplaceTab" component={MarketplaceStackNavigator} />
      <Tabs.Screen name="AnnouncementsTab" component={AnnouncementsScreen} />
      <Tabs.Screen name="MoreTab" component={MoreStackNavigator} />
    </Tabs.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <SidebarProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader />
        <View style={{ flex: 1 }}>
          <TabNavigator />
        </View>
        <Sidebar />
      </View>
    </SidebarProvider>
  );
}
