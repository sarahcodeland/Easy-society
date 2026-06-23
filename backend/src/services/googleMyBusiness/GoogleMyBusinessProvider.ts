export interface BusinessListingInput {
  name: string;
  address: string;
  contactNumber: string;
  category: string;
  photoUrls: string[];
  workingHours: Record<string, { open: string; close: string; closed?: boolean }>;
}

export interface BusinessListingResult {
  placeId: string;
  mapsUrl: string;
}

// Wraps the Google My Business (Business Profile) API. The real flow is
// OAuth: the business owner grants EasySociety's app consent once, then
// createOrSuggestListing() calls Business Information API's
// accounts.locations.create (or searches for an existing match first) on
// their behalf — "auto-registration without the owner needing to know how".
export interface GoogleMyBusinessProvider {
  createOrSuggestListing(input: BusinessListingInput, oauthAccessToken: string): Promise<BusinessListingResult>;
}
