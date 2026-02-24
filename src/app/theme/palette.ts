import { useAppPreferences } from '../preferences/AppPreferences';

export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
};

const lightPalette: Palette = {
  background: '#F4F7FD',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3FF',
  text: '#12243A',
  textMuted: '#61738C',
  border: '#D9E2F4',
  primary: '#2C69FF',
  success: '#28A364',
  warning: '#F29B3C',
  danger: '#E45555',
};

const darkPalette: Palette = {
  background: '#0C1423',
  surface: '#122038',
  surfaceAlt: '#1A2B49',
  text: '#E8F1FF',
  textMuted: '#90A5C3',
  border: '#2B4065',
  primary: '#74A8FF',
  success: '#44D187',
  warning: '#FFB566',
  danger: '#FF7676',
};

export function usePalette(): Palette {
  const { themeMode } = useAppPreferences();
  return themeMode === 'dark' ? darkPalette : lightPalette;
}
