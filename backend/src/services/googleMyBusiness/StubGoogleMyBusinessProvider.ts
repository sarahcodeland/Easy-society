import { BusinessListingInput, BusinessListingResult, GoogleMyBusinessProvider } from './GoogleMyBusinessProvider';

// Dev stub: fabricates a plausible place_id/maps URL instead of calling
// Google. Swap for a real implementation that uses
// GOOGLE_MY_BUSINESS_CLIENT_ID/SECRET (OAuth) and the Business Information
// API once the app is verified with Google — same interface, no call sites
// elsewhere change.
export class StubGoogleMyBusinessProvider implements GoogleMyBusinessProvider {
  async createOrSuggestListing(input: BusinessListingInput): Promise<BusinessListingResult> {
    const fakePlaceId = `STUB_${Buffer.from(input.name).toString('base64url')}`;
    return {
      placeId: fakePlaceId,
      mapsUrl: `https://maps.google.com/?q=place_id:${fakePlaceId}`,
    };
  }
}
