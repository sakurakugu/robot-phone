import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { createRole, deleteRole, fetchRoleRobots, fetchRoles, updateRole } from '../api';
import { RoleFormModal } from '../components/RoleFormModal';
import type { Role, RoleForm } from '../types';

export function RoleManagementScreen() {
  const palette = usePalette();
  const [roles, setRoles] = useState<Role[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleUsage, setRoleUsage] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError('');
      const roleList = await fetchRoles();
      setRoles(roleList);

      const usageEntries = await Promise.all(
        roleList.map(async role => {
          const robots = await fetchRoleRobots(role.uuid);
          return [role.uuid, robots.length] as const;
        }),
      );
      setRoleUsage(Object.fromEntries(usageEntries));
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(payload: RoleForm) {
    await createRole(payload);
    await loadData();
  }

  async function handleEdit(payload: RoleForm) {
    if (!editingRole) return;
    await updateRole(editingRole.uuid, payload);
    await loadData();
  }

  async function handleDelete(uuid: string) {
    await deleteRole(uuid);
    await loadData();
  }

  return (
    <Screen
      palette={palette}
      title="角色管理"
      subtitle={`总数 ${roles.length} · 云端同步`}
    >
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
          onPress={() => setCreateVisible(true)}
        >
          <Text style={styles.primaryBtnText}>新增角色</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { color: palette.danger }]}>{error}</Text>
      ) : null}

      <FlatList
        data={roles}
        keyExtractor={item => item.uuid}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.name, { color: palette.text }]}>
              {item.name}
              {item.is_default === 1 ? '（默认）' : ''}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              {item.description || '暂无描述'}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>
              LLM {item.llm_provider || '-'} / {item.llm_model || '-'} | 机器人 {roleUsage[item.uuid] ?? 0}
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => setEditingRole(item)}
                style={[styles.actionBtn, { borderColor: palette.border }]}
              >
                <Text style={{ color: palette.text }}>编辑</Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item.uuid)}
                style={[styles.actionBtn, { borderColor: palette.danger }]}
              >
                <Text style={{ color: palette.danger }}>删除</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <RoleFormModal
        visible={createVisible}
        mode="create"
        onClose={() => setCreateVisible(false)}
        onSubmit={handleCreate}
      />
      <RoleFormModal
        visible={!!editingRole}
        mode="edit"
        initialValue={editingRole}
        onClose={() => setEditingRole(null)}
        onSubmit={handleEdit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 10,
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
