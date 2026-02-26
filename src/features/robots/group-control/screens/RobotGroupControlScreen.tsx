import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../../app/theme/palette';
import { Screen } from '../../../../shared/ui/Screen';

const groupControls = [
  {
    id: 'x2',
    title: 'X2 机器人群控',
    desc: '适用于 X2 机型的多机协同控制',
    route: 'X2 机器人控制',
  },
  {
    id: 'd1',
    title: 'D1 机器狗群控',
    desc: '适用于 D1 机型的编队与统一调度',
    route: null,
  },
];

export function RobotGroupControlScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();

  return (
    <Screen palette={palette} subtitle="选择群控类型">
      <View style={styles.list}>
        {groupControls.map(item => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: pressed
                  ? palette.surface + 'cc'
                  : palette.surface,
                borderColor: palette.border,
                opacity: item.route ? 1 : 0.5,
              },
            ]}
            onPress={() => item.route && navigation.navigate(item.route)}
            disabled={!item.route}
          >
            <Text style={[styles.title, { color: palette.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.desc, { color: palette.textMuted }]}>
              {item.desc}
            </Text>
            {!item.route && (
              <Text style={[styles.coming, { color: palette.textMuted }]}>
                即将推出
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  coming: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
