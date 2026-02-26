/**
 * X2TaiCiScreen — 可配置台词控制
 * 对应 Android TaiCiActivity（台词1-23 + 基础动作）
 */
import { useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../../app/theme/palette';
import { Screen } from '../../../../shared/ui/Screen';
import { X2ActionButton } from '../x2/components/X2ActionButton';
import { TAICI_ACTIONS, TAICI_DEFAULT_ACTIONS } from '../x2/x2Actions';
import { sendAction } from '../x2/x2Api';

export function X2TaiCiScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const ip: string = route.params?.ip ?? '';

  return (
    <Screen palette={palette} title="可配置台词" subtitle={`设备：${ip}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle label="台词（音频 / 表情 / 动作）" palette={palette} />
        <View style={styles.grid}>
          {TAICI_ACTIONS.map((item, i) => (
            <View key={i} style={styles.cell}>
              <X2ActionButton
                label={item.label}
                palette={palette}
                onPress={() => sendAction(ip, item.data)}
              />
            </View>
          ))}
        </View>

        <SectionTitle label="基础动作" palette={palette} />
        <View style={styles.grid}>
          {TAICI_DEFAULT_ACTIONS.map((item, i) => (
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
