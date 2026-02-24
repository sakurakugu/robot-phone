import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStack } from './navigation/RootStack';
import { AppPreferencesProvider, useAppPreferences } from './preferences/AppPreferences';
import { usePalette } from './theme/palette';

function AppContent() {
  const { themeMode } = useAppPreferences();
  const isDarkMode = themeMode === 'dark';
  const palette = usePalette();

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
