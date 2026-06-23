import {
  LocationType, UserRole, MessageType, VisibilityLevel, QaTargetType, VoteType,
  StatusMediaType, ListingCategory, ReactionType, NotificationType,
  ModerationTargetType, ModerationAction, LanguageCode,
} from '../constants/enums';

// Base fields present on every row per the DB schema.
export interface Timestamped {
  created_at: string; // ISO 8601, UTC
  updated_at: string;
}

export interface SoftDeletable {
  is_deleted: boolean;
}

export interface Location extends Timestamped {
  id: string;
  name: string;
  type: LocationType;
  parent_id: string | null;
  lat: number | null;
  lng: number | null;
}

export interface User extends Timestamped {
  id: string;
  phone_number: string;
  name: string;
  profile_photo_url: string | null;
  location_id: string | null;
  role: UserRole;
  is_verified: boolean;
  is_deleted: boolean;
  preferred_language?: LanguageCode;
}

// Attached client-side / by API responses to flag content from outside the
// viewing user's registered area. See backend visitorTag() helper.
export interface VisitorTag {
  is_visitor: boolean;
  visitor_location_label: string | null; // e.g. "Kukatpally, Hyderabad"
}

export interface ChatGroup extends Timestamped {
  id: string;
  location_id: string;
  name: string;
}

export interface ChatMessage extends Timestamped {
  id: string;
  group_id: string;
  sender_user_id: string | null;
  message_type: MessageType;
  content: string | null;
  reply_to_message_id: string | null;
  is_deleted: boolean;
  sender?: Pick<User, 'id' | 'name' | 'profile_photo_url'> & Partial<VisitorTag>;
}

export interface Question extends Timestamped, SoftDeletable {
  id: string;
  user_id: string | null;
  location_id: string;
  visibility_level: VisibilityLevel;
  title: string;
  body: string | null;
  vote_score?: number;
  recommendation_count?: number;
}

export interface Answer extends Timestamped, SoftDeletable {
  id: string;
  question_id: string;
  user_id: string | null;
  body: string;
  vote_score?: number;
  recommendation_count?: number;
}

export interface QaVote {
  user_id: string;
  target_id: string;
  target_type: QaTargetType;
  vote_type: VoteType;
}

export interface QaRecommendation {
  user_id: string;
  target_id: string;
  target_type: QaTargetType;
}

export interface Status extends Timestamped, SoftDeletable {
  id: string;
  user_id: string | null;
  location_id: string;
  media_type: StatusMediaType;
  content_url: string | null;
  text_content: string | null;
  expires_at: string;
}

export interface Listing extends Timestamped, SoftDeletable {
  id: string;
  user_id: string | null;
  location_id: string;
  visibility_level: VisibilityLevel;
  category: ListingCategory;
  sub_category: string | null;
  title: string;
  description: string | null;
  price: number | null;
  contact_info: string | null;
  is_active: boolean;
  recommendation_count?: number;
}

export interface Business extends Timestamped, SoftDeletable {
  id: string;
  user_id: string | null;
  location_id: string;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  contact_number: string | null;
  working_hours: Record<string, { open: string; close: string; closed?: boolean }>;
  is_google_maps_registered: boolean;
  google_maps_place_id: string | null;
  is_verified: boolean;
}

export interface Announcement extends Timestamped, SoftDeletable {
  id: string;
  posted_by_user_id: string | null;
  location_id: string;
  visibility_level: VisibilityLevel;
  title: string;
  body: string | null;
  is_pinned: boolean;
  is_official: boolean;
}

export interface Notification extends Timestamped {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
}

export interface Scheme extends Timestamped {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  language: string;
  location_id: string | null;
  last_synced_at: string | null;
}

export interface ModerationActionRecord extends Timestamped {
  id: string;
  moderator_user_id: string | null;
  target_type: ModerationTargetType;
  target_id: string;
  action: ModerationAction;
  reason: string | null;
}
