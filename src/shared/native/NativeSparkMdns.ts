/**
 * Codegen TurboModule 规范文件 — SparkMdns
 *
 * 此文件会被 React Native Codegen 解析，自动生成：
 *  - Java 抽象类 NativeSparkMdnsSpec（Android）
 *  - C++ JSI 绑定（通过 REACT_NATIVE_APP_MODULE_PROVIDER）
 *
 * 命名约定：文件名必须以 Native 开头，接口必须命名为 Spec 并继承 TurboModule。
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * mDNS 发现的机器人信息
 */
type DiscoveredRobotInfo = {
  uuid: string;
  name: string;
  model: string;
  version: string;
  ip: string;
  port: number;
};

export interface Spec extends TurboModule {
  /**
   * 扫描局域网内 _sparkrobot._tcp. 服务
   * @param timeoutSeconds 扫描超时（秒）
   * @returns 发现的机器人列表
   */
  scan(timeoutSeconds: number): Promise<DiscoveredRobotInfo[]>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SparkMdns');
