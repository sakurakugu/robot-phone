/**
 * 舞蹈播放屏幕
 * 加载本地编舞工程 → 映射机器人到真实 D1 IP → 播放控制
 */

import { useNavigation, useRoute } from '@react-navigation/native';
import { Pause, Play, Square } from 'lucide-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { fetchRobotsLocal } from '../../robots/api';
import type { Robot } from '../../robots/types';
import {
  ChoreoScheduler,
  type SchedulerState,
} from '../services/choreoScheduler';
import { getRobots, getTimeline } from '../services/choreoStorage';
import { compileTimeline } from '../services/timelineCompiler';
import type { ExecutionPlan, TimelineData, TimelineTrack } from '../types';

const D1_WS_PORT = 8082;
const RECONNECT_DELAY = 3000;
const COLLAPSE_THRESHOLD = 3;

type RobotMapping = {
  projectRobotId: string;
  projectRobotName: string;
  projectRobotModel: string;
  localRobotUuid: string | null;
  ip: string;
};

export function D1ChoreoPlayScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectUuid: string = route.params?.projectUuid ?? '';

  // 工程数据
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [localRobots, setLocalRobots] = useState<Robot[]>([]);

  // 机器人映射
  const [mappings, setMappings] = useState<RobotMapping[]>([]);
  const [mappingListCollapsed, setMappingListCollapsed] = useState(true);

  // 播放状态
  const [schedulerState, setSchedulerState] = useState<SchedulerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const schedulerRef = useRef(new ChoreoScheduler());

  // WebSocket 连接管理
  const wsMapRef = useRef<Map<string, WebSocket>>(new Map());
  const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const destroyedRef = useRef(false);

  // 加载工程数据
  useEffect(() => {
    (async () => {
      try {
        const [tl, robots] = await Promise.all([
          getTimeline(projectUuid),
          getRobots(projectUuid),
        ]);

        if (!tl) {
          setLoadError('找不到时间轴数据');
          return;
        }

        setTimelineData(tl);

        // 提取时间轴中涉及的 robotId
        const robotIdsInTimeline = new Set<string>();
        for (const track of tl.tracks) {
          if (track.type !== 'action') continue;
          if (track.robotId) robotIdsInTimeline.add(track.robotId);
          for (const block of track.blocks ?? []) {
            if (block.robotId) robotIdsInTimeline.add(block.robotId);
          }
        }

        // 初始化映射（尝试从 robots.json 中匹配名称）
        const initialMappings: RobotMapping[] = Array.from(
          robotIdsInTimeline,
        ).map(rid => {
          const robot = robots.find(r => r.uuid === rid || r.robot_id === rid);
          return {
            projectRobotId: rid,
            projectRobotName: robot?.name ?? `机器人 ${rid.slice(0, 6)}`,
            projectRobotModel:
              (robot as (typeof robot & { model?: string }) | undefined)
                ?.model ?? 'agibot-d1',
            localRobotUuid: null,
            ip: '',
          };
        });
        setMappings(initialMappings);
      } catch (e: any) {
        setLoadError(e.message || '加载工程失败');
      }
    })();
  }, [projectUuid]);

  useEffect(() => {
    fetchRobotsLocal()
      .then(list =>
        setLocalRobots(
          list.filter(
            r =>
              r.model?.toLowerCase() === 'agibot-d1' &&
              typeof r.ip === 'string' &&
              r.ip.trim().length > 0,
          ),
        ),
      )
      .catch(() => {});
  }, []);

  const bindLocalRobot = useCallback(
    (projectRobotId: string, localRobot: Robot) => {
      setMappings(prev =>
        prev.map(m =>
          m.projectRobotId === projectRobotId
            ? {
                ...m,
                localRobotUuid: localRobot.uuid,
                ip: localRobot.ip?.trim() ?? '',
              }
            : m,
        ),
      );
    },
    [],
  );

  const pickLocalRobot = useCallback(
    (projectRobotId: string) => {
      if (localRobots.length === 0) {
        Alert.alert('提示', '没有可用的 D1 机器人');
        return;
      }
      const options = localRobots.map(
        r => `${r.name ?? '未命名'} (${r.ip ?? '无 IP'})`,
      );
      options.push('取消');

      Alert.alert('选择机器人', undefined, [
        ...localRobots.map((r, i) => ({
          text: options[i],
          onPress: () => bindLocalRobot(projectRobotId, r),
        })),
        { text: '取消', style: 'cancel' as const },
      ]);
    },
    [bindLocalRobot, localRobots],
  );

  // WebSocket 连接管理
  const connectWs = useCallback((robotId: string, ip: string) => {
    if (destroyedRef.current) return;

    const existing = wsMapRef.current.get(robotId);
    if (existing && existing.readyState === WebSocket.OPEN) return;

    const url = `ws://${ip}:${D1_WS_PORT}`;
    try {
      const ws = new WebSocket(url);
      wsMapRef.current.set(robotId, ws);

      ws.onclose = () => {
        if (destroyedRef.current) return;
        const timer = setTimeout(() => connectWs(robotId, ip), RECONNECT_DELAY);
        reconnectTimersRef.current.set(robotId, timer);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // 连接失败，稍后重试
      const timer = setTimeout(() => connectWs(robotId, ip), RECONNECT_DELAY);
      reconnectTimersRef.current.set(robotId, timer);
    }
  }, []);

  const disconnectAll = useCallback(() => {
    for (const timer of reconnectTimersRef.current.values()) {
      clearTimeout(timer);
    }
    reconnectTimersRef.current.clear();

    for (const ws of wsMapRef.current.values()) {
      ws.close();
    }
    wsMapRef.current.clear();
  }, []);

  // 组件卸载清理
  useEffect(() => {
    const scheduler = schedulerRef.current;
    return () => {
      destroyedRef.current = true;
      scheduler.destroy();
      disconnectAll();
    };
  }, [disconnectAll]);

  // 编译执行计划
  const executionPlan = useMemo<ExecutionPlan | null>(() => {
    if (!timelineData) return null;
    try {
      return compileTimeline(projectUuid, timelineData);
    } catch {
      return null;
    }
  }, [projectUuid, timelineData]);

  // 播放
  const handlePlay = useCallback(() => {
    if (!executionPlan || executionPlan.actions.length === 0) {
      Alert.alert('提示', '时间轴中没有可执行的动作');
      return;
    }

    // 检查映射是否完整
    const unmapped = mappings.filter(m => !m.ip);
    if (unmapped.length > 0) {
      Alert.alert(
        '提示',
        `以下机器人未分配 IP：\n${unmapped.map(m => m.projectRobotName).join('\n')}`,
      );
      return;
    }

    // 建立 WebSocket 连接
    disconnectAll();
    for (const m of mappings) {
      connectWs(m.projectRobotId, m.ip);
    }

    // 等待短暂连接时间后启动调度
    setTimeout(() => {
      schedulerRef.current.setConnections(wsMapRef.current);
      setTotalDuration(executionPlan.totalDuration);
      setCurrentTime(0);

      schedulerRef.current.start(executionPlan, {
        onProgress: (ct, td) => {
          setCurrentTime(ct);
          setTotalDuration(td);
        },
        onComplete: () => {
          setSchedulerState('completed');
        },
        onError: err => {
          Alert.alert('执行错误', err);
        },
        onStateChange: setSchedulerState,
      });
    }, 800);
  }, [executionPlan, mappings, connectWs, disconnectAll]);

  // 暂停 / 恢复
  const handlePauseResume = useCallback(() => {
    const scheduler = schedulerRef.current;
    if (scheduler.getState() === 'running') {
      scheduler.pause();
    } else if (scheduler.getState() === 'paused') {
      scheduler.resume();
    }
  }, []);

  // 停止
  const handleStop = useCallback(() => {
    schedulerRef.current.stop();
    setCurrentTime(0);
    disconnectAll();
  }, [disconnectAll]);

  // 格式化时间
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // 简化的时间轴预览中用到的 action 轨道
  const actionTracks = useMemo<TimelineTrack[]>(() => {
    if (!timelineData) return [];
    return timelineData.tracks.filter(t => t.type === 'action');
  }, [timelineData]);

  const isPlaying = schedulerState === 'running';
  const isPaused = schedulerState === 'paused';
  const visibleMappings = useMemo(
    () =>
      mappingListCollapsed && mappings.length > COLLAPSE_THRESHOLD
        ? mappings.slice(0, COLLAPSE_THRESHOLD)
        : mappings,
    [mappingListCollapsed, mappings],
  );
  const canPlay =
    schedulerState === 'idle' ||
    schedulerState === 'stopped' ||
    schedulerState === 'completed';
  const progressPercent =
    totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;
  const progressWidth = `${progressPercent}%` as `${number}%`;
  const progressFillStyle = useMemo(
    () => [
      styles.progressFill,
      { backgroundColor: palette.primary, width: progressWidth },
    ],
    [palette.primary, progressWidth],
  );
  const buildBlockStyle = useCallback(
    (
      block: { color?: string; duration: number; startTime: number },
      fallbackColor: string,
    ) => {
      const blockColor = block.color || fallbackColor;
      return [
        styles.block,
        {
          backgroundColor: `${blockColor}40`,
          borderColor: blockColor,
          width: Math.max(40, block.duration * 30),
          marginLeft: block.startTime * 30 > 0 ? 2 : 0,
        },
      ];
    },
    [],
  );

  if (loadError) {
    return (
      <Screen palette={palette} unsafeTop>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: palette.danger }]}>
            {loadError}
          </Text>
          <Pressable
            style={[styles.backBtn, { borderColor: palette.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: palette.primary }}>返回</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen palette={palette} unsafeTop>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 机器人映射 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            机器人映射
          </Text>
          <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
            将工程中的机器人分配到真实 D1 机器狗 IP
          </Text>
          {visibleMappings.map(m => {
            const selectedLocalRobot =
              m.localRobotUuid == null
                ? null
                : (localRobots.find(r => r.uuid === m.localRobotUuid) ?? null);
            const selectedName = selectedLocalRobot?.name ?? '未分配';
            const selectedIp = (selectedLocalRobot?.ip ?? m.ip) || '未分配';
            return (
              <Pressable
                key={m.projectRobotId}
                style={({ pressed }) => [
                  styles.mappingRow,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.surface,
                    opacity: canPlay && pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => pickLocalRobot(m.projectRobotId)}
                disabled={!canPlay}
              >
                <View style={styles.mappingTopRow}>
                  <Text
                    style={[styles.mappingName, { color: palette.text }]}
                    numberOfLines={1}
                  >
                    {m.projectRobotName}
                  </Text>
                  <View
                    style={[
                      styles.mappingBadge,
                      { backgroundColor: `${palette.primary}22` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.mappingBadgeText,
                        { color: palette.primary },
                      ]}
                    >
                      {m.projectRobotModel}
                    </Text>
                  </View>
                </View>
                <View style={styles.mappingBottomRow}>
                  <Text
                    style={[
                      styles.mappingSubText,
                      { color: palette.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedIp} · {selectedName}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {mappings.length > COLLAPSE_THRESHOLD && (
            <Pressable
              style={[
                styles.mappingCollapseRow,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() => setMappingListCollapsed(v => !v)}
            >
              <Text
                style={[styles.mappingCollapseText, { color: palette.primary }]}
              >
                {mappingListCollapsed
                  ? `展开全部 ${mappings.length} 台映射 ▾`
                  : '收起 ▴'}
              </Text>
            </Pressable>
          )}
          {mappings.length === 0 && (
            <Text style={[styles.emptyHint, { color: palette.textMuted }]}>
              时间轴中无绑定机器人的轨道
            </Text>
          )}
        </View>

        {/* 时间轴预览 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            时间轴预览
          </Text>
          {actionTracks.length === 0 ? (
            <Text style={[styles.emptyHint, { color: palette.textMuted }]}>
              无动作轨道
            </Text>
          ) : (
            actionTracks.map(track => (
              <View
                key={track.id}
                style={[styles.trackRow, { borderColor: palette.border }]}
              >
                <View
                  style={[
                    styles.trackLabel,
                    { backgroundColor: track.color || palette.primary },
                  ]}
                >
                  <Text style={styles.trackLabelText} numberOfLines={1}>
                    {track.name}
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.trackBlocks}
                >
                  {(track.blocks ?? []).map(block => (
                    <View
                      key={block.id}
                      style={buildBlockStyle(
                        block,
                        track.color || palette.primary,
                      )}
                    >
                      <Text
                        style={[styles.blockText, { color: palette.text }]}
                        numberOfLines={1}
                      >
                        {block.name}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 底部播放控制栏 */}
      <View
        style={[
          styles.controlBar,
          { backgroundColor: palette.surface, borderTopColor: palette.border },
        ]}
      >
        {/* 进度条 */}
        <View
          style={[styles.progressTrack, { backgroundColor: palette.border }]}
        >
          <View style={progressFillStyle} />
        </View>

        <View style={styles.controlRow}>
          <Text style={[styles.timeText, { color: palette.textMuted }]}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </Text>

          <View style={styles.controlButtons}>
            {canPlay && (
              <Pressable
                style={[
                  styles.controlBtn,
                  { backgroundColor: palette.primary },
                ]}
                onPress={handlePlay}
              >
                <View style={styles.controlBtnContent}>
                  <Play size={15} color="#fff" strokeWidth={2.25} />
                  <Text style={styles.controlBtnText}>播放</Text>
                </View>
              </Pressable>
            )}
            {(isPlaying || isPaused) && (
              <>
                <Pressable
                  style={[
                    styles.controlBtn,
                    { backgroundColor: palette.warning },
                  ]}
                  onPress={handlePauseResume}
                >
                  <View style={styles.controlBtnContent}>
                    {isPlaying ? (
                      <Pause size={15} color="#fff" strokeWidth={2.25} />
                    ) : (
                      <Play size={15} color="#fff" strokeWidth={2.25} />
                    )}
                    <Text style={styles.controlBtnText}>
                      {isPlaying ? '暂停' : '继续'}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[
                    styles.controlBtn,
                    { backgroundColor: palette.danger },
                  ]}
                  onPress={handleStop}
                >
                  <View style={styles.controlBtnContent}>
                    <Square size={15} color="#fff" strokeWidth={2.25} />
                    <Text style={styles.controlBtnText}>停止</Text>
                  </View>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  backBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  // 映射
  mappingRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  mappingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mappingName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  mappingBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mappingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  mappingBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  mappingSubText: {
    flex: 1,
    fontSize: 12,
  },
  mappingCollapseRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: -2,
  },
  mappingCollapseText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 轨道预览
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  trackLabel: {
    width: 64,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
    marginRight: 6,
  },
  trackLabelText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  trackBlocks: {
    flex: 1,
  },
  block: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 2,
  },
  blockText: {
    fontSize: 9,
  },
  // 控制栏
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  controlBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  controlBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
