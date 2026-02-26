/**
 * X2LingChuangScreen — 灵创动作触发
 * 对应 Android LingChuangActivity
 */
import { useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../../app/theme/palette';
import { Screen } from '../../../../shared/ui/Screen';
import { X2ActionButton } from '../x2/components/X2ActionButton';
import { DEFAULT_ACTIONS, LINGCHUANG_MOTIONS } from '../x2/x2Actions';
import { sendAction, sendLingChuangAction } from '../x2/x2Api';

export function X2LingChuangScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const ip: string = route.params?.ip ?? '';

  return (
    <Screen palette={palette} title="灵创动作触发" subtitle={`设备：${ip}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle
          label="灵创完整（动作 + 音频 + 表情）"
          palette={palette}
        />
        <View style={styles.grid}>
          {LINGCHUANG_MOTIONS.map((motion, i) => (
            <View key={i} style={styles.cell}>
              <X2ActionButton
                label={`灵创 ${motion.name}`}
                palette={palette}
                onPress={() => sendLingChuangAction(ip, motion, true)}
              />
            </View>
          ))}
        </View>

        <SectionTitle label="灵创纯动作（无音频表情）" palette={palette} />
        <View style={styles.grid}>
          {LINGCHUANG_MOTIONS.map((motion, i) => (
            <View key={i} style={styles.cell}>
              <X2ActionButton
                label={`${motion.name} 纯动作`}
                palette={palette}
                onPress={() => sendLingChuangAction(ip, motion, false)}
              />
            </View>
          ))}
        </View>

        <SectionTitle label="基础动作" palette={palette} />
        <View style={styles.grid}>
          {DEFAULT_ACTIONS.map((item, i) => (
            <View key={i} style={styles.cell}>
              <X2ActionButton
                label={item.label}
                palette={palette}
                onPress={() => sendAction(ip, item.data)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ label, palette }: { label: string; palette: any }) {
  return (
    <Text style={[styles.section, { color: palette.textMuted }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48%' },
});
