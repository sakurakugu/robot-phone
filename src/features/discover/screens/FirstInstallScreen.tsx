import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { usePalette } from '../../../app/theme/palette';
import { SparkSsh } from '../../../shared/native/SparkSsh';
import { Screen } from '../../../shared/ui/Screen';
import { Toast } from '../../../shared/ui/Toast';
import {
  ActionRow,
  InfoRow,
  InputRow,
  Section,
} from '../../robots/components/SettingsComponents';

type SshConfig = {
  host: string;
  port: string;
  user: string;
  password: string;
};

type LogEntry = {
  id: number;
  title: string;
  output: string;
  isError: boolean;
};

type PackageSpec = {
  key: 'common' | 'server' | 'agent';
  name: string;
  fileName: string;
  title: string;
};

const PACKAGE_LIST: PackageSpec[] = [
  {
    key: 'common',
    name: 'sparkrobot-common',
    fileName: 'sparkrobot-common.tar.gz',
    title: 'SparkRobot Common',
  },
  {
    key: 'server',
    name: 'robot-server',
    fileName: 'robot-server.tar.gz',
    title: 'Robot Server',
  },
  {
    key: 'agent',
    name: 'robot-agent',
    fileName: 'robot-agent.tar.gz',
    title: 'Robot Agent',
  },
];

