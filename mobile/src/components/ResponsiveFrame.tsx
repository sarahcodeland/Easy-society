import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MAX_CONTENT_WIDTH } from '../hooks/useResponsive';

// Centers its children in a column no wider than MAX_CONTENT_WIDTH. Used at
// the app root and inside full-screen modals (which render outside the root
// frame). `backdrop` fills the space either side on wide screens.
export default function ResponsiveFrame({
  children,
  backdrop = '#FFFFFF',
  style,
}: {
  children: React.ReactNode;
  backdrop?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[S.outer, { backgroundColor: backdrop }]}>
      <View style={[S.inner, style]}>{children}</View>
    </View>
  );
}

const S = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH },
});
