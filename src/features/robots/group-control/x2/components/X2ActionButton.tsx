/**
 * X2ActionButton — 通用动作按钮
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { Palette } from '../../../../../app/theme/palette';

interface Props {
  label: string;
  palette: Palette;
  onPress: () => void;
  loading?: boolean;
}

export function X2ActionButton({ label, palette, onPress, loading }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? palette.primary + 'cc' : palette.primary,
        },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
