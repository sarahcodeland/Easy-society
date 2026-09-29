import React from 'react';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import './i18n';
import RootNavigator from './navigation/RootNavigator';
import ResponsiveFrame from './components/ResponsiveFrame';
import { FONT_ASSETS, applyGlobalSerifFonts } from './theme/fonts';

// Respect the phone's accessibility font size, but cap it — beyond ~1.3x
// the compact cards, pills and floating nav start clipping and overlapping.
const FONT_SCALE_CAP = 1.3;
(Text as any).defaultProps = { ...(Text as any).defaultProps, maxFontSizeMultiplier: FONT_SCALE_CAP };
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, maxFontSizeMultiplier: FONT_SCALE_CAP };

applyGlobalSerifFonts();

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  // Brief blank frame while fonts load (splash stays up on native). On a
  // load failure, render anyway with system fonts rather than a blank app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ResponsiveFrame backdrop="#EDE7E3">
        <RootNavigator />
      </ResponsiveFrame>
    </SafeAreaProvider>
  );
}
