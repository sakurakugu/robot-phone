import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Bot,
  Mic,
  MicOff,
  Smartphone,
  Thermometer,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Dimensions,
  GestureResponderEvent,
  LayoutRectangle,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { getBatteryLevel } from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { ChatDrawer } from '../components/ChatDrawer';
import { JoystickPad, JoystickPadHandle } from '../components/JoystickPad';
import { RtspVideoPlayer } from '../components/RtspVideoPlayer';
import {
  DanmakuItem,
  StatusDanmaku,
  useStatusDanmaku,
} from '../components/StatusDanmaku';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { useDirectRobotControl } from '../hooks/useDirectRobotControl';
import { useRobotTelemetry } from '../hooks/useRobotTelemetry';
import { useRobotWebSocket } from '../hooks/useRobotWebSocket';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
  /** 机器狗本体 IP，用于直连 WebRTC 视频流 */
  robotIp?: string;
};

type ControlMode = 'move' | 'pose';
const JOYSTICK_HIT_RADIUS = 70;

const ACTION_BUTTONS = [
  { id: 'stand_up', label: '起立', x: 34, y: 78 },
  { id: 'sit_down', label: '趴下', x: 44, y: 78 },
  { id: 'front_jump', label: '向前跳', x: 54, y: 78 },
  { id: 'jump', label: '向上跳', x: 64, y: 78 },
  { id: 'back_flip', label: '后空翻', x: 36, y: 88 },
  { id: 'two_leg_stand', label: '双腿站立', x: 50, y: 88 },
  { id: 'shake_hand', label: '打招呼', x: 64, y: 88 },
] as const;

// ─── 速度滑条组件 ───
function SpeedSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const palette = usePalette();
  const containerRef = useRef<View>(null);
  const widthRef = useRef(0);
  const pageXRef = useRef(0);

  const applyPageX = (pageX: number) => {
    const x = Math.max(0, pageX - pageXRef.current);
    const w = widthRef.current;
    if (!w) return;
    // 速度范围 1-10
    const ratio = Math.min(1, Math.max(0, x / w));
    const val = Math.round(1 + ratio * 9); // 1 + 0..9
    onChange(val);
  };

  const pct = ((value - 1) / 9) * 100;
  const sliderWidth = 140;
  const fillWidth = (pct / 100) * sliderWidth;
  const thumbLeft = (pct / 100) * sliderWidth;
  const trackStyle = useMemo(
    () => [styles.speedSliderTrack, { backgroundColor: palette.surfaceAlt }],
    [palette.surfaceAlt],
  );
  const fillStyle = useMemo(
    () => [
      styles.speedSliderFill,
      { width: fillWidth, backgroundColor: palette.primary },
    ],
    [fillWidth, palette.primary],
  );
  const thumbStyle = useMemo(
    () => [
      styles.speedSliderThumb,
      { left: thumbLeft, backgroundColor: palette.primary },
    ],
    [thumbLeft, palette.primary],
  );

  return (
    <View
      ref={containerRef}
      style={styles.speedSliderContainer}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, w, _h, px) => {
          widthRef.current = w;
          pageXRef.current = px;
        });
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={e => applyPageX(e.nativeEvent.pageX)}
      onResponderMove={e => applyPageX(e.nativeEvent.pageX)}
    >
      <View style={trackStyle}>
        <View style={fillStyle} />
      </View>
      <View style={thumbStyle} />
    </View>
  );
}

