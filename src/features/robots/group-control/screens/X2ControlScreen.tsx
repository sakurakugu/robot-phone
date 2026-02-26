/**
 * X2ControlScreen — X2 机器人控制主页
 * 对应 Android MainActivity
 */
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePalette } from '../../../../app/theme/palette';
import { Screen } from '../../../../shared/ui/Screen';
import { fetchRobots } from '../../api';
import type { Robot } from '../../types';
import { useX2Ip } from '../x2/useX2Ip';
import { sendStop } from '../x2/x2Api';

const SCENARIOS = [
  { id: 'normal', label: '简单动作 & 音乐', desc: '常规舞蹈、音频、表情动作' },
  { id: 'lingchuang', label: '灵创动作触发', desc: 'ONNX 灵创舞蹈触发' },
  { id: 'haidilao', label: '海底捞脚本', desc: '大招呼、舞蹈、迎打台词' },
  { id: 'taici', label: '可配置台词', desc: '台词1-23 音频/表情/动作' },
  { id: 'teji', label: '特技动作', desc: '空翻、回旋踢等高难度动作' },
];

const SCENE_ROUTE: Record<string, string> = {
  normal: 'X2 普通动作',
  lingchuang: 'X2 灵创动作',
  haidilao: 'X2 海底捞',
  taici: 'X2 台词',
  teji: 'X2 特技',
};

type DeviceItem =
  | { kind: 'server'; robot: Robot; ip: string }
  | { kind: 'manual'; ip: string };

const COLLAPSE_THRESHOLD = 2;

