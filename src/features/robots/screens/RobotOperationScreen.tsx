import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Bot,
  Smartphone,
  Thermometer,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getBatteryLevel } from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { ChatDrawer } from '../components/ChatDrawer';
import { JoystickPad } from '../components/JoystickPad';
import { RtspVideoPlayer } from '../components/RtspVideoPlayer';
import {
  DanmakuItem,
  StatusDanmaku,
  useStatusDanmaku,
} from '../components/StatusDanmaku';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { useRobotTelemetry } from '../hooks/useRobotTelemetry';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
  /** 机器狗本体 IP，用于直连 RTSP 视频流 */
  robotIp?: string;
};

type ControlMode = 'move' | 'pose';

const ACTION_BUTTONS = [
  { id: 'stand_up', label: '起立', x: 34, y: 78 },
  { id: 'sit_down', label: '趴下', x: 44, y: 78 },
  { id: 'front_jump', label: '向前跳', x: 54, y: 78 },
  { id: 'jump', label: '向上跳', x: 64, y: 78 },
  { id: 'backflip', label: '后空翻', x: 36, y: 88 },
  { id: 'two_leg_stand', label: '双腿站立', x: 50, y: 88 },
  { id: 'shake_hand', label: '打招呼', x: 64, y: 88 },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────
export function RobotOperationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const palette = usePalette();
  const { setHomeOrientation } = useAppPreferences();
  const route = useRoute<any>();
  const { robotUuid, robotName, robotIp } = (route.params || {}) as RouteParams;

  const [controlMode, setControlMode] = useState<ControlMode>('move');
  const [sdkMode, setSdkMode] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [micEnabled, setMicEnabled] = useState(true);
  const [phoneBattery, setPhoneBattery] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  // 连接机器狗得到遥测（电量、体温、在线状态）
  const dogTelemetry = useRobotTelemetry(robotIp, 3000);

  // ── 预计算遥测颜色（避免 inline 条件样式 lint 警告）─────────────────────────
  const dogOnlineColor = dogTelemetry.online
    ? palette.success
    : palette.textMuted;
  const dogPowerColor =
    dogTelemetry.power !== null && dogTelemetry.power <= 20
      ? palette.danger
      : dogTelemetry.power !== null && dogTelemetry.power <= 50
        ? palette.warning
        : palette.text;

  // ── 弹幕状态 ─────────────────────────────────────────────────────────────
  const [danmakuMessages, setDanmakuMessages] = useState<DanmakuItem[]>([]);
  const {
    push: pushDanmaku,
    expire: expireDanmaku,
    setMessagesExternal,
  } = useStatusDanmaku();

  useEffect(() => {
    setMessagesExternal.current = setDanmakuMessages;
  }, [setMessagesExternal]);

  const sendControl = useCallback(
    (text: string) => {
      pushDanmaku(text);
    },
    [pushDanmaku],
  );
  const [timeText, setTimeText] = useState(() =>
    new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  // ── 定时器 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeText(
        new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }, 1000);

    const updatePhoneBattery = () => {
      getBatteryLevel().then(level => setPhoneBattery(Math.round(level * 100)));
    };
    updatePhoneBattery();
    const batteryTimer = setInterval(updatePhoneBattery, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(batteryTimer);
    };
  }, []);

  useEffect(() => {
    return () => setHomeOrientation('portrait');
  }, [setHomeOrientation]);

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (chatVisible) {
        setChatVisible(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [chatVisible]);

  // ── 拍照（通过服务端，后续改成通过本地也可以） ────────────────────────────────────────────
  async function handleCapturePhoto() {
    if (!robotUuid) return;
    try {
      setCapturing(true);
      sendControl('正在拍照...');
      // const data = await capturePhoto(robotUuid);
      // setPhotoUri(`data:image/${data.format || 'jpeg'};base64,${data.image}`);
      sendControl('拍照成功');
    } catch (e: any) {
      sendControl(e.message || '拍照失败');
    } finally {
      setCapturing(false);
    }
  }

  function handleGoBack() {
    if (chatVisible) {
      setChatVisible(false);
      return;
    }
    setHomeOrientation('portrait');
    navigation.goBack();
  }

  const headerText = robotName || '未命名机器人';

  return (
    <View style={[styles.page, { backgroundColor: palette.background }]}>
      {/* ── 顶部工具栏 ────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: palette.border,
            backgroundColor: palette.surface,
            paddingLeft: 10 + insets.left,
            paddingRight: 10 + insets.right,
          },
        ]}
      >
        <View style={styles.leftTools}>
          <Pressable
            onPress={handleGoBack}
            style={[styles.smallBtn, { borderColor: palette.border }]}
          >
            <ArrowLeft size={16} color={palette.text} />
          </Pressable>

          <ToggleSwitch
            value={controlMode === 'pose'}
            onValueChange={v => setControlMode(v ? 'pose' : 'move')}
            activeText="姿态"
            inactiveText="移动"
          />

          <ToggleSwitch
            value={sdkMode}
            onValueChange={setSdkMode}
            activeText="SDK"
            inactiveText="遥控"
          />

          <View style={styles.speedBox}>
            <Pressable
              onPress={() => setSpeed(v => Math.max(1, v - 1))}
              style={[styles.speedBtn, { borderColor: palette.border }]}
            >
              <Text style={[styles.btnText, { color: palette.text }]}>-</Text>
            </Pressable>
            <Text style={[styles.speedText, { color: palette.text }]}>
              速度 {speed}
            </Text>
            <Pressable
              onPress={() => setSpeed(v => Math.min(10, v + 1))}
              style={[styles.speedBtn, { borderColor: palette.border }]}
            >
              <Text style={[styles.btnText, { color: palette.text }]}>+</Text>
            </Pressable>
          </View>

          <Text style={[styles.switchLabel, { color: palette.text }]}>
            视频
          </Text>
          <ToggleSwitch
            value={showVideo}
            onValueChange={setShowVideo}
            activeText="视频开"
            inactiveText="视频关"
          />

          <Pressable
            onPress={handleCapturePhoto}
            disabled={capturing}
            style={[styles.smallBtn, { borderColor: palette.border }]}
          >
            <Text style={[styles.btnText, { color: palette.text }]}>
              {capturing ? '拍照中' : '拍照'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate('机器人设置', { robotUuid, robotName })
            }
            style={[styles.smallBtn, { borderColor: palette.border }]}
          >
            <Text style={[styles.btnText, { color: palette.text }]}>设置</Text>
          </Pressable>

          <Pressable
            onPress={() => sendControl('急停')}
            style={[
              styles.emergencyBtn,
              {
                borderColor: palette.danger,
                backgroundColor: palette.danger + '22',
              },
            ]}
          >
            <Text style={[styles.emergencyText, { color: palette.danger }]}>
              急停
            </Text>
          </Pressable>
        </View>

        <View style={styles.rightInfo}>
          <Text style={[styles.infoText, { color: palette.text }]}>
            {headerText}
          </Text>
          <Text style={[styles.infoText, { color: palette.text }]}>
            {timeText}
          </Text>
          <View style={styles.batteryStack}>
            {/* 机器狗在线状态 */}
            <View style={styles.batteryInfo}>
              {dogTelemetry.online ? (
                <Wifi size={14} color={palette.success} />
              ) : (
                <WifiOff size={14} color={palette.textMuted} />
              )}
              <Text style={[styles.infoText, { color: dogOnlineColor }]}>
                {dogTelemetry.online ? '在线' : '离线'}
              </Text>
            </View>
            {/* 机器狗体温 */}
            <View style={styles.batteryInfo}>
              <Thermometer size={14} color={palette.text} />
              <Text style={[styles.infoText, { color: palette.text }]}>
                {dogTelemetry.temp !== null
                  ? `${dogTelemetry.temp.toFixed(1)}°C`
                  : '--'}
              </Text>
            </View>
          </View>
          <View style={styles.batteryStack}>
            {/* 手机电量 */}
            <View style={styles.batteryInfo}>
              <Smartphone size={14} color={palette.text} />
              <Text style={[styles.infoText, { color: palette.text }]}>
                {phoneBattery !== null ? `${phoneBattery}%` : '--'}
              </Text>
            </View>
            {/* 机器狗电量 */}
            <View style={styles.batteryInfo}>
              <Bot size={14} color={palette.text} />
              <Text style={[styles.infoText, { color: dogPowerColor }]}>
                {dogTelemetry.power !== null ? `${dogTelemetry.power}%` : '--'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── 视频区域（直连机器狗 RTSP 流）─────────────────────────────────── */}
      <View style={[styles.videoArea, { backgroundColor: '#000000' }]}>
        {showVideo ? (
          robotIp ? (
            <RtspVideoPlayer robotIp={robotIp} />
          ) : (
            <View
              style={[
                styles.placeholder,
                { backgroundColor: palette.surfaceAlt },
              ]}
            >
              <Text
                style={[styles.placeholderText, { color: palette.textMuted }]}
              >
                未配置机器人 IP，无法获取视频流
              </Text>
            </View>
          )
        ) : (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: palette.surfaceAlt },
            ]}
          >
            <Text
              style={[styles.placeholderText, { color: palette.textMuted }]}
            >
              视频已关闭
            </Text>
          </View>
        )}

        {/* ── 浮层控件 ────────────────────────────────────────────────────── */}
        <View style={styles.floatingLayer} pointerEvents="box-none">
          {/* 右上角圆形按钮 */}
          <Pressable
            onPress={() => setChatVisible(true)}
            style={[
              styles.circleBtn,
              styles.chatPos,
              {
                backgroundColor: palette.surface + 'E6',
                borderColor: palette.border,
                right: 20 + insets.right,
              },
            ]}
          >
            <Text style={[styles.btnText, { color: palette.text }]}>对话</Text>
          </Pressable>

          <Pressable
            onPress={() => setMicEnabled(v => !v)}
            style={[
              styles.circleBtn,
              styles.micPos,
              {
                backgroundColor: palette.surface + 'E6',
                borderColor: palette.border,
                right: 20 + insets.right,
              },
            ]}
          >
            <Text style={[styles.btnText, { color: palette.text }]}>
              {micEnabled ? '麦克风' : '已静音'}
            </Text>
          </Pressable>

          {/* 左摇杆 */}
          <View
            style={[
              styles.leftJoystick,
              { left: 16 + insets.left, bottom: 20 + insets.bottom },
            ]}
            pointerEvents="box-none"
          >
            <JoystickPad
              onMove={({ x, y }) => {
                if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;
              }}
            />
          </View>

          {/* 右摇杆 */}
          <View
            style={[
              styles.rightJoystick,
              { right: 100 + insets.right, bottom: 20 + insets.bottom },
            ]}
            pointerEvents="box-none"
          >
            <JoystickPad
              onMove={({ x, y }) => {
                if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;
              }}
            />
          </View>

          {/* 动作按钮 */}
          {ACTION_BUTTONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => sendControl(item.label)}
              style={[
                styles.actionBtn,
                {
                  left: `${item.x}%` as any,
                  top: `${item.y}%` as any,
                  backgroundColor: palette.surface + '80',
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.actionBtnText, { color: palette.text }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}

          {/* 弹幕状态层 */}
          <StatusDanmaku messages={danmakuMessages} onExpire={expireDanmaku} />
        </View>

        {/* ── 聊天抽屉 ──────────────────────────────────────────────────── */}
        <ChatDrawer
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
          robotUuid={robotUuid}
          robotName={robotName}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#111827',
  },

  // ── 顶部工具栏
  topBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#2C374D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
  },
  batteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryStack: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  },
  infoText: {
    color: '#DCE7FF',
    fontSize: 12,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtn: {
    borderWidth: 1,
    borderColor: '#C74646',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#3A1616',
  },
  emergencyText: {
    color: '#FF8A8A',
    fontSize: 12,
    fontWeight: '600',
  },
  speedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  speedBtn: {
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: '#DCE7FF',
    fontSize: 12,
  },
  switchLabel: {
    color: '#DCE7FF',
    fontSize: 11,
  },

  // ── 视频区域
  videoArea: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8FA2C7',
    fontSize: 16,
  },
  floatingLayer: {
    ...StyleSheet.absoluteFill,
  },

  // ── 圆形悬浮按钮
  circleBtn: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(23,33,52,0.9)',
    borderWidth: 1,
    borderColor: '#50628A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPos: {
    top: 18,
    right: 20,
  },
  micPos: {
    top: 88,
    right: 20,
  },

  // ── 摇杆容器位置
  leftJoystick: {
    position: 'absolute',
    left: 16,
    bottom: 20,
  },
  rightJoystick: {
    position: 'absolute',
    right: 100,
    bottom: 20,
  },

  // ── 动作按钮
  actionBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: -22,
    marginTop: -22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  btnText: {
    color: '#DCE7FF',
    fontSize: 12,
    fontWeight: '600',
  },
});
