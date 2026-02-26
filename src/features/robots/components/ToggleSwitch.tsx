import React from 'react';
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

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={[
        styles.toggleSwitch,
        { backgroundColor: value ? palette.primary : palette.surfaceAlt },
        value ? null : { borderWidth: 1, borderColor: palette.border },
        disabled ? { opacity: 0.45 } : null,
      ]}
    >
      <View
        style={[
          styles.toggleThumb,
          value ? styles.toggleThumbRight : styles.toggleThumbLeft,
          { backgroundColor: palette.surface },
        ]}
      />
      <Text
        style={[
          styles.toggleLabel,
          value ? styles.toggleLabelLeft : styles.toggleLabelRight,
          { color: value ? '#FFFFFF' : palette.textMuted },
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