// ─── 屏幕 ───────────────────────────────────────────────────────────────
export function RobotOperationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const palette = usePalette();
  const { setHomeOrientation } = useAppPreferences();
  const route = useRoute<any>();
  const { robotUuid, robotName, robotIp } = (route.params || {}) as RouteParams;

  const [controlMode, setControlMode] = useState<ControlMode>('move');
  const [sdkMode, setSdkMode] = useState(true);
  /** SDK 模式切换进行中，切换完成前禁用开关 */
  const [sdkModeLoading, setSdkModeLoading] = useState(false);
  const sdkModeLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [showVideo, setShowVideo] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [micEnabled, setMicEnabled] = useState(true);
  const [phoneBattery, setPhoneBattery] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  /** 双腿站立模式激活中（此时右摇杆禁用，左摇杆走 two_leg 通道） */
  const [twoLegStandActive, setTwoLegStandActive] = useState(false);

  // 速度弹窗控制
  const [speedPopoverVisible, setSpeedPopoverVisible] = useState(false);
  const [speedPopoverPos, setSpeedPopoverPos] = useState({ x: 0, y: 0 });
  const speedBtnRef = useRef<View>(null);
  const speedPopoverWidth = 192;
  const screenWidth = Dimensions.get('window').width;
  const speedBtnStyle = useMemo(
    () => [styles.speedBtn, { borderColor: palette.border }],
    [palette.border],
  );
  const speedPopoverStyle = useMemo(
    () => [
      styles.speedPopover,
      {
        left: speedPopoverPos.x,
        top: speedPopoverPos.y,
        backgroundColor: palette.surface,
        borderColor: palette.border,
      },
    ],
    [palette.border, palette.surface, speedPopoverPos.x, speedPopoverPos.y],
  );
  const speedPopoverLabelStyle = useMemo(
    () => [styles.speedPopoverLabel, { color: palette.text }],
    [palette.text],
  );

  // 连接机器狗得到遥测（电量、体温、在线状态）
  const dogTelemetry = useRobotTelemetry(robotIp, 3000);

  // 直连机器狗控制（同局域网时绕过云端服务器）
  const directCtrl = useDirectRobotControl(robotIp);

  // 后端 WebSocket（用于语音录制上传通道）
  const cloudWs = useRobotWebSocket();
  useEffect(() => {
    if (robotUuid) cloudWs.connect(robotUuid);
    return () => cloudWs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotUuid]);
  const audioMethods = useMemo(
    () => ({
      sendAudioStart: cloudWs.sendAudioStart,
      sendAudioChunk: cloudWs.sendAudioChunk,
      sendAudioEnd: cloudWs.sendAudioEnd,
      isAudioUploadConnected: cloudWs.isAudioUploadConnected,
    }),
    [
      cloudWs.sendAudioStart,
      cloudWs.sendAudioChunk,
      cloudWs.sendAudioEnd,
      cloudWs.isAudioUploadConnected,
    ],
  );

  // 摇杆发送阶趾（ms），避免频繁刷新发送
  const leftJoyThrottleRef = useRef<number>(0);
  const rightJoyThrottleRef = useRef<number>(0);
  // 急停双击保护：记录上次点击时间
  const lastEstopPressRef = useRef<number>(0);

  // ── 双摇杆多点触控（命令式模式）──────────────────────────────────────────
  // Android 的 MotionEvent 只会将 ACTION_POINTER_DOWN 派发给首个触摸目标，
  // 两个兄弟 View 无法同时独立接收各自手指的 onTouchMove 事件。
  // 解决方案：在 floatingLayer 内放置单一透明 View 统一捕获所有手指事件，
  // 仅当触点命中摇杆圆形区域时才分配给对应摇杆，
  // 再通过 ref 命令式驱动摇杆动画和回调。
  const leftJoyRef = useRef<JoystickPadHandle>(null);
  const rightJoyRef = useRef<JoystickPadHandle>(null);
  const leftJoyWrapRef = useRef<View>(null);
  const rightJoyWrapRef = useRef<View>(null);
  const leftJoyLayoutRef = useRef<LayoutRectangle | null>(null);
  const rightJoyLayoutRef = useRef<LayoutRectangle | null>(null);
  // 记录各触控点 ID → 'left' | 'right' 的分配关系
  const joyTouchSideRef = useRef(new Map<string, 'left' | 'right'>());
  // 记录各触控点 ID → 起始屏幕坐标（用于计算偏移量）
  const joyTouchOriginRef = useRef(new Map<string, { x: number; y: number }>());

  // 最新 state 的 Ref，供触摸处理器直接读取（避免闭包捕获过期值）
  const controlModeRef = useRef(controlMode);
  controlModeRef.current = controlMode;
  const twoLegStandActiveRef = useRef(twoLegStandActive);
  twoLegStandActiveRef.current = twoLegStandActive;

  const updateJoystickLayout = useCallback((side: 'left' | 'right') => {
    const targetRef = side === 'left' ? leftJoyWrapRef : rightJoyWrapRef;
    targetRef.current?.measureInWindow((x, y, width, height) => {
      const layout = { x, y, width, height };
      if (side === 'left') {
        leftJoyLayoutRef.current = layout;
      } else {
        rightJoyLayoutRef.current = layout;
      }
    });
  }, []);

  const isTouchInsideJoystick = useCallback(
    (touchX: number, touchY: number, side: 'left' | 'right') => {
      const layout =
        side === 'left' ? leftJoyLayoutRef.current : rightJoyLayoutRef.current;
      if (!layout) return false;
      const centerX = layout.x + layout.width / 2;
      const centerY = layout.y + layout.height / 2;
      const dx = touchX - centerX;
      const dy = touchY - centerY;
      return dx * dx + dy * dy <= JOYSTICK_HIT_RADIUS * JOYSTICK_HIT_RADIUS;
    },
    [],
  );

  const handleJoystickTouchStart = (e: GestureResponderEvent) => {
    const { changedTouches } = e.nativeEvent;
    for (let i = 0; i < changedTouches.length; i++) {
      const t = changedTouches[i];
      // 触点必须落在摇杆圆形区域内，才算命中对应摇杆
      let side: 'left' | 'right' | null = null;
      if (isTouchInsideJoystick(t.pageX, t.pageY, 'left')) {
        side = 'left';
      } else if (isTouchInsideJoystick(t.pageX, t.pageY, 'right')) {
        side = 'right';
      }
      if (!side) continue;
      // 对应摇杆被禁用时忽略该触控
      if (
        side === 'left' &&
        controlModeRef.current === 'pose' &&
        !twoLegStandActiveRef.current
      )
        continue;
      if (side === 'right' && twoLegStandActiveRef.current) continue;
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

  // ── 拍照：通过直连 WebSocket 触发，机器人回传 base64，保存到相册 ──────────
  async function handleCapturePhoto() {
    if (!robotIp) {
      sendControl('未配置机器人 IP，无法拍照');
      return;
    }
    if (capturing) {
      return;
    }
    try {
      setCapturing(true);
      sendControl('正在拍照...');
      directCtrl.sendCameraCapture();
      // 结果通过 setOnPhotoReceived 回调返回，见下方 useEffect
    } catch (e: any) {
      sendControl(e.message || '拍照失败');
      setCapturing(false);
    }
  }

  // ── 注册直连响应回调 ───────────────────────────────────────────────────────
  useEffect(() => {
    // 拍照结果回调
    directCtrl.setOnPhotoReceived(async (base64: string, format: string) => {
      try {
        const ext = format === 'png' ? 'png' : 'jpg';
        const dir = ReactNativeBlobUtil.fs.dirs.CacheDir;
        const filePath = `${dir}/robot_photo_${Date.now()}.${ext}`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');

        // Android 13以下需要 WRITE_EXTERNAL_STORAGE 权限
        if (Platform.OS === 'android' && Platform.Version < 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            sendControl('存储权限被拒绝，照片未保存');
            setCapturing(false);
            return;
          }
        }

        await CameraRoll.save(`file://${filePath}`, { type: 'photo' });
        sendControl('照片已保存到相册');
      } catch (e: any) {
        sendControl(`保存相册失败: ${e.message}`);
      } finally {
        setCapturing(false);
      }
    });

    // SDK 模式切换结果回调
    directCtrl.setOnSdkModeResponse(
      (success: boolean, sdkModeResult?: boolean, error?: string) => {
        // 清除超时保护计时器
        if (sdkModeLoadingTimeoutRef.current !== null) {
          clearTimeout(sdkModeLoadingTimeoutRef.current);
          sdkModeLoadingTimeoutRef.current = null;
        }
        setSdkModeLoading(false);
        if (success) {
          setSdkMode(sdkModeResult ?? false);
          sendControl(`已切换到 ${sdkModeResult ? 'SDK' : '遥控'} 模式`);
        } else {
          // 切换失败，开关保持原有状态（不更新 sdkMode）
          sendControl(`模式切换失败: ${error ?? '未知错误'}`);
        }
      },
    );

    return () => {
      directCtrl.setOnPhotoReceived(null);
      directCtrl.setOnSdkModeResponse(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directCtrl]);

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
            onValueChange={v => {
              const next: ControlMode = v ? 'pose' : 'move';
              setControlMode(next);
              // 切换模式时退出双腿站立
              if (twoLegStandActive) {
                setTwoLegStandActive(false);
                directCtrl.sendAction('cancel_two_leg_stand');
              }
              directCtrl.sendSwitchMode(next);
              sendControl(`切换到${next === 'pose' ? '姿态' : '移动'}模式`);
            }}
            activeText="姿态"
            inactiveText="移动"
          />

          <ToggleSwitch
            value={sdkMode}
            onValueChange={v => {
              // 不立即更新开关状态，等待服务器确认后再更新
              setSdkModeLoading(true);
              directCtrl.sendSdkMode(v);
              // 30 秒超时保护，避免开关永久卡住
              if (sdkModeLoadingTimeoutRef.current !== null) {
                clearTimeout(sdkModeLoadingTimeoutRef.current);
              }
              sdkModeLoadingTimeoutRef.current = setTimeout(() => {
                setSdkModeLoading(false);
                sendControl('模式切换超时，请重试');
              }, 30000);
            }}
            activeText={sdkModeLoading ? '切换中' : 'SDK'}
            inactiveText={sdkModeLoading ? '切换中' : '遥控'}
            disabled={sdkModeLoading}
          />

          <Pressable
            ref={speedBtnRef}
            style={[styles.speedBox, speedBtnStyle]}
            onPress={() => {
              speedBtnRef.current?.measure((_x, _y, w, h, px, py) => {
                const left = Math.max(
                  8,
                  Math.min(
                    px + w / 2 - speedPopoverWidth / 2,
                    screenWidth - speedPopoverWidth - 8,
                  ),
                );
                setSpeedPopoverPos({ x: left, y: py + h + 4 });
                setSpeedPopoverVisible(true);
              });
            }}
          >
            <Text style={[styles.speedText, { color: palette.text }]}>
              速度 {speed}
            </Text>
          </Pressable>

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
            onPress={() => {
              const now = Date.now();
              // 5秒内第二次点击才触发急停
              if (now - lastEstopPressRef.current < 5000) {
                directCtrl.sendEstop();
                sendControl('已触发急停！');
                // 重置时间，防止连续第三次点击又触发
                lastEstopPressRef.current = 0;
              } else {
                sendControl('再次点击确认急停（5秒内）');
                lastEstopPressRef.current = now;
              }
            }}
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

          {/* 机器狗麦克风开关 */}
          <Pressable
            onPress={() => {
              const nextVal = !micEnabled;
              setMicEnabled(nextVal);
              directCtrl.sendMicControl(nextVal);
              sendControl(
                nextVal ? '机器狗麦克风已开启' : '机器狗麦克风已关闭',
              );
            }}
            style={[styles.smallBtn, { borderColor: palette.border }]}
          >
            {micEnabled ? (
              <Mic size={16} color={palette.text} />
            ) : (
              <MicOff size={16} color={palette.danger} />
            )}
          </Pressable>
        </View>

        <View style={styles.rightInfo}>
          {/* 直连状态指示（小点） */}
          {robotIp ? (
            <View
              style={[
                styles.directDot,
                {
                  backgroundColor: directCtrl.isConnected
                    ? palette.success
                    : palette.danger,
                },
              ]}
            />
          ) : null}
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
      <View style={styles.videoArea}>
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
          {/*
            ── 摇杆统一触摸处理层（必须是 floatingLayer 的第一个子元素，z 最低）──
            两个摇杆的所有手指事件由此单一 View 统一接收，避免 Android 多点触控时
            ACTION_POINTER_DOWN 仅派发给首个触摸目标、兄弟 View 收不到事件的问题。
            Pressable 按钮等在此 View 之后渲染（z 更高），优先接收各自的触摸。
          */}
          <View
            style={StyleSheet.absoluteFill}
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
            onTouchCancel={handleJoystickTouchEnd}
          />

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

          {/* 语音录制按钮（按住说话，发送到后端 ASR → 大模型） */}
          <View style={[styles.micPos, { right: 20 + insets.right }]}>
            <VoiceRecordButton audio={audioMethods} size={56} iconSize={22} />
          </View>

          {/* 左摇杆视觉（pointerEvents="none" 使触摸穿透到底层统一处理 View） */}
          <View
            style={[
              styles.leftJoystick,
              { left: 16 + insets.left, bottom: 20 + insets.bottom },
            ]}
            ref={leftJoyWrapRef}
            onLayout={() => updateJoystickLayout('left')}
            pointerEvents="none"
          >
            <JoystickPad
              ref={leftJoyRef}
              disabled={controlMode === 'pose' && !twoLegStandActive}
              onMove={({ x, y }) => {
                if (controlMode === 'pose' && !twoLegStandActive) return;
                if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;
                const now = Date.now();
                if (now - leftJoyThrottleRef.current < 50) return;
                leftJoyThrottleRef.current = now;
                directCtrl.sendJoystick(
                  twoLegStandActive ? 'two_leg' : controlMode,
                  'move',
                  x,
                  y,
                  speed,
                );
              }}
              onEnd={() => {
                if (controlMode === 'pose' && !twoLegStandActive) return;
                leftJoyThrottleRef.current = 0;
                directCtrl.sendJoystickStop(
                  twoLegStandActive ? 'two_leg' : controlMode,
                  'move',
                );
              }}
            />
          </View>

          {/* 右摇杆视觉（pointerEvents="none" 使触摸穿透到底层统一处理 View） */}
          <View
            style={[
              styles.rightJoystick,
              { right: 100 + insets.right, bottom: 20 + insets.bottom },
            ]}
            ref={rightJoyWrapRef}
            onLayout={() => updateJoystickLayout('right')}
            pointerEvents="none"
          >
            <JoystickPad
              ref={rightJoyRef}
              disabled={twoLegStandActive}
              onMove={({ x, y }) => {
                if (twoLegStandActive) return;
                if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;
                const now = Date.now();
                if (now - rightJoyThrottleRef.current < 50) return;
                rightJoyThrottleRef.current = now;
                const channel = controlMode === 'pose' ? 'pose' : 'look';
                directCtrl.sendJoystick(controlMode, channel, x, y, speed);
              }}
              onEnd={() => {
                if (twoLegStandActive) return;
                rightJoyThrottleRef.current = 0;
                const channel = controlMode === 'pose' ? 'pose' : 'look';
                directCtrl.sendJoystickStop(controlMode, channel);
              }}
            />
          </View>

          {/* 动作按钮 */}
          {ACTION_BUTTONS.map(item => {
            const isActive = item.id === 'two_leg_stand' && twoLegStandActive;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.id === 'two_leg_stand') {
                    // 双腿站立：切换开关
                    const next = !twoLegStandActive;
                    setTwoLegStandActive(next);
                    directCtrl.sendAction(
                      next ? 'two_leg_stand' : 'cancel_two_leg_stand',
                    );
                    sendControl(next ? '进入双腿站立' : '退出双腿站立');
                  } else {
                    directCtrl.sendAction(item.id);
                    sendControl(item.label);
                  }
                }}
                style={[
                  styles.actionBtn,
                  {
                    left: `${item.x}%` as any,
                    top: `${item.y}%` as any,
                    backgroundColor: isActive
                      ? palette.primary + 'CC'
                      : palette.surface + '80',
                    borderColor: isActive ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={[styles.actionBtnText, { color: palette.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}

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

      {/* 速度设置弹窗 */}
      <Modal
        visible={speedPopoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSpeedPopoverVisible(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setSpeedPopoverVisible(false)}
        >
          <View
            onStartShouldSetResponder={() => true}
            style={speedPopoverStyle}
          >
            <Text style={speedPopoverLabelStyle}>速度</Text>
            <SpeedSlider value={speed} onChange={setSpeed} />
          </View>
        </Pressable>
      </Modal>
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
    borderRadius: 6,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  speedText: {
    color: '#DCE7FF',
    fontSize: 12,
  },
  switchLabel: {
    color: '#DCE7FF',
    fontSize: 11,
  },
  speedSliderContainer: {
    height: 32,
    justifyContent: 'center',
    width: 140,
  },
  speedSliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  speedSliderFill: {
    height: '100%',
  },
  speedSliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: 8,
    elevation: 2,
  },
  speedPopover: {
    position: 'absolute',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 192,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedPopoverLabel: {
    fontSize: 12,
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
    position: 'absolute',
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

  // 直连状态指示小圆点
  directDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
