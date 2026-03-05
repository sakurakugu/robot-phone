import NativeSparkSsh from './NativeSparkSsh';

export type SshExecuteResult = {
  command: string;
  output: string;
  isError: boolean;
};

export const SparkSsh = {
  /**
   * 建立 SSH 长连接
   */
  connect: (host: string, port: number, username: string, password: string) =>
    NativeSparkSsh.connect(host, port, username, password),

  /**
   * 断开 SSH 连接
   */
  disconnect: () => NativeSparkSsh.disconnect(),

  /**
   * 同步返回当前是否已连接
   */
  isConnected: () => NativeSparkSsh.isConnected(),

  /**
   * 执行单条命令，返回输出字符串
   */
  execute: (command: string, timeoutSeconds = 30) =>
    NativeSparkSsh.execute(command, timeoutSeconds),

  /**
   * 批量执行命令，逐条执行并通过 onProgress 回调实时通知结果
   * 遇到错误不中断，继续执行后续命令
   */
  executeAll: async (
    commands: string[],
    options?: {
      timeoutSeconds?: number;
      onProgress?: (result: SshExecuteResult) => void;
    },
  ): Promise<SshExecuteResult[]> => {
    const { timeoutSeconds = 30, onProgress } = options ?? {};
    const results: SshExecuteResult[] = [];

    for (const cmd of commands) {
      const trimmed = cmd.trim();
      if (!trimmed) continue;

      try {
        const output = await NativeSparkSsh.execute(trimmed, timeoutSeconds);
        const result: SshExecuteResult = { command: trimmed, output, isError: false };
        results.push(result);
        onProgress?.(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const result: SshExecuteResult = { command: trimmed, output: msg, isError: true };
        results.push(result);
        onProgress?.(result);
        // SSH_NOT_CONNECTED 时终止后续命令
        if (err instanceof Error && (err as { code?: string }).code === 'SSH_NOT_CONNECTED') {
          break;
        }
      }
    }

    return results;
  },
};
