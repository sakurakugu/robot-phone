import { useCallback, useRef, useState } from 'react';
import { scanRobots } from '../../../shared/native/SparkMdns';
import type { DiscoveredRobot } from '../types';

export interface MdnsDiscoveryState {
  /** 扫描发现的机器人列表 */
  results: DiscoveredRobot[];
  /** 是否正在扫描 */
  scanning: boolean;
  /** 是否已执行过至少一次扫描 */
  hasScanned: boolean;
  /** 最近一次错误信息 */
  error: string | null;
  /**
   * 发起一次 mDNS 扫描
   * @param timeoutSeconds 扫描超时（秒），默认 3
   * @returns 发现的机器人列表
   */
  scan: (timeoutSeconds?: number) => Promise<DiscoveredRobot[]>;
}

/**
 * mDNS 局域网机器人发现 Hook
 *
 * 使用原生 SparkMdns 模块扫描 `_sparkrobot._tcp.` 服务，
 * 返回扫描结果及状态。
 */
export function useMdnsDiscovery(): MdnsDiscoveryState {
  const [results, setResults] = useState<DiscoveredRobot[]>([]);
  const [scanning, setScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanningRef = useRef(false);
  const resultsRef = useRef<DiscoveredRobot[]>([]);

  const scan = useCallback(async (timeoutSeconds = 3): Promise<DiscoveredRobot[]> => {
    if (scanningRef.current) return resultsRef.current;
    scanningRef.current = true;
    setScanning(true);
    setError(null);

    try {
      const list = await scanRobots(timeoutSeconds);
      resultsRef.current = list;
      setResults(list);
      setHasScanned(true);
      return list;
    } catch (e: any) {
      const msg = e?.message || 'mDNS 扫描失败';
      setError(msg);
      throw e;
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, []); // 无依赖，scan 引用稳定

  return { results, scanning, hasScanned, error, scan };
}
