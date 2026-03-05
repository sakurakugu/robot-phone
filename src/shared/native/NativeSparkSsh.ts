/**
 * Codegen TurboModule 规范文件 — SparkSsh
 *
 * 此文件会被 React Native Codegen 解析，自动生成：
 *  - Java 抽象类 NativeSparkSshSpec（Android）
 *  - C++ JSI 绑定（通过 REACT_NATIVE_APP_MODULE_PROVIDER）
 *
 * 命名约定：文件名必须以 Native 开头，接口必须命名为 Spec 并继承 TurboModule。
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * 建立 SSH 长连接（会话在 disconnect 调用或模块销毁前保持活跃）
   */
  connect(
    host: string,
    port: number,
    username: string,
    password: string,
  ): Promise<void>;

  /**
   * 断开 SSH 连接
   */
  disconnect(): Promise<void>;

  /**
   * 同步返回当前连接状态
   */
  isConnected(): boolean;

  /**
   * 通过已建立的 SSH 会话执行单条命令，返回 stdout+stderr 合并输出
   * @param command 要执行的命令
   * @param timeoutSeconds 等待超时（秒），建议 30
   */
  execute(command: string, timeoutSeconds: number): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SparkSsh');
