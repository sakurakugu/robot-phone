import { useNavigation, useRoute } from '@react-navigation/native';
import { Bot, Smartphone } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBatteryLevel } from 'react-native-device-info';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { capturePhoto } from '../api';
import { ChatDrawer, ChatMessage } from '../components/ChatDrawer';
import { JoystickPad } from '../components/JoystickPad';
import { DanmakuItem, StatusDanmaku, useStatusDanmaku } from '../components/StatusDanmaku';
import { ToggleSwitch } from '../components/ToggleSwitch';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
};

type ControlMode = 'move' | 'pose';

const ACTION_BUTTONS = [
  { id: 'stand_up',      label: '起立',     x: 34, y: 78 },
  { id: 'sit_down',      label: '趴下',     x: 44, y: 78 },
  { id: 'front_jump',    label: '向前跳',   x: 54, y: 78 },
  { id: 'jump',          label: '向上跳',   x: 64, y: 78 },
  { id: 'backflip',      label: '后空翻',   x: 36, y: 88 },
  { id: 'two_leg_stand', label: '双腿站立', x: 50, y: 88 },
  { id: 'shake_hand',    label: '打招呼',   x: 64, y: 88 },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────
export function RobotOperationScreen() {
  const navigation = useNavigation<any>();
  const { setHomeOrientation } = useAppPreferences();
  const route = useRoute<any>();
  const { robotUuid, robotName } = (route.params || {}) as RouteParams;

  const [controlMode, setControlMode] = useState<ControlMode>('move');
  const [sdkMode, setSdkMode] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [micEnabled, setMicEnabled] = useState(true);
  const [battery] = useState<number | null>(null);
  const [phoneBattery, setPhoneBattery] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'robot', text: '你好，我已准备好接收指令。' },
  ]);

  // ── 弹幕状态 ─────────────────────────────────────────────────────────────
  const [danmakuMessages, setDanmakuMessages] = useState<DanmakuItem[]>([]);
  const { push: pushDanmaku, expire: expireDanmaku, setMessagesExternal } = useStatusDanmaku();

  useEffect(() => {
    setMessagesExternal.current = setDanmakuMessages;
  }, [setMessagesExternal]);

  const sendControl = useCallback((text: string) => {
    pushDanmaku(text);
  }, [pushDanmaku]);
  const [timeText, setTimeText] = useState(() =>
    new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  );

  // ── 定时器 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeText(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
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
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (chatVisible) {
        setChatVisible(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [chatVisible]);

  // ── 拍照 ──────────────────────────────────────────────────────────────────
  async function handleCapturePhoto() {
    if (!robotUuid) return;
    try {
      setCapturing(true);
      sendControl('正在拍照...');
      const data = await capturePhoto(robotUuid);
      setPhotoUri(`data:image/${data.format || 'jpeg'};base64,${data.image}`);
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

  // ── 聊天 ──────────────────────────────────────────────────────────────────
  function handleChatSend(text: string) {
    const userMsg: ChatMessage = { id: `${Date.now()}_u`, role: 'user', text };
    const robotMsg: ChatMessage = { id: `${Date.now()}_r`, role: 'robot', text: `已收到：${text}` };
    setChatMessages(prev => [...prev, userMsg, robotMsg]);
    sendControl(`指令：${text}`);
  }

  const headerText = robotName || '未命名机器人';

  return (
    <SafeAreaView style={styles.page}>

      {/* ── 顶部工具栏 ────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.leftTools}>
          <Pressable onPress={handleGoBack} style={styles.smallBtn}>
            <Text style={styles.btnText}>返回</Text>
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
            <Pressable onPress={() => setSpeed(v => Math.max(1, v - 1))} style={styles.speedBtn}>
              <Text style={styles.btnText}>-</Text>
            </Pressable>
            <Text style={styles.speedText}>速度 {speed}</Text>
            <Pressable onPress={() => setSpeed(v => Math.min(10, v + 1))} style={styles.speedBtn}>
              <Text style={styles.btnText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.switchLabel}>视频</Text>
          <ToggleSwitch
            value={showVideo}
            onValueChange={setShowVideo}
            activeText="视频开"
            inactiveText="视频关"
          />

          <Pressable onPress={handleCapturePhoto} disabled={capturing} style={styles.smallBtn}>
            <Text style={styles.btnText}>{capturing ? '拍照中' : '拍照'}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('机器人设置', { robotUuid, robotName })}
            style={styles.smallBtn}
          >
            <Text style={styles.btnText}>设置</Text>
          </Pressable>

          <Pressable onPress={() => sendControl('急停')} style={styles.emergencyBtn}>
            <Text style={styles.emergencyText}>急停</Text>
          </Pressable>
        </View>

        <View style={styles.rightInfo}>
          <Text style={styles.infoText}>{headerText}</Text>
          <View style={styles.batteryInfo}>
            <Bot size={14} color="#DCE7FF" />
            <Text style={styles.infoText}>{battery !== null ? `${battery}%` : '--'}</Text>
          </View>
          <View style={styles.batteryInfo}>
            <Smartphone size={14} color="#DCE7FF" />
            <Text style={styles.infoText}>{phoneBattery !== null ? `${phoneBattery}%` : '--'}</Text>
          </View>
          <Text style={styles.infoText}>{timeText}</Text>
        </View>
      </View>

      {/* ── 视频区域 ──────────────────────────────────────────────────────── */}
      <View style={styles.videoArea}>
        {showVideo && photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.videoFrame} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {showVideo ? '等待视频信号...' : '视频已关闭'}
            </Text>
          </View>
        )}

        {/* ── 浮层控件 ────────────────────────────────────────────────────── */}
        <View style={styles.floatingLayer} pointerEvents="box-none">

          {/* 右上角圆形按钮 */}
          <Pressable onPress={() => setChatVisible(true)} style={[styles.circleBtn, styles.chatPos]}>
            <Text style={styles.btnText}>对话</Text>
          </Pressable>

          <Pressable onPress={() => setMicEnabled(v => !v)} style={[styles.circleBtn, styles.micPos]}>
            <Text style={styles.btnText}>{micEnabled ? '麦克风' : '已静音'}</Text>
          </Pressable>

          {/* 左摇杆 */}
          <View style={styles.leftJoystick} pointerEvents="box-none">
            <JoystickPad
              onMove={({ x, y }) => {
                if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;
                sendControl(`移动 x:${x.toFixed(2)} y:${y.toFixed(2)}`);
              }}
              onEnd={() => sendControl('移动停止')}
            />
          </View>

          {/* 右摇杆 */}
          <View style={styles.rightJoystick} pointerEvents="box-none">
            <JoystickPad
              onMove={({ x, y }) => {
                if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;
                const ch = controlMode === 'pose' ? '姿态' : '观察';
                sendControl(`${ch} x:${x.toFixed(2)} y:${y.toFixed(2)}`);
              }}
              onEnd={() => sendControl('归中')}
            />
          </View>

          {/* 动作按钮 */}
          {ACTION_BUTTONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => sendControl(item.label)}
              style={[styles.actionBtn, { left: `${item.x}%` as any, top: `${item.y}%` as any }]}
            >
              <Text style={styles.actionBtnText}>{item.label}</Text>
            </Pressable>
          ))}

          {/* 弹幕状态层 */}
          <StatusDanmaku messages={danmakuMessages} onExpire={expireDanmaku} />
        </View>

        {/* ── 聊天抽屉 ──────────────────────────────────────────────────── */}
        <ChatDrawer
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
          messages={chatMessages}
          onSend={handleChatSend}
        />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#111827',
  },

  // ── 顶部工具栏
  topBar: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: '#2C374D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
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
  infoText: {
    color: '#DCE7FF',
    fontSize: 12,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  videoFrame: {
    width: '100%',
    height: '100%',
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
    ...StyleSheet.absoluteFillObject,
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
