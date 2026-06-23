import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  isVisitor?: boolean;
  visitorLocationLabel?: string | null;
}

// Renders "Visitor — Kukatpally, Hyderabad" consistently everywhere content
// can carry a visitor tag: chat messages, Q&A posts/comments, marketplace
// listings, announcements.
export default function VisitorTag({ isVisitor, visitorLocationLabel }: Props) {
  const { t } = useTranslation();
  if (!isVisitor) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {t('common.visitor')}
        {visitorLocationLabel ? ` — ${visitorLocationLabel}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  text: {
    fontSize: 11,
    color: '#8A6D3B',
    fontWeight: '600',
  },
});
