import { useNavigation, useRoute } from '@react-navigation/native';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { usePalette } from '../../../app/theme/palette';
import { SparkSsh } from '../../../shared/native/SparkSsh';
import { Screen } from '../../../shared/ui/Screen';
import { versionCodeToSemver } from '../../settings/services/updateService';
import type { ActivePackageInfo, PackageType } from '../api';
import {
    fetchRobot,
    getActivePackage,
    getPackageDownloadUrl,
    getRobotAudioRoute,
    updateRobot,
    updateRobotAudioRoute,
} from '../api';
import { RobotClient } from '../api/robotClient';
import {
    ActionRow,
    InfoRow,
    InputRow,
    Section,
} from '../components/SettingsComponents';
import { getOrCreatePhoneDeviceId } from '../device/phoneIdentity';
import {
    installPackageFromBase64,
    PACKAGE_INSTALL_ORDER,
    PACKAGE_INSTALL_SPECS,
} from '../services/机器人软件包安装服务';
import type { RobotForm } from '../types';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
};

// ── 音量滑条组件 ──
type VolumeRowProps = {
  volume: number;
  muted: boolean;
  onVolumeChange: (val: number) => void;
  onMuteToggle: () => void;
};
function VolumeRow({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}: VolumeRowProps) {
  const palette = usePalette();
  const [displayVolume, setDisplayVolume] = useState(volume);
  const containerRef = useRef<View>(null);
  const pageXRef = useRef(0);
  const widthRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVolumeChangeRef = useRef(onVolumeChange);

  useEffect(() => {
    setDisplayVolume(volume);
  }, [volume]);
  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  const applyPageX = useCallback((pageX: number) => {
    const x = Math.max(0, pageX - pageXRef.current);
    const w = widthRef.current;
    if (!w) return;
    const val = Math.round(Math.min(100, Math.max(0, (x / w) * 100)));
    setDisplayVolume(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onVolumeChangeRef.current(val), 300);
  }, []);

  const pct = muted ? 0 : displayVolume;
  const trackColor = muted ? '#aaa' : palette.primary;
  const VolumeIcon = muted
    ? VolumeX
    : displayVolume > 60
      ? Volume2
      : displayVolume > 20
        ? Volume1
        : Volume;

  return (
    <View style={volStyles.row}>
      <Pressable onPress={onMuteToggle} style={volStyles.iconBtn} hitSlop={8}>
        <VolumeIcon size={24} color={trackColor} />
      </Pressable>
      <View
        ref={containerRef}
        style={volStyles.sliderArea}
        onLayout={() => {
          containerRef.current?.measure((_x, _y, w, _h, px) => {
            pageXRef.current = px;
            widthRef.current = w;
          });
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={e => applyPageX(e.nativeEvent.pageX)}
        onResponderMove={e => applyPageX(e.nativeEvent.pageX)}
      >
        {/* 轨道背景 */}
        <View
          style={[volStyles.track, { backgroundColor: palette.surfaceAlt }]}
        >
          {/* 填充 */}
          <View
            style={[
              volStyles.fill,
              { width: `${pct}%`, backgroundColor: trackColor },
            ]}
          />
        </View>
        {/* 拖柄 */}
        <View
          style={[
            volStyles.thumb,
            { left: `${pct}%`, backgroundColor: trackColor },
          ]}
        />
      </View>
      <Text style={[volStyles.label, { color: palette.textMuted }]}>
        {muted ? '静音' : `${displayVolume}%`}
      </Text>
    </View>
  );
}
const volStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  iconBtn: { padding: 4 },
  sliderArea: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 17,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 10,
    marginLeft: -10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
});

