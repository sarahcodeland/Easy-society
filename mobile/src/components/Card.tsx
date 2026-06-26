import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radii, shadow } from '../theme';

export default function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    ...shadow,
  },
});
