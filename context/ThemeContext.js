import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { themes } from '../theme';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themes[isDark ? 'dark' : 'light'];

  return (
    <ThemeContext.Provider value={{ theme, isDark, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
