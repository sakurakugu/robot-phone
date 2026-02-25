/**
 * useRobotTelemetry
 *
 * 轮询机器狗本体 HTTP 接口（GET http://<ip>:8080/api/v1/telemetry）
 * 获取实时遥测数据（电量、体温、在线状态等）。
 *
 * 遥测数据由运行在机器狗上的 robot-server 的遥测后台服务提供：
 *   - 机器狗 robot-server 通过 UDP 心跳从运动控制器订阅 dog_state
 *   - 缓存最新数据后通过 HTTP 端点暴露
 *
 * @param ip       机器狗 IP，为 null 时不发起请求
 * @param interval 轮询间隔（ms），默认 4000
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type RobotTelemetry = {
  /** 是否在线（最近 5s 内有 dog_state 回包） */
  online: boolean;
  /** 电量百分比 0~100，未知时为 null */
  power: number | null;
  /** 机身温度（°C），未知时为 null */
  temp: number | null;
  /** 型号 */
  model: string | null;
  /** 设备名 */
  dev_name: string | null;
};

const INITIAL: RobotTelemetry = {
  online: false,
  power: null,
  temp: null,
  model: null,
  dev_name: null,
};

export function useRobotTelemetry(
  ip: string | null | undefined,
  interval = 4000,
): RobotTelemetry {
  const [telemetry, setTelemetry] = useState<RobotTelemetry>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTelemetry = useCallback(async () => {
    if (!ip) return;

    // 取消上一次未完成的请求
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`http://${ip}:8080/api/v1/telemetry`, {
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.data ?? {};
      setTelemetry({
        online:   Boolean(data.online),
        power:    typeof data.power    === 'number' ? data.power    : null,
        temp:     typeof data.temp     === 'number' ? data.temp     : null,
        model:    typeof data.model    === 'string' ? data.model    : null,
        dev_name: typeof data.dev_name === 'string' ? data.dev_name : null,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      // 请求失败 -> 标记离线，保留上一次已知的 power/temp
      setTelemetry(prev => ({ ...prev, online: false }));
    }
  }, [ip]);

  useEffect(() => {
    if (!ip) {
      setTelemetry(INITIAL);
      return;
    }

    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, interval);

    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [ip, interval, fetchTelemetry]);

  return telemetry;
}
