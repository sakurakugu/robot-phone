import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rawTheme, rawOrientation] = await Promise.all([
          AsyncStorage.getItem('@robot:theme_mode'),
          AsyncStorage.getItem('@robot:home_orientation'),
        ]);
        if (!alive) return;
        if (rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system') {
          setThemeMode(rawTheme);
        }
        if (rawOrientation === 'portrait' || rawOrientation === 'landscape') {
          setHomeOrientation(rawOrientation);
        }
      } finally {
        if (alive) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem('@robot:theme_mode', themeMode).catch(() => {});
  }, [themeMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem('@robot:home_orientation', homeOrientation).catch(() => {});
  }, [homeOrientation, hydrated]);

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
    throw new Error('“useAppPreferences”必须在“AppPreferencesProvider”内部使用。');
  }
  return context;
}
