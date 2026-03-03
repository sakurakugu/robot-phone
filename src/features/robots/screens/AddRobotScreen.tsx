import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { createRobot, discoverRobots, fetchRobots } from '../api';
import type { DiscoveredRobot, Robot } from '../types';

type MessageTone = 'info' | 'error';

export function AddRobotScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [discoveredRobots, setDiscoveredRobots] = useState<DiscoveredRobot[]>(
    [],
  );
  const [existingCollapsed, setExistingCollapsed] = useState(true);
  const [selectedDiscoveredRobot, setSelectedDiscoveredRobot] =
    useState<DiscoveredRobot | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [robotIp, setRobotIp] = useState('');
  const [groupName, setGroupName] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');

  const messageColor =
    messageTone === 'error' ? palette.danger : palette.warning;

  const isFormValid = useMemo(() => Boolean(name.trim()), [name]);
  const themedStyles = useMemo(
    () => ({
      scanBtn: { backgroundColor: palette.primary },
      primaryBtn: { backgroundColor: palette.primary },
    }),
    [palette],
  );
  const existingUuids = useMemo(
    () => new Set(robots.map(r => r.uuid)),
    [robots],
  );
  const newlyDiscovered = useMemo(
    () => discoveredRobots.filter(r => !existingUuids.has(r.uuid)),
    [discoveredRobots, existingUuids],
  );
  const alreadyDiscovered = useMemo(
    () => discoveredRobots.filter(r => existingUuids.has(r.uuid)),
    [discoveredRobots, existingUuids],
  );

  const loadExisting = useCallback(async () => {
    try {
      setMessage('');
      const list = await fetchRobots();
      setRobots(list);
    } catch (e: any) {
      setMessageTone('error');
      setMessage(e?.message || '加载失败');
    }
  }, []);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const handleDiscover = useCallback(async () => {
    setDiscovering(true);
    setHasScanned(true);
    setDiscoveredRobots([]);
    setSelectedDiscoveredRobot(null);
    setExistingCollapsed(true);
    setMessage('');
    try {
      const list = await discoverRobots(3);
      const existingUuidsSet = new Set(robots.map(r => r.uuid));
      const filtered = list.filter(r => !existingUuidsSet.has(r.uuid));
      setDiscoveredRobots(list);
      if (filtered.length === 0 && list.length > 0) {
        setMessageTone('info');
        setMessage('所有发现的机器人都已添加');
      } else if (filtered.length > 0) {
        setMessageTone('info');
        setMessage(`发现 ${filtered.length} 个新机器人`);
      }
    } catch (e: any) {
      setMessageTone('error');
      setMessage(e?.message || '扫描失败');
    } finally {
      setDiscovering(false);
    }
  }, [robots]);

  const selectDiscoveredRobot = useCallback(
    (robot: DiscoveredRobot) => {
      if (existingUuids.has(robot.uuid)) return;
      setSelectedDiscoveredRobot(prev => {
        if (prev?.uuid === robot.uuid) {
          return null;
        }
        setName(robot.name);
        setRobotIp(robot.ip);
        return robot;
      });
    },
    [existingUuids],
  );

  const handleAddDiscovered = useCallback(async () => {
    if (!selectedDiscoveredRobot || adding) return;
    setAdding(true);
    try {
      await createRobot({
        name: selectedDiscoveredRobot.name,
        ip: selectedDiscoveredRobot.ip,
        group_name: groupName || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      setMessageTone('error');
      setMessage(e?.message || '添加失败');
    } finally {
      setAdding(false);
    }
  }, [adding, groupName, navigation, selectedDiscoveredRobot]);

  const handleManualAdd = useCallback(async () => {
    if (!isFormValid || adding) {
      setMessageTone('error');
      setMessage('请填写机器人名称');
      return;
    }
    setAdding(true);
    try {
      await createRobot({
        name: name.trim(),
        ip: robotIp.trim() || undefined,
        group_name: groupName.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      setMessageTone('error');
      setMessage(e?.message || '添加失败');
    } finally {
      setAdding(false);
    }
  }, [adding, groupName, isFormValid, name, navigation, robotIp]);

  return (
    <Screen palette={palette}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>
            自动发现局域网内的机器人
          </Text>
          <Pressable
            style={[
              styles.scanBtn,
              themedStyles.scanBtn,
              discovering ? styles.btnDisabled : styles.btnEnabled,
            ]}
            onPress={handleDiscover}
            disabled={discovering}
          >
            <Text style={styles.scanBtnText}>
              {discovering ? '扫描中...' : '扫描'}
            </Text>
          </Pressable>
        </View>

        {newlyDiscovered.map(robot => {
          const selected = selectedDiscoveredRobot?.uuid === robot.uuid;
          return (
            <Pressable
              key={robot.uuid}
              style={[
                styles.discoveredCard,
                {
                  borderColor: selected ? palette.primary : palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
              onPress={() => selectDiscoveredRobot(robot)}
            >
              <View style={styles.discoveredRow}>
                <View style={styles.discoveredMain}>
                  <Text style={[styles.robotName, { color: palette.text }]}>
                    {robot.name}
                  </Text>
                  <Text
                    style={[styles.robotMeta, { color: palette.textMuted }]}
                  >
                    {robot.model} · {robot.version}
                  </Text>
                </View>
                <View style={styles.ipBadge}>
                  <Text style={styles.ipText}>
                    {robot.ip}:{robot.port}
                  </Text>
                </View>
              </View>
              <Text style={[styles.robotUuid, { color: palette.textMuted }]}>
                {robot.uuid}
              </Text>
            </Pressable>
          );
        })}

        {!discovering && hasScanned && discoveredRobots.length === 0 ? (
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            未发现机器人
          </Text>
        ) : null}

        {alreadyDiscovered.length > 0 ? (
          <View style={styles.existingSection}>
            <Pressable
              style={[
                styles.collapseRow,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
              onPress={() => setExistingCollapsed(v => !v)}
            >
              <Text style={[styles.collapseText, { color: palette.textMuted }]}>
                {existingCollapsed
                  ? `已添加 ${alreadyDiscovered.length} 台，点击展开 ▾`
                  : `已添加 ${alreadyDiscovered.length} 台，点击收起 ▴`}
              </Text>
            </Pressable>
            {!existingCollapsed
              ? alreadyDiscovered.map(robot => (
                  <View
                    key={robot.uuid}
                    style={[
                      styles.discoveredCard,
                      styles.existingCard,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.surface,
                      },
                    ]}
                  >
                    <View style={styles.discoveredRow}>
                      <View style={styles.discoveredMain}>
                        <Text
                          style={[styles.robotName, { color: palette.text }]}
                        >
                          {robot.name}
                        </Text>
                        <Text
                          style={[
                            styles.robotMeta,
                            { color: palette.textMuted },
                          ]}
                        >
                          {robot.model} · {robot.version}
                        </Text>
                      </View>
                      <View style={styles.ipBadge}>
                        <Text style={styles.ipText}>
                          {robot.ip}:{robot.port}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.robotUuid, { color: palette.textMuted }]}
                    >
                      {robot.uuid}
                    </Text>
                  </View>
                ))
              : null}
          </View>
        ) : null}

        <Text style={[styles.dividerText, { color: palette.textMuted }]}>
          或手动输入
        </Text>

        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="名称，例如：机器狗1"
          placeholderTextColor={palette.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="机器人IP，例如：192.168.1.110"
          placeholderTextColor={palette.textMuted}
          value={robotIp}
          onChangeText={setRobotIp}
          autoCapitalize="none"
        />
        <TextInput
          style={[
            styles.input,
            { borderColor: palette.border, color: palette.text },
          ]}
          placeholder="分组，例如：Default"
          placeholderTextColor={palette.textMuted}
          value={groupName}
          onChangeText={setGroupName}
        />

        {message ? (
          <Text style={[styles.message, { color: messageColor }]}>
            {message}
          </Text>
        ) : null}

        {selectedDiscoveredRobot ? (
          <Pressable
            style={[
              styles.primaryBtn,
              themedStyles.primaryBtn,
              adding ? styles.btnDisabled : styles.btnEnabled,
            ]}
            onPress={handleAddDiscovered}
            disabled={adding}
          >
            <Text style={styles.primaryBtnText}>
              {adding ? '添加中...' : '添加已发现的机器人'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.primaryBtn,
              themedStyles.primaryBtn,
              !isFormValid || adding ? styles.btnDisabled : styles.btnEnabled,
            ]}
            onPress={handleManualAdd}
            disabled={!isFormValid || adding}
          >
            <Text style={styles.primaryBtnText}>
              {adding ? '添加中...' : '手动添加'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  sectionHeader: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
  },
  scanBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  discoveredCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  discoveredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  discoveredMain: {
    flex: 1,
    gap: 2,
  },
  robotName: {
    fontSize: 16,
    fontWeight: '700',
  },
  robotMeta: {
    fontSize: 12,
  },
  ipBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#22C55E22',
  },
  ipText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  robotUuid: {
    fontSize: 11,
  },
  existingSection: {
    gap: 8,
  },
  existingCard: {
    opacity: 0.75,
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 6,
  },
  dividerText: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  message: {
    fontSize: 12,
  },
  collapseRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  collapseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnEnabled: {
    opacity: 1,
  },
});
