import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveThemeMode = 'light' | 'dark';
export type HomeOrientation = 'portrait' | 'landscape';

type AppPreferencesValue = {
  themeMode: ThemeMode;
  setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  activeThemeMode: ActiveThemeMode;
  homeOrientation: HomeOrientation;
  setHomeOrientation: React.Dispatch<React.SetStateAction<HomeOrientation>>;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [homeOrientation, setHomeOrientation] = useState<HomeOrientation>('portrait');

  const activeThemeMode: ActiveThemeMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  const value = useMemo(
    () => ({ themeMode, setThemeMode, activeThemeMode, homeOrientation, setHomeOrientation }),
    [themeMode, activeThemeMode, homeOrientation],
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
