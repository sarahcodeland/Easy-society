import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MainTabParamList, ChatStackParamList, QaStackParamList, MarketplaceStackParamList, MoreStackParamList } from './types';
import { colors, spacing, shadow } from '../theme';

import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';

import QuestionFeedScreen from '../screens/qa/QuestionFeedScreen';
import QuestionDetailScreen from '../screens/qa/QuestionDetailScreen';
import AskQuestionScreen from '../screens/qa/AskQuestionScreen';

import StatusFeedScreen from '../screens/status/StatusFeedScreen';

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
  const visibleRoutes = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  return (
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
            <View style={[tabStyles.pill, isFocused && tabStyles.pillActive]}>
              <Ionicons
                name={isFocused ? cfg?.iconFocused : cfg?.icon}
                size={20}
                color={isFocused ? '#FFFFFF' : colors.inactive}
              />
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {cfg?.label ?? route.name}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow,
  },
  tab: { flex: 1, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pillActive: { backgroundColor: colors.primary },
  label: { fontSize: 11, fontWeight: '600', color: colors.inactive },
  labelActive: { color: '#FFFFFF' },
});

// ── Stack navigators ─────────────────────────────────────────────────────────

function ChatStackNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Community Chat' }} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} options={({ route }) => ({ title: route.params.groupName })} />
    </ChatStack.Navigator>
  );
}

function QaStackNavigator() {
  return (
    <QaStack.Navigator>
      <QaStack.Screen name="QuestionFeed" component={QuestionFeedScreen} options={{ title: 'Q&A' }} />
      <QaStack.Screen name="QuestionDetail" component={QuestionDetailScreen} options={{ title: 'Question' }} />
      <QaStack.Screen name="AskQuestion" component={AskQuestionScreen} options={{ title: 'Ask a question' }} />
    </QaStack.Navigator>
  );
}

function MarketplaceStackNavigator() {
  return (
    <MarketplaceStack.Navigator>
      <MarketplaceStack.Screen name="MarketplaceHome" component={MarketplaceHomeScreen} options={{ title: 'Marketplace' }} />
      <MarketplaceStack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing' }} />
      <MarketplaceStack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'New listing' }} />
      <MarketplaceStack.Screen name="BusinessDirectory" component={BusinessDirectoryScreen} options={{ title: 'Businesses' }} />
      <MarketplaceStack.Screen name="BusinessDetail" component={BusinessDetailScreen} options={{ title: 'Business' }} />
      <MarketplaceStack.Screen name="CreateBusiness" component={CreateBusinessScreen} options={{ title: 'Register business' }} />
    </MarketplaceStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <MoreStack.Screen name="Weather" component={WeatherScreen} options={{ title: 'Weather' }} />
      <MoreStack.Screen name="Schemes" component={SchemesScreen} options={{ title: 'Government Schemes' }} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <MoreStack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={({ route }) => ({ title: route.params.featureTitle })}
      />
    </MoreStack.Navigator>
  );
}

export default function MainNavigator() {
  const { t } = useTranslation();
  return (
    <Tabs.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="ChatTab" component={ChatStackNavigator} />
      <Tabs.Screen name="QaTab" component={QaStackNavigator} />
      <Tabs.Screen name="StatusTab" component={StatusFeedScreen} />
      <Tabs.Screen name="MarketplaceTab" component={MarketplaceStackNavigator} />
      <Tabs.Screen name="AnnouncementsTab" component={AnnouncementsScreen} />
      <Tabs.Screen name="MoreTab" component={MoreStackNavigator} />
    </Tabs.Navigator>
  );
}
