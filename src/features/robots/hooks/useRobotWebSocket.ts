/**
 * useRobotWebSocket
 *
 * 手机端连接后端服务器的 WebSocket Hook。
 *
 * 连接方式：
 *   /api/v1/phone/business?robotId={robotUUID}&role=ui
 *   ↑ robotId  = 目标机器狗的 UUID（告诉服务器订阅哪台机器狗的消息）
 *   ↑ role=ui  = 标识本端是 UI 客户端（机器狗端使用 role=robot）
 *
 * 支持的消息类型：
 *   发送：text_input（→大模型）/ tts_input（→机器狗语音）/ action_command（→动作指令）
 *   接收：text_response / asr_transcript / error
 *
 * 特性：连接超时检测、断线自动重连（指数退避，最多 5 次）
 *
 * WebSocket 地址自动派生：从环境配置的 baseUrl 派生为 ws:// 或 wss:// 前缀
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getActiveEnvironment } from '../../../shared/config/environment';
import { getAuthToken } from '../../auth/providers/AuthContext';
import { getOrCreatePhoneDeviceId, getPhoneSessionId } from '../device/phoneIdentity';

// 后端 WebSocket 对话通道路径（与后端 server.ts 中的 phonePath + '/business' 一致）
const WS_CHAT_PATH = '/api/v1/phone/business';
const WS_AUDIO_UPLOAD_PATH = '/api/v1/phone/audio/upload';
const WS_AUDIO_DOWNLOAD_PATH = '/api/v1/phone/audio/download';
const CONNECT_TIMEOUT_MS = 8000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2000; // 指数退避：2s, 4s, 8s, 16s, 32s

type PhoneIdentity = {
  phoneSessionId: string;
  phoneDeviceId: string;
};

export type WsMessage = {
  type: string;
  robotId?: string;
  timestamp: number;
  conversationId?: string;
  data?: any;
};

export type MessageHandler = (data: WsMessage) => void;

export type TtsOptions = {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  stream?: boolean;
};

type WsMessageEvent = {
  data?: string | { toString(): string };
};

export type UseRobotWebSocketResult = {
  isConnected: boolean;
  connect: (robotId: string) => void;
  disconnect: () => void;
  /** 发送文本给大模型，服务器回复后广播 text_response */
  sendToAI: (text: string, ttsOptions?: TtsOptions) => void;
  /** 直接合成 TTS 推送到机器狗播放，不经过大模型 */
  sendToRobot: (text: string, ttsOptions?: TtsOptions) => void;
  /** 发送动作指令 */
  sendAction: (action: string, parameters?: Record<string, any>) => void;
  /** 底层消息发送，用于自定义消息类型 */
  sendRaw: (msg: WsMessage) => void;
  /** 注册消息监听，返回取消监听函数 */
  onMessage: (handler: MessageHandler) => () => void;
  /** 音频上传通道是否已连接 */
  isAudioUploadConnected: boolean;
  /** 发送音频开始消息 */
  sendAudioStart: (sessionId: string, sampleRate?: number, channels?: number, frameDurationMs?: number) => void;
  /** 发送音频数据块（base64 编码的 PCM 数据） */
  sendAudioChunk: (sessionId: string, seq: number, buffer: string, frameDurationMs?: number) => void;
  /** 发送音频结束消息 */
  sendAudioEnd: (sessionId: string, reason?: string) => void;
};

