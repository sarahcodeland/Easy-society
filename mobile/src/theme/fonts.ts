import { StyleSheet, Text, TextInput, TextStyle } from 'react-native';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_800ExtraBold_Italic,
  PlayfairDisplay_900Black,
  PlayfairDisplay_900Black_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';

// Typeface system:
//   • Instrument Serif — display type (titles, headings, logo): fontSize >= DISPLAY_MIN_SIZE
//   • Playfair Display — everything else, in the weight the style asks for
//
// Custom fonts ignore `fontWeight` on Android (each weight is its own font
// file/family), so instead of touching every screen we map the requested
// fontSize/fontWeight/fontStyle onto the matching family in one place.
export const FONT_ASSETS = {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_800ExtraBold_Italic,
  PlayfairDisplay_900Black,
  PlayfairDisplay_900Black_Italic,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
};

export const DISPLAY_MIN_SIZE = 20;

const PLAYFAIR_WEIGHTS: Record<number, string> = {
  400: 'PlayfairDisplay_400Regular',
  500: 'PlayfairDisplay_500Medium',
  600: 'PlayfairDisplay_600SemiBold',
  700: 'PlayfairDisplay_700Bold',
  800: 'PlayfairDisplay_800ExtraBold',
  900: 'PlayfairDisplay_900Black',
};

function numericWeight(w: TextStyle['fontWeight']): number {
  if (w === 'bold') return 700;
  const n = Number(w);
  if (!n || n < 400) return 400;
  return Math.min(900, Math.round(n / 100) * 100);
}

export function serifFamilyFor(style: TextStyle): string {
  const italic = style.fontStyle === 'italic';
  if ((style.fontSize ?? 14) >= DISPLAY_MIN_SIZE) {
    return italic ? 'InstrumentSerif_400Regular_Italic' : 'InstrumentSerif_400Regular';
  }
  const base = PLAYFAIR_WEIGHTS[numericWeight(style.fontWeight)];
  return italic ? `${base}_Italic` : base;
}

// Wraps Text/TextInput's render so every instance gets the serif family.
// Anything that already sets fontFamily (icon fonts, one-off overrides) is
// left untouched.
function patchRender(Component: any) {
  const original = Component?.render;
  if (typeof original !== 'function' || Component.__serifPatched) return;
  Component.__serifPatched = true;
  Component.render = function render(props: any, ref: any) {
    const flat: TextStyle = StyleSheet.flatten(props.style) ?? {};
    if (flat.fontFamily) return original.call(this, props, ref);
    // lining-nums: Playfair defaults to old-style figures, where 0 reads as
    // the letter "o" — bad for prices, counts and times.
    const serif = {
      fontFamily: serifFamilyFor(flat),
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontVariant: flat.fontVariant ?? ['lining-nums'],
    } as const;
    return original.call(this, { ...props, style: [props.style, serif] }, ref);
  };
}

export function applyGlobalSerifFonts() {
  patchRender(Text);
  patchRender(TextInput);
}
