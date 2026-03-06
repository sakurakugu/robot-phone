import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { useAuth } from '../../auth/AuthContext';
import { InfoCard } from '../../../shared/ui/InfoCard';
import { Screen } from '../../../shared/ui/Screen';

type NavItem = {
  id: string;
  title: string;
  desc: string;
  route?: string;
  /** 仅管理员以上可见 */
  adminOnly?: boolean;
};

const ALL_DISCOVER_ITEMS: NavItem[] = [
  {
    id: 'ssh',
    title: 'SSH 终端',
    desc: '通过 SSH 连接设备并执行远程命令',
    route: 'SSH 终端',
    adminOnly: false,
  },
  {
    id: 'first-install',
    title: '首次安装机器狗软件',
    desc: '通过 SSH 安装机器人基础服务',
    route: '首次安装机器狗软件',
    adminOnly: false,
  },
  { id: 'd1', title: '新能力中心', desc: '后续接入插件与技能商店' },
  { id: 'd2', title: '任务模板', desc: '快速创建巡检/守卫任务' },
  { id: 'd3', title: '场景联动', desc: '机器人 + 设备自动化' },
];

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function DiscoverScreen() {
  const palette = usePalette();
  const { user } = useAuth();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<Record<string, object | undefined>>
    >();

  const isAdmin = user != null && ADMIN_ROLES.has(user.role);

  const discoverItems = useMemo(
    () => ALL_DISCOVER_ITEMS.filter(item => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  const handlePress = useCallback(
    (route?: string) => {
      if (route) {
        navigation.navigate(route);
      }
    },
    [navigation],
  );

  return (
    <Screen palette={palette} title="发现" subtitle="预留功能入口">
      <FlatList
        data={discoverItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InfoCard
            title={item.title}
            desc={item.desc}
            onPress={item.route ? () => handlePress(item.route) : undefined}
          />
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
});
