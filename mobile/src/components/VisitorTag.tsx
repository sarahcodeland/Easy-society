import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

interface Props {
  isVisitor?: boolean;
  visitorLocationLabel?: string | null;
}

export default function VisitorTag({ isVisitor, visitorLocationLabel }: Props) {
  const { t } = useTranslation();
  if (!isVisitor) return null;

  return (
    <View style={styles.pill}>
      <Text style={styles.text}>
        {t('common.visitor').toUpperCase()}
        {visitorLocationLabel ? ` — ${visitorLocationLabel}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.visitorBg,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 10,
    color: colors.visitorText,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
