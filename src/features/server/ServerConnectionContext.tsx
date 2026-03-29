/**
 * ServerConnectionContext
 *
 * 手机端与服务器之间的独立 WebSocket 连接（无机器人绑定）。
 *
 * 连接方式：
 *   /api/v1/phone/business?phoneId={稳定UUID}&role=ui
 *   ↑ phoneId 为本次 App 会话生成的唯一 ID，整个生命周期不变
 *     （区别于 useRobotWebSocket 的 robotId，后者用于订阅特定机器狗消息）
 *   ↑ role=ui  = 告知服务器这是手机客户端
 *
 * 特性：
 *   - App 启动后自动连接，无需手动调用
 *   - 断线后无限次自动重连（指数退避，最长间隔 30 秒）
 *   - 提供 isConnected 状态与 reconnect 手动触发函数
 *
 * 使用方式：
 *   const { isConnected, reconnect } = useServerConnection();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getActiveEnvironment } from '../../shared/config/environment';
import { getAuthToken } from '../auth/AuthContext';

const WS_PHONE_PATH = '/api/v1/phone/business';
const CONNECT_TIMEOUT_MS = 8000;
const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000; // 最长重连间隔 30s

/**
 * TODO: 改成uuidv7
 * 生成简单的 UUID v4（用于标识本次 App 会话）。
 * 整个 App 生命周期仅生成一次，重连时复用同一 ID，
 * 避免服务器每次重连都写入新的幽灵记录。
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    if (c === 'x') {
      return Math.floor(Math.random() * 16).toString(16);
    }
    const yCandidates = ['8', '9', 'a', 'b'];
    return yCandidates[Math.floor(Math.random() * yCandidates.length)];
  });
}

/** 本次 App 会话的手机端 ID，模块级单例 */
const PHONE_SESSION_ID = generateUUID();

type ServerConnectionContextValue = {
  isConnected: boolean;
  reconnect: () => void;
};

const ServerConnectionContext = createContext<ServerConnectionContextValue>({
  isConnected: false,
  reconnect: () => { },
});

/** 将 http/https baseUrl 转为对应的 ws/wss URL（手机独立通道，不含 robotId） */
function buildPhoneWsUrl(baseUrl: string): string {
  const wsBase = baseUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`);
  const token = encodeURIComponent(getAuthToken());
  // phoneId = 手机端会话 ID（整个 App 生命周期唯一、稳定）
  // 服务器识别 phoneId 后不会将其写入机器人数据库
  return `${wsBase}${WS_PHONE_PATH}?phoneId=${PHONE_SESSION_ID}&role=ui&token=${token}`;
}

export function ServerConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const destroyedRef = useRef(false);
  // 保存最新的 openSocket 引用，避免 useCallback 闭包过期
  const openSocketRef = useRef<(() => void) | null>(null);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const openSocket = useCallback(() => {
    if (destroyedRef.current) return;

    const wsUrl = buildPhoneWsUrl(getActiveEnvironment().baseUrl);

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

    ws.onerror = () => {
      clearTimeout(timeoutId);
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      setIsConnected(false);
      wsRef.current = null;

      if (destroyedRef.current) return;

      // 无限重连：指数退避，上限 30s
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectCountRef.current),
        RECONNECT_MAX_DELAY_MS,
      );
      reconnectCountRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (!destroyedRef.current) {
          openSocketRef.current?.();
        }
      }, delay);
    };
  }, []);

  // 保持 ref 与最新的 openSocket 同步
  useEffect(() => {
    openSocketRef.current = openSocket;
  }, [openSocket]);

  /** 手动触发重连（立即断开并重新连接） */
  const reconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.onclose = null; // 阻止触发自动重连计时
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    reconnectCountRef.current = 0;
    destroyedRef.current = false;
    openSocket();
  }, [openSocket]);

  useEffect(() => {
    destroyedRef.current = false;
    openSocket();
    return () => {
      destroyedRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [openSocket]);

  return (
    <ServerConnectionContext.Provider value={{ isConnected, reconnect }}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

export function useServerConnection(): ServerConnectionContextValue {
  return useContext(ServerConnectionContext);
}
