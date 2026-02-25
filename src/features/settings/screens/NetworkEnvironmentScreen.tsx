import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
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

  const reload = useCallback(() => {
    setEnvironments(listEnvironments());
    setActiveId(getActiveEnvironment().id);
  }, []);

  useFocusEffect(reload);

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
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>
        当前环境列表
      </Text>
      <View style={[styles.group, { borderColor: palette.border }]}>
        {environments.map((env, idx) => {
          const active = env.id === activeId;
          const isDefault = !env.id.startsWith('custom-');
          return (
            <View key={env.id}>
              <View
                style={[styles.envRow, { backgroundColor: palette.surface }]}
              >
                <Pressable
                  style={styles.envMain}
                  onPress={() => activate(env.id)}
                >
                  <View style={styles.envTextGroup}>
                    <View style={styles.envNameRow}>
                      <Text
                        style={[
                          styles.envName,
                          { color: active ? palette.primary : palette.text },
                        ]}
                      >
                        {env.name}
                      </Text>
                      {active && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: palette.primary },
                          ]}
                        >
                          <Text style={styles.activeBadgeText}>使用中</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.envUrl, { color: palette.textMuted }]}>
                      {env.baseUrl}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? palette.primary : palette.border,
                        backgroundColor: active
                          ? palette.primary
                          : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
                {!isDefault && (
                  <Pressable
                    style={[styles.deleteBtn, { borderColor: palette.border }]}
                    onPress={() => handleRemove(env.id, env.name)}
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.deleteBtnText, { color: palette.danger }]}
                    >
                      删除
                    </Text>
                  </Pressable>
                )}
              </View>
              {idx < environments.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: palette.border }]}
                />
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>
        操作
      </Text>
      <View style={[styles.group, { borderColor: palette.border }]}>
        <Pressable
          style={[styles.addRow, { backgroundColor: palette.surface }]}
          onPress={() => navigation.navigate('添加配置环境')}
        >
          <Text style={[styles.addRowText, { color: palette.primary }]}>
            + 添加新环境
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.tip, { color: palette.textMuted }]}>
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
