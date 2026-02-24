import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';

const discoverItems = [
  { id: 'd1', title: '新能力中心', desc: '后续接入插件与技能商店' },
  { id: 'd2', title: '任务模板', desc: '快速创建巡检/守卫任务' },
  { id: 'd3', title: '场景联动', desc: '机器人 + 设备自动化' },
];

export function DiscoverScreen() {
  const palette = usePalette();

  return (
    <Screen palette={palette} title="发现" subtitle="预留功能入口">
      <FlatList
        data={discoverItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>{item.title}</Text>
            <Text style={[styles.desc, { color: palette.textMuted }]}>{item.desc}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
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
