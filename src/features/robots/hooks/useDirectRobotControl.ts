/**
 * useDirectRobotControl
 *
 * 手机与机器狗处于同一局域网时，直接通过 WebSocket 发送控制指令，
 * 绕过云端服务器，大幅降低延迟。
 *
 * 连接地址: ws://{robotIp}:8082
 *
 * 使用方式:
 *   const ctrl = useDirectRobotControl(robotIp);
 *   ctrl.sendJoystick('move', 'move', 0.5, 0.0);  // 左摇杆
 *   ctrl.sendJoystick('move', 'look', 0.0, 0.3);  // 右摇杆旋转
 *   ctrl.sendAction('stand_up');
 *   ctrl.sendEstop();
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DIRECT_CONTROL_PORT = 8082;
const RECONNECT_DELAY_MS = 3000;

/** 摇杆通道：move = 前后左右移动；look = 偏航旋转；pose = 姿态控制 */
export type JoystickChannel = 'move' | 'look' | 'pose';

/** 控制模式：move = 移动；pose = 姿态；two_leg = 双腿站立行走 */
export type DirectControlMode = 'move' | 'pose' | 'two_leg';

/** 拍照响应回调，base64 为 jpeg 图像数据（不含 data URI 前缀） */
export type OnPhotoReceived = (base64: string, format: string) => void;
/** SDK 模式响应回调 */
export type OnSdkModeResponse = (success: boolean, sdkMode?: boolean, error?: string) => void;

export type UseDirectRobotControlResult = {
  /** 当前是否已连接到机器狗本地控制服务 */
  isConnected: boolean;
  /**
   * 发送摇杆移动指令
   * @param mode    控制模式
   * @param channel 通道：'move'=前后左右，'look'=偏航旋转
   * @param x       X 轴，范围 [-1, 1]（横向）
   * @param y       Y 轴，范围 [-1, 1]（纵向 / 旋转强度）
   * @param speed   速度档位，1-10，默认 5
   */
  sendJoystick: (
    mode: DirectControlMode,
    channel: JoystickChannel,
    x: number,
    y: number,
    speed?: number,
  ) => void;
  /**
   * 发送摇杆停止指令（松开摇杆时调用）
   */
  sendJoystickStop: (mode: DirectControlMode, channel?: JoystickChannel) => void;
  /**
   * 执行预设动作
   * @param action     动作名称，如 'stand_up' / 'sit_down' / 'jump' 等
   * @param parameters 可选参数
   */
  sendAction: (action: string, parameters?: Record<string, unknown>) => void;
  /**
   * 急停：机器狗立即进入被动阻尼状态
   */
  sendEstop: () => void;
  /**
   * 控制麦克风开关
   * @param enabled 是否开启麦克风
   */
  sendMicControl: (enabled: boolean) => void;
  /**
   * 通知机器人切换控制模式（移动 / 姿态）
   */
  sendSwitchMode: (mode: DirectControlMode) => void;
  /**
   * 切换 SDK / 遥控模式
   * @param enabled true = SDK 模式；false = 遥控模式
   */
  sendSdkMode: (enabled: boolean) => void;
  /**
   * 触发机器人拍照。图像通过 onPhotoReceived 回调异步返回。
   * @param requestId 可选请求 ID，用于匹配响应
   */
  sendCameraCapture: (requestId?: string) => void;
  /**
   * 注册拍照结果回调
   */
  setOnPhotoReceived: (fn: OnPhotoReceived | null) => void;
  /**
   * 注册 SDK 模式切换结果回调
   */
  setOnSdkModeResponse: (fn: OnSdkModeResponse | null) => void;
};

export function useDirectRobotControl(
  robotIp: string | undefined,
): UseDirectRobotControlResult {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  // ── 底层发送 ─────────────────────────────────────────────────────────────
  const sendRaw = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // ── 公开 API ─────────────────────────────────────────────────────────────
  const sendJoystick = useCallback(
    (
      mode: DirectControlMode,
      channel: JoystickChannel,
      x: number,
      y: number,
      speed: number = 5,
    ) => {
      sendRaw({
        type: 'control_command',
        data: { command: 'joystick', mode, channel, x, y, speed },
      });
    },
    [sendRaw],
  );

  const sendJoystickStop = useCallback(
    (mode: DirectControlMode, channel?: JoystickChannel) => {
      sendRaw({
        type: 'control_command',
        data: { command: 'joystick_stop', mode, channel },
      });
    },
    [sendRaw],
  );

  const sendAction = useCallback(
    (action: string, parameters: Record<string, unknown> = {}) => {
      sendRaw({
        type: 'control_command',
        data: { command: 'action', action, parameters },
      });
    },
    [sendRaw],
  );

  const sendEstop = useCallback(() => {
    sendRaw({
      type: 'control_command',
      data: { command: 'estop' },
    });
  }, [sendRaw]);

  const sendMicControl = useCallback((enabled: boolean) => {
    sendRaw({
      type: 'control_command',
      data: { command: 'mic_control', enabled },
    });
  }, [sendRaw]);

  const sendSwitchMode = useCallback((mode: DirectControlMode) => {
    sendRaw({
      type: 'control_command',
      data: { command: 'switch_control_mode', mode },
    });
  }, [sendRaw]);

  const sendSdkMode = useCallback((enabled: boolean) => {
    const requestId = `sdk_${Date.now()}`;
    sendRaw({
      type: 'control_command',
      data: { command: 'sdk_mode', enabled, requestId },
    });
  }, [sendRaw]);

  const sendCameraCapture = useCallback((requestId?: string) => {
    sendRaw({
      type: 'control_command',
      data: { command: 'camera_capture', requestId: requestId ?? `cap_${Date.now()}` },
    });
  }, [sendRaw]);

  // ── 异步响应回调 Ref ──────────────────────────────────────────────────────
  const onPhotoReceivedRef = useRef<OnPhotoReceived | null>(null);
  const onSdkModeResponseRef = useRef<OnSdkModeResponse | null>(null);

  const setOnPhotoReceived = useCallback((fn: OnPhotoReceived | null) => {
    onPhotoReceivedRef.current = fn;
  }, []);

  const setOnSdkModeResponse = useCallback((fn: OnSdkModeResponse | null) => {
    onSdkModeResponseRef.current = fn;
  }, []);

  // ── 连接管理 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!robotIp) return;

    destroyedRef.current = false;

    function connect() {
      if (destroyedRef.current) return;

      const ws = new WebSocket(`ws://${robotIp}:${DIRECT_CONTROL_PORT}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          const type: string = msg?.type ?? '';
          const data = msg?.data ?? {};
          if (type === 'camera_capture_response') {
            if (data.success && data.image && onPhotoReceivedRef.current) {
              onPhotoReceivedRef.current(data.image as string, (data.format as string) || 'jpeg');
            }
          } else if (type === 'sdk_mode_response') {
            if (onSdkModeResponseRef.current) {
              onSdkModeResponseRef.current(
                Boolean(data.success),
                data.sdkMode as boolean | undefined,
                data.error as string | undefined,
              );
            }
          }
        } catch {
          // 忽略不是 JSON 的消息
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (!destroyedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        // 错误后会触发 onclose，在 onclose 里处理重连
      };
    }

    connect();

    return () => {
      destroyedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // 防止触发自动重连
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [robotIp]);

  return {
    isConnected,
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
  };
}
