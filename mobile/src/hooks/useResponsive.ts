import { useWindowDimensions } from 'react-native';

// Content column is capped on tablets / foldables / landscape so cards and
// forms don't stretch edge-to-edge; phones use the full width.
export const MAX_CONTENT_WIDTH = 640;

export interface Responsive {
  /** Usable width of the content column (window width, capped). */
  contentWidth: number;
  windowWidth: number;
  windowHeight: number;
  /** Narrow phones (e.g. 320–359dp) — tighten paddings, shrink fixed media. */
  isSmall: boolean;
  /** Window is wider than the content column (tablet, foldable, landscape). */
  isWide: boolean;
}

// Hook rather than Dimensions.get at module load, so layouts follow
// rotation, split-screen and foldable resizes.
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  return {
    contentWidth: Math.min(width, MAX_CONTENT_WIDTH),
    windowWidth: width,
    windowHeight: height,
    isSmall: width < 360,
    isWide: width > MAX_CONTENT_WIDTH,
  };
}
