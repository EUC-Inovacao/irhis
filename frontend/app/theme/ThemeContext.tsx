import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  useEffect(() => {
    async function loadTheme() {
      const savedTheme = await AsyncStorage.getItem('@iRHIS:theme');
      if (savedTheme !== null) {
        setIsDark(JSON.parse(savedTheme));
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    await AsyncStorage.setItem('@iRHIS:theme', JSON.stringify(newIsDark));
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