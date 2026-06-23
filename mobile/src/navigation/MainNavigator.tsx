import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MainTabParamList, ChatStackParamList, QaStackParamList, MarketplaceStackParamList, MoreStackParamList } from './types';

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
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="ChatTab" component={ChatStackNavigator} options={{ title: t('nav.chat') }} />
      <Tabs.Screen name="QaTab" component={QaStackNavigator} options={{ title: t('nav.qa') }} />
      <Tabs.Screen name="StatusTab" component={StatusFeedScreen} options={{ title: t('nav.status') }} />
      <Tabs.Screen name="MarketplaceTab" component={MarketplaceStackNavigator} options={{ title: t('nav.marketplace') }} />
      <Tabs.Screen name="AnnouncementsTab" component={AnnouncementsScreen} options={{ title: t('nav.announcements') }} />
      <Tabs.Screen name="MoreTab" component={MoreStackNavigator} options={{ title: t('nav.more') }} />
    </Tabs.Navigator>
  );
}
