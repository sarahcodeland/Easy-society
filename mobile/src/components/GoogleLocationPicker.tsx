import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// TODO: restore for production
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Location } from '@easysociety/shared';
import { apiClient } from '../api/client';
import { colors } from '../theme';

export interface LocationHierarchy {
  state: Location | null;
  district: Location | null;
  city: Location | null;
  mandal: Location | null;
  area: Location | null;
}

interface Props {
  onResolved: (hierarchy: LocationHierarchy) => void;
}

// TODO: restore for production
// const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export default function GoogleLocationPicker({ onResolved }: Props) {
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<LocationHierarchy | null>(null);
  const [error, setError] = useState('');

  async function handleSelect(placeId: string) {
    if (!placeId) return;
    setResolving(true);
    setError('');
    setResolved(null);
    try {
      const { data } = await apiClient.get('/locations/resolve-place', {
        params: { place_id: placeId },
      });
      const hierarchy: LocationHierarchy = data.resolved;
      setResolved(hierarchy);
      onResolved(hierarchy);
    } catch {
      setError('Could not match this location. Please use the dropdowns below to select manually.');
    } finally {
      setResolving(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* TODO: swap mock button for GooglePlacesAutocomplete before production */}
      <TouchableOpacity style={styles.mockButton} onPress={() => handleSelect('MOCK_PLACE')}>
        <Text style={styles.mockButtonText}>Use mock location (dev)</Text>
      </TouchableOpacity>

      {/* --- Real implementation (restore before production) ---
      <GooglePlacesAutocomplete
        placeholder="Search your area or colony…"
        onPress={(data) => handleSelect(data.place_id)}
        query={{
          key: API_KEY,
          language: 'en',
          components: 'country:in',
          types: 'geocode',
        }}
        fetchDetails={false}
        enablePoweredByContainer={false}
        keepResultsAfterBlur={false}
        styles={{
          container: { flex: 0, zIndex: 10 },
          textInput: styles.searchInput,
          listView: styles.listView,
          row: styles.listRow,
          description: styles.listDescription,
          separator: styles.listSeparator,
        }}
      />
      */}

      {resolving && (
        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Extracting location details…</Text>
        </View>
      )}

      {resolved && !resolving && (
        <View style={styles.resolvedCard}>
          <Text style={styles.resolvedTitle}>📍 Extracted location</Text>
          <View style={styles.grid}>
            {(
              [
                { label: 'Area', value: resolved.area?.name },
                { label: 'Mandal', value: resolved.mandal?.name },
                { label: 'City', value: resolved.city?.name },
                { label: 'District', value: resolved.district?.name },
                { label: 'State', value: resolved.state?.name },
              ] as { label: string; value: string | undefined }[]
            )
              .filter((r) => r.value)
              .map((r) => (
                <View key={r.label} style={styles.chip}>
                  <Text style={styles.chipLabel}>{r.label}</Text>
                  <Text style={styles.chipValue}>{r.value}</Text>
                </View>
              ))}
          </View>
          {!resolved.area && (
            <Text style={styles.partialHint}>
              Your exact area wasn't found in our database — please complete the selection below.
            </Text>
          )}
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12, zIndex: 10 },
  mockButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  mockButtonText: { fontSize: 13, color: colors.textSecondary },
  // --- kept for production restore ---
  // searchInput: { ... },
  // listView: { ... },
  // listRow: { ... },
  // listDescription: { ... },
  // listSeparator: { ... },
  loaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  loaderText: { fontSize: 13, color: colors.textSecondary },
  resolvedCard: {
    marginTop: 10,
    backgroundColor: '#EAF4EC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B2DFB8',
  },
  resolvedTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B2DFB8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: '45%',
  },
  chipLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  chipValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  partialHint: { fontSize: 11.5, color: '#B45309', marginTop: 8, fontStyle: 'italic' },
  error: { fontSize: 12, color: '#C62828', marginTop: 6 },
});
