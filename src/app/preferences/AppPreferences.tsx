import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark';
export type HomeOrientation = 'portrait' | 'landscape';

type AppPreferencesValue = {
  themeMode: ThemeMode;
  setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  homeOrientation: HomeOrientation;
  setHomeOrientation: React.Dispatch<React.SetStateAction<HomeOrientation>>;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');
  const [homeOrientation, setHomeOrientation] = useState<HomeOrientation>('portrait');

  const value = useMemo(
    () => ({ themeMode, setThemeMode, homeOrientation, setHomeOrientation }),
    [themeMode, homeOrientation],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  }
  return context;
}
