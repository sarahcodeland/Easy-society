import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@easysociety/shared';

// "User picks language on signup" — shown at the very top of the funnel,
// before phone entry, so OTP/voice prompts that follow are already in the
// chosen language.
export default function LanguagePicker() {
  const { i18n } = useTranslation();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.chip, i18n.language === lang.code && styles.chipActive]}
          onPress={() => i18n.changeLanguage(lang.code)}
        >
          <Text style={[styles.chipText, i18n.language === lang.code && styles.chipTextActive]}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 24 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextActive: { color: '#fff' },
});
