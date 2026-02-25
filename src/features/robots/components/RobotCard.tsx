/**
 * RobotCard
 *
 * 机器人管理列表中的单张卡片，集成实时遥测（通过 useRobotTelemetry 轮询）：
 *   - 右上角显示 在线/离线 状态点
 *   - 显示电量（🔋 xx%）和体温（🌡 xx°C）
 *   - 底部操作按钮：操控 / 对话 / 编辑 / 删除
 */

import React from 'react';
import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Thermometer,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Palette } from '../../../app/theme/palette';
import { useRobotTelemetry } from '../hooks/useRobotTelemetry';
import type { Robot } from '../types';

type Props = {
  item: Robot;
  palette: Palette;
  onOperate: () => void;
  onChat: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function RobotCard({
  item,
  palette,
  onOperate,
  onChat,
  onEdit,
  onDelete,
}: Props) {
  const telemetry = useRobotTelemetry(item.ip, 5000);

  // ── 在线状态颜色 ────────────────────────────────────────────────────────────
  const onlineColor = telemetry.online ? palette.success : palette.textMuted;
  const onlineLabel = telemetry.online ? '在线' : '离线';

  // ── 电量颜色（≤20% 红，≤50% 橙，否则绿）──────────────────────────────────────
  const powerColor =
    telemetry.power === null
      ? palette.textMuted
      : telemetry.power <= 20
        ? palette.danger
        : telemetry.power <= 50
          ? palette.warning
          : palette.success;

  // ── 根据电量选择电池图标 ────────────────────────────────────────────────────
  const BatteryIcon =
    telemetry.power === null
      ? Battery
      : telemetry.power <= 20
        ? BatteryLow
        : telemetry.power <= 50
          ? BatteryMedium
          : telemetry.power < 100
            ? Battery
            : BatteryFull;

  return (
    <Pressable
      onPress={onOperate}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {/* ── 标题行 ──────────────────────────────────────────────────────── */}
      <View style={styles.titleRow}>
        <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
          {item.name || item.uuid}
        </Text>

        {/* 在线状态 */}
        <View style={styles.onlineBadge}>
          <View style={[styles.onlineDot, { backgroundColor: onlineColor }]} />
          <Text style={[styles.onlineLabel, { color: onlineColor }]}>
            {onlineLabel}
          </Text>
        </View>
      </View>

      {/* ── 遥测行：电量 + 体温 ─────────────────────────────────────────── */}
      <View style={styles.telemetryRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <BatteryIcon size={14} color={powerColor} />
          <Text style={[styles.telemetryItem, { color: powerColor }]}>
            {telemetry.power !== null ? `${telemetry.power}%` : '--'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Thermometer size={14} color={palette.textMuted} />
          <Text style={[styles.telemetryItem, { color: palette.textMuted }]}>
            {telemetry.temp !== null ? `${telemetry.temp.toFixed(1)}°C` : '--'}
          </Text>
        </View>
      </View>

      {/* ── 元信息 ──────────────────────────────────────────────────────── */}
      <Text style={[styles.meta, { color: palette.textMuted }]}>
        IP {item.ip || '-'} | 组 {item.group_name || '-'}
      </Text>
      <Text style={[styles.meta, { color: palette.textMuted }]}>
        标签 {item.tags.join(', ') || '-'} | 角色 {item.role?.name || '-'}
      </Text>

      {/* ── 操作按钮 ────────────────────────────────────────────────────── */}
      <View style={styles.row}>
        <Pressable
          onPress={e => {
            e.stopPropagation();
            onOperate();
          }}
          style={[styles.actionBtn, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.text }}>操控</Text>
        </Pressable>
        <Pressable
          onPress={e => {
            e.stopPropagation();
            onChat();
          }}
          style={[styles.actionBtn, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.text }}>对话</Text>
        </Pressable>
        <Pressable
          onPress={e => {
            e.stopPropagation();
            onEdit();
          }}
          style={[styles.actionBtn, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.text }}>编辑</Text>
        </Pressable>
        <Pressable
          onPress={e => {
            e.stopPropagation();
            onDelete();
          }}
          style={[styles.actionBtn, { borderColor: palette.danger }]}
        >
          <Text style={{ color: palette.danger }}>删除</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  telemetryItem: {
    fontSize: 13,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
