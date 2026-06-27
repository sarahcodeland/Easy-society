// import axios from 'axios'; // TODO: restore for production

export interface GeocodedPlace {
  state: string | null;
  district: string | null;
  city: string | null;
  mandal: string | null;
  area: string | null;
  formatted_address: string;
  lat: number;
  lng: number;
}

// TODO: swap to real Google Geocoding API before production.
// Uncomment the implementation below and remove MOCK_GEOCODED.
const MOCK_GEOCODED: GeocodedPlace = {
  state: 'Telangana',
  district: 'Hyderabad',
  city: null,
  mandal: 'Kukatpally',
  area: 'KPHB Colony',
  formatted_address: 'KPHB Colony, Kukatpally, Hyderabad, Telangana 500072',
  lat: 17.4947,
  lng: 78.3996,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function geocodePlaceId(_placeId: string): Promise<GeocodedPlace> {
  return MOCK_GEOCODED;

  // --- Real implementation (restore before production) ---
  // const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');
  //
  // const { data } = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
  //   params: { place_id: _placeId, key: apiKey },
  // });
  //
  // if (data.status !== 'OK' || !data.results?.length) {
  //   throw new Error(`Geocoding failed: ${data.status}`);
  // }
  //
  // const result = data.results[0];
  // const parts = result.address_components as { long_name: string; types: string[] }[];
  //
  // const find = (...types: string[]): string | null =>
  //   parts.find(p => types.some(t => p.types.includes(t)))?.long_name ?? null;
  //
  // const adminL3 = find('administrative_area_level_3');
  // const subL1   = find('sublocality_level_1');
  // const subL2   = find('sublocality_level_2');
  //
  // return {
  //   state:    find('administrative_area_level_1'),
  //   district: find('administrative_area_level_2'),
  //   city:     find('locality'),
  //   mandal:   adminL3 ?? subL1,
  //   area:     adminL3 ? (subL1 ?? subL2) : (subL2 ?? find('neighborhood') ?? subL1),
  //   formatted_address: result.formatted_address,
  //   lat: result.geometry.location.lat,
  //   lng: result.geometry.location.lng,
  // };
}
