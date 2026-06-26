import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const Tabs = createBottomTabNavigator<MainTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const QaStack = createNativeStackNavigator<QaStackParamList>();
const StatusStack = createNativeStackNavigator<StatusStackParamList>();
const MarketplaceStack = createNativeStackNavigator<MarketplaceStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { icon: TabIconName; iconFocused: TabIconName; label: string }> = {
  ChatTab:          { icon: 'chatbubble-ellipses-outline', iconFocused: 'chatbubble-ellipses', label: 'Chat' },
  QaTab:            { icon: 'help-circle-outline',          iconFocused: 'help-circle',          label: 'Q&A' },
  StatusTab:        { icon: 'add-circle-outline',           iconFocused: 'add-circle',            label: 'Status' },
  MarketplaceTab:   { icon: 'bag-handle-outline',           iconFocused: 'bag-handle',            label: 'Market' },
  AnnouncementsTab: { icon: 'newspaper-outline',            iconFocused: 'newspaper',             label: 'News' },
};

// Only these 5 tabs appear in the bottom bar; MoreTab is kept for programmatic access.
const VISIBLE_TABS = ['ChatTab', 'QaTab', 'StatusTab', 'MarketplaceTab', 'AnnouncementsTab'];

function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  return (
    <View style={[tabStyles.wrapper, { paddingBottom: insets.bottom + 14 }]}>
      <View style={tabStyles.bar}>
        {visibleRoutes.map((route) => {
          const globalIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === globalIndex;
          const cfg = TAB_CONFIG[route.name];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabStyles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel ?? cfg?.label}
            >
              <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
                <Ionicons
                  name={isFocused ? cfg?.iconFocused : cfg?.icon}
                  size={26}
                  color={isFocused ? '#fff' : colors.inactive}
                />
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {cfg?.label ?? route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  /* Outer shell — matches screen bg so content doesn't bleed through the gaps */
  wrapper: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  /* The floating pill itself */
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#3D1F17',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 16,
  },
  /* Each tab column */
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  /* Perfect circle behind the icon when active */
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inactive,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.primary,
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
