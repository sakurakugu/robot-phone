import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initEnvironments } from '../shared/config/environment';
import { RootStack } from './navigation/RootStack';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from './preferences/AppPreferences';
import { usePalette } from './theme/palette';

function AppContent() {
  const { activeThemeMode } = useAppPreferences();
  const isDarkMode = activeThemeMode === 'dark';
  const palette = usePalette();

  useEffect(() => {
    initEnvironments();
  }, []);

  const navigationTheme = isDarkMode
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          primary: palette.primary,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          primary: palette.primary,
        },
      };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <AppPreferencesProvider>
      <AppContent />
    </AppPreferencesProvider>
  );
}

export default App;
