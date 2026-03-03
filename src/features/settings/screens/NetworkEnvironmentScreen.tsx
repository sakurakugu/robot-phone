import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import DeviceInfo from "react-native-device-info";
import { usePalette } from '../../../app/theme/palette';
import type { AppEnvironment } from '../../../shared/config/environment';
import {
    getActiveEnvironment,
    listEnvironments,
    removeEnvironment,
    setActiveEnvironment,
} from '../../../shared/config/environment';

export function NetworkEnvironmentScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const [environments, setEnvironments] = useState(listEnvironments());
  const [activeId, setActiveId] = useState(getActiveEnvironment().id);
  const [ipAddress, setIpAddress] = useState('');
  const [envConnectivity, setEnvConnectivity] = useState<
    Record<string, boolean | null>
  >({});
  const abortControllersRef = useRef<AbortController[]>([]);
  const checkSeqRef = useRef(0);
  const checkingConnectivity = useMemo(
    () => Object.values(envConnectivity).some(v => v === null),
    [envConnectivity],
  );
  const themedStyles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: palette.background },
      sectionHeader: { color: palette.textMuted },
      group: { borderColor: palette.border },
      envRow: { backgroundColor: palette.surface },
      envNameActive: { color: palette.primary },
      envNameInactive: { color: palette.text },
      activeBadge: { backgroundColor: palette.primary },
      envUrl: { color: palette.textMuted },
      envUrlConnected: { color: palette.success },
      radioActive: {
        borderColor: palette.primary,
        backgroundColor: palette.primary,
      },
      radioInactive: {
        borderColor: palette.border,
        backgroundColor: 'transparent',
      },
      deleteBtn: { borderColor: palette.border },
      deleteBtnText: { color: palette.danger },
      divider: { backgroundColor: palette.border },
      addRow: { backgroundColor: palette.surface },
      addRowText: { color: palette.primary },
      tip: { color: palette.textMuted },
    }),
    [palette],
  );

  const reload = useCallback(() => {
    const envs = listEnvironments();
    setEnvironments(envs);
    setActiveId(getActiveEnvironment().id);
    return envs;
  }, []);

  const loadIp = useCallback(async () => {
    try {
      const ip = await DeviceInfo.getIpAddress();
      setIpAddress(String(ip || '').trim() || '未知');
    } catch {
      setIpAddress('无法获取');
    }
  }, []);

  const resetAbortControllers = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];
  }, []);

  const probeEnvironment = useCallback(
    async (env: AppEnvironment): Promise<boolean> => {
      const controller = new AbortController();
      abortControllersRef.current.push(controller);
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const trimmedBaseUrl = env.baseUrl.replace(/\/$/, '');
        const response = await fetch(`${trimmedBaseUrl}/api/v1/health`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          return false;
        }
        const text = await response.text();
        if (!text) {
          return true;
        }
        try {
          const payload = JSON.parse(text) as { success?: boolean };
          if (payload?.success === false) {
            return false;
          }
        } catch {
          return true;
        }
        return true;
      } catch {
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [],
  );

  const checkConnectivity = useCallback(
    async (envs: AppEnvironment[]) => {
      const seq = ++checkSeqRef.current;
      resetAbortControllers();
      setEnvConnectivity(() => {
        const next: Record<string, boolean | null> = {};
        envs.forEach(env => {
          next[env.id] = null;
        });
        return next;
      });
      const results = await Promise.all(
        envs.map(async env => ({
          id: env.id,
          ok: await probeEnvironment(env),
        })),
      );
      if (checkSeqRef.current !== seq) return;
      setEnvConnectivity(prev => {
        const next = { ...prev };
        results.forEach(result => {
          next[result.id] = result.ok;
        });
        return next;
      });
    },
    [probeEnvironment, resetAbortControllers],
  );

  useFocusEffect(
    useCallback(() => {
      const envs = reload();
      loadIp();
      checkConnectivity(envs);
      return () => {
        checkSeqRef.current += 1;
        resetAbortControllers();
      };
    }, [reload, loadIp, checkConnectivity, resetAbortControllers]),
  );

  function activate(id: string) {
    setActiveEnvironment(id);
    setActiveId(id);
  }

  function handleRemove(id: string, name: string) {
    Alert.alert('删除环境', `确定删除「${name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          removeEnvironment(id);
          reload();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeaderText, themedStyles.sectionHeader]}>
          当前环境列表
        </Text>
        {checkingConnectivity ? (
          <View style={styles.checkingRow}>
            <Text style={[styles.checkingText, themedStyles.sectionHeader]}>
              正在检测连通性...
            </Text>
            <ActivityIndicator size="small" color={palette.textMuted} />
          </View>
        ) : null}
      </View>
      <View style={[styles.group, themedStyles.group]}>
        {environments.map((env, idx) => {
          const active = env.id === activeId;
          const isDefault = !env.id.startsWith('custom-');
          return (
            <View key={env.id}>
              <View style={[styles.envRow, themedStyles.envRow]}>
                <Pressable
                  style={styles.envMain}
                  onPress={() => activate(env.id)}
                  onLongPress={() =>
                    navigation.navigate('添加配置环境', {
                      mode: 'edit',
                      envId: env.id,
                      name: env.name,
                      baseUrl: env.baseUrl,
                    })
                  }
                >
                  <View style={styles.envTextGroup}>
                    <View style={styles.envNameRow}>
                      <Text
                        style={[
                          styles.envName,
                          active
                            ? themedStyles.envNameActive
                            : themedStyles.envNameInactive,
                        ]}
                      >
                        {env.name}
                      </Text>
                      {active && (
                        <View
                          style={[
                            styles.activeBadge,
                            themedStyles.activeBadge,
                          ]}
                        >
                          <Text style={styles.activeBadgeText}>使用中</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.envUrl,
                        envConnectivity[env.id]
                          ? themedStyles.envUrlConnected
                          : themedStyles.envUrl,
                      ]}
                    >
                      {env.baseUrl}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      active
                        ? themedStyles.radioActive
                        : themedStyles.radioInactive,
                    ]}
                  />
                </Pressable>
                {!isDefault && (
                  <Pressable
                    style={[styles.deleteBtn, themedStyles.deleteBtn]}
                    onPress={() => handleRemove(env.id, env.name)}
                    hitSlop={8}
                  >
                    <Text style={[styles.deleteBtnText, themedStyles.deleteBtnText]}>
                      删除
                    </Text>
                  </Pressable>
                )}
              </View>
              {idx < environments.length - 1 && (
                <View style={[styles.divider, themedStyles.divider]} />
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.tip, themedStyles.tip]}>
        当前 IP：{ipAddress || '未知'}
      </Text>

      <Text style={[styles.sectionHeader, themedStyles.sectionHeader]}>
        操作
      </Text>
      <View style={[styles.group, themedStyles.group]}>
        <Pressable
          style={[styles.addRow, themedStyles.addRow]}
          onPress={() => navigation.navigate('添加配置环境')}
        >
          <Text style={[styles.addRowText, themedStyles.addRowText]}>
            + 添加新环境
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.tip, themedStyles.tip]}>
        提示：点击某一环境切换到该环境。手机连接服务端时请填写电脑在同一 Wi-Fi
        下的 IP 地址（如 http://192.168.x.x:9000）。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
    marginHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 16,
    marginHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkingText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  group: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  envRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  envMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  envTextGroup: {
    flex: 1,
    gap: 4,
  },
  envNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envName: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  envUrl: {
    fontSize: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  tip: {
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 12,
    lineHeight: 18,
  },
});
