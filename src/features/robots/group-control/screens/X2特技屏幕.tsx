/**
 * X2TejiScreen — 特技动作
 * 对应 Android TejiActivity
 */
import { useRoute } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../../app/theme/palette';
import { Screen } from '../../../../shared/ui/Screen';
import { X2ActionButton } from '../x2/components/X2ActionButton';
import { TEJI_MOTIONS } from '../x2/x2Actions';
import { sendLingChuangAction } from '../x2/x2Api';

export function X2TejiScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const ip: string = route.params?.ip ?? '';
  const themedStyles = useMemo(
    () => ({
      warning: { color: palette.danger },
    }),
    [palette],
  );

  return (
    <Screen palette={palette} title="特技动作" subtitle={`设备：${ip}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.warning, themedStyles.warning]}>
          ⚠️ 高难度动作，请确保场地安全，远离人群！
        </Text>
        <View style={styles.grid}>
          {TEJI_MOTIONS.map((motion, i) => (
            <View key={i} style={styles.cell}>
              <X2ActionButton
                label={`灵创 ${motion.name}`}
                palette={palette}
                onPress={() => sendLingChuangAction(ip, motion, true)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  warning: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48%' },
});
