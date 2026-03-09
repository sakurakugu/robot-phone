/**
 * D1ControlScreen — D1 机器狗群控主页
 *
 * 功能：
 *  - 选择服务器上 agibot-d1 型号的机器狗（不支持手动输入 IP）
 *  - 7 个预设动作按钮
 *  - 移动 / 姿态模式切换
 *  - 左右两个摇杆（固定底部，竖屏布局）
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../../../app/preferences/AppPreferences';
import { usePalette } from '../../../../app/theme/palette';
import { fetchRobots } from '../../api';
import { JoystickPad, JoystickPadHandle } from '../../components/JoystickPad';
import { ToggleSwitch } from '../../components/ToggleSwitch';
import type { Robot } from '../../types';
import type { D1ControlMode } from '../d1/useD1GroupControl';
import { useD1GroupControl } from '../d1/useD1GroupControl';

const JOYSTICK_THROTTLE_MS = 50;

const ACTION_BUTTONS = [
  { id: 'stand_up', label: '起立' },
  { id: 'sit_down', label: '趴下' },
  { id: 'front_jump', label: '向前跳' },
  { id: 'jump', label: '向上跳' },
  { id: 'backflip', label: '后空翻' },
  { id: 'two_leg_stand', label: '双腿站立' },
  { id: 'shake_hand', label: '打招呼' },
] as const;

const COLLAPSE_THRESHOLD = 3;

// ─── 动作卡片按钮 ─────────────────────────────────────────────────────────────
function ActionCard({
  label,
  onPress,
  palette,
}: {
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: pressed
            ? `${palette.primary}55`
            : `${palette.surface}`,
          borderColor: palette.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.actionCardText, { color: palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── 主屏 ─────────────────────────────────────────────────────────────────────
export function D1ControlScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { activeThemeMode } = useAppPreferences();
  const isDark = activeThemeMode === 'dark';

  // ── 服务器机器狗列表 ──────────────────────────────────────────────────────
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [listCollapsed, setListCollapsed] = useState(true);

  const loadRobots = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchRobots();
      setRobots(all.filter(r => r.model === 'agibot-d1' && r.ip));
    } catch {
      // 服务端不可达时静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRobots();
  }, [loadRobots]);

  const visibleRobots = useMemo(
    () =>
      listCollapsed && robots.length > COLLAPSE_THRESHOLD
        ? robots.slice(0, COLLAPSE_THRESHOLD)
        : robots,
    [robots, listCollapsed],
  );

  function toggleRobot(uuid: string) {
    setSelectedUuids(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }

  function selectAll() {
    setSelectedUuids(new Set(robots.map(r => r.uuid)));
  }

  function clearAll() {
    setSelectedUuids(new Set());
  }

  // ── 群控 hook：把选中机器狗的 IP 传入 ────────────────────────────────────
  const selectedIps = useMemo(() => {
    return robots
      .filter(r => selectedUuids.has(r.uuid) && r.ip)
      .map(r => r.ip!);
  }, [robots, selectedUuids]);

  const ctrl = useD1GroupControl(selectedIps);

  const joystickColors = useMemo(
    () =>
      isDark
        ? undefined
        : {
            outer: 'rgba(44,105,255,0.18)',
            outerBorder: 'rgba(44,105,255,0.6)',
            stick: 'rgba(44,105,255,0.6)',
            stickBorder: 'rgba(44,105,255,0.8)',
          },
    [isDark],
  );

  // ── 控制模式 ─────────────────────────────────────────────────────────────
  const [controlMode, setControlMode] = useState<D1ControlMode>('move');

  function handleModeChange(isPose: boolean) {
    const next: D1ControlMode = isPose ? 'pose' : 'move';
    setControlMode(next);
    ctrl.sendSwitchMode(next);
  }

  // ── 双摇杆多点触控 ─────────────────────────────────────────────────────────
  const screenWidth = Dimensions.get('window').width;
  const leftJoyRef = useRef<JoystickPadHandle>(null);
  const rightJoyRef = useRef<JoystickPadHandle>(null);
  const joyTouchSideRef = useRef(new Map<string, 'left' | 'right'>());
  const joyTouchOriginRef = useRef(new Map<string, { x: number; y: number }>());

  const handleJoystickTouchStart = (e: GestureResponderEvent) => {
    const { changedTouches } = e.nativeEvent;
    for (let i = 0; i < changedTouches.length; i++) {
      const t = changedTouches[i];
      let side: 'left' | 'right' | null = null;
      if (t.pageX < screenWidth * 0.5) side = 'left';
      else if (t.pageX > screenWidth * 0.5) side = 'right';
      if (!side) continue;
      joyTouchSideRef.current.set(t.identifier, side);
      joyTouchOriginRef.current.set(t.identifier, { x: t.pageX, y: t.pageY });
    }
  };

  const handleJoystickTouchMove = (e: GestureResponderEvent) => {
    const { changedTouches } = e.nativeEvent;
    for (let i = 0; i < changedTouches.length; i++) {
      const t = changedTouches[i];
      const side = joyTouchSideRef.current.get(t.identifier);
      const origin = joyTouchOriginRef.current.get(t.identifier);
      if (!side || !origin) continue;
      const dx = t.pageX - origin.x;
      const dy = t.pageY - origin.y;
      if (side === 'left') {
        leftJoyRef.current?.applyDelta(dx, dy);
      } else {
        rightJoyRef.current?.applyDelta(dx, dy);
      }
    }
  };

  const handleJoystickTouchEnd = (e: GestureResponderEvent) => {
    const { changedTouches } = e.nativeEvent;
    for (let i = 0; i < changedTouches.length; i++) {
      const t = changedTouches[i];
      const side = joyTouchSideRef.current.get(t.identifier);
      if (!side) continue;
      joyTouchSideRef.current.delete(t.identifier);
      joyTouchOriginRef.current.delete(t.identifier);
      if (side === 'left') {
        leftJoyRef.current?.release();
      } else {
        rightJoyRef.current?.release();
      }
    }
  };

  // ── 摇杆节流 ─────────────────────────────────────────────────────────────
  const leftThrottle = useRef(0);
  const rightThrottle = useRef(0);
  const controlModeRef = useRef(controlMode);
  controlModeRef.current = controlMode;

  const handleLeftJoystick = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - leftThrottle.current < JOYSTICK_THROTTLE_MS) return;
      leftThrottle.current = now;
      const mode = controlModeRef.current;
      const channel = mode === 'pose' ? 'pose' : 'move';
      ctrl.sendJoystick(mode, channel, x, y);
    },
    [ctrl],
  );

  const handleLeftEnd = useCallback(() => {
    ctrl.sendJoystickStop(controlModeRef.current, 'move');
  }, [ctrl]);

  const handleRightJoystick = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - rightThrottle.current < JOYSTICK_THROTTLE_MS) return;
      rightThrottle.current = now;
      const mode = controlModeRef.current;
      ctrl.sendJoystick(mode, 'look', x, y);
    },
    [ctrl],
  );

  const handleRightEnd = useCallback(() => {
    ctrl.sendJoystickStop(controlModeRef.current, 'look');
  }, [ctrl]);

  // ── 急停 ─────────────────────────────────────────────────────────────────
  function handleEstop() {
    ctrl.sendEstop();
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {/* 上方滚动区域：机器狗列表 + 模式 + 动作 */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 机器狗列表 ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            机器狗列表
          </Text>
          <View style={styles.sectionActions}>
            {loading && (
              <ActivityIndicator
                size="small"
                color={palette.primary}
                style={styles.activityIndicator}
              />
            )}
            <TouchableOpacity onPress={loadRobots} style={styles.linkBtn}>
              <Text style={[styles.linkBtnText, { color: palette.textMuted }]}>
                刷新
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={selectAll} style={styles.linkBtn}>
              <Text style={[styles.linkBtnText, { color: palette.primary }]}>
                全选
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={styles.linkBtn}>
              <Text style={[styles.linkBtnText, { color: palette.textMuted }]}>
                清除
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {robots.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {loading ? '正在加载...' : '未发现 agibot-d1 设备'}
            </Text>
          </View>
        ) : (
          <View style={[styles.deviceList, { borderColor: palette.border }]}>
            {visibleRobots.map((r, idx) => {
              const selected = selectedUuids.has(r.uuid);
              const isLastVisible =
                listCollapsed && robots.length > COLLAPSE_THRESHOLD
                  ? idx === COLLAPSE_THRESHOLD - 1
                  : idx === robots.length - 1;
              return (
                <Pressable
                  key={r.uuid}
                  style={({ pressed }) => [
                    styles.deviceRow,
                    selected
                      ? { backgroundColor: `${palette.primary}22` }
                      : pressed
                        ? { backgroundColor: `${palette.surface}dd` }
                        : { backgroundColor: palette.surface },
                    !isLastVisible && [
                      styles.deviceRowDivider,
                      { borderBottomColor: palette.border },
                    ],
                  ]}
                  onPress={() => toggleRobot(r.uuid)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selected
                        ? {
                            borderColor: palette.primary,
                            backgroundColor: palette.primary,
                          }
                        : [
                            styles.checkboxNormal,
                            { borderColor: palette.border },
                          ],
                    ]}
                  >
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceNameRow}>
                      <Text
                        style={[styles.deviceName, { color: palette.text }]}
                      >
                        {r.name ?? r.ip}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: `${palette.primary}33` },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: palette.primary }]}
                        >
                          agibot-d1
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[styles.deviceIp, { color: palette.textMuted }]}
                    >
                      {r.ip}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {robots.length > COLLAPSE_THRESHOLD && (
              <TouchableOpacity
                style={[
                  styles.collapseRow,
                  {
                    backgroundColor: palette.surface,
                    borderTopColor: palette.border,
                  },
                ]}
                onPress={() => setListCollapsed(v => !v)}
              >
                <Text style={[styles.collapseText, { color: palette.primary }]}>
                  {listCollapsed
                    ? `展开全部 ${robots.length} 台设备 ▾`
                    : '收起 ▴'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={[styles.selectedHint, { color: palette.textMuted }]}>
          已选 {selectedUuids.size} 台 · 已连接 {ctrl.connectedCount} 台
        </Text>

        {/* ── 模式切换 ── */}
        <View style={styles.modeRow}>
          <Text style={[styles.modeLabel, { color: palette.text }]}>
            控制模式
          </Text>
          <ToggleSwitch
            value={controlMode === 'pose'}
            onValueChange={handleModeChange}
            activeText="姿态"
            inactiveText="移动"
          />
          <Pressable
            style={[
              styles.estopBtn,
              {
                borderColor: palette.danger,
                backgroundColor: `${palette.danger}22`,
              },
            ]}
            onPress={handleEstop}
          >
            <Text style={[styles.estopText, { color: palette.danger }]}>
              急停
            </Text>
          </Pressable>
        </View>

        {/* ── 动作按钮 ── */}
        <Text
          style={[
            styles.sectionTitle,
            styles.sectionTitleSpacing,
            { color: palette.text },
          ]}
        >
          动作控制
        </Text>
        <View style={styles.actionGrid}>
          {ACTION_BUTTONS.map(btn => (
            <View key={btn.id} style={styles.actionCell}>
              <ActionCard
                label={btn.label}
                palette={palette}
                onPress={() => ctrl.sendAction(btn.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── 底部摇杆区（固定） ── */}
      <View
        style={[
          styles.joystickBar,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        {/*
          单一触摸捕获 View，统一接收所有手指事件，根据触摸起始 X 坐标
          （左50% → 左摇杆，右50% → 右摇杆）分发给对应摇杆的 ref，
          解决 Android 多点触控时兄弟 View 无法同时接收事件的问题。
        */}
        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
        />
        <View style={styles.joystickContainer} pointerEvents="none">
          <JoystickPad
            ref={leftJoyRef}
            onMove={({ x, y }) => handleLeftJoystick(x, y)}
            onEnd={handleLeftEnd}
            colors={joystickColors}
          />
          <Text style={[styles.joystickLabel, { color: palette.textMuted }]}>
            移动
          </Text>
        </View>
        <View style={styles.joystickContainer} pointerEvents="none">
          <JoystickPad
            ref={rightJoyRef}
            onMove={({ x, y }) => handleRightJoystick(x, y)}
            onEnd={handleRightEnd}
            colors={joystickColors}
          />
          <Text style={[styles.joystickLabel, { color: palette.textMuted }]}>
            {controlMode === 'pose' ? '姿态' : '转向'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // ── 区块头
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sectionTitleSpacing: {
    marginTop: 16,
    marginBottom: 10,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityIndicator: { marginRight: 4 },
  linkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkBtnText: {
    fontSize: 13,
  },

  // ── 设备列表
  emptyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 13,
  },
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
  deviceRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxNormal: {
    backgroundColor: 'transparent',
  },
  checkmark: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceIp: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  collapseRow: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  collapseText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedHint: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'right',
  },

  // ── 模式切换行
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  estopBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  estopText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── 动作按钮网格（3 列）
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCell: {
    width: '30.5%',
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── 底部摇杆栏
  joystickBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  joystickContainer: {
    alignItems: 'center',
    gap: 8,
  },
  joystickLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
