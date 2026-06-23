// Mirrors the PostgreSQL enum types in db/migrations/0001_init_schema.sql.
// Keep these in sync with the database — they are the single source of truth
// for fixed-value columns shared between backend and mobile.

export const LocationType = {
  STATE: 'state',
  DISTRICT: 'district',
  CITY: 'city',
  VILLAGE: 'village',
  MANDAL: 'mandal',
  AREA: 'area',
} as const;
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

export const UserRole = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  VOICE: 'voice',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const VisibilityLevel = {
  AREA: 'area',
  MANDAL: 'mandal',
  DISTRICT: 'district',
  STATE: 'state',
  NATIONAL: 'national',
} as const;
export type VisibilityLevel = (typeof VisibilityLevel)[keyof typeof VisibilityLevel];

// Order matters: index = how "wide" the visibility is. Used to check
// whether a user's expanded filter level includes a given piece of content.
export const VISIBILITY_LEVEL_ORDER: VisibilityLevel[] = [
  VisibilityLevel.AREA,
  VisibilityLevel.MANDAL,
  VisibilityLevel.DISTRICT,
  VisibilityLevel.STATE,
  VisibilityLevel.NATIONAL,
];

export const QaTargetType = {
  QUESTION: 'question',
  ANSWER: 'answer',
} as const;
export type QaTargetType = (typeof QaTargetType)[keyof typeof QaTargetType];

export const VoteType = {
  UPVOTE: 'upvote',
  DOWNVOTE: 'downvote',
} as const;
export type VoteType = (typeof VoteType)[keyof typeof VoteType];

export const StatusMediaType = {
  TEXT: 'text',
  PHOTO: 'photo',
  VIDEO: 'video',
} as const;
export type StatusMediaType = (typeof StatusMediaType)[keyof typeof StatusMediaType];

export const ListingCategory = {
  BUY_SELL: 'buy_sell',
  RENT: 'rent',
  SERVICES: 'services',
  JOBS: 'jobs',
  BUSINESSES: 'businesses',
} as const;
export type ListingCategory = (typeof ListingCategory)[keyof typeof ListingCategory];

export const ReactionType = {
  LIKE: 'like',
  LOVE: 'love',
  HELPFUL: 'helpful',
  NOT_HELPFUL: 'not_helpful',
} as const;
export type ReactionType = (typeof ReactionType)[keyof typeof ReactionType];

export const NotificationType = {
  MESSAGE: 'message',
  REPLY: 'reply',
  UPVOTE: 'upvote',
  RECOMMENDATION: 'recommendation',
  ANNOUNCEMENT: 'announcement',
  REPORT_RESOLVED: 'report_resolved',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ModerationTargetType = {
  USER: 'user',
  MESSAGE: 'message',
  POST: 'post',
  LISTING: 'listing',
  ANNOUNCEMENT: 'announcement',
} as const;
export type ModerationTargetType = (typeof ModerationTargetType)[keyof typeof ModerationTargetType];

export const ModerationAction = {
  WARN: 'warn',
  REMOVE: 'remove',
  BAN: 'ban',
  RESTORE: 'restore',
} as const;
export type ModerationAction = (typeof ModerationAction)[keyof typeof ModerationAction];

export const BUY_SELL_SUBCATEGORIES = [
  'mobiles', 'bikes', 'cars', 'furniture', 'electronics', 'land', 'agricultural_equipment',
] as const;

export const RENT_SUBCATEGORIES = [
  'houses', 'rooms', 'shops', 'offices', 'vehicles', 'agricultural_equipment',
] as const;

export const SERVICE_SUBCATEGORIES = [
  'electrician', 'plumber', 'mechanic', 'carpenter', 'painter', 'driver', 'photographer', 'tutor', 'other',
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// New accounts cannot post official/community announcements until this many
// days have passed since registration — anti-spam / anti-impersonation gate.
export const MIN_ACCOUNT_AGE_DAYS_FOR_ANNOUNCEMENTS = 7;

// Stories/status auto-expiry window.
export const STATUS_EXPIRY_HOURS = 24;