export function FirstInstallScreen() {
  const palette = usePalette();
  const [config, setConfig] = useState<SshConfig>({
    host: '192.168.234.1',
    port: '22',
    user: 'firefly',
    password: 'firefly',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const themedStyles = useMemo(
    () => ({
      hint: { color: palette.textMuted },
      progress: { color: palette.warning },
      logBlock: { backgroundColor: palette.surface },
      logTitle: { color: palette.text },
      logOutput: { color: palette.textMuted },
      logError: { color: palette.danger },
      tag: {
        backgroundColor: palette.surfaceAlt,
        borderColor: palette.border,
        color: palette.textMuted,
      },
    }),
    [palette],
  );

  const updateConfig = useCallback(
    (key: keyof SshConfig) => (val: string) => {
      setConfig(prev => ({ ...prev, [key]: val }));
    },
    [],
  );

  const appendLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setHistory(prev => [...prev, { ...entry, id: ++idRef.current }]);
  }, []);

  const executeAndLog = useCallback(
    async (title: string, command: string, timeoutSeconds = 120) => {
      try {
        const output = await SparkSsh.execute(command, timeoutSeconds);
        appendLog({ title, output, isError: false });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendLog({ title, output: msg, isError: true });
        return false;
      }
    },
    [appendLog],
  );

  const ensureConnected = useCallback(async () => {
    if (SparkSsh.isConnected()) {
      setIsConnected(true);
      return true;
    }
    if (!config.host.trim() || !config.user.trim()) {
      Toast.show('请填写主机地址和用户名');
      return false;
    }
    const port = parseInt(config.port, 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      Toast.show('端口号无效');
      return false;
    }
    try {
      await SparkSsh.connect(
        config.host.trim(),
        port,
        config.user.trim(),
        config.password,
      );
      setIsConnected(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Toast.show(`连接失败：${msg}`);
      return false;
    } finally {
    }
  }, [config]);

  const getPackageBase64 = useCallback(async (fileName: string) => {
    if (Platform.OS === 'android') {
      const assetPath = ReactNativeBlobUtil.fs.asset(
        `robot-packages/${fileName}`,
      );
      return ReactNativeBlobUtil.fs.readFile(assetPath, 'base64');
    }
    const bundlePath = `${ReactNativeBlobUtil.fs.dirs.MainBundleDir}/robot-packages/${fileName}`;
    return ReactNativeBlobUtil.fs.readFile(bundlePath, 'base64');
  }, []);

  const uploadBase64File = useCallback(
    async (remotePath: string, base64: string, label: string) => {
      const b64Path = `${remotePath}.b64`;
      const chunkSize = 3000;
      const totalChunks = Math.ceil(base64.length / chunkSize);
      await executeAndLog(
        `清理临时文件 (${label})`,
        `rm -f ${b64Path} ${remotePath}`,
      );
      try {
        for (let i = 0; i < totalChunks; i += 1) {
          const chunk = base64.slice(i * chunkSize, (i + 1) * chunkSize);
          await SparkSsh.execute(`printf '%s' '${chunk}' >> ${b64Path}`, 120);
          const percent = Math.round(((i + 1) / totalChunks) * 100);
          setProgress(`上传 ${label} ${percent}%`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendLog({ title: `上传失败 (${label})`, output: msg, isError: true });
        return false;
      }
      setProgress(`解码 ${label}`);
      if (
        !(await executeAndLog(
          `解码安装包 (${label})`,
          `base64 -d ${b64Path} > ${remotePath}`,
        ))
      ) {
        return false;
      }
      await executeAndLog(`清理临时文件 (${label})`, `rm -f ${b64Path}`);
      return true;
    },
    [appendLog, executeAndLog],
  );

  const installCommon = useCallback(
    async (pkg: PackageSpec) => {
      const remoteDir = `/home/${config.user}/sparkrobot/${pkg.name}`;
      const remoteArchive = `/tmp/${pkg.name}.tar.gz`;
      setProgress(`读取 ${pkg.title}`);
      const base64 = await getPackageBase64(pkg.fileName);
      if (!(await executeAndLog(`创建目录 (${pkg.title})`, `mkdir -p ${remoteDir}`))) {
        return false;
      }
      await executeAndLog(`修正权限 (${pkg.title})`, `sudo chown -R ${config.user}:${config.user} ${remoteDir}`);
      if (!(await uploadBase64File(remoteArchive, base64, pkg.title))) {
        return false;
      }
      if (
        !(await executeAndLog(
          `解压安装包 (${pkg.title})`,
          `tar -xzf ${remoteArchive} -C ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(`清理压缩包 (${pkg.title})`, `rm -f ${remoteArchive}`);
      if (
        !(await executeAndLog(
          `安装依赖 (${pkg.title})`,
          'python3 -m pip install --upgrade pip setuptools wheel uuid6 watchdog',
          180,
        ))
      ) {
        return false;
      }
      return executeAndLog(
        `安装包 (${pkg.title})`,
        `python3 -m pip install -e ${remoteDir}`,
        180,
      );
    },
    [config.user, executeAndLog, getPackageBase64, uploadBase64File],
  );

  const installServer = useCallback(
    async (pkg: PackageSpec) => {
      const remoteDir = `/home/${config.user}/sparkrobot/${pkg.name}`;
      const remoteArchive = `/tmp/${pkg.name}.tar.gz`;
      setProgress(`读取 ${pkg.title}`);
      const base64 = await getPackageBase64(pkg.fileName);
      if (!(await executeAndLog(`创建目录 (${pkg.title})`, `mkdir -p ${remoteDir}`))) {
        return false;
      }
      await executeAndLog(`修正权限 (${pkg.title})`, `sudo chown -R ${config.user}:${config.user} ${remoteDir}`);
      if (!(await uploadBase64File(remoteArchive, base64, pkg.title))) {
        return false;
      }
      if (
        !(await executeAndLog(
          `解压安装包 (${pkg.title})`,
          `tar -xzf ${remoteArchive} -C ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(`清理压缩包 (${pkg.title})`, `rm -f ${remoteArchive}`);
      if (
        !(await executeAndLog(
          `安装依赖 (${pkg.title})`,
          `python3 -m pip install ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(`赋权脚本 (${pkg.title})`, `chmod +x ${remoteDir}/scripts/install.sh`);
      return executeAndLog(
        `运行安装脚本 (${pkg.title})`,
        `sudo bash ${remoteDir}/scripts/install.sh`,
        180,
      );
    },
    [config.user, executeAndLog, getPackageBase64, uploadBase64File],
  );

  const installAgent = useCallback(
    async (pkg: PackageSpec) => {
      const remoteDir = `/home/${config.user}/sparkrobot/${pkg.name}`;
      const remoteArchive = `/tmp/${pkg.name}.tar.gz`;
      setProgress(`读取 ${pkg.title}`);
      const base64 = await getPackageBase64(pkg.fileName);
      if (!(await executeAndLog(`创建目录 (${pkg.title})`, `mkdir -p ${remoteDir}`))) {
        return false;
      }
      await executeAndLog(`修正权限 (${pkg.title})`, `sudo chown -R ${config.user}:${config.user} ${remoteDir}`);
      if (!(await uploadBase64File(remoteArchive, base64, pkg.title))) {
        return false;
      }
      if (
        !(await executeAndLog(
          `解压安装包 (${pkg.title})`,
          `tar -xzf ${remoteArchive} -C ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(`清理压缩包 (${pkg.title})`, `rm -f ${remoteArchive}`);
      await executeAndLog(`赋权脚本 (${pkg.title})`, `chmod +x ${remoteDir}/scripts/start.sh`);
      await executeAndLog(`赋权脚本 (${pkg.title})`, `chmod +x ${remoteDir}/scripts/stop.sh`);
      return true;
    },
    [config.user, executeAndLog, getPackageBase64, uploadBase64File],
  );

  const handleInstall = useCallback(async () => {
    if (installing) return;
    setHistory([]);
    setProgress('');
    setInstalling(true);
    try {
      const ok = await ensureConnected();
      if (!ok) return;
      const common = PACKAGE_LIST[0];
      const server = PACKAGE_LIST[1];
      const agent = PACKAGE_LIST[2];
      setProgress(`开始 ${common.title}`);
      if (!(await installCommon(common))) {
        Toast.show('安装 sparkrobot-common 失败');
        return;
      }
      setProgress(`开始 ${server.title}`);
      if (!(await installServer(server))) {
        Toast.show('安装 robot-server 失败');
        return;
      }
      setProgress(`开始 ${agent.title}`);
      if (!(await installAgent(agent))) {
        Toast.show('安装 robot-agent 失败');
        return;
      }
      setProgress('安装完成');
      Toast.show('首次安装完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog({ title: '安装失败', output: msg, isError: true });
      Toast.show(`安装失败：${msg}`);
    } finally {
      setInstalling(false);
    }
  }, [
    appendLog,
    ensureConnected,
    installAgent,
    installCommon,
    installServer,
    installing,
  ]);

  const handleDisconnect = useCallback(async () => {
    try {
      await SparkSsh.disconnect();
    } finally {
      setIsConnected(false);
    }
  }, []);

  return (
    <Screen palette={palette} subtitle="通过 SSH 安装基础服务" unsafeTop={true}>
      <ScrollView contentContainerStyle={styles.container}>
        <Section title="连接信息">
          <InputRow
            label="IP 地址"
            value={config.host}
            onChangeText={updateConfig('host')}
            placeholder="192.168.234.1"
          />
          <InputRow
            label="端口"
            value={config.port}
            onChangeText={updateConfig('port')}
            keyboardType="number-pad"
          />
          <InputRow
            label="用户名"
            value={config.user}
            onChangeText={updateConfig('user')}
            autoCapitalize="none"
          />
          <InputRow
            label="密码"
            value={config.password}
            onChangeText={updateConfig('password')}
            secureTextEntry
            isLast
          />
        </Section>

        <Section title="安装顺序">
          {PACKAGE_LIST.map((pkg, idx) => (
            <InfoRow
              key={pkg.key}
              label={pkg.title}
              value={pkg.name}
              isLast={idx === PACKAGE_LIST.length - 1}
            />
          ))}
        </Section>

        <Section title="操作">
          <ActionRow
            label={installing ? '安装中...' : '开始安装'}
            onPress={handleInstall}
            loading={installing}
          />
          <ActionRow
            label="断开连接"
            onPress={handleDisconnect}
            isLast
            subtitle={isConnected ? '当前已连接' : '未连接'}
          />
        </Section>

        <View style={styles.hintWrap}>
          <Text style={[styles.hintText, themedStyles.hint]}>
            请确保手机已连接机器狗自带Wifi/有线网络，Wifi密码在遥控器上
          </Text>
        </View>

        {progress ? (
          <View style={styles.progressWrap}>
            {installing && (
              <ActivityIndicator size="small" color={palette.warning} />
            )}
            <Text style={[styles.progressText, themedStyles.progress]}>
              {progress}
            </Text>
          </View>
        ) : null}

        {history.length > 0 && (
          <Section title="执行日志">
            {history.map((entry, idx) => (
              <View
                key={entry.id}
                style={[
                  styles.logBlock,
                  themedStyles.logBlock,
                  idx === history.length - 1 && styles.logBlockLast,
                ]}
              >
                <View style={styles.logHeader}>
                  <Text
                    style={[
                      styles.logTitle,
                      themedStyles.logTitle,
                      entry.isError && themedStyles.logError,
                    ]}
                  >
                    {entry.title}
                  </Text>
                  <Text style={[styles.logTag, themedStyles.tag]}>
                    {entry.isError ? '失败' : '完成'}
                  </Text>
                </View>
                <Text style={[styles.logOutput, themedStyles.logOutput]}>
                  {entry.output || '无输出'}
                </Text>
              </View>
            ))}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hintWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
  progressWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 13,
  },
  logBlock: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logBlockLast: {
    borderBottomWidth: 0,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  logTag: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  logOutput: {
    fontSize: 12,
    lineHeight: 18,
  },
});
