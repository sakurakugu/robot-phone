import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';

const menu = [
  { id: 'm1', title: '设置', desc: '语言、主题、通知偏好' },
  { id: 'm2', title: '参数管理', desc: '速度、阈值、巡检间隔等' },
  { id: 'm3', title: '账号与安全', desc: '权限、登录设备、隐私配置' },
];

export function ProfileScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();

  return (
    <Screen palette={palette} title="我的" subtitle="账户与系统">
      <View style={[styles.profile, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.name, { color: palette.text }]}>Admin 管理员</Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>云端机器人与角色管理已接入</Text>
      </View>

      <FlatList
        data={menu}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => {
              if (item.id === 'm1') {
                navigation.navigate('设置');
              }
            }}
          >
            <Text style={[styles.title, { color: palette.text }]}>{item.title}</Text>
            <Text style={[styles.desc, { color: palette.textMuted }]}>{item.desc}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
  },
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