/** 将 http/https baseUrl 转为对应的 ws/wss URL，并拼接路径 */
function toWsUrl(baseUrl: string, path: string, robotId: string, identity: PhoneIdentity): string {
  const wsBase = baseUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`);
  const token = encodeURIComponent(getAuthToken());
  return `${wsBase}${path}?robotId=${robotId}&role=ui&phoneSessionId=${identity.phoneSessionId}&phoneDeviceId=${identity.phoneDeviceId}&token=${token}`;
}

export function useRobotWebSocket(): UseRobotWebSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const wsAudioRef = useRef<WebSocket | null>(null);
  const wsAudioDownloadRef = useRef<WebSocket | null>(null);
  const robotIdRef = useRef<string>('');
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const destroyedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isAudioUploadConnected, setIsAudioUploadConnected] = useState(false);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  /** 注册消息监听，返回取消监听函数 */
  const onMessage = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.onclose = null; // 阻止 onclose 触发自动重连
      wsRef.current.close();
      wsRef.current = null;
    }
    if (wsAudioRef.current) {
      wsAudioRef.current.onclose = null;
      wsAudioRef.current.close();
      wsAudioRef.current = null;
    }
    if (wsAudioDownloadRef.current) {
      wsAudioDownloadRef.current.onclose = null;
      wsAudioDownloadRef.current.close();
      wsAudioDownloadRef.current = null;
    }
    setIsConnected(false);
    setIsAudioUploadConnected(false);
  }, []);

  /** 内部：建立一次 WebSocket 连接，断线后自动重连 */
  const openSocket = useCallback((robotId: string, wsUrl: string) => {
    const timeoutId = setTimeout(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        wsRef.current?.close();
      }
    }, CONNECT_TIMEOUT_MS);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      clearTimeout(timeoutId);
      reconnectCountRef.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (event: WsMessageEvent) => {
      try {
        const raw = event.data;
        if (!raw) return;
        const data: WsMessage = JSON.parse(
          typeof raw === 'string' ? raw : raw.toString(),
        );
        handlersRef.current.forEach(h => h(data));
      } catch { /* 忽略解析错误 */ }
    };

    ws.onerror = () => { clearTimeout(timeoutId); };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      setIsConnected(false);
      wsRef.current = null;

      if (!destroyedRef.current && reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectCountRef.current);
        reconnectCountRef.current++;
        reconnectTimerRef.current = setTimeout(() => {
          if (!destroyedRef.current) {
            openSocket(robotId, wsUrl);
          }
        }, delay);
      }
    };
  // openSocket 自引用，eslint 忽略

  }, []);

  /** 连接到指定机器狗（robotId = 机器狗 UUID） */
  const connect = useCallback(
    async (robotId: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && robotIdRef.current === robotId) {
        return; // 已连接同一台机器狗，跳过
      }
      disconnect();
      destroyedRef.current = false;
      robotIdRef.current = robotId;
      reconnectCountRef.current = 0;

      // 使用环境配置的 baseUrl 自动派生 WebSocket 地址
      const serverBase = getActiveEnvironment().baseUrl;
      const phoneDeviceId = await getOrCreatePhoneDeviceId();
      const identity: PhoneIdentity = {
        phoneSessionId: getPhoneSessionId(),
        phoneDeviceId,
      };
      openSocket(robotId, toWsUrl(serverBase, WS_CHAT_PATH, robotId, identity));

      // 音频上传通道（独立连接，不影响业务通道）
      try {
        const audioWs = new WebSocket(toWsUrl(serverBase, WS_AUDIO_UPLOAD_PATH, robotId, identity));
        wsAudioRef.current = audioWs;
        audioWs.onopen = () => setIsAudioUploadConnected(true);
        audioWs.onclose = () => { setIsAudioUploadConnected(false); wsAudioRef.current = null; };
        audioWs.onerror = () => { /* 等待 onclose */ };
      } catch {
        console.warn('[useRobotWebSocket] 音频上传通道连接失败');
      }

      // 音频下载通道（用于接收云端 TTS 分片）
      try {
        const audioDownloadWs = new WebSocket(toWsUrl(serverBase, WS_AUDIO_DOWNLOAD_PATH, robotId, identity));
        wsAudioDownloadRef.current = audioDownloadWs;
        audioDownloadWs.onmessage = (event: WsMessageEvent) => {
          try {
            const raw = event.data;
            if (!raw) return;
            const data: WsMessage = JSON.parse(
              typeof raw === 'string' ? raw : raw.toString(),
            );
            handlersRef.current.forEach(h => h(data));
          } catch { /* 忽略解析错误 */ }
        };
        audioDownloadWs.onclose = () => { wsAudioDownloadRef.current = null; };
        audioDownloadWs.onerror = () => { /* 等待 onclose */ };
      } catch {
        console.warn('[useRobotWebSocket] 音频下载通道连接失败');
      }
    },
    [disconnect, openSocket],
  );

  const sendRaw = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[useRobotWebSocket] WebSocket 未就绪，消息丢弃:', msg.type);
      return;
    }
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  /** 发送文本给大模型 */
  const sendToAI = useCallback(
    (text: string, ttsOptions: TtsOptions = {}) => {
      sendRaw({
        type: 'text_input',
        robotId: robotIdRef.current,
        timestamp: Date.now(),
        data: { text, ttsOptions: { stream: true, ...ttsOptions } },
      });
    },
    [sendRaw],
  );

  /** 直接合成 TTS 推送到机器狗 */
  const sendToRobot = useCallback(
    (text: string, ttsOptions: TtsOptions = {}) => {
      sendRaw({
        type: 'tts_input',
        robotId: robotIdRef.current,
        timestamp: Date.now(),
        data: { text, ttsOptions: { stream: true, ...ttsOptions } },
      });
    },
    [sendRaw],
  );

  /** 发送动作指令 */
  const sendAction = useCallback(
    (action: string, parameters: Record<string, any> = {}) => {
      sendRaw({
        type: 'action_command',
        robotId: robotIdRef.current,
        timestamp: Date.now(),
        data: {
          action_name: action,
          parameters,
          source: 'phone-chat',
        },
      });
    },
    [sendRaw],
  );

  // ── 音频上传方法 ──────────────────────────────────────────────

  const sendAudioRaw = useCallback((msg: WsMessage) => {
    if (wsAudioRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('[useRobotWebSocket] 音频上传通道未就绪，消息丢弃:', msg.type);
      return;
    }
    wsAudioRef.current.send(JSON.stringify(msg));
  }, []);

  /** 发送音频开始消息 */
  const sendAudioStart = useCallback(
    (sessionId: string, sampleRate = 16000, channels = 1, frameDurationMs = 20) => {
      // TODO: 后续替换 format 为 opus
      sendAudioRaw({
        type: 'audio_start',
        robotId: robotIdRef.current,
        timestamp: Date.now(),
        data: { format: 'pcm', sampleRate, channels, frameDurationMs, sessionId },
      });
    },
    [sendAudioRaw],
  );

  /** 发送音频数据块（base64 编码的 PCM 数据） */
  const sendAudioChunk = useCallback(
    (sessionId: string, seq: number, buffer: string, frameDurationMs = 20) => {
      // TODO: 后续替换 format 为 opus
      sendAudioRaw({
        type: 'audio_chunk',
        robotId: robotIdRef.current,
        timestamp: Date.now(),
        data: { format: 'pcm', sampleRate: 16000, channels: 1, sessionId, seq, frameDurationMs, buffer },
      });
    },
    [sendAudioRaw],
  );

  /** 发送音频结束消息 */
  const sendAudioEnd = useCallback(
    (sessionId: string, reason = 'manual') => {
      sendAudioRaw({
        type: 'audio_end',
        robotId: robotIdRef.current,
        timestamp: Date.now(),
        data: { sessionId, reason },
      });
    },
    [sendAudioRaw],
  );

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  return useMemo(
    () => ({
      isConnected,
      connect,
      disconnect,
      sendToAI,
      sendToRobot,
      sendAction,
      sendRaw,
      onMessage,
      isAudioUploadConnected,
      sendAudioStart,
      sendAudioChunk,
      sendAudioEnd,
    }),
    [
      connect,
      disconnect,
      isAudioUploadConnected,
      isConnected,
      onMessage,
      sendAction,
      sendAudioChunk,
      sendAudioEnd,
      sendAudioStart,
      sendRaw,
      sendToAI,
      sendToRobot,
    ],
  );
}
