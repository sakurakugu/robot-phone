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
import type { PackageType } from '../../robots/api';
import {
  installPackageFromBase64,
  PACKAGE_INSTALL_ORDER,
  PACKAGE_INSTALL_SPECS,
} from '../../robots/services/机器人软件包安装服务';

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

type PackagePayload = {
  base64: string;
  fileName: string;
  isGzip: boolean;
};

export function FirstInstallScreen() {
  const palette = usePalette();
  const [config, setConfig] = useState<SshConfig>({
    host: '',
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

  const uploadViaSftpOrThrow = useCallback(
    async (remotePath: string, base64: string, label: string) => {
      setProgress(`上传 ${label}`);
      try {
        await SparkSsh.uploadFile(base64, remotePath);
        appendLog({
          title: `上传安装包 (${label})`,
          output: '上传完成',
          isError: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendLog({ title: `上传失败 (${label})`, output: msg, isError: true });
        throw new Error(msg);
      }
    },
    [appendLog],
  );

  const executeAndThrow = useCallback(
    async (title: string, command: string, timeoutSeconds = 120) => {
      const ok = await executeAndLog(title, command, timeoutSeconds);
      if (!ok) {
        throw new Error(title);
      }
    },
    [executeAndLog],
  );

  const installPackage = useCallback(
    async (type: PackageType) => {
      const spec = PACKAGE_INSTALL_SPECS[type];
      setProgress(`读取 ${spec.title}`);
      const payload = await getPackageBase64(spec.archiveName);
      await installPackageFromBase64({
        type,
        user: config.user,
        archiveBase64: payload.base64,
        archiveFileName: payload.fileName,
        runRemoteCommand: executeAndThrow,
        uploadRemoteFile: uploadViaSftpOrThrow,
        onProgress: setProgress,
      });
    },
    [config.user, executeAndThrow, getPackageBase64, uploadViaSftpOrThrow],
  );

  const handleInstall = useCallback(async () => {
    if (installing) return;
    setHistory([]);
    setProgress('');
    setInstalling(true);
    try {
      const ok = await ensureConnected();
      if (!ok) return;
      for (const type of PACKAGE_INSTALL_ORDER) {
        const spec = PACKAGE_INSTALL_SPECS[type];
        setProgress(`开始 ${spec.title}`);
        try {
          await installPackage(type);
        } catch {
          Toast.show(`安装 ${spec.name} 失败`);
          return;
        }
      }
      setProgress('安装完成');
      Toast.show('安装完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLog({ title: '安装失败', output: msg, isError: true });
      Toast.show(`安装失败：${msg}`);
    } finally {
      setInstalling(false);
    }
  }, [appendLog, ensureConnected, installPackage, installing]);

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
              <View style={styles.configRow}>
                <Text
                  style={[styles.configLabel, { color: palette.textMuted }]}
                >
                  SSID
                </Text>
                <TextInput
                  style={[styles.configInput, { color: palette.text }]}
                  value={wifiSsid}
                  onChangeText={setWifiSsid}
                  placeholder="WiFi名称"
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
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !wifiWorking && styles.pressedRow,
                ]}
                onPress={wifiWorking ? undefined : handleViewWifi}
              >
                <Text
                  style={[styles.rowActionText, { color: palette.primary }]}
                >
                  {wifiWorking ? '处理中...' : '查看当前 WiFi 信息'}
                </Text>
                {wifiWorking ? (
                  <ActivityIndicator size="small" color={palette.textMuted} />
                ) : null}
              </Pressable>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !wifiWorking && styles.pressedRow,
                ]}
                onPress={wifiWorking ? undefined : handleConnectWifi}
              >
                <Text
                  style={[styles.rowActionText, { color: palette.primary }]}
                >
                  {wifiWorking ? '处理中...' : '连接 WiFi'}
                </Text>
                {wifiWorking ? (
                  <ActivityIndicator size="small" color={palette.textMuted} />
                ) : null}
              </Pressable>
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
              {PACKAGE_INSTALL_ORDER.map((type, idx) => {
                const isLast = idx === PACKAGE_INSTALL_ORDER.length - 1;
                const spec = PACKAGE_INSTALL_SPECS[type];
                return (
                  <React.Fragment key={spec.key}>
                    <View style={styles.configRow}>
                      <Text
                        style={[
                          styles.orderLabel,
                          { color: palette.textMuted },
                        ]}
                      >
                        {spec.title}
                      </Text>
                      <Text
                        style={[styles.configValue, { color: palette.text }]}
                      >
                        {spec.name}
                      </Text>
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: palette.border },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
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
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !installing && styles.pressedRow,
                ]}
                onPress={installing ? undefined : handleInstall}
              >
                <Text
                  style={[styles.rowActionText, { color: palette.primary }]}
                >
                  {installing ? '安装中...' : '开始安装'}
                </Text>
                {installing ? (
                  <ActivityIndicator size="small" color={palette.textMuted} />
                ) : null}
              </Pressable>
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.pressedRow,
                ]}
                onPress={handleDisconnect}
              >
                <Text style={[styles.rowActionText, { color: palette.danger }]}>
                  断开连接
                </Text>
                <Text
                  style={[styles.configValue, { color: palette.textMuted }]}
                >
                  {isConnected ? '当前已连接' : '未连接'}
                </Text>
              </Pressable>
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  configLabel: {
    fontSize: 13,
    width: 52,
  },
  orderLabel: {
    fontSize: 13,
    width: 200,
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
  configValue: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
    paddingVertical: 6,
  },
  eyeBtn: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  rowActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  pressedRow: {
    opacity: 0.8,
  },
  sectionBody: {
    paddingHorizontal: 8,
    paddingBottom: 8,
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
