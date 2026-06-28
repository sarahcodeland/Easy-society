import React, { useEffect, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../api/client';
import { useNavPadding } from '../../hooks/useNavPadding';

interface SchemeRow {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  language: string;
}

// Read-only — sourced exclusively from myscheme.gov.in / official government
// data via the backend sync job. No edit affordances anywhere in this screen.
export default function SchemesScreen() {
  const { i18n } = useTranslation();
  const navPadding = useNavPadding();
  const [schemes, setSchemes] = useState<SchemeRow[]>([]);

  useEffect(() => {
    apiClient.get('/schemes', { params: { language: i18n.language } }).then(({ data }) => setSchemes(data.schemes));
  }, [i18n.language]);

  return (
    <FlatList
      data={schemes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: navPadding }}
      ListEmptyComponent={<Text style={styles.empty}>No schemes synced yet for this language/region.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          {item.description && <Text style={styles.description}>{item.description}</Text>}
          {item.source_url && (
            <TouchableOpacity onPress={() => Linking.openURL(item.source_url!)}>
              <Text style={styles.link}>View official source</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 14, color: '#333', marginTop: 6 },
  link: { fontSize: 13, color: '#1A73E8', marginTop: 8 },
  empty: { padding: 24, textAlign: 'center', color: '#777' },
});
