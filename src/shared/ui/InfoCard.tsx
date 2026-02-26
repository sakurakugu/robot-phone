import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../app/theme/palette';

type InfoCardProps = {
  title: string;
  desc: string;
  onPress?: () => void;
};

export function InfoCard({ title, desc, onPress }: InfoCardProps) {
  const palette = usePalette();

  if (onPress) {
    return (
      <Pressable
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.desc, { color: palette.textMuted }]}>{desc}</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: palette.textMuted }]}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    marginTop: 4,
  },
});
