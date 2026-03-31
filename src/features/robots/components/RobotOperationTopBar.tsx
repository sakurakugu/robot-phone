import {
    ArrowLeft,
    Bot,
    Mic,
    MicOff,
    Smartphone,
    Thermometer,
    Wifi,
    WifiOff,
} from 'lucide-react-native';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { usePalette } from '../../../app/theme/palette';
import type { ControlMode } from '../services/operation';
import { ToggleSwitch } from './ToggleSwitch';

type RobotOperationTopBarProps = {
  insets: EdgeInsets;
  headerText: string;
  timeText: string;
  phoneBattery: number | null;
  dogTelemetry: {
    online: boolean;
    temp: number | null;
    power: number | null;
  };
  directConnected: boolean;
  controlMode: ControlMode;
  sdkMode: boolean;
  sdkModeLoading: boolean;
  showVideo: boolean;
  speed: number;
  micEnabled: boolean;
  capturing: boolean;
  speedButtonRef: React.RefObject<View | null>;
  onBack: () => void;
  onToggleControlMode: (poseModeEnabled: boolean) => void;
  onToggleSdkMode: (enabled: boolean) => void;
  onOpenSpeedPopover: () => void;
  onToggleVideo: (visible: boolean) => void;
  onCapturePhoto: () => void;
  onOpenSettings: () => void;
  onEmergencyStop: () => void;
  onToggleMic: () => void;
};

export function RobotOperationTopBar({
  insets,
  headerText,
  timeText,
  phoneBattery,
  dogTelemetry,
  directConnected,
  controlMode,
  sdkMode,
  sdkModeLoading,
  showVideo,
  speed,
  micEnabled,
  capturing,
  speedButtonRef,
  onBack,
  onToggleControlMode,
  onToggleSdkMode,
  onOpenSpeedPopover,
  onToggleVideo,
  onCapturePhoto,
  onOpenSettings,
  onEmergencyStop,
  onToggleMic,
}: RobotOperationTopBarProps) {
  const palette = usePalette();

  const dogOnlineColor = dogTelemetry.online
    ? palette.success
    : palette.textMuted;
  const dogPowerColor =
    dogTelemetry.power !== null && dogTelemetry.power <= 20
      ? palette.danger
      : dogTelemetry.power !== null && dogTelemetry.power <= 50
        ? palette.warning
        : palette.text;

  return (
    <View
      style={[
        styles.topBar,
        {
          borderBottomColor: palette.border,
          backgroundColor: palette.surface,
          paddingLeft: 10 + insets.left,
          paddingRight: 10 + insets.right,
        },
      ]}
    >
      <View style={styles.leftTools}>
        <Pressable
          onPress={onBack}
          style={[styles.smallBtn, { borderColor: palette.border }]}
        >
          <ArrowLeft size={16} color={palette.text} />
        </Pressable>

        <ToggleSwitch
          value={controlMode === 'pose'}
          onValueChange={onToggleControlMode}
          activeText="姿态"
          inactiveText="移动"
        />

        <ToggleSwitch
          value={sdkMode}
          onValueChange={onToggleSdkMode}
          activeText={sdkModeLoading ? '切换中' : 'SDK'}
          inactiveText={sdkModeLoading ? '切换中' : '遥控'}
          disabled={sdkModeLoading}
        />

        <Pressable
          ref={speedButtonRef}
          style={[styles.speedBtn, { borderColor: palette.border }]}
          onPress={onOpenSpeedPopover}
        >
          <Text style={[styles.speedText, { color: palette.text }]}>
            速度 {speed}
          </Text>
        </Pressable>

        <ToggleSwitch
          value={showVideo}
          onValueChange={onToggleVideo}
          activeText="视频开"
          inactiveText="视频关"
        />

        <Pressable
          onPress={onCapturePhoto}
          disabled={capturing}
          style={[styles.smallBtn, { borderColor: palette.border }]}
        >
          <Text style={[styles.btnText, { color: palette.text }]}>
            {capturing ? '拍照中' : '拍照'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenSettings}
          style={[styles.smallBtn, { borderColor: palette.border }]}
        >
          <Text style={[styles.btnText, { color: palette.text }]}>设置</Text>
        </Pressable>

        <Pressable
          onPress={onEmergencyStop}
          style={[
            styles.emergencyBtn,
            {
              borderColor: palette.danger,
              backgroundColor: palette.danger + '22',
            },
          ]}
        >
          <Text style={[styles.emergencyText, { color: palette.danger }]}>
            急停
          </Text>
        </Pressable>

        <Pressable
          onPress={onToggleMic}
          style={[styles.smallBtn, { borderColor: palette.border }]}
        >
          {micEnabled ? (
            <Mic size={16} color={palette.text} />
          ) : (
            <MicOff size={16} color={palette.danger} />
          )}
        </Pressable>
      </View>

      <View style={styles.rightInfo}>
        <View
          style={[
            styles.directDot,
            {
              backgroundColor: directConnected
                ? palette.success
                : palette.danger,
            },
          ]}
        />
        <Text style={[styles.infoText, { color: palette.text }]}>
          {headerText}
        </Text>
        <Text style={[styles.infoText, { color: palette.text }]}>
          {timeText}
        </Text>
        <View style={styles.batteryStack}>
          <View style={styles.batteryInfo}>
            {dogTelemetry.online ? (
              <Wifi size={14} color={palette.success} />
            ) : (
              <WifiOff size={14} color={palette.textMuted} />
            )}
            <Text style={[styles.infoText, { color: dogOnlineColor }]}>
              {dogTelemetry.online ? '在线' : '离线'}
            </Text>
          </View>
          <View style={styles.batteryInfo}>
            <Thermometer size={14} color={palette.text} />
            <Text style={[styles.infoText, { color: palette.text }]}>
              {dogTelemetry.temp !== null
                ? `${dogTelemetry.temp.toFixed(1)}°C`
                : '--'}
            </Text>
          </View>
        </View>
        <View style={styles.batteryStack}>
          <View style={styles.batteryInfo}>
            <Smartphone size={14} color={palette.text} />
            <Text style={[styles.infoText, { color: palette.text }]}>
              {phoneBattery !== null ? `${phoneBattery}%` : '--'}
            </Text>
          </View>
          <View style={styles.batteryInfo}>
            <Bot size={14} color={palette.text} />
            <Text style={[styles.infoText, { color: dogPowerColor }]}>
              {dogTelemetry.power !== null ? `${dogTelemetry.power}%` : '--'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  leftTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
  },
  batteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryStack: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  },
  infoText: {
    fontSize: 12,
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtn: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  speedBtn: {
    borderWidth: 1,
    borderRadius: 6,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  speedText: {
    fontSize: 12,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  directDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
