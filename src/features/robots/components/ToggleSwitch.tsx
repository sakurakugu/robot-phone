import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  activeText: string;
  inactiveText: string;
};

export function ToggleSwitch({ value, onValueChange, activeText, inactiveText }: ToggleSwitchProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.toggleSwitch, value ? styles.toggleSwitchOn : styles.toggleSwitchOff]}
    >
      <View style={[styles.toggleThumb, value ? styles.toggleThumbRight : styles.toggleThumbLeft]} />
      <Text style={[styles.toggleLabel, value ? styles.toggleLabelLeft : styles.toggleLabelRight]}>
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
  toggleSwitchOn: {
    backgroundColor: '#4D86F7',
  },
  toggleSwitchOff: {
    backgroundColor: '#3D4E71',
  },
  toggleThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E6EEFF',
    top: 3,
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
    color: '#FFFFFF',
  },
  toggleLabelLeft: {
    left: 6,
  },
  toggleLabelRight: {
    right: 6,
  },
});
