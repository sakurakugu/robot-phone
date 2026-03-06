import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type PackagePayload = {
  base64: string;
  fileName: string;
  isGzip: boolean;
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
  const [configExpanded, setConfigExpanded] = useState(true);
  const [wifiExpanded, setWifiExpanded] = useState(true);
  const [packagesExpanded, setPackagesExpanded] = useState(true);
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [wifiPasswordVisible, setWifiPasswordVisible] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [wifiWorking, setWifiWorking] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
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

  const quoteForShell = useCallback(
    (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`,
    [],
  );

  const sudoCommand = useCallback(
    (command: string) => {
      const password = quoteForShell(config.password ?? '');
      return `echo ${password} | sudo -S ${command}`;
    },
    [config.password, quoteForShell],
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

  const getPackageBase64 = useCallback(
    async (fileName: string): Promise<PackagePayload> => {
      const readFromPath = (path: string) =>
        ReactNativeBlobUtil.fs.readFile(path, 'base64');
      const getAndroidAssetPath = (name: string) =>
        ReactNativeBlobUtil.fs.asset(`robot-packages/${name}`);
      const getIosBundlePath = (name: string) =>
        `${ReactNativeBlobUtil.fs.dirs.MainBundleDir}/robot-packages/${name}`;
      const read = (name: string) =>
        Platform.OS === 'android'
          ? readFromPath(getAndroidAssetPath(name))
          : readFromPath(getIosBundlePath(name));

      try {
        const base64 = await read(fileName);
        return { base64, fileName, isGzip: fileName.endsWith('.tar.gz') };
      } catch (err) {
        if (!fileName.endsWith('.tar.gz')) {
          throw err;
        }
        const fallbackName = fileName.replace(/\.tar\.gz$/, '.tar');
        const base64 = await read(fallbackName);
        return { base64, fileName: fallbackName, isGzip: false };
      }
    },
    [],
  );

  const uploadViaSftp = useCallback(
    async (remotePath: string, base64: string, label: string) => {
      setProgress(`上传 ${label}`);
      try {
        await SparkSsh.uploadFile(base64, remotePath);
        appendLog({
          title: `上传安装包 (${label})`,
          output: '上传完成',
          isError: false,
        });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendLog({ title: `上传失败 (${label})`, output: msg, isError: true });
        return false;
      }
    },
    [appendLog],
  );

  const installCommon = useCallback(
    async (pkg: PackageSpec) => {
      const remoteDir = `/home/${config.user}/sparkrobot/${pkg.name}`;
      setProgress(`读取 ${pkg.title}`);
      const payload = await getPackageBase64(pkg.fileName);
      const remoteArchive = `/tmp/${pkg.name}${payload.isGzip ? '.tar.gz' : '.tar'}`;
      if (
        !(await executeAndLog(
          `创建目录 (${pkg.title})`,
          `mkdir -p ${remoteDir}`,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `修正权限 (${pkg.title})`,
        `sudo chown -R ${config.user}:${config.user} ${remoteDir}`,
      );
      if (!(await uploadViaSftp(remoteArchive, payload.base64, pkg.title))) {
        return false;
      }
      if (
        !(await executeAndLog(
          `解压安装包 (${pkg.title})`,
          `tar ${payload.isGzip ? '-xzf' : '-xf'} ${remoteArchive} -C ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `清理压缩包 (${pkg.title})`,
        `rm -f ${remoteArchive}`,
      );
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
    [config.user, executeAndLog, getPackageBase64, uploadViaSftp],
  );

  const installServer = useCallback(
    async (pkg: PackageSpec) => {
      const remoteDir = `/home/${config.user}/sparkrobot/${pkg.name}`;
      setProgress(`读取 ${pkg.title}`);
      const payload = await getPackageBase64(pkg.fileName);
      const remoteArchive = `/tmp/${pkg.name}${payload.isGzip ? '.tar.gz' : '.tar'}`;
      if (
        !(await executeAndLog(
          `创建目录 (${pkg.title})`,
          `mkdir -p ${remoteDir}`,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `修正权限 (${pkg.title})`,
        `sudo chown -R ${config.user}:${config.user} ${remoteDir}`,
      );
      if (!(await uploadViaSftp(remoteArchive, payload.base64, pkg.title))) {
        return false;
      }
      if (
        !(await executeAndLog(
          `解压安装包 (${pkg.title})`,
          `tar ${payload.isGzip ? '-xzf' : '-xf'} ${remoteArchive} -C ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `清理压缩包 (${pkg.title})`,
        `rm -f ${remoteArchive}`,
      );
      if (
        !(await executeAndLog(
          `安装依赖 (${pkg.title})`,
          `python3 -m pip install ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `赋权脚本 (${pkg.title})`,
        `chmod +x ${remoteDir}/scripts/install.sh`,
      );
      return executeAndLog(
        `运行安装脚本 (${pkg.title})`,
        `sudo bash ${remoteDir}/scripts/install.sh`,
        180,
      );
    },
    [config.user, executeAndLog, getPackageBase64, uploadViaSftp],
  );

  const installAgent = useCallback(
    async (pkg: PackageSpec) => {
      const remoteDir = `/home/${config.user}/sparkrobot/${pkg.name}`;
      setProgress(`读取 ${pkg.title}`);
      const payload = await getPackageBase64(pkg.fileName);
      const remoteArchive = `/tmp/${pkg.name}${payload.isGzip ? '.tar.gz' : '.tar'}`;
      if (
        !(await executeAndLog(
          `创建目录 (${pkg.title})`,
          `mkdir -p ${remoteDir}`,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `修正权限 (${pkg.title})`,
        `sudo chown -R ${config.user}:${config.user} ${remoteDir}`,
      );
      if (!(await uploadViaSftp(remoteArchive, payload.base64, pkg.title))) {
        return false;
      }
      if (
        !(await executeAndLog(
          `解压安装包 (${pkg.title})`,
          `tar ${payload.isGzip ? '-xzf' : '-xf'} ${remoteArchive} -C ${remoteDir}`,
          180,
        ))
      ) {
        return false;
      }
      await executeAndLog(
        `清理压缩包 (${pkg.title})`,
        `rm -f ${remoteArchive}`,
      );
      await executeAndLog(
        `赋权脚本 (${pkg.title})`,
        `chmod +x ${remoteDir}/scripts/start.sh`,
      );
      await executeAndLog(
        `赋权脚本 (${pkg.title})`,
        `chmod +x ${remoteDir}/scripts/stop.sh`,
      );
      return true;
    },
    [config.user, executeAndLog, getPackageBase64, uploadViaSftp],
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

  const handleViewWifi = useCallback(async () => {
    if (installing || wifiWorking) return;
    setWifiWorking(true);
    try {
      const ok = await ensureConnected();
      if (!ok) return;
      setProgress('查看当前 WiFi 信息');
      const ssidOutput = await SparkSsh.execute(
        "nmcli -t -f active,ssid dev wifi | grep '^yes' | cut -d: -f2",
      );
      const ssid = ssidOutput.trim();
      const ipOutput = await SparkSsh.execute('ip addr show wlan0');
      const ipMatch = ipOutput.match(/inet (\d+\.\d+\.\d+\.\d+)/);
      const ip = ipMatch?.[1] ?? '';
      const lines: string[] = [];
      if (ssid) {
        lines.push(`当前连接的 WIFI: ${ssid}`);
      } else {
        lines.push('未连接到 WIFI');
      }
      if (ip) {
        lines.push(`IP 地址: ${ip}`);
      }
      appendLog({
        title: '查看 WiFi 信息',
        output: lines.join('\n') || '未获取到信息',
        isError: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog({ title: '查看 WiFi 信息失败', output: msg, isError: true });
      Toast.show(`查看失败：${msg}`);
    } finally {
      setProgress('');
      setWifiWorking(false);
    }
  }, [appendLog, ensureConnected, installing, wifiWorking]);

  const handleConnectWifi = useCallback(async () => {
    if (installing || wifiWorking) return;
    const ssid = wifiSsid.trim();
    const password = wifiPassword;
    if (!ssid || !password) {
      Toast.show('请输入 WiFi 名称和密码');
      return;
    }
    setWifiWorking(true);
    try {
      const ok = await ensureConnected();
      if (!ok) return;
      setProgress('连接 WiFi');
      const ssidArg = quoteForShell(ssid);
      const passwordArg = quoteForShell(password);
      if (
        !(await executeAndLog(
          '连接 WiFi',
          sudoCommand(
            `nmcli device wifi connect ${ssidArg} password ${passwordArg} ifname wlan0`,
          ),
          120,
        ))
      ) {
        Toast.show('连接 WiFi 失败');
        return;
      }
      await executeAndLog(
        '配置网络服务',
        sudoCommand('systemctl stop networkmanager-cleanup.service'),
      );
      await executeAndLog(
        '配置网络服务',
        sudoCommand('systemctl disable networkmanager-cleanup.service'),
      );
      await executeAndLog(
        '设置自动连接',
        sudoCommand(
          `nmcli connection modify ${ssidArg} connection.autoconnect yes`,
        ),
      );
      appendLog({
        title: 'WiFi 配置完成',
        output: `已请求连接到 ${ssid}`,
        isError: false,
      });
      Toast.show('WiFi 配置完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog({ title: '连接 WiFi 失败', output: msg, isError: true });
      Toast.show(`连接失败：${msg}`);
    } finally {
      setProgress('');
      setWifiWorking(false);
    }
  }, [
    appendLog,
    ensureConnected,
    executeAndLog,
    installing,
    quoteForShell,
    sudoCommand,
    wifiPassword,
    wifiSsid,
    wifiWorking,
  ]);

  const statusColor = isConnected
    ? (palette.success ?? '#22c55e')
    : palette.textMuted;

  return (
    <Screen palette={palette} subtitle="通过 SSH 安装基础服务" unsafeTop={true}>
      <ScrollView contentContainerStyle={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Pressable
            style={styles.cardHeader}
            onPress={() => setConfigExpanded(prev => !prev)}
          >
            <View style={styles.headerLeft}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {isConnected
                  ? `${config.user}@${config.host}:${config.port}`
                  : '连接配置'}
              </Text>
            </View>
            {configExpanded ? (
              <ChevronUp color={palette.textMuted} size={18} />
            ) : (
              <ChevronDown color={palette.textMuted} size={18} />
            )}
          </Pressable>

          {configExpanded && (
            <>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  主机
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.host}
                  onChangeText={updateConfig('host')}
                  placeholder="192.168.234.1"
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  端口
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.port}
                  onChangeText={updateConfig('port')}
                  placeholder="22"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  用户名
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.user}
                  onChangeText={updateConfig('user')}
                  placeholder="firefly"
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.configRow}>
                <Text
                  style={[
                    styles.configLabel,
                    styles.passwordLabel,
                    { color: palette.textMuted },
                  ]}
                >
                  密码
                </Text>
                <Pressable
                  onPress={() => setPasswordVisible(v => !v)}
                  style={styles.eyeBtn}
                >
                  {passwordVisible ? (
                    <EyeOff color={palette.textMuted} size={16} />
                  ) : (
                    <Eye color={palette.textMuted} size={16} />
                  )}
                </Pressable>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={config.password}
                  onChangeText={updateConfig('password')}
                  secureTextEntry={passwordVisible}
                  placeholderTextColor={palette.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Pressable
            style={styles.cardHeader}
            onPress={() => setWifiExpanded(prev => !prev)}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                WiFi 配置
              </Text>
            </View>
            {wifiExpanded ? (
              <ChevronUp color={palette.textMuted} size={18} />
            ) : (
              <ChevronDown color={palette.textMuted} size={18} />
            )}
          </Pressable>
          {wifiExpanded && (
            <>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.sectionBody}>
                <InputRow
                  label="SSID"
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  placeholder="WiFi名称"
                  autoCapitalize="none"
                />
                <View style={styles.configRow}>
                  <Text
                    style={[
                      styles.configLabel,
                      styles.passwordLabel,
                      { color: palette.textMuted },
                    ]}
                  >
                    密码
                  </Text>
                  <Pressable
                    onPress={() => setWifiPasswordVisible(v => !v)}
                    style={styles.eyeBtn}
                  >
                    {wifiPasswordVisible ? (
                      <EyeOff color={palette.textMuted} size={16} />
                    ) : (
                      <Eye color={palette.textMuted} size={16} />
                    )}
                  </Pressable>
                  <TextInput
                    style={[styles.configInput, { color: palette.text }]}
                    value={wifiPassword}
                    onChangeText={setWifiPassword}
                    placeholder="WiFi密码"
                    placeholderTextColor={palette.textMuted}
                    secureTextEntry={wifiPasswordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View
                  style={[styles.divider, { backgroundColor: palette.border }]}
                />
                <ActionRow
                  label={wifiWorking ? '处理中...' : '查看当前 WiFi 信息'}
                  onPress={handleViewWifi}
                  loading={wifiWorking}
                />
                <ActionRow
                  label={wifiWorking ? '处理中...' : '连接 WiFi'}
                  onPress={handleConnectWifi}
                  loading={wifiWorking}
                  isLast
                />
              </View>
            </>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Pressable
            style={styles.cardHeader}
            onPress={() => setPackagesExpanded(prev => !prev)}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                安装顺序
              </Text>
            </View>
            {packagesExpanded ? (
              <ChevronUp color={palette.textMuted} size={18} />
            ) : (
              <ChevronDown color={palette.textMuted} size={18} />
            )}
          </Pressable>
          {packagesExpanded && (
            <>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.sectionBody}>
                {PACKAGE_LIST.map((pkg, idx) => (
                  <InfoRow
                    key={pkg.key}
                    label={pkg.title}
                    value={pkg.name}
                    isLast={idx === PACKAGE_LIST.length - 1}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Pressable
            style={styles.cardHeader}
            onPress={() => setActionsExpanded(prev => !prev)}
          >
            <View style={styles.headerLeft}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                操作
              </Text>
            </View>
            {actionsExpanded ? (
              <ChevronUp color={palette.textMuted} size={18} />
            ) : (
              <ChevronDown color={palette.textMuted} size={18} />
            )}
          </Pressable>
          {actionsExpanded && (
            <>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <View style={styles.sectionBody}>
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
              </View>
            </>
          )}
        </View>

        <View style={styles.hintWrap}>
          <Text style={[styles.hintText, themedStyles.hint]}>
            请确保手机已连接机器狗自带Wifi网络，密码在遥控器上
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
          <View
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Pressable
              style={styles.cardHeader}
              onPress={() => setLogsExpanded(prev => !prev)}
            >
              <View style={styles.headerLeft}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  执行日志
                </Text>
              </View>
              {logsExpanded ? (
                <ChevronUp color={palette.textMuted} size={18} />
              ) : (
                <ChevronDown color={palette.textMuted} size={18} />
              )}
            </Pressable>
            {logsExpanded && (
              <>
                <View
                  style={[styles.divider, { backgroundColor: palette.border }]}
                />
                <View style={styles.sectionBody}>
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
                </View>
              </>
            )}
          </View>
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
  card: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  configLabel: {
    fontSize: 13,
    width: 52,
  },
  passwordLabel: {
    width: 'auto',
    marginRight: 2,
  },
  configInput: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    paddingVertical: 6,
  },
  eyeBtn: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  sectionBody: {
    padding: 8,
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
