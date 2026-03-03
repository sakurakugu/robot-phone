/**
 * SparkMdns 原生模块 JS 层封装
 *
 * 通过平台原生实现（Android NsdManager / iOS NetServiceBrowser）
 * 在局域网内发现 `_sparkrobot._tcp.` 服务。
 *
 * 底层使用 Codegen 生成的 TurboModule C++ 绑定，通过 JSI 直接调用原生方法。
 */
import { Platform } from 'react-native';
import type { DiscoveredRobot } from '../../features/robots/types';
import NativeSparkMdns from './NativeSparkMdns';

if (__DEV__) {
  console.log(
    `[SparkMdns] module=${!!NativeSparkMdns}, platform=${Platform.OS}`,
  );
}

/**
 * 扫描局域网内的 SparkRobot 机器人
 * @param timeoutSeconds 扫描超时（秒），默认 3
 * @returns 发现的机器人列表
 */
export async function scanRobots(
  timeoutSeconds = 3,
): Promise<DiscoveredRobot[]> {
  const results = await NativeSparkMdns.scan(timeoutSeconds);
  // 确保类型安全：port 在某些平台可能是 string
  return results.map(r => ({
    uuid: String(r.uuid ?? ''),
    name: String(r.name ?? ''),
    model: String(r.model ?? ''),
    version: String(r.version ?? ''),
    ip: String(r.ip ?? ''),
    port: typeof r.port === 'number' ? r.port : parseInt(String(r.port), 10) || 0,
  }));
}
