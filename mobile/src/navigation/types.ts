export type AuthStackParamList = {
  Login: undefined;
  ProfileSetup: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { groupId: string; groupName: string };
};

export type QaStackParamList = {
  QuestionFeed: undefined;
  QuestionDetail: { questionId: string };
  AskQuestion: undefined;
};

export type MarketplaceStackParamList = {
  MarketplaceHome: undefined;
  ListingDetail: { listingId: string };
  CreateListing: undefined;
  BusinessDirectory: undefined;
  BusinessDetail: { businessId: string };
  CreateBusiness: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Weather: undefined;
  Schemes: undefined;
  Notifications: undefined;
  ComingSoon: { featureTitle: string };
};

export type MainTabParamList = {
  ChatTab: undefined;
  QaTab: undefined;
  StatusTab: undefined;
  MarketplaceTab: undefined;
  AnnouncementsTab: undefined;
  MoreTab: undefined;
};