function splitTags(input: string): string[] {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

// --- 主屏幕 ---

export function RobotSettingsScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { robotUuid, robotName } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 安装包管理
  const [activePackage, setActivePackage] = useState<ActivePackageInfo | null>(
    null,
  );
  const [downloadingPackages, setDownloadingPackages] = useState(false);
  const [installingPackages, setInstallingPackages] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [downloadedPackagePaths, setDownloadedPackagePaths] = useState<
    Partial<Record<PackageType, string>>
  >({});
  const [downloadedVersion, setDownloadedVersion] = useState<string | null>(
    null,
  );
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);

  // 客户端状态
  const [client, setClient] = useState<RobotClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // 基本信息状态
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [ip, setIp] = useState('');
  const [groupName, setGroupName] = useState('');
  const [sn, setSn] = useState('');
  const [tagsText, setTagsText] = useState('');

  // 音量状态
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioRouteText, setAudioRouteText] = useState('未加载');

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      setMessage('');
      await fn();
    } catch (e: any) {
      setMessage(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化客户端当IP改变时
  useEffect(() => {
    if (ip && !isConnected && !connecting) {
      const initClient = async () => {
        setConnecting(true);
        try {
          const c = new RobotClient(ip);
          await c.login();
          setClient(c);
          setIsConnected(true);
          setMessage('已连接到机器人');

          // 初始加载安装包信息
          getActivePackage()
            .then(pkg => setActivePackage(pkg))
            .catch(() => {});

          // 初始加载音量
          const volData = await c.getVolume();
          if (volData.success) {
            setVolume(volData.data.volume);
            setMuted(volData.data.muted);
          }
        } catch (e: any) {
          console.log('连接失败:', e);
          setMessage(e.message || '连接失败');
          // 连接失败时不立即显示错误，避免打扰用户，只是保持 isConnected 为 false
        } finally {
          setConnecting(false);
        }
      };
      initClient();
    }
  }, [ip, isConnected, connecting]);

  const loadRobot = useCallback(async () => {
    await withLoading(async () => {
      const data = await fetchRobot(robotUuid);
      setName(data.name || '');
      setModel(data.model || '');
      setIp(data.ip || '');
      setGroupName(data.group_name || '');
      setSn(data.sn || '');
      setTagsText((data.tags || []).join(','));
    });
  }, [robotUuid, withLoading]);

  const loadAudioRoute = useCallback(async () => {
    try {
      const routeConfig = await getRobotAudioRoute(robotUuid);
      const modeText =
        routeConfig.mode === 'phone'
          ? '手机播报'
          : routeConfig.mode === 'mute'
            ? '静默'
            : '机器狗播报';
      const targetText = routeConfig.targetPhoneDeviceId
        ? routeConfig.targetPhoneDeviceId.slice(0, 8)
        : '-';
      setAudioRouteText(
        `${modeText} / 目标:${targetText} / 回退:${routeConfig.fallback}`,
      );
    } catch {
      setAudioRouteText('读取失败');
    }
  }, [robotUuid]);

  useEffect(() => {
    loadRobot();
  }, [loadRobot]);

  useEffect(() => {
    loadAudioRoute();
  }, [loadAudioRoute]);

  useEffect(() => {
    setDownloadedPackagePaths({});
    setDownloadedVersion(null);
    setInstalledVersion(null);
  }, [activePackage?.versionCode]);

  async function handleSaveBasic() {
    const payload: RobotForm = {
      name: name || undefined,
      model: model || undefined,
      ip: ip || undefined,
      group_name: groupName || undefined,
      sn: sn || undefined,
      tags: splitTags(tagsText),
    };
    await withLoading(async () => {
      await updateRobot(robotUuid, payload);
      setMessage('基本信息保存成功');
      await loadRobot();
    });
  }

  // --- Robot Operations ---

  const handleSetVolume = async (val: number) => {
    if (!client) return;
    try {
      await client.setVolume(val);
      setVolume(val);
    } catch (e: any) {
      setMessage(e.message || '设置音量失败');
    }
  };

  const handleMuteToggle = async () => {
    if (!client) return;
    await withLoading(async () => {
      const next = !muted;
      await client.setMute(next);
      setMuted(next);
    });
  };

  const handleMarkLog = async () => {
    if (!client) return;
    await withLoading(async () => {
      await client.markLog('手动标记');
      setMessage('日志标记已写入');
    });
  };

  const handleSetCurrentPhoneAsAudioTarget = async () => {
    await withLoading(async () => {
      const phoneDeviceId = await getOrCreatePhoneDeviceId();
      await updateRobotAudioRoute(robotUuid, {
        mode: 'phone',
        targetPhoneDeviceId: phoneDeviceId,
        fallback: 'robot',
      });
      await loadAudioRoute();
      setMessage('已将当前手机设为云端语音播报目标');
    });
  };

  const handleSetRobotAsAudioTarget = async () => {
    await withLoading(async () => {
      await updateRobotAudioRoute(robotUuid, {
        mode: 'robot',
        targetPhoneDeviceId: null,
        fallback: 'robot',
      });
      await loadAudioRoute();
      setMessage('已切回机器狗本体播报');
    });
  };

  const downloadPackageToTemp = useCallback(
    async (type: PackageType) => {
      const pkg = activePackage?.[type];
      if (!pkg) {
        throw new Error(`${type} 安装包不存在`);
      }
      const spec = PACKAGE_INSTALL_SPECS[type];
      const tmpDir = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/tmp`;
      if (!(await ReactNativeBlobUtil.fs.exists(tmpDir))) {
        await ReactNativeBlobUtil.fs.mkdir(tmpDir);
      }
      const destPath = `${tmpDir}/${spec.archiveName}`;
      if (await ReactNativeBlobUtil.fs.exists(destPath)) {
        await ReactNativeBlobUtil.fs.unlink(destPath);
      }
      const url = getPackageDownloadUrl(type);
      const res = await ReactNativeBlobUtil.config({
        path: destPath,
        fileCache: false,
      }).fetch('GET', url);
      if (res.info().status !== 200) {
        throw new Error(`${spec.title} 下载失败，状态码: ${res.info().status}`);
      }
      return destPath;
    },
    [activePackage],
  );

  const executeSshAndThrow = useCallback(
    async (title: string, command: string) => {
      try {
        await SparkSsh.execute(command, 180);
      } catch (e: any) {
        throw new Error(`${title}失败: ${e.message || String(e)}`);
      }
    },
    [],
  );

  const uploadSshAndThrow = useCallback(
    async (remotePath: string, base64: string, label: string) => {
      try {
        await SparkSsh.uploadFile(base64, remotePath);
      } catch (e: any) {
        throw new Error(`上传 ${label} 失败: ${e.message || String(e)}`);
      }
    },
    [],
  );

  const installSinglePackage = useCallback(
    async (type: PackageType, localPath: string) => {
      const spec = PACKAGE_INSTALL_SPECS[type];
      const base64 = await ReactNativeBlobUtil.fs.readFile(localPath, 'base64');
      await installPackageFromBase64({
        type,
        user: 'firefly',
        archiveBase64: base64,
        archiveFileName: spec.archiveName,
        runRemoteCommand: executeSshAndThrow,
        uploadRemoteFile: uploadSshAndThrow,
        onProgress: setInstallProgress,
      });
    },
    [executeSshAndThrow, uploadSshAndThrow],
  );

  const handleInstallAllPackages = useCallback(async () => {
    if (installingPackages || downloadingPackages) return;
    if (!ip) {
      setMessage('IP 未设置，无法安装');
      return;
    }
    if (!activePackage) {
      setMessage('暂无可用安装包');
      return;
    }
    for (const type of PACKAGE_INSTALL_ORDER) {
      if (!activePackage[type]) {
        setMessage(`${type} 安装包不存在，无法一次性安装`);
        return;
      }
      const localPath = downloadedPackagePaths[type];
      if (!localPath || !(await ReactNativeBlobUtil.fs.exists(localPath))) {
        setMessage('请先下载全部安装包');
        return;
      }
    }

    setInstallingPackages(true);
    setMessage('');
    setInstallProgress('连接机器人');
    try {
      if (!SparkSsh.isConnected()) {
        await SparkSsh.connect(ip, 22, 'firefly', 'firefly');
      }
      for (const type of PACKAGE_INSTALL_ORDER) {
        const spec = PACKAGE_INSTALL_SPECS[type];
        const localPath = downloadedPackagePaths[type]!;
        setInstallProgress(`安装 ${spec.title}`);
        await installSinglePackage(type, localPath);
      }
      setInstallProgress('');
      const currentVersion = activePackage
        ? `v${versionCodeToSemver(activePackage.versionCode)}`
        : null;
      setInstalledVersion(currentVersion);
      setMessage('全部安装完成');
    } catch (e: any) {
      setMessage(e.message || '安装失败');
    } finally {
      setInstallingPackages(false);
    }
  }, [
    activePackage,
    downloadedPackagePaths,
    downloadingPackages,
    installSinglePackage,
    installingPackages,
    ip,
  ]);

  const handleDownloadAllPackages = useCallback(async () => {
    if (downloadingPackages || installingPackages) return;
    if (!activePackage) {
      setMessage('暂无可用安装包');
      return;
    }
    for (const type of PACKAGE_INSTALL_ORDER) {
      if (!activePackage[type]) {
        setMessage(`${type} 安装包不存在，无法一次性下载`);
        return;
      }
    }

    setDownloadingPackages(true);
    setMessage('');
    try {
      const nextDownloadedPaths: Partial<Record<PackageType, string>> = {};
      for (const type of PACKAGE_INSTALL_ORDER) {
        const spec = PACKAGE_INSTALL_SPECS[type];
        setInstallProgress(`下载 ${spec.title}`);
        nextDownloadedPaths[type] = await downloadPackageToTemp(type);
      }
      setDownloadedPackagePaths(nextDownloadedPaths);
      const currentVersion = activePackage
        ? `v${versionCodeToSemver(activePackage.versionCode)}`
        : null;
      setDownloadedVersion(currentVersion);
      setInstalledVersion(null);
      setInstallProgress('');
      setMessage('全部安装包下载完成');
    } catch (e: any) {
      setMessage(e.message || '下载失败');
    } finally {
      setDownloadingPackages(false);
    }
  }, [
    activePackage,
    downloadPackageToTemp,
    downloadingPackages,
    installingPackages,
  ]);

  const currentVersion = activePackage
    ? `v${versionCodeToSemver(activePackage.versionCode)}`
    : null;
  const isCurrentDownloaded =
    !!currentVersion && downloadedVersion === currentVersion;
  const isCurrentInstalled =
    !!currentVersion && installedVersion === currentVersion;

  return (
    <Screen palette={palette} unsafeTop={true}>
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <Text style={[styles.message, { color: palette.warning }]}>
            {message}
          </Text>
        ) : null}

        <Section title="基本信息">
          <InputRow
            label="名称"
            value={name}
            onChangeText={setName}
            placeholder="未设置"
          />
          <InfoRow label="UUID" value={robotUuid || '-'} />
          <InputRow
            label="型号"
            value={model}
            onChangeText={setModel}
            placeholder="未设置"
          />
          <InputRow
            label="IP"
            value={ip}
            onChangeText={setIp}
            placeholder="未设置"
            autoCapitalize="none"
          />
          <InputRow
            label="分组"
            value={groupName}
            onChangeText={setGroupName}
            placeholder="未设置"
          />
          <InputRow
            label="SN"
            value={sn}
            onChangeText={setSn}
            placeholder="未设置"
          />
          <InputRow
            label="标签"
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="逗号分隔"
          />
          <ActionRow
            label="保存基本信息"
            onPress={handleSaveBasic}
            loading={loading}
            isLast
          />
        </Section>

        <Section title="云端语音路由">
          <InfoRow label="当前策略" value={audioRouteText} />
          <ActionRow
            label="设为当前手机播报"
            subtitle="云端 TTS 将优先发给本机，再由本机外放/蓝牙播放"
            onPress={handleSetCurrentPhoneAsAudioTarget}
            loading={loading}
          />
          <ActionRow
            label="切回机器狗播报"
            subtitle="恢复发到机器狗本体"
            onPress={handleSetRobotAsAudioTarget}
            loading={loading}
            isLast
          />
        </Section>

        {isConnected ? (
          <>
            <Section title="音量控制">
              <VolumeRow
                volume={volume}
                muted={muted}
                onVolumeChange={handleSetVolume}
                onMuteToggle={handleMuteToggle}
              />
            </Section>

            <Section title="高级功能">
              <ActionRow
                label="打日志标记"
                subtitle="在机器人本地日志中写入可识别标记"
                onPress={handleMarkLog}
                loading={loading}
              />
              <ActionRow
                label="WiFi 设置"
                subtitle="管理 WiFi 连接"
                onPress={() =>
                  navigation.navigate('WiFi设置', {
                    robotUuid,
                    robotName,
                    robotIp: ip,
                  })
                }
              />
              <ActionRow
                label="日志管理"
                subtitle="查看和下载日志"
                onPress={() =>
                  navigation.navigate('日志管理', {
                    robotUuid,
                    robotName,
                    robotIp: ip,
                  })
                }
              />
              <ActionRow
                label="高级配置"
                subtitle="配置参数、SDK 与 运控服务"
                onPress={() =>
                  navigation.navigate('高级配置', {
                    robotUuid,
                    robotName,
                    robotIp: ip,
                  })
                }
                isLast
              />
            </Section>

            <Section title="安装包管理">
              {activePackage ? (
                <InfoRow
                  label="云端版本"
                  value={`v${versionCodeToSemver(activePackage.versionCode)} (${activePackage.channel})`}
                />
              ) : (
                <InfoRow label="云端版本" value="暂无可用安装包" />
              )}
              <InfoRow label="安装顺序" value="common ➡ server ➡ agent" />
              {installProgress ? (
                <InfoRow label="安装进度" value={installProgress} />
              ) : null}
              <View style={styles.installActionRow}>
                <Pressable
                  style={[
                    styles.installActionButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                    },
                    (downloadingPackages || installingPackages) &&
                      styles.installActionButtonDisabled,
                  ]}
                  onPress={
                    downloadingPackages || installingPackages
                      ? undefined
                      : handleDownloadAllPackages
                  }
                >
                  <Text
                    style={[styles.installActionText, { color: palette.text }]}
                  >
                    {downloadingPackages
                      ? '下载中...'
                      : isCurrentDownloaded
                        ? `已下载(${currentVersion})`
                        : '下载安装包'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.installActionButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                    },
                    (!isCurrentDownloaded ||
                      downloadingPackages ||
                      installingPackages) &&
                      styles.installActionButtonDisabled,
                  ]}
                  onPress={
                    !isCurrentDownloaded ||
                    downloadingPackages ||
                    installingPackages
                      ? undefined
                      : handleInstallAllPackages
                  }
                >
                  <Text
                    style={[styles.installActionText, { color: palette.text }]}
                  >
                    {installingPackages
                      ? '安装中...'
                      : isCurrentInstalled
                        ? '已全部安装'
                        : '上传并安装'}
                  </Text>
                </Pressable>
              </View>
            </Section>
          </>
        ) : (
          <Section title="机器人连接">
            <InfoRow
              label="状态"
              value={connecting ? '连接中...' : '未连接 (请检查IP)'}
              isLast
            />
            {!connecting && ip && (
              <ActionRow
                label="重试连接"
                onPress={() => setIp(ip)} // Trigger useEffect
                isLast
              />
            )}
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  installActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  installActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  installActionButtonDisabled: {
    opacity: 0.5,
  },
  installActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
