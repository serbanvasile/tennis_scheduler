import React from 'react';
import { ColorValue } from 'react-native';

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
    card: '#ffffff',
    inputBackground: '#ffffff',
    shadowColor: '#000'
  }
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: '#0f1720',
    surface: '#0b1220',
    primary: '#4f9fff',
    accent: '#9b8cff',
    text: '#e6eef8',
    muted: '#9aa6b2',
    border: '#1f2933',
    error: '#ff6b6b',
    card: '#0b1220',
    inputBackground: '#091022',
    shadowColor: '#000'
  }
};

const ThemeContext = React.createContext<{
  theme: Theme;
  setThemeName: (name: 'light' | 'dark') => void;
}>({ theme: lightTheme, setThemeName: () => {} });

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [themeName, setThemeName] = React.useState<'light' | 'dark'>('light');
  const theme = themeName === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => React.useContext(ThemeContext);

export default ThemeContext;
