import { useNavigation, useRoute } from '@react-navigation/native';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { fetchRobot, updateRobot } from '../api';
import {
  ActionRow,
  InfoRow,
  InputRow,
  Section,
} from '../components/SettingsComponents';
import { RobotClient } from '../robotClient';
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

  useEffect(() => {
    loadRobot();
  }, [loadRobot]);


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
});
