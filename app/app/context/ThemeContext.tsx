import React, { createContext, useContext, useState } from 'react';

// Define what our theme looks like
const LightTheme = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  subtext: '#666666',
  border: '#E5E5E5',
  tint: '#00E5FF',
};

const DarkTheme = {
  background: '#000000',
  card: '#121212',
  text: '#FFFFFF',
  subtext: '#888888',
  border: '#222222',
  tint: '#00E5FF',
};

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = isDarkMode ? DarkTheme : LightTheme;

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme anywhere
export const useAppTheme = () => useContext(ThemeContext);