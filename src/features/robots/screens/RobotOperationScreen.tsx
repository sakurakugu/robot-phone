import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bot, Smartphone } from 'lucide-react-native';
import { getBatteryLevel } from 'react-native-device-info';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { capturePhoto } from '../api';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
};

type ControlMode = 'move' | 'pose';

const actionButtons = [
  { id: 'stand_up', label: '起立' },
  { id: 'sit_down', label: '趴下' },
  { id: 'front_jump', label: '向前跳' },
  { id: 'jump', label: '向上跳' },
  { id: 'backflip', label: '后空翻' },
  { id: 'two_leg_stand', label: '双腿站立' },
  { id: 'shake_hand', label: '打招呼' },
];

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
  const [statusText, setStatusText] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [timeText, setTimeText] = useState(() =>
    new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeText(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    const updatePhoneBattery = () => {
      getBatteryLevel().then((level) => {
        setPhoneBattery(Math.round(level * 100));
      });
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

  const headerText = `${robotName || '未命名机器人'} · ${robotUuid || ''}`;

  async function handleCapturePhoto() {
    if (!robotUuid) return;
    try {
      setCapturing(true);
      setStatusText('正在拍照...');
      const data = await capturePhoto(robotUuid);
      setPhotoUri(`data:image/${data.format || 'jpeg'};base64,${data.image}`);
      setStatusText('拍照成功');
    } catch (e: any) {
      setStatusText(e.message || '拍照失败');
    } finally {
      setCapturing(false);
    }
  }

  function sendControl(text: string) {
    setStatusText(`已发送: ${text}`);
  }

  function handleGoBack() {
    setHomeOrientation('portrait');
    navigation.goBack();
  }

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: '#111827' }]}>
      <View style={[styles.topBar, { borderBottomColor: '#2C374D' }]}>
        <View style={styles.leftTools}>
          <Pressable onPress={handleGoBack} style={[styles.smallBtn, { borderColor: '#41506F' }]}>
            <Text style={styles.btnText}>返回</Text>
          </Pressable>
          <Pressable
            onPress={() => setControlMode(controlMode === 'move' ? 'pose' : 'move')}
            style={[styles.smallBtn, { borderColor: '#41506F' }]}
          >
            <Text style={styles.btnText}>{controlMode === 'move' ? '移动' : '姿态'}</Text>
          </Pressable>
          <Pressable onPress={() => setSdkMode(v => !v)} style={[styles.smallBtn, { borderColor: '#41506F' }]}>
            <Text style={styles.btnText}>{sdkMode ? 'SDK' : '遥控'}</Text>
          </Pressable>
          <View style={styles.speedBox}>
            <Pressable onPress={() => setSpeed(v => Math.max(1, v - 1))} style={[styles.speedBtn, { borderColor: '#41506F' }]}>
              <Text style={styles.btnText}>-</Text>
            </Pressable>
            <Text style={styles.speedText}>速度 {speed}</Text>
            <Pressable onPress={() => setSpeed(v => Math.min(10, v + 1))} style={[styles.speedBtn, { borderColor: '#41506F' }]}>
              <Text style={styles.btnText}>+</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setShowVideo(v => !v)} style={[styles.smallBtn, { borderColor: '#41506F' }]}>
            <Text style={styles.btnText}>{showVideo ? '视频开' : '视频关'}</Text>
          </Pressable>
          <Pressable onPress={handleCapturePhoto} disabled={capturing} style={[styles.smallBtn, { borderColor: '#41506F' }]}>
            <Text style={styles.btnText}>{capturing ? '拍照中' : '拍照'}</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('机器人设置', { robotUuid, robotName })}
            style={[styles.smallBtn, { borderColor: '#41506F' }]}
          >
            <Text style={styles.btnText}>设置</Text>
          </Pressable>
          <Pressable
            onPress={() => sendControl('急停')}
            style={[styles.smallBtn, { borderColor: '#C74646', backgroundColor: '#3A1616' }]}
          >
            <Text style={[styles.btnText, { color: '#FF8A8A' }]}>急停</Text>
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

      <View style={styles.videoArea}>
        {showVideo && photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.videoFrame} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{showVideo ? '等待视频信号...' : '视频已关闭'}</Text>
          </View>
        )}

        <View style={styles.floatingLayer}>
          <Pressable
            onPress={() => navigation.navigate('机器人对话', { robotUuid, robotName })}
            style={[styles.circleBtn, styles.chatPos]}
          >
            <Text style={styles.btnText}>对话</Text>
          </Pressable>
          <Pressable onPress={() => setMicEnabled(v => !v)} style={[styles.circleBtn, styles.micPos]}>
            <Text style={styles.btnText}>{micEnabled ? '麦克风' : '已静音'}</Text>
          </Pressable>

          <View style={[styles.joystick, styles.leftJoystick]}>
            <Text style={styles.joystickText}>移动摇杆</Text>
            <View style={styles.joystickPad}>
              <Pressable style={styles.directionBtn} onPress={() => sendControl('前进')}>
                <Text style={styles.btnText}>上</Text>
              </Pressable>
              <View style={styles.middleRow}>
                <Pressable style={styles.directionBtn} onPress={() => sendControl('左转')}>
                  <Text style={styles.btnText}>左</Text>
                </Pressable>
                <Pressable style={styles.directionBtn} onPress={() => sendControl('停止')}>
                  <Text style={styles.btnText}>停</Text>
                </Pressable>
                <Pressable style={styles.directionBtn} onPress={() => sendControl('右转')}>
                  <Text style={styles.btnText}>右</Text>
                </Pressable>
              </View>
              <Pressable style={styles.directionBtn} onPress={() => sendControl('后退')}>
                <Text style={styles.btnText}>下</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.joystick, styles.rightJoystick]}>
            <Text style={styles.joystickText}>{controlMode === 'pose' ? '姿态摇杆' : '观察摇杆'}</Text>
            <View style={styles.joystickPad}>
              <Pressable style={styles.directionBtn} onPress={() => sendControl(controlMode === 'pose' ? '抬头' : '看上')}>
                <Text style={styles.btnText}>上</Text>
              </Pressable>
              <View style={styles.middleRow}>
                <Pressable style={styles.directionBtn} onPress={() => sendControl(controlMode === 'pose' ? '左倾' : '看左')}>
                  <Text style={styles.btnText}>左</Text>
                </Pressable>
                <Pressable style={styles.directionBtn} onPress={() => sendControl('归中')}>
                  <Text style={styles.btnText}>中</Text>
                </Pressable>
                <Pressable style={styles.directionBtn} onPress={() => sendControl(controlMode === 'pose' ? '右倾' : '看右')}>
                  <Text style={styles.btnText}>右</Text>
                </Pressable>
              </View>
              <Pressable style={styles.directionBtn} onPress={() => sendControl(controlMode === 'pose' ? '低头' : '看下')}>
                <Text style={styles.btnText}>下</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.actionArea}>
            {actionButtons.map(item => (
              <Pressable
                key={item.id}
                onPress={() => sendControl(item.label)}
                style={[styles.actionBtn, { borderColor: '#41506F', backgroundColor: '#1B273D' }]}
              >
                <Text style={styles.btnText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: '#2C374D' }]}>
        <Text style={[styles.infoText, { color: statusText ? '#F7CF72' : '#90A5C3' }]}>
          {statusText || '横屏操控模式已启用'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  topBar: {
    height: 58,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  speedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  speedBtn: {
    borderWidth: 1,
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
  joystick: {
    position: 'absolute',
    width: 140,
    borderRadius: 12,
    backgroundColor: 'rgba(15,24,38,0.72)',
    borderWidth: 1,
    borderColor: '#405174',
    padding: 8,
    gap: 6,
  },
  leftJoystick: {
    left: 16,
    bottom: 20,
  },
  rightJoystick: {
    right: 16,
    bottom: 20,
  },
  joystickText: {
    color: '#DCE7FF',
    fontSize: 12,
    textAlign: 'center',
  },
  joystickPad: {
    gap: 6,
  },
  middleRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  directionBtn: {
    flex: 1,
    minHeight: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#50628A',
    backgroundColor: '#22314A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionArea: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    bottom: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footer: {
    height: 34,
    borderTopWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnText: {
    color: '#DCE7FF',
    fontSize: 12,
    fontWeight: '600',
  },
});
