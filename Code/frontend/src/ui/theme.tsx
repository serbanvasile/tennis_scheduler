import React from 'react';
import { ColorValue, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for persisting theme index
const THEME_INDEX_STORAGE_KEY = '@theme_index';

// Max content width for modals and forms
// Uses device type instead of resolution - phones/tablets get full width, desktop gets constrained width
const getResponsiveWidth = (): string => {
  // Mobile devices (iOS/Android) always get full width
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return '100%';
  }
  // Web: use viewport width to determine if it's mobile browser or desktop
  if (typeof window !== 'undefined') {
    // Use a more conservative breakpoint and check for touch capability
    const isMobileWeb = window.innerWidth <= 768 ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0);
    return isMobileWeb ? '100%' : '60%';
  }
  return '60%';
};
export const MAX_CONTENT_WIDTH = getResponsiveWidth();

// Default theme index (0 = Midnight Gold)
export const DEFAULT_THEME_INDEX = 0;

/**
 * REFINED THEME PRESETS - Based on User Votes
 * 
 * VOTED FAVORITES:
 * - Midnight Gold (dark, gold accent)
 * - Slate Amber (slate gray, amber accent)
 * - Graphite Coral (dark gray, coral accent)
 * - Cream Tangerine (warm light, orange accent)
 * - Cotton Sky (light blue, sky accent)
 * 
 * FIXES:
 * - Added chipBackground for avatar/initials chips
 * - Fixed delete button colors on warm themes (using dark red instead of bright red)
 * - Fixed button text colors
 */
