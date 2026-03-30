import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import type { HomeOrientation } from '../../../app/preferences/AppPreferences';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  PermissionsAndroid,
  Platform,
  StatusBar,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { getBatteryLevel } from 'react-native-device-info';
import {
  type DanmakuItem,
  useStatusDanmaku,
} from '../components/StatusDanmaku';
import type { ControlMode } from '../operation';
import {
  SPEED_POPOVER_WIDTH,
  formatOperationTime,
} from '../operation';
import { useDirectRobotControl } from './useDirectRobotControl';
import { useRobotTelemetry } from './useRobotTelemetry';
import { useRobotWebSocket } from './useRobotWebSocket';

type UseRobotOperationScreenOptions = {
  robotUuid: string;
  robotName?: string;
  robotIp?: string;
  navigation: {
    goBack: () => void;
    navigate: (
      screen: '机器人设置',
      params: { robotUuid: string; robotName?: string },
    ) => void;
  };
  setHomeOrientation: (orientation: HomeOrientation) => void;
};

export function useRobotOperationScreen(
  options: UseRobotOperationScreenOptions,
) {
  const {
    robotUuid,
    robotName,
    robotIp,
    navigation,
    setHomeOrientation,
  } = options;
  const [controlMode, setControlMode] = useState<ControlMode>('move');
  const [sdkMode, setSdkMode] = useState(true);
  const [sdkModeLoading, setSdkModeLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [micEnabled, setMicEnabled] = useState(true);
  const [phoneBattery, setPhoneBattery] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [twoLegStandActive, setTwoLegStandActive] = useState(false);
  const [speedPopoverVisible, setSpeedPopoverVisible] = useState(false);
  const [speedPopoverPos, setSpeedPopoverPos] = useState({ x: 0, y: 0 });
  const [danmakuMessages, setDanmakuMessages] = useState<DanmakuItem[]>([]);
  const [timeText, setTimeText] = useState(() => formatOperationTime());

  const speedBtnRef = useRef<View>(null);
  const sdkModeLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastEstopPressRef = useRef(0);
  const screenWidth = Dimensions.get('window').width;

  const dogTelemetry = useRobotTelemetry(robotIp, 3000);
  const {
    isConnected: directConnected,
    sendJoystick,
    sendJoystickStop,
    sendAction,
    sendEstop,
    sendMicControl,
    sendSwitchMode,
    sendSdkMode,
    sendCameraCapture,
    setOnPhotoReceived,
    setOnSdkModeResponse,
  } = useDirectRobotControl(robotIp);
  const {
    connect,
    disconnect,
    sendAudioStart,
    sendAudioChunk,
    sendAudioEnd,
    isAudioUploadConnected,
  } = useRobotWebSocket();

  const audioMethods = useMemo(
    () => ({
      sendAudioStart,
      sendAudioChunk,
      sendAudioEnd,
      isAudioUploadConnected,
    }),
    [
      isAudioUploadConnected,
      sendAudioChunk,
      sendAudioEnd,
      sendAudioStart,
    ],
  );

  const { push: pushDanmaku, expire: expireDanmaku, setMessagesExternal } =
    useStatusDanmaku();

  useEffect(() => {
    setMessagesExternal.current = setDanmakuMessages;
  }, [setMessagesExternal]);

  const sendControl = useCallback(
    (text: string) => {
      pushDanmaku(text);
    },
    [pushDanmaku],
  );

  const clearSdkModeTimeout = useCallback(() => {
    if (sdkModeLoadingTimeoutRef.current !== null) {
      clearTimeout(sdkModeLoadingTimeoutRef.current);
      sdkModeLoadingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (robotUuid) {
      connect(robotUuid);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, robotUuid]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeText(formatOperationTime());
    }, 1000);

    const updatePhoneBattery = () => {
      getBatteryLevel()
        .then(level => {
          setPhoneBattery(Math.round(level * 100));
        })
        .catch(() => {
          setPhoneBattery(null);
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
    return () => {
      setHomeOrientation('portrait');
    };
  }, [setHomeOrientation]);

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (chatVisible) {
          setChatVisible(false);
          return true;
        }
        return false;
      },
    );
    return () => {
      subscription.remove();
    };
  }, [chatVisible]);

  useEffect(() => {
    return () => {
      clearSdkModeTimeout();
    };
  }, [clearSdkModeTimeout]);

  const handleCapturePhoto = useCallback(async () => {
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
      sendCameraCapture();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '拍照失败';
      sendControl(message);
      setCapturing(false);
    }
  }, [capturing, robotIp, sendCameraCapture, sendControl]);

  useEffect(() => {
    setOnPhotoReceived(async (base64: string, format: string) => {
      try {
        const ext = format === 'png' ? 'png' : 'jpg';
        const dir = ReactNativeBlobUtil.fs.dirs.CacheDir;
        const filePath = `${dir}/robot_photo_${Date.now()}.${ext}`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');

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
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '未知错误';
        sendControl(`保存相册失败: ${message}`);
      } finally {
        setCapturing(false);
      }
    });

    setOnSdkModeResponse(
      (success: boolean, sdkModeResult?: boolean, error?: string) => {
        clearSdkModeTimeout();
        setSdkModeLoading(false);
        if (success) {
          setSdkMode(sdkModeResult ?? false);
          sendControl(`已切换到 ${sdkModeResult ? 'SDK' : '遥控'} 模式`);
          return;
        }
        sendControl(`模式切换失败: ${error ?? '未知错误'}`);
      },
    );

    return () => {
      setOnPhotoReceived(null);
      setOnSdkModeResponse(null);
    };
  }, [
    clearSdkModeTimeout,
    sendControl,
    setOnPhotoReceived,
    setOnSdkModeResponse,
  ]);

  const handleGoBack = useCallback(() => {
    if (chatVisible) {
      setChatVisible(false);
      return;
    }
    setHomeOrientation('portrait');
    navigation.goBack();
  }, [chatVisible, navigation, setHomeOrientation]);

  const handleToggleControlMode = useCallback(
    (poseModeEnabled: boolean) => {
      const nextMode: ControlMode = poseModeEnabled ? 'pose' : 'move';
      setControlMode(nextMode);
      if (twoLegStandActive) {
        setTwoLegStandActive(false);
        sendAction('cancel_two_leg_stand');
      }
      sendSwitchMode(nextMode);
      sendControl(`切换到${nextMode === 'pose' ? '姿态' : '移动'}模式`);
    },
    [sendAction, sendControl, sendSwitchMode, twoLegStandActive],
  );

  const handleToggleSdkMode = useCallback(
    (enabled: boolean) => {
      clearSdkModeTimeout();
      setSdkModeLoading(true);
      sendSdkMode(enabled);
      sdkModeLoadingTimeoutRef.current = setTimeout(() => {
        setSdkModeLoading(false);
        sendControl('模式切换超时，请重试');
      }, 30000);
    },
    [clearSdkModeTimeout, sendControl, sendSdkMode],
  );

  const handleOpenSpeedPopover = useCallback(() => {
    speedBtnRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      const left = Math.max(
        8,
        Math.min(
          pageX + width / 2 - SPEED_POPOVER_WIDTH / 2,
          screenWidth - SPEED_POPOVER_WIDTH - 8,
        ),
      );
      setSpeedPopoverPos({ x: left, y: pageY + height + 4 });
      setSpeedPopoverVisible(true);
    });
  }, [screenWidth]);

  const handleOpenSettings = useCallback(() => {
    navigation.navigate('机器人设置', {
      robotUuid,
      robotName,
    });
  }, [navigation, robotName, robotUuid]);

  const handleEmergencyStop = useCallback(() => {
    const now = Date.now();
    if (now - lastEstopPressRef.current < 5000) {
      sendEstop();
      sendControl('已触发急停！');
      lastEstopPressRef.current = 0;
      return;
    }
    sendControl('再次点击确认急停（5秒内）');
    lastEstopPressRef.current = now;
  }, [sendControl, sendEstop]);

  const handleToggleMic = useCallback(() => {
    setMicEnabled(current => {
      const next = !current;
      sendMicControl(next);
      sendControl(next ? '机器狗麦克风已开启' : '机器狗麦克风已关闭');
      return next;
    });
  }, [sendControl, sendMicControl]);

  const handleActionPress = useCallback(
    (actionId: string, label: string) => {
      if (actionId === 'two_leg_stand') {
        const next = !twoLegStandActive;
        setTwoLegStandActive(next);
        sendAction(next ? 'two_leg_stand' : 'cancel_two_leg_stand');
        sendControl(next ? '进入双腿站立' : '退出双腿站立');
        return;
      }
      sendAction(actionId);
      sendControl(label);
    },
    [sendAction, sendControl, twoLegStandActive],
  );

  return {
    headerText: robotName || '未命名机器人',
    timeText,
    phoneBattery,
    controlMode,
    sdkMode,
    sdkModeLoading,
    showVideo,
    speed,
    micEnabled,
    capturing,
    chatVisible,
    twoLegStandActive,
    speedPopoverVisible,
    speedPopoverPos,
    speedBtnRef,
    dogTelemetry,
    directConnected,
    audioMethods,
    danmakuMessages,
    expireDanmaku,
    sendJoystick,
    sendJoystickStop,
    setChatVisible,
    setShowVideo,
    setSpeed,
    setSpeedPopoverVisible,
    handleGoBack,
    handleCapturePhoto,
    handleToggleControlMode,
    handleToggleSdkMode,
    handleOpenSpeedPopover,
    handleOpenSettings,
    handleEmergencyStop,
    handleToggleMic,
    handleActionPress,
  };
}
