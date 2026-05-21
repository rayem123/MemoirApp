import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  setTheme: (theme: ThemeType) => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    card: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const lightColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  primary: '#844567',
  border: '#eeeeee',
  card: '#ffffff',
};

export const darkColors = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#aaaaaa',
  primary: '#a85a7e',
  border: '#333333',
  card: '#2d2d2d',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_theme');
        if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error('Erreur chargement thème:', error);
      }
    };
    loadTheme();
  }, []);

  const saveTheme = async (newTheme: ThemeType) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  const isDark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark');
  
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme: saveTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}