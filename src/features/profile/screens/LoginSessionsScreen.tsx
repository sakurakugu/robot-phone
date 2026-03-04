import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { http } from '../../../shared/net/http';
import { Screen } from '../../../shared/ui/Screen';
import { Toast } from '../../../shared/ui/Toast';

type SessionItem = {
  id: string;
  clientType: 'web' | 'mobile' | 'unknown';
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  lastSeenAt: string;
  current: boolean;
};

export function LoginSessionsScreen() {
  const palette = usePalette();
  const [list, setList] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const themed = useMemo(
    () => ({
      card: { backgroundColor: palette.surface, borderColor: palette.border },
      title: { color: palette.text },
      sub: { color: palette.textMuted },
      btn: { color: palette.danger },
      current: { color: palette.success },
    }),
    [palette],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await http.get<SessionItem[]>('/auth/sessions');
      setList(data || []);
    } catch (e: any) {
      Toast.show(e.message || '加载失败', Toast.SHORT);
    } finally {
      setLoading(false);
    }
  }, []);

  const revoke = useCallback(
    async (id: string) => {
      try {
        await http.delete(`/auth/sessions/${id}`);
        Toast.show('设备已下线', Toast.SHORT);
        await load();
      } catch (e: any) {
        Toast.show(e.message || '下线失败', Toast.SHORT);
      }
    },
    [load],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen
      palette={palette}
      subtitle={loading ? '加载中...' : `共 ${list.length} 台`}
      unsafeTop={true}
    >
      <FlatList
        data={list}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, themed.card]}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={[styles.title, themed.title]}>
                  {item.deviceName}
                </Text>
                <Text style={[styles.sub, themed.sub]}>
                  {item.clientType === 'mobile'
                    ? '手机端'
                    : item.clientType === 'web'
                      ? 'Web'
                      : item.clientType}
                  {' · '}
                  {item.ipAddress}
                </Text>
                <Text style={[styles.sub, themed.sub]}>
                  最近活跃：{new Date(item.lastSeenAt).toLocaleString()}
                </Text>
              </View>
              {item.current ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: palette.success + '22',
                      borderColor: palette.success,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: palette.success }]}>
                    当前
                  </Text>
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.kickBtn,
                    {
                      backgroundColor: palette.danger + '15',
                      borderColor: palette.danger,
                    },
                  ]}
                  onPress={() => revoke(item.id)}
                >
                  <Text style={[styles.kickText, { color: palette.danger }]}>
                    下线
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  kickBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kickText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
