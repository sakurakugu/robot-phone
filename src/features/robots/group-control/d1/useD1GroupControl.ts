/**
 * useD1GroupControl
 *
 * 同时连接多台 D1 机器狗，广播控制指令。
 * 每台机器狗通过 ws://{ip}:8082 直连（与单机操控一致）。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DIRECT_CONTROL_PORT = 8082;
const RECONNECT_DELAY_MS = 3000;

export type D1ControlMode = 'move' | 'pose';
export type D1JoystickChannel = 'move' | 'look' | 'pose';

type WsEntry = {
  ip: string;
  ws: WebSocket | null;
  connected: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  destroyed: boolean;
};

export type UseD1GroupControlResult = {
  /** 已连接数量 */
  connectedCount: number;
  /** 发送摇杆指令（广播） */
  sendJoystick: (
    mode: D1ControlMode,
    channel: D1JoystickChannel,
    x: number,
    y: number,
    speed?: number,
  ) => void;
  /** 发送摇杆停止（广播） */
  sendJoystickStop: (mode: D1ControlMode, channel?: D1JoystickChannel) => void;
  /** 发送动作（广播） */
  sendAction: (action: string, parameters?: Record<string, unknown>) => void;
  /** 切换控制模式（广播） */
  sendSwitchMode: (mode: D1ControlMode) => void;
  /** 急停（广播） */
  sendEstop: () => void;
};

export function useD1GroupControl(ips: string[]): UseD1GroupControlResult {
  // entries 用 ref 管理，避免频繁 re-render
  const entriesRef = useRef<Map<string, WsEntry>>(new Map());
  const [connectedCount, setConnectedCount] = useState(0);

  // 每次 ips 变化时，增/删 WebSocket 连接
  useEffect(() => {
    const current = entriesRef.current;
    const nextIpSet = new Set(ips);

    // 断开并移除已不在列表中的连接
    for (const [ip, entry] of current) {
      if (!nextIpSet.has(ip)) {
        entry.destroyed = true;
        if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
        entry.ws?.close();
        current.delete(ip);
      }
    }

    // 为新增的 IP 建立连接
    for (const ip of ips) {
      if (!current.has(ip)) {
        const entry: WsEntry = {
          ip,
          ws: null,
          connected: false,
          reconnectTimer: null,
          destroyed: false,
        };
        current.set(ip, entry);
        connect(entry, setConnectedCount, current);
      }
    }
  }, [ips]);

  // 组件卸载时清理所有连接
  useEffect(() => {
    const entries = entriesRef.current;
    return () => {
      for (const entry of entries.values()) {
        entry.destroyed = true;
        if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
        entry.ws?.close();
      }
      entries.clear();
    };
  }, []);

  // 广播发送
  const broadcast = useCallback((data: object) => {
    const msg = JSON.stringify(data);
    for (const entry of entriesRef.current.values()) {
      if (entry.ws?.readyState === WebSocket.OPEN) {
        entry.ws.send(msg);
      }
    }
  }, []);

  const sendJoystick = useCallback(
    (
      mode: D1ControlMode,
      channel: D1JoystickChannel,
      x: number,
      y: number,
      speed = 5,
    ) => {
      broadcast({
        type: 'control_command',
        data: { command: 'joystick', mode, channel, x, y, speed },
      });
    },
    [broadcast],
  );

  const sendJoystickStop = useCallback(
    (mode: D1ControlMode, channel?: D1JoystickChannel) => {
      broadcast({
        type: 'control_command',
        data: { command: 'joystick_stop', mode, channel },
      });
    },
    [broadcast],
  );

  const sendAction = useCallback(
    (action: string, parameters: Record<string, unknown> = {}) => {
      broadcast({
        type: 'control_command',
        data: { command: 'action', action, parameters },
      });
    },
    [broadcast],
  );

  const sendSwitchMode = useCallback(
    (mode: D1ControlMode) => {
      broadcast({
        type: 'control_command',
        data: { command: 'switch_control_mode', mode },
      });
    },
    [broadcast],
  );

  const sendEstop = useCallback(() => {
    broadcast({
      type: 'control_command',
      data: { command: 'estop' },
    });
  }, [broadcast]);

  return {
    connectedCount,
    sendJoystick,
    sendJoystickStop,
    sendAction,
    sendSwitchMode,
    sendEstop,
  };
}

// ── 内部：建立单条 WebSocket 连接，并自动重连 ──────────────────────────────
function connect(
  entry: WsEntry,
  setConnectedCount: React.Dispatch<React.SetStateAction<number>>,
  allEntries: Map<string, WsEntry>,
) {
  if (entry.destroyed) return;

  const url = `ws://${entry.ip}:${DIRECT_CONTROL_PORT}`;
  try {
    const ws = new WebSocket(url);
    entry.ws = ws;

    ws.onopen = () => {
      if (entry.destroyed) {
        ws.close();
        return;
      }
      entry.connected = true;
      setConnectedCount(countConnected(allEntries));
    };

    ws.onclose = () => {
      entry.connected = false;
      setConnectedCount(countConnected(allEntries));
      if (!entry.destroyed) {
        entry.reconnectTimer = setTimeout(
          () => connect(entry, setConnectedCount, allEntries),
          RECONNECT_DELAY_MS,
        );
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  } catch {
    if (!entry.destroyed) {
      entry.reconnectTimer = setTimeout(
        () => connect(entry, setConnectedCount, allEntries),
        RECONNECT_DELAY_MS,
      );
    }
  }
}

function countConnected(entries: Map<string, WsEntry>): number {
  let count = 0;
  for (const e of entries.values()) {
    if (e.connected) count++;
  }
  return count;
}
