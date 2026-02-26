import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeText: string;
  inactiveText: string;
  /** 禁用开关，切换进行中时使用 */
  disabled?: boolean;
};

export function ToggleSwitch({
  value,
  onValueChange,
  activeText,
  inactiveText,
  disabled = false,
}: ToggleSwitchProps) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      activeTrack: { backgroundColor: palette.primary },
      inactiveTrack: {
        backgroundColor: palette.surfaceAlt,
        borderWidth: 1,
        borderColor: palette.border,
      },
      disabledTrack: { opacity: 0.45 },
      thumb: { backgroundColor: palette.surface },
      labelActive: { color: '#FFFFFF' },
      labelInactive: { color: palette.textMuted },
    }),
    [palette],
  );

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={[
        styles.toggleSwitch,
        value ? themedStyles.activeTrack : themedStyles.inactiveTrack,
        disabled ? themedStyles.disabledTrack : null,
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          value ? styles.toggleThumbRight : styles.toggleThumbLeft,
          themedStyles.thumb,
        ]}
      />
      <Text
        style={[
          styles.toggleLabel,
          value ? styles.toggleLabelLeft : styles.toggleLabelRight,
          value ? themedStyles.labelActive : themedStyles.labelInactive,
        ]}
      >
        {value ? activeText : inactiveText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleSwitch: {
    width: 62,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 2, // Adjusted for border
  },
  toggleThumbLeft: {
    left: 3,
  },
  toggleThumbRight: {
    right: 3,
  },
  toggleLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
  },
  toggleLabelLeft: {
    left: 6,
  },
  toggleLabelRight: {
    right: 6,
  },
});
