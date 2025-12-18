import React from 'react';
import { ColorValue, Dimensions, Platform } from 'react-native';

// Log window dimensions for debugging
if (typeof window !== 'undefined') {
  const dims = Dimensions.get('window');
  console.log('🖥️ Window dimensions:', dims);
  console.log('📱 Device type:', dims.width > 768 ? 'Desktop/Tablet' : 'Phone');
  console.log('🌐 Viewport width (CSS):', typeof document !== 'undefined' ? `${window.innerWidth}px` : 'N/A');
}

// Max content width for modals and forms - responsive based on actual viewport
const getResponsiveWidth = () => {
  if (typeof window !== 'undefined') {
    // Use innerWidth which respects device emulation in DevTools
    return window.innerWidth <= 768 ? '95%' : '50%';
  }
  return '50%';
};
export const MAX_CONTENT_WIDTH = getResponsiveWidth();

export type Theme = {
  name: 'light' | 'dark';
  colors: {
    background: ColorValue;
    surface: ColorValue;
    primary: ColorValue;
    accent: ColorValue;
    text: ColorValue;
    muted: ColorValue;
    border: ColorValue;
    error: ColorValue;
    errorBackground: ColorValue; // Added safe error background color
    card: ColorValue;
    inputBackground: ColorValue;
    shadowColor: ColorValue;
  };
};

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: '#f8f9fa',
    surface: '#ffffff',
    primary: '#007bff',
    accent: '#6f42c1',
    text: '#212529',
    muted: '#6c757d',
    border: '#e9ecef',
    error: '#dc3545',
    errorBackground: '#f8d7da', // Default bootstrap error bg
    card: '#ffffff',
    inputBackground: '#ffffff',
    shadowColor: '#000'
  }
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: '#121212', // Deep Black
    surface: '#1E1E1E', // Dark Gray Surface
    primary: '#FFC107', // Amber/Gold
    accent: '#FFD54F', // Light Amber
    text: '#FFFFFF',
    muted: '#B0BEC5',
    border: '#2C2C2C',
    error: '#CF6679',
    errorBackground: 'rgba(207, 102, 121, 0.1)',
    card: '#1E1E1E',
    inputBackground: '#2C2C2C',
    shadowColor: '#000'
  }
};

const ThemeContext = React.createContext<{
  theme: Theme;
  setThemeName: (name: 'light' | 'dark') => void;
}>({ theme: lightTheme, setThemeName: () => { } });

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [themeName, setThemeName] = React.useState<'light' | 'dark'>('dark');
  const theme = themeName === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => React.useContext(ThemeContext);

export default ThemeContext;
