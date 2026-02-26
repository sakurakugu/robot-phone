/**
 * X2HaidilaoScreen — 海底捞脚本
 * 对应 Android HaidilaoActivity
 */
import { useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../../app/theme/palette';
import { Screen } from '../../../../shared/ui/Screen';
import { X2ActionButton } from '../x2/components/X2ActionButton';
import {
  HAIDILAO_DA_ZHAO_HU,
  HAIDILAO_DANCE_MOTIONS,
  HAIDILAO_YING_DA,
} from '../x2/x2Actions';
import { sendAction, sendLingChuangAction } from '../x2/x2Api';

export function X2HaidilaoScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const ip: string = route.params?.ip ?? '';

  return (
    <Screen palette={palette} title="海底捞脚本" subtitle={`设备：${ip}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle label="灵创舞蹈" palette={palette} />
        <View style={styles.grid}>
          {HAIDILAO_DANCE_MOTIONS.map((motion, i) => (
            <View key={i} style={styles.cell}>
              <X2ActionButton
                label={`灵创 ${motion.name}`}
                palette={palette}
                onPress={() => sendLingChuangAction(ip, motion, true)}
              />
            </View>
          ))}
        </View>

        <SectionTitle label="大招呼" palette={palette} />
        <View style={styles.list}>
          {HAIDILAO_DA_ZHAO_HU.map((item, i) => (
            <X2ActionButton
              key={i}
              label={item.label}
              palette={palette}
              onPress={() => sendAction(ip, item.data)}
            />
          ))}
        </View>

        <SectionTitle label="迎打台词" palette={palette} />
        <View style={styles.list}>
          {HAIDILAO_YING_DA.map((item, i) => (
            <X2ActionButton
              key={i}
              label={item.label}
              palette={palette}
              onPress={() => sendAction(ip, item.data)}
            />
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
  list: { gap: 8 },
});
