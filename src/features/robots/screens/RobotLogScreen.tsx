import { useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { ActionRow, InfoRow, Section } from '../components/SettingsComponents';
import { RobotClient } from '../robotClient';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
  robotIp: string;
};

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatDisplayTime(isoStr: string): string {
  if (!isoStr) return '未设置';
  try {
    const d = new Date(isoStr);
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${M}-${D} ${h}:${m}`;
  } catch {
    return isoStr;
  }
}

// 时间快捷选择预设
const TIME_PRESETS = [
  { label: '最近 1 小时', hours: 1 },
  { label: '最近 3 小时', hours: 3 },
  { label: '最近 6 小时', hours: 6 },
  { label: '最近 24 小时', hours: 24 },
  { label: '最近 3 天', hours: 72 },
  { label: '最近 7 天', hours: 168 },
];

// ── 应用选择弹窗 ──
type PickerModalProps = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
};
function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: PickerModalProps) {
  const palette = usePalette();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={[pickerStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <View
          style={[pickerStyles.sheet, { backgroundColor: palette.surface }]}
        >
          <Text style={[pickerStyles.title, { color: palette.text }]}>
            {title}
          </Text>
          <FlatList
            data={['', ...options]}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  pickerStyles.item,
                  { borderBottomColor: palette.border },
                  item === selected && { backgroundColor: palette.surfaceAlt },
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={{
                    color: item === selected ? palette.primary : palette.text,
                  }}
                >
                  {item || '全部应用'}
                </Text>
                {item === selected && (
                  <Text style={{ color: palette.primary }}>✓</Text>
                )}
              </Pressable>
            )}
          />
          <Pressable
            style={[
              pickerStyles.cancel,
              { backgroundColor: palette.surfaceAlt },
            ]}
            onPress={onClose}
          >
            <Text style={{ color: palette.text }}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── 时间选择弹窗 ──
type TimePickerModalProps = {
  visible: boolean;
  title: string;
  onSelect: (isoStr: string) => void;
  onClose: () => void;
};
function TimePickerModal({
  visible,
  title,
  onSelect,
  onClose,
}: TimePickerModalProps) {
  const palette = usePalette();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={[pickerStyles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <View
          style={[pickerStyles.sheet, { backgroundColor: palette.surface }]}
        >
          <Text style={[pickerStyles.title, { color: palette.text }]}>
            {title}
          </Text>
          <Text
            style={{
              color: palette.textMuted,
              marginHorizontal: 16,
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            以当前时间为基准快速选择开始时间
          </Text>
          {TIME_PRESETS.map(p => {
            const d = new Date(Date.now() - p.hours * 3_600_000);
            const iso = formatDateTimeLocal(d);
            return (
              <Pressable
                key={p.hours}
                style={[
                  pickerStyles.item,
                  { borderBottomColor: palette.border },
                ]}
                onPress={() => {
                  onSelect(iso);
                  onClose();
                }}
              >
                <Text style={{ color: palette.text }}>{p.label}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  {formatDisplayTime(iso)}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[
              pickerStyles.cancel,
              { backgroundColor: palette.surfaceAlt },
            ]}
            onPress={onClose}
          >
            <Text style={{ color: palette.text }}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { margin: 16, padding: 12, borderRadius: 10, alignItems: 'center' },
});

// ── 主屏幕 ──
export function RobotLogScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const { robotUuid, robotName, robotIp } = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [client, setClient] = useState<RobotClient | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [apps, setApps] = useState<string[]>([]);
  const [appName, setAppName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [showAppPicker, setShowAppPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (robotIp) {
      const c = new RobotClient(robotIp);
      setClient(c);
      c.login().catch(() => {});

      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      setStartTime(formatDateTimeLocal(start));
      setEndTime(formatDateTimeLocal(end));
    }
  }, [robotIp]);

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

  const handleLoadLogs = async () => {
    if (!client) return;
    await withLoading(async () => {
      const res = await client.getLogs(appName || undefined);
      if (res.success) {
        setLogs(res.logs || []);
        setApps(res.apps || []);
        setMessage(`已加载 ${(res.logs || []).length} 个日志文件`);
      }
    });
  };

  const handleDownloadLogs = () => {
    if (!client) {
      setMessage('未连接到机器人');
      return;
    }
    if (!startTime || !endTime) {
      setMessage('请先选择时间范围');
      return;
    }
    // URL 中已包含 session_token，服务端支持查询参数认证
    const url = client.getDownloadLogsUrl(
      startTime,
      endTime,
      appName || undefined,
    );
    Linking.openURL(url).catch(err =>
      setMessage('无法打开下载链接: ' + err.message),
    );
  };

  return (
    <Screen
      palette={palette}
      title="日志管理"
      subtitle={robotName || robotUuid}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <Text style={[styles.message, { color: palette.warning }]}>
            {message}
          </Text>
        ) : null}

        <Section title="日志筛选">
          {/* 应用名称 - 下拉选择 */}
          <Pressable
            style={[
              styles.selectorRow,
              {
                borderBottomColor: palette.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => setShowAppPicker(true)}
          >
            <Text style={[styles.label, { color: palette.text }]}>
              应用名称
            </Text>
            <View style={styles.selectorRight}>
              <Text
                style={{ color: appName ? palette.text : palette.textMuted }}
              >
                {appName || '全部应用'}
              </Text>
              <Text style={{ color: palette.textMuted, marginLeft: 4 }}>›</Text>
            </View>
          </Pressable>

          {/* 开始时间 - 快速选择 */}
          <Pressable
            style={[
              styles.selectorRow,
              {
                borderBottomColor: palette.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={[styles.label, { color: palette.text }]}>
              开始时间
            </Text>
            <View style={styles.selectorRight}>
              <Text
                style={{ color: startTime ? palette.text : palette.textMuted }}
              >
                {startTime ? formatDisplayTime(startTime) : '点击选择'}
              </Text>
              <Text style={{ color: palette.textMuted, marginLeft: 4 }}>›</Text>
            </View>
          </Pressable>

          {/* 结束时间 - 选择（现在/自定义） */}
          <Pressable
            style={styles.selectorRow}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={[styles.label, { color: palette.text }]}>
              结束时间
            </Text>
            <View style={styles.selectorRight}>
              <Text
                style={{ color: endTime ? palette.text : palette.textMuted }}
              >
                {endTime ? formatDisplayTime(endTime) : '点击选择'}
              </Text>
              <Text style={{ color: palette.textMuted, marginLeft: 4 }}>›</Text>
            </View>
          </Pressable>
        </Section>

        <Section>
          <ActionRow
            label="刷新日志列表"
            onPress={handleLoadLogs}
            loading={loading}
          />
          <ActionRow
            label="打包下载"
            subtitle={
              startTime && endTime
                ? `${formatDisplayTime(startTime)} ~ ${formatDisplayTime(endTime)}${appName ? '  ' + appName : ''}`
                : '请先选择时间范围'
            }
            onPress={handleDownloadLogs}
            isLast
          />
        </Section>

        <Section
          title={`日志文件列表${logs.length ? ` (${logs.length})` : ''}`}
        >
          {logs.length === 0 ? (
            <InfoRow label="提示" value="暂无日志，点击刷新加载" isLast />
          ) : (
            logs.map((log, index) => (
              <InfoRow
                key={index}
                label={log.file_name || String(log)}
                value={
                  log.size_bytes
                    ? `${(log.size_bytes / 1024).toFixed(1)} KB`
                    : ''
                }
                isLast={index === logs.length - 1}
              />
            ))
          )}
        </Section>
      </ScrollView>

      {/* 应用选择弹窗 */}
      <PickerModal
        visible={showAppPicker}
        title="选择应用"
        options={apps}
        selected={appName}
        onSelect={setAppName}
        onClose={() => setShowAppPicker(false)}
      />

      {/* 开始时间弹窗 */}
      <TimePickerModal
        visible={showStartPicker}
        title="选择开始时间"
        onSelect={setStartTime}
        onClose={() => setShowStartPicker(false)}
      />

      {/* 结束时间弹窗（预设均设为当前时间附近的结束时间） */}
      <TimePickerModal
        visible={showEndPicker}
        title="选择结束时间"
        onSelect={setEndTime}
        onClose={() => setShowEndPicker(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  message: {
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
