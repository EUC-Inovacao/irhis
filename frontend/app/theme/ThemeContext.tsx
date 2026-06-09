import React, { createContext, useState, useContext } from 'react';
import { lightColors, darkColors } from './colors';

interface Theme {
  colors: typeof lightColors;
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<Theme>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark((currentIsDark) => !currentIsDark);
  };

  const theme = {
    colors: isDark ? darkColors : lightColors,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 
