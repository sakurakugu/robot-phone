import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import { createRobot, deleteRobot, fetchRobotGroups, fetchRobots } from '../api';
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
      const [robotList, groupList] = await Promise.all([fetchRobots(), fetchRobotGroups()]);
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
          onPress={() => setHomeOrientation(v => (v === 'portrait' ? 'landscape' : 'portrait'))}
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
          <Pressable
            onPress={() =>
              navigation.navigate('机器人操作', {
                robotUuid: item.uuid,
                robotName: item.name || '',
              })
            }
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.name, { color: palette.text }]}>
              {item.name || item.uuid}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              状态 {item.status} | IP {item.ip || '-'} | 组 {item.group_name || '-'}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              标签 {item.tags.join(', ') || '-'} | 角色 {item.role?.name || '-'}
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  navigation.navigate('机器人操作', {
                    robotUuid: item.uuid,
                    robotName: item.name || '',
                  });
                }}
                style={[styles.actionBtn, { borderColor: palette.border }]}
              >
                <Text style={{ color: palette.text }}>操控</Text>
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  navigation.navigate('机器人对话', {
                    robotUuid: item.uuid,
                    robotName: item.name || '',
                  });
                }}
                style={[styles.actionBtn, { borderColor: palette.border }]}
              >
                <Text style={{ color: palette.text }}>对话</Text>
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  navigation.navigate('机器人设置', {
                    robotUuid: item.uuid,
                    robotName: item.name || '',
                  });
                }}
                style={[styles.actionBtn, { borderColor: palette.border }]}
              >
                <Text style={{ color: palette.text }}>编辑</Text>
              </Pressable>
              <Pressable
                onPress={e => {
                  e.stopPropagation();
                  handleDelete(item.uuid);
                }}
                style={[styles.actionBtn, { borderColor: palette.danger }]}
              >
                <Text style={{ color: palette.danger }}>删除</Text>
              </Pressable>
            </View>
          </Pressable>
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
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
