import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Smartphone } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import {
  deleteRobot,
  fetchRobotGroups,
  fetchRobots,
  syncDiscoveredRobots,
} from '../api';
import { RobotCard } from '../components/RobotCard';
import { useMdnsDiscovery } from '../hooks/useMdnsDiscovery';
import type { Robot } from '../types';

const groupControlItems = [
  { id: 'gc1', title: '群控', desc: '进入群控中心', route: '群控' },
];

export function RobotManagementScreen() {
  const palette = usePalette();
  const { homeOrientation, setHomeOrientation } = useAppPreferences();
  const navigation = useNavigation<any>();
  const mdns = useMdnsDiscovery();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError('');
      const [robotList, groupList] = await Promise.all([
        fetchRobots(),
        fetchRobotGroups(),
      ]);
      setRobots(robotList);
      setGroups(groupList);
      return robotList;
    } catch (e: any) {
      setError(e.message || '加载失败');
      return [];
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 进入页面时加载数据，并在后台通过 mDNS 自动同步已有机器人信息
  useFocusEffect(
    useCallback(() => {
      loadData().then(robotList => {
        // 每次 focus 时进行一次后台 mDNS 同步
        if (robotList.length > 0) {
          mdns
            .scan(3)
            .then(discovered => {
              if (discovered.length > 0) {
                syncDiscoveredRobots(discovered, robotList).then(
                  ({ updated }) => {
                    if (updated.length > 0) {
                      loadData();
                    }
                  },
                );
              }
            })
            .catch(() => {
              /* mDNS 同步失败不影响主流程 */
            });
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadData]),
  );

  async function handleDelete(uuid: string) {
    await deleteRobot(uuid);
    await loadData();
  }

  return (
    <Screen
      palette={palette}
      title="机器人管理"
      subtitle={`总数 ${robots.length} · 分组 ${groups.length}`}
      headerRight={
        <Pressable
          style={[
            styles.rotateBtn,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
          onPress={() =>
            setHomeOrientation(v =>
              v === 'portrait' ? 'landscape' : 'portrait',
            )
          }
        >
          <View
            style={{
              transform: [
                {
                  rotate: homeOrientation === 'portrait' ? '0deg' : '90deg',
                },
              ],
            }}
          >
            <Smartphone size={16} color={palette.text} />
          </View>
        </Pressable>
      }
    >
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
          onPress={() => navigation.navigate('新增机器人')}
        >
          <Text style={styles.primaryBtnText}>新增机器人</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { color: palette.danger }]}>{error}</Text>
      ) : null}

      <FlatList
        data={robots}
        keyExtractor={item => item.uuid}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.groupList}>
            {groupControlItems.map(item => (
              <Pressable
                key={item.id}
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
                onPress={() => navigation.navigate(item.route)}
              >
                <Text style={[styles.groupTitle, { color: palette.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.groupDesc, { color: palette.textMuted }]}>
                  {item.desc}
                </Text>
              </Pressable>
            ))}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
        renderItem={({ item }) => (
          <RobotCard
            item={item}
            palette={palette}
            onOperate={() =>
              navigation.navigate('机器人操作', {
                robotUuid: item.uuid,
                robotName: item.name || '',
                robotIp: item.ip || '',
              })
            }
            onChat={() =>
              navigation.navigate('机器人对话', {
                robotUuid: item.uuid,
                robotName: item.name || '',
              })
            }
            onEdit={() =>
              navigation.navigate('机器人设置', {
                robotUuid: item.uuid,
                robotName: item.name || '',
              })
            }
            onDelete={() => handleDelete(item.uuid)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  rotateBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  groupList: {
    gap: 10,
    paddingBottom: 8,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  groupDesc: {
    fontSize: 12,
    marginTop: 4,
  },
});