export function X2ControlScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const { ips: manualIps, addIp, removeIp } = useX2Ip();
  const themedStyles = useMemo(
    () => ({
      sectionTitle: { color: palette.text },
      linkPrimary: { color: palette.primary },
      linkMuted: { color: palette.textMuted },
      addBtn: { backgroundColor: palette.primary },
      emptyBox: {
        backgroundColor: palette.surface,
        borderColor: palette.border,
      },
      emptyText: { color: palette.textMuted },
      deviceList: { borderColor: palette.border },
      rowSelected: { backgroundColor: `${palette.primary}22` },
      rowPressed: { backgroundColor: `${palette.surface}dd` },
      rowNormal: { backgroundColor: palette.surface },
      rowDivider: { borderBottomColor: palette.border },
      checkboxSelected: {
        borderColor: palette.primary,
        backgroundColor: palette.primary,
      },
      checkboxNormal: {
        borderColor: palette.border,
        backgroundColor: 'transparent',
      },
      deviceName: { color: palette.text },
      deviceIp: { color: palette.textMuted },
      badge: { backgroundColor: `${palette.primary}33` },
      badgeText: { color: palette.primary },
      removeBtnText: { color: '#e53935' },
      collapseText: { color: palette.primary },
      collapseBorder: { borderTopColor: palette.border },
      selectedHint: { color: palette.textMuted },
      stopBtnActive: { backgroundColor: '#e53935' },
      stopBtnInactive: { backgroundColor: palette.border },
      cardNormal: {
        backgroundColor: palette.surface,
        borderColor: palette.border,
      },
      cardPressed: {
        backgroundColor: `${palette.surface}cc`,
        borderColor: palette.border,
      },
      cardTitle: { color: palette.text },
      cardDesc: { color: palette.textMuted },
      modalBox: { backgroundColor: palette.surface },
      modalTitle: { color: palette.text },
      modalHint: { color: palette.textMuted },
      input: { color: palette.text, borderColor: palette.border },
      modalBtnBorder: { borderColor: palette.border },
      modalCancelText: { color: palette.textMuted },
      modalPrimaryBtn: { backgroundColor: palette.primary },
      modalPrimaryText: { color: '#fff' },
    }),
    [palette],
  );

  const [serverRobots, setServerRobots] = useState<Robot[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [selectedIps, setSelectedIps] = useState<Set<string>>(new Set());
  const [addVisible, setAddVisible] = useState(false);
  const [draftIp, setDraftIp] = useState('');
  const [listCollapsed, setListCollapsed] = useState(true);

  const loadServerRobots = useCallback(async () => {
    setLoadingServer(true);
    try {
      const all = await fetchRobots();
      setServerRobots(all.filter(r => r.model === 'agibot-x2' && r.ip));
    } catch {
      // 服务端不可达时静默失败
    } finally {
      setLoadingServer(false);
    }
  }, []);

  useEffect(() => {
    loadServerRobots();
  }, [loadServerRobots]);

  const devices = useMemo<DeviceItem[]>(() => {
    const serverItems: DeviceItem[] = serverRobots.map(r => ({
      kind: 'server',
      robot: r,
      ip: r.ip!,
    }));
    const serverIpSet = new Set(serverItems.map(d => d.ip));
    const manualItems: DeviceItem[] = manualIps
      .filter(ip => !serverIpSet.has(ip))
      .map(ip => ({ kind: 'manual', ip }));
    return [...serverItems, ...manualItems];
  }, [serverRobots, manualIps]);

  const visibleDevices = useMemo(
    () =>
      listCollapsed && devices.length > COLLAPSE_THRESHOLD
        ? devices.slice(0, COLLAPSE_THRESHOLD)
        : devices,
    [devices, listCollapsed],
  );

  const selectedIpStr = useMemo(
    () => [...selectedIps].join(':'),
    [selectedIps],
  );

  function toggleDevice(ip: string) {
    setSelectedIps(prev => {
      const next = new Set(prev);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });
  }

  function selectAll() {
    setSelectedIps(new Set(devices.map(d => d.ip)));
  }

  function clearAll() {
    setSelectedIps(new Set());
  }

  function openAdd() {
    setDraftIp('');
    setAddVisible(true);
  }

  function confirmAdd() {
    const trimmed = draftIp.trim();
    if (!trimmed) {
      Alert.alert('提示', '请输入有效的 IP 地址');
      return;
    }
    addIp(trimmed);
    setSelectedIps(prev => new Set([...prev, trimmed]));
    setAddVisible(false);
  }

  function handleRemoveManual(ip: string) {
    Alert.alert('删除设备', `确认删除 ${ip}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          removeIp(ip);
          setSelectedIps(prev => {
            const next = new Set(prev);
            next.delete(ip);
            return next;
          });
        },
      },
    ]);
  }

  function handleStop() {
    if (!selectedIpStr) {
      Alert.alert('提示', '请先选择设备');
      return;
    }
    sendStop(selectedIpStr);
  }

  function handleScenario(id: string) {
    if (!selectedIpStr) {
      Alert.alert('提示', '请先选择设备');
      return;
    }
    const route = SCENE_ROUTE[id];
    if (route) navigation.navigate(route, { ip: selectedIpStr });
  }

  return (
    <Screen palette={palette}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── 设备列表 ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>
            设备列表
          </Text>
          <View style={styles.sectionActions}>
            {loadingServer && (
              <ActivityIndicator
                size="small"
                color={palette.primary}
                style={styles.activityIndicator}
              />
            )}
            <TouchableOpacity onPress={selectAll} style={styles.linkBtn}>
              <Text style={[styles.linkBtnText, themedStyles.linkPrimary]}>
                全选
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={styles.linkBtn}>
              <Text style={[styles.linkBtnText, themedStyles.linkMuted]}>
                清除
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, themedStyles.addBtn]}
              onPress={openAdd}
            >
              <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>

        {devices.length === 0 ? (
          <View style={[styles.emptyBox, themedStyles.emptyBox]}>
            <Text style={[styles.emptyText, themedStyles.emptyText]}>
              暂无设备，点击 ＋ 添加 IP
            </Text>
          </View>
        ) : (
          <View style={[styles.deviceList, themedStyles.deviceList]}>
            {visibleDevices.map((d, idx) => {
              const selected = selectedIps.has(d.ip);
              const isLastVisible =
                listCollapsed && devices.length > COLLAPSE_THRESHOLD
                  ? idx === COLLAPSE_THRESHOLD - 1
                  : idx === devices.length - 1;
              return (
                <Pressable
                  key={d.ip}
                  style={({ pressed }) => [
                    styles.deviceRow,
                    selected
                      ? themedStyles.rowSelected
                      : pressed
                        ? themedStyles.rowPressed
                        : themedStyles.rowNormal,
                    !(
                      isLastVisible && devices.length <= COLLAPSE_THRESHOLD
                    ) && [styles.deviceRowDivider, themedStyles.rowDivider],
                  ]}
                  onPress={() => toggleDevice(d.ip)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selected
                        ? themedStyles.checkboxSelected
                        : themedStyles.checkboxNormal,
                    ]}
                  >
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>

                  <View style={styles.deviceInfo}>
                    {d.kind === 'server' ? (
                      <>
                        <View style={styles.deviceNameRow}>
                          <Text
                            style={[styles.deviceName, themedStyles.deviceName]}
                          >
                            {d.robot.name ?? d.ip}
                          </Text>
                          <View style={[styles.badge, themedStyles.badge]}>
                            <Text
                              style={[styles.badgeText, themedStyles.badgeText]}
                            >
                              agibot-x2
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.deviceIp, themedStyles.deviceIp]}>
                          {d.ip}
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={[styles.deviceName, themedStyles.deviceName]}
                      >
                        {d.ip}
                      </Text>
                    )}
                  </View>

                  {d.kind === 'manual' && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveManual(d.ip)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text
                        style={[
                          styles.removeBtnText,
                          themedStyles.removeBtnText,
                        ]}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </Pressable>
              );
            })}
            {devices.length > COLLAPSE_THRESHOLD && (
              <TouchableOpacity
                style={[
                  styles.collapseRow,
                  themedStyles.rowNormal,
                  themedStyles.collapseBorder,
                ]}
                onPress={() => setListCollapsed(v => !v)}
              >
                <Text style={[styles.collapseText, themedStyles.collapseText]}>
                  {listCollapsed
                    ? `展开全部 ${devices.length} 台设备 ▾`
                    : '收起 ▴'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={[styles.selectedHint, themedStyles.selectedHint]}>
          已选 {selectedIps.size} 台设备
        </Text>

        {/* 停止按钮 */}
        <TouchableOpacity
          style={[
            styles.stopBtn,
            selectedIps.size > 0
              ? themedStyles.stopBtnActive
              : themedStyles.stopBtnInactive,
          ]}
          onPress={handleStop}
        >
          <Text style={styles.stopBtnText}>停止音频</Text>
        </TouchableOpacity>

        {/* 场景列表 */}
        <Text
          style={[styles.sectionTitle, styles.sectionTitleSpacing, themedStyles.sectionTitle]}
        >
          场景控制
        </Text>
        <View style={styles.scenarioList}>
          {SCENARIOS.map(s => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [
                styles.card,
                pressed ? themedStyles.cardPressed : themedStyles.cardNormal,
              ]}
              onPress={() => handleScenario(s.id)}
            >
              <Text style={[styles.cardTitle, themedStyles.cardTitle]}>
                {s.label}
              </Text>
              <Text style={[styles.cardDesc, themedStyles.cardDesc]}>
                {s.desc}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* 添加 IP 弹窗 */}
      <Modal visible={addVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, themedStyles.modalBox]}>
            <Text style={[styles.modalTitle, themedStyles.modalTitle]}>
              添加设备 IP
            </Text>
            <Text style={[styles.modalHint, themedStyles.modalHint]}>
              输入单个 IP 地址
            </Text>
            <TextInput
              style={[styles.input, themedStyles.input]}
              value={draftIp}
              onChangeText={setDraftIp}
              placeholder="例如：192.168.1.100"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="default"
              onSubmitEditing={confirmAdd}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, themedStyles.modalBtnBorder]}
                onPress={() => setAddVisible(false)}
              >
                <Text style={themedStyles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, themedStyles.modalPrimaryBtn]}
                onPress={confirmAdd}
              >
                <Text style={themedStyles.modalPrimaryText}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  sectionTitleSpacing: { marginTop: 20, marginBottom: 8 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityIndicator: { marginRight: 2 },
  linkBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  linkBtnText: { fontSize: 13 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 18, lineHeight: 22 },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 13 },
  deviceList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  deviceRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceName: { fontSize: 14, fontWeight: '600' },
  deviceIp: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, fontWeight: '700' },
  collapseRow: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  collapseText: { fontSize: 13, fontWeight: '600' },
  selectedHint: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'right',
  },
  stopBtn: { marginTop: 4, padding: 12, borderRadius: 8, alignItems: 'center' },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  scenarioList: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: { width: '85%', borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  modalHint: { fontSize: 12, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
