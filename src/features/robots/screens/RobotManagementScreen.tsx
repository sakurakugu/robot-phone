import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
  createRobot,
  deleteRobot,
  fetchRobotGroups,
  fetchRobots,
} from '../api';
import { RobotCard } from '../components/RobotCard';
import { RobotFormModal } from '../components/RobotFormModal';
import type { Robot, RobotForm } from '../types';

export function RobotManagementScreen() {
  const palette = usePalette();
  const { homeOrientation, setHomeOrientation } = useAppPreferences();
  const navigation = useNavigation<any>();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [createVisible, setCreateVisible] = useState(false);

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
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(payload: RobotForm) {
    await createRobot(payload);
    await loadData();
  }

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
          <Text style={[styles.rotateBtnText, { color: palette.text }]}>
            {homeOrientation === 'portrait' ? '切横屏' : '切竖屏'}
          </Text>
        </Pressable>
      }
    >
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
          onPress={() => setCreateVisible(true)}
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

      <RobotFormModal
        visible={createVisible}
        mode="create"
        onClose={() => setCreateVisible(false)}
        onSubmit={handleCreate}
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
  rotateBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
  // card styles moved to RobotCard component
});