export const THEME_PRESETS = [
  // ========== DARK THEMES (0-9) ==========

  // VOTED ✓
  {
    name: 'Midnight Gold',  // 0 - Original favorite
    colors: {
      background: '#0D0D0D',
      surface: '#1A1A1A',
      card: '#1A1A1A',
      inputBackground: '#242424',
      border: '#333333',
      primary: '#F5A623',
      accent: '#FFD700',
      text: '#FAFAFA',
      muted: '#888888',
      buttonText: '#000000',
      chipBackground: '#F5A623',
      chipText: '#000000',
      error: '#E34234',
      errorText: '#FFFFFF',
      errorBackground: '#2D1B1B',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Midnight Copper',  // 1 - Similar to Midnight Gold
    colors: {
      background: '#0D0D0D',
      surface: '#1A1A1A',
      card: '#1A1A1A',
      inputBackground: '#242424',
      border: '#333333',
      primary: '#CD7F32',
      accent: '#E8A857',
      text: '#FAFAFA',
      muted: '#888888',
      buttonText: '#000000',
      chipBackground: '#CD7F32',
      chipText: '#000000',
      error: '#FF6B6B',
      errorText: '#FFFFFF',
      errorBackground: '#2D1B1B',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Midnight Bronze',  // 2 - Similar to Midnight Gold
    colors: {
      background: '#0A0A0A',
      surface: '#161616',
      card: '#161616',
      inputBackground: '#202020',
      border: '#2A2A2A',
      primary: '#C9A227',
      accent: '#DAB94E',
      text: '#F5F5F0',
      muted: '#7A7A7A',
      buttonText: '#1A1A00',
      chipBackground: '#C9A227',
      chipText: '#1A1A00',
      error: '#E34234',
      errorText: '#FFFFFF',
      errorBackground: '#2D1B1B',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Charcoal Honey',  // 3 - Warmer dark
    colors: {
      background: '#1A1814',
      surface: '#262420',
      card: '#262420',
      inputBackground: '#33302A',
      border: '#403D35',
      primary: '#E6B325',
      accent: '#F0C94D',
      text: '#FAF8F5',
      muted: '#9A9590',
      buttonText: '#1A1500',
      chipBackground: '#E6B325',
      chipText: '#1A1500',
      error: '#D44B3E',
      errorText: '#FFFFFF',
      errorBackground: '#2D1F1B',
      shadowColor: '#000000',
    }
  },

  // VOTED ✓
  {
    name: 'Slate Amber',  // 4 - YOUR FAVORITE!
    colors: {
      background: '#334155',
      surface: '#475569',
      card: '#475569',
      inputBackground: '#64748B',
      border: '#64748B',
      primary: '#FBBF24',
      accent: '#FCD34D',
      text: '#F8FAFC',
      muted: '#CBD5E1',
      buttonText: '#1E293B',
      chipBackground: '#FBBF24',
      chipText: '#1E293B',
      error: '#EF4444',
      errorText: '#FFFFFF',
      errorBackground: '#5D3A3A',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Slate Gold',  // 5 - Similar to Slate Amber
    colors: {
      background: '#2D3748',
      surface: '#4A5568',
      card: '#4A5568',
      inputBackground: '#5A6A84',
      border: '#5A6A84',
      primary: '#F5A623',
      accent: '#FFD700',
      text: '#F7FAFC',
      muted: '#CBD5E0',
      buttonText: '#1A202C',
      chipBackground: '#F5A623',
      chipText: '#1A202C',
      error: '#E34234',
      errorText: '#FFFFFF',
      errorBackground: '#5D3A3A',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Steel Sunset',  // 6 - Similar to Slate with warm accent
    colors: {
      background: '#374151',
      surface: '#4B5563',
      card: '#4B5563',
      inputBackground: '#6B7280',
      border: '#6B7280',
      primary: '#F59E0B',
      accent: '#FBBF24',
      text: '#F9FAFB',
      muted: '#D1D5DB',
      buttonText: '#1F2937',
      chipBackground: '#F59E0B',
      chipText: '#1F2937',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#5D3A3A',
      shadowColor: '#000000',
    }
  },

  // VOTED ✓ (with delete button fix)
  {
    name: 'Graphite Coral',  // 7
    colors: {
      background: '#292524',
      surface: '#3D3937',
      card: '#3D3937',
      inputBackground: '#514B47',
      border: '#57534E',
      primary: '#F97316',
      accent: '#FB923C',
      text: '#FAFAF9',
      muted: '#A8A29E',
      buttonText: '#1C1917',
      chipBackground: '#F97316',
      chipText: '#1C1917',
      error: '#B91C1C',  // Darker red for better contrast
      errorText: '#FFFFFF',
      errorBackground: '#4D2020',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Graphite Peach',  // 8 - Similar to Graphite Coral
    colors: {
      background: '#292524',
      surface: '#3D3937',
      card: '#3D3937',
      inputBackground: '#514B47',
      border: '#57534E',
      primary: '#FB923C',
      accent: '#FDBA74',
      text: '#FAFAF9',
      muted: '#A8A29E',
      buttonText: '#1C1917',
      chipBackground: '#FB923C',
      chipText: '#1C1917',
      error: '#991B1B',  // Even darker red
      errorText: '#FFFFFF',
      errorBackground: '#4D2020',
      shadowColor: '#000000',
    }
  },
  {
    name: 'Graphite Rust',  // 9 - Similar to Graphite Coral
    colors: {
      background: '#1C1917',
      surface: '#292524',
      card: '#292524',
      inputBackground: '#3D3937',
      border: '#44403C',
      primary: '#EA580C',
      accent: '#F97316',
      text: '#FAFAF9',
      muted: '#A8A29E',
      buttonText: '#FFFFFF',
      chipBackground: '#EA580C',
      chipText: '#FFFFFF',
      error: '#7F1D1D',  // Very dark red for warm bg
      errorText: '#FECACA',
      errorBackground: '#450A0A',
      shadowColor: '#000000',
    }
  },

  // ========== LIGHT THEMES (10-19) ==========

  // VOTED ✓ (with delete button fix)
  {
    name: 'Cream Tangerine',  // 10
    colors: {
      background: '#FFFBF5',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#FEF7ED',
      border: '#E7D5C0',
      primary: '#EA580C',
      accent: '#F97316',
      text: '#431407',
      muted: '#9A6940',
      buttonText: '#FFFFFF',
      chipBackground: '#EA580C',
      chipText: '#FFFFFF',
      error: '#991B1B',  // Dark maroon instead of bright red
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#D4A574',
    }
  },
  {
    name: 'Cream Amber',  // 11 - Similar to Cream Tangerine
    colors: {
      background: '#FFFBF0',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#FEF3D8',
      border: '#E8D9B8',
      primary: '#D97706',
      accent: '#F59E0B',
      text: '#451A03',
      muted: '#92722A',
      buttonText: '#FFFFFF',
      chipBackground: '#D97706',
      chipText: '#FFFFFF',
      error: '#7F1D1D',  // Dark maroon
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#D4B896',
    }
  },
  {
    name: 'Cream Cinnamon',  // 12 - Similar to Cream Tangerine
    colors: {
      background: '#FDF8F3',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#F8F0E8',
      border: '#DDD0C0',
      primary: '#B45309',
      accent: '#D97706',
      text: '#422006',
      muted: '#8B6D4A',
      buttonText: '#FFFFFF',
      chipBackground: '#B45309',
      chipText: '#FFFFFF',
      error: '#7F1D1D',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#C4A882',
    }
  },
  {
    name: 'Ivory Maple',  // 13 - Warmer cream
    colors: {
      background: '#FAF6F0',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#F5EDE5',
      border: '#DDD2C2',
      primary: '#C2410C',
      accent: '#EA580C',
      text: '#431407',
      muted: '#8C7560',
      buttonText: '#FFFFFF',
      chipBackground: '#C2410C',
      chipText: '#FFFFFF',
      error: '#881B1B',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#C4AA8C',
    }
  },

  // VOTED ✓ (with fixes for button text and chips)
  {
    name: 'Cotton Sky',  // 14
    colors: {
      background: '#F0F9FF',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#E0F2FE',
      border: '#BAE6FD',
      primary: '#0284C7',
      accent: '#0EA5E9',
      text: '#0C4A6E',
      muted: '#0369A1',
      buttonText: '#FFFFFF',  // Fixed: white text
      chipBackground: '#0284C7',  // Fixed: uses primary instead of black
      chipText: '#FFFFFF',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#7DD3FC',
    }
  },
  {
    name: 'Cotton Ocean',  // 15 - Similar to Cotton Sky
    colors: {
      background: '#EFF6FF',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#DBEAFE',
      border: '#BFDBFE',
      primary: '#2563EB',
      accent: '#3B82F6',
      text: '#1E3A8A',
      muted: '#1D4ED8',
      buttonText: '#FFFFFF',
      chipBackground: '#2563EB',
      chipText: '#FFFFFF',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#93C5FD',
    }
  },
  {
    name: 'Cotton Teal',  // 16 - Similar to Cotton Sky
    colors: {
      background: '#F0FDFA',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#CCFBF1',
      border: '#99F6E4',
      primary: '#0D9488',
      accent: '#14B8A6',
      text: '#134E4A',
      muted: '#0F766E',
      buttonText: '#FFFFFF',
      chipBackground: '#0D9488',
      chipText: '#FFFFFF',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#5EEAD4',
    }
  },
  {
    name: 'Mist Azure',  // 17 - Light blue-gray
    colors: {
      background: '#F1F5F9',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#E2E8F0',
      border: '#CBD5E1',
      primary: '#0EA5E9',
      accent: '#38BDF8',
      text: '#0F172A',
      muted: '#475569',
      buttonText: '#FFFFFF',
      chipBackground: '#0EA5E9',
      chipText: '#FFFFFF',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#94A3B8',
    }
  },
  {
    name: 'Cloud Breeze',  // 18 - Light and airy
    colors: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#F1F5F9',
      border: '#E2E8F0',
      primary: '#0891B2',
      accent: '#06B6D4',
      text: '#164E63',
      muted: '#0E7490',
      buttonText: '#FFFFFF',
      chipBackground: '#0891B2',
      chipText: '#FFFFFF',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#A5F3FC',
    }
  },
  {
    name: 'Pearl Aqua',  // 19 - Clean light
    colors: {
      background: '#ECFEFF',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      inputBackground: '#CFFAFE',
      border: '#A5F3FC',
      primary: '#0891B2',
      accent: '#06B6D4',
      text: '#155E75',
      muted: '#0E7490',
      buttonText: '#FFFFFF',
      chipBackground: '#0891B2',
      chipText: '#FFFFFF',
      error: '#DC2626',
      errorText: '#FFFFFF',
      errorBackground: '#FEE2E2',
      shadowColor: '#67E8F9',
    }
  },
];

export const THEME_COUNT = THEME_PRESETS.length;

export type Theme = {
  name: string;
  index: number;
  colors: {
    background: ColorValue;
    surface: ColorValue;
    primary: ColorValue;
    accent: ColorValue;
    text: ColorValue;
    muted: ColorValue;
    buttonText: ColorValue;
    chipBackground: ColorValue;
    chipText: ColorValue;
    border: ColorValue;
    error: ColorValue;
    errorText: ColorValue;
    errorBackground: ColorValue;
    card: ColorValue;
    inputBackground: ColorValue;
    shadowColor: ColorValue;
  };
};

// Create theme from index
export function createTheme(index: number): Theme {
  const safeIndex = Math.max(0, Math.min(index, THEME_PRESETS.length - 1));
  const preset = THEME_PRESETS[safeIndex];
  return {
    name: preset.name,
    index: safeIndex,
    colors: preset.colors as Theme['colors'],
  };
}

// Static default theme
export const darkTheme: Theme = createTheme(DEFAULT_THEME_INDEX);
export const lightTheme: Theme = createTheme(THEME_PRESETS.length - 1);

const ThemeContext = React.createContext<{
  theme: Theme;
  themeIndex: number;
  setThemeIndex: (index: number) => void;
  resetTheme: () => void;
}>({
  theme: darkTheme,
  themeIndex: DEFAULT_THEME_INDEX,
  setThemeIndex: () => { },
  resetTheme: () => { },
});

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [themeIndex, setThemeIndexState] = React.useState<number>(DEFAULT_THEME_INDEX);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const loadIndex = async () => {
      try {
        const savedIndex = await AsyncStorage.getItem(THEME_INDEX_STORAGE_KEY);
        if (savedIndex !== null) {
          setThemeIndexState(parseInt(savedIndex, 10));
        }
      } catch (e) {
        console.log('Failed to load theme index from storage:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadIndex();
  }, []);

  const setThemeIndex = React.useCallback(async (newIndex: number) => {
    const safeIndex = Math.max(0, Math.min(Math.round(newIndex), THEME_PRESETS.length - 1));
    setThemeIndexState(safeIndex);
    try {
      await AsyncStorage.setItem(THEME_INDEX_STORAGE_KEY, safeIndex.toString());
    } catch (e) {
      console.log('Failed to save theme index to storage:', e);
    }
  }, []);

  const resetTheme = React.useCallback(() => {
    setThemeIndex(DEFAULT_THEME_INDEX);
  }, [setThemeIndex]);

  const theme = React.useMemo(() => createTheme(themeIndex), [themeIndex]);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeIndex, setThemeIndex, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => React.useContext(ThemeContext);

export default ThemeContext;
