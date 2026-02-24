import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import {
  fetchRobot,
  getRobotConfig,
  getRobotVolume,
  setRobotMute,
  setRobotVolume,
  updateRobot,
  updateRobotConfig,
} from '../api';
import type { Robot, RobotForm } from '../types';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
};

function splitTags(input: string): string[] {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function RobotSettingsScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const { robotUuid, robotName } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [robot, setRobot] = useState<Robot | null>(null);
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [ip, setIp] = useState('');
  const [groupName, setGroupName] = useState('');
  const [sn, setSn] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [configText, setConfigText] = useState('');

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      setMessage('');
      await fn();
    } catch (e: any) {
      setMessage(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRobot = useCallback(async () => {
    await withLoading(async () => {
      const data = await fetchRobot(robotUuid);
      setRobot(data);
      setName(data.name || '');
      setModel(data.model || '');
      setIp(data.ip || '');
      setGroupName(data.group_name || '');
      setSn(data.sn || '');
      setTagsText((data.tags || []).join(','));
    });
  }, [robotUuid, withLoading]);

  useEffect(() => {
    loadRobot();
  }, [loadRobot]);

  const subtitle = useMemo(
    () => `${robotName || robot?.name || '未命名机器人'} · ${robotUuid || ''}`,
    [robot?.name, robotName, robotUuid],
  );

  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text }];

  async function handleSaveBasic() {
    const payload: RobotForm = {
      name: name || undefined,
      model: model || undefined,
      ip: ip || undefined,
      group_name: groupName || undefined,
      sn: sn || undefined,
      tags: splitTags(tagsText),
    };
    await withLoading(async () => {
      await updateRobot(robotUuid, payload);
      setMessage('基本信息保存成功');
      await loadRobot();
    });
  }

  function renderButton(text: string, onPress: () => void, danger = false) {
    return (
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={[
          styles.btn,
          {
            borderColor: danger ? palette.danger : palette.border,
            backgroundColor: danger ? palette.surfaceAlt : palette.surface,
          },
        ]}
      >
        <Text style={{ color: danger ? palette.danger : palette.text }}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <Screen
      palette={palette}
      title="机器人设置"
      subtitle={subtitle}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {message ? <Text style={[styles.message, { color: palette.warning }]}>{message}</Text> : null}

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>基本信息</Text>
          <TextInput
            style={inputStyle}
            placeholder="名称"
            placeholderTextColor={palette.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={inputStyle}
            placeholder="型号"
            placeholderTextColor={palette.textMuted}
            value={model}
            onChangeText={setModel}
          />
          <TextInput
            style={inputStyle}
            placeholder="IP"
            placeholderTextColor={palette.textMuted}
            value={ip}
            onChangeText={setIp}
            autoCapitalize="none"
          />
          <TextInput
            style={inputStyle}
            placeholder="分组"
            placeholderTextColor={palette.textMuted}
            value={groupName}
            onChangeText={setGroupName}
          />
          <TextInput
            style={inputStyle}
            placeholder="SN"
            placeholderTextColor={palette.textMuted}
            value={sn}
            onChangeText={setSn}
          />
          <TextInput
            style={inputStyle}
            placeholder="标签（逗号分隔）"
            placeholderTextColor={palette.textMuted}
            value={tagsText}
            onChangeText={setTagsText}
          />
          {renderButton('保存基本信息', handleSaveBasic)}
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>音量控制</Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>当前音量: {volume} | 静音: {muted ? '是' : '否'}</Text>
          <View style={styles.row}>
            {renderButton('获取音量', () =>
              withLoading(async () => {
                const data = await getRobotVolume(robotUuid);
                setVolume(data.volume);
                setMuted(data.muted);
              }),
            )}
            {renderButton('音量 +10', () =>
              withLoading(async () => {
                const next = Math.min(100, volume + 10);
                await setRobotVolume(robotUuid, next);
                setVolume(next);
              }),
            )}
            {renderButton('音量 -10', () =>
              withLoading(async () => {
                const next = Math.max(0, volume - 10);
                await setRobotVolume(robotUuid, next);
                setVolume(next);
              }),
            )}
            {renderButton(muted ? '取消静音' : '设置静音', () =>
              withLoading(async () => {
                const next = !muted;
                await setRobotMute(robotUuid, next);
                setMuted(next);
              }),
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>配置管理</Text>
          <View style={styles.row}>
            {renderButton('读取配置', () =>
              withLoading(async () => {
                const data = await getRobotConfig(robotUuid);
                setConfigText(JSON.stringify(data, null, 2));
              }),
            )}
            {renderButton('保存配置', () =>
              withLoading(async () => {
                const payload = configText ? JSON.parse(configText) : {};
                const updated = await updateRobotConfig(robotUuid, payload);
                setConfigText(JSON.stringify(updated || payload, null, 2));
              }),
            )}
          </View>
          <TextInput
            style={[styles.configInput, { borderColor: palette.border, color: palette.text }]}
            placeholder="配置 JSON"
            placeholderTextColor={palette.textMuted}
            multiline
            value={configText}
            onChangeText={setConfigText}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  message: {
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  configInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 180,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
