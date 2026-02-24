import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { getActiveEnvironment, listEnvironments, setActiveEnvironment } from '../../../shared/config/environment';
import { Screen } from '../../../shared/ui/Screen';

export function SettingsScreen() {
  const palette = usePalette();
  const { themeMode, setThemeMode } = useAppPreferences();
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
    setActiveId(getActiveEnvironment().id);
  }

  return (
    <Screen palette={palette} title="设置" subtitle="应用与环境">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>主题模式</Text>
        <View style={styles.themeRow}>
          <Pressable
            onPress={() => setThemeMode('light')}
            style={[
              styles.themeBtn,
              {
                borderColor: themeMode === 'light' ? palette.primary : palette.border,
                backgroundColor: themeMode === 'light' ? palette.surfaceAlt : palette.surface,
              },
            ]}
          >
            <Text style={{ color: themeMode === 'light' ? palette.primary : palette.textMuted }}>
              浅色模式
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setThemeMode('dark')}
            style={[
              styles.themeBtn,
              {
                borderColor: themeMode === 'dark' ? palette.primary : palette.border,
                backgroundColor: themeMode === 'dark' ? palette.surfaceAlt : palette.surface,
              },
            ]}
          >
            <Text style={{ color: themeMode === 'dark' ? palette.primary : palette.textMuted }}>
              深色模式
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setThemeMode('system')}
            style={[
              styles.themeBtn,
              {
                borderColor: themeMode === 'system' ? palette.primary : palette.border,
                backgroundColor: themeMode === 'system' ? palette.surfaceAlt : palette.surface,
              },
            ]}
          >
            <Text style={{ color: themeMode === 'system' ? palette.primary : palette.textMuted }}>
              跟随系统
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
          onPress={() => navigation.navigate('添加配置环境')}
        >
          <Text style={styles.primaryBtnText}>打开添加配置环境页</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>环境列表</Text>
        {environments.map(env => {
          const active = env.id === activeId;
          return (
            <View
              key={env.id}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Text style={[styles.envName, { color: palette.text }]}>{env.name}</Text>
              <Text style={[styles.envUrl, { color: palette.textMuted }]}>{env.baseUrl}</Text>
              <Pressable
                onPress={() => activate(env.id)}
                style={[
                  styles.useBtn,
                  { borderColor: active ? palette.success : palette.border, backgroundColor: active ? palette.surfaceAlt : palette.surface },
                ]}
              >
                <Text style={{ color: active ? palette.success : palette.textMuted }}>{active ? '当前使用中' : '切换到此环境'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  envName: {
    fontSize: 15,
    fontWeight: '700',
  },
  envUrl: {
    fontSize: 12,
  },
  useBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
