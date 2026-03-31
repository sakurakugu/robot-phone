import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';
import { ChatDrawer } from '../components/ChatDrawer';
import { RobotOperationOverlay } from '../components/RobotOperationOverlay';
import { RobotOperationSpeedPopover } from '../components/RobotOperationSpeedPopover';
import { RobotOperationTopBar } from '../components/RobotOperationTopBar';
import { RtspVideoPlayer } from '../components/RtspVideoPlayer';
import { useRobotOperationJoystick } from '../hooks/useRobotOperationJoystick';
import { useRobotOperationScreen } from '../hooks/useRobotOperationScreen';
import type { RobotOperationRouteParams } from '../services/operation';

type RobotOperationStackParamList = {
  机器人操作: RobotOperationRouteParams;
  机器人设置: {
    robotUuid: string;
    robotName?: string;
  };
};

export function RobotOperationScreen() {
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const { setHomeOrientation } = useAppPreferences();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RobotOperationStackParamList, '机器人操作'>
    >();
  const route =
    useRoute<RouteProp<RobotOperationStackParamList, '机器人操作'>>();
  const { robotUuid, robotName, robotIp } = route.params;

  const screenState = useRobotOperationScreen({
    robotUuid,
    robotName,
    robotIp,
    navigation,
    setHomeOrientation,
  });

  const joystick = useRobotOperationJoystick({
    controlMode: screenState.controlMode,
    twoLegStandActive: screenState.twoLegStandActive,
    speed: screenState.speed,
    sendJoystick: screenState.sendJoystick,
    sendJoystickStop: screenState.sendJoystickStop,
  });

  return (
    <View style={[styles.page, { backgroundColor: palette.background }]}>
      <RobotOperationTopBar
        insets={insets}
        headerText={screenState.headerText}
        timeText={screenState.timeText}
        phoneBattery={screenState.phoneBattery}
        dogTelemetry={screenState.dogTelemetry}
        directConnected={screenState.directConnected}
        controlMode={screenState.controlMode}
        sdkMode={screenState.sdkMode}
        sdkModeLoading={screenState.sdkModeLoading}
        showVideo={screenState.showVideo}
        speed={screenState.speed}
        micEnabled={screenState.micEnabled}
        capturing={screenState.capturing}
        speedButtonRef={screenState.speedBtnRef}
        onBack={screenState.handleGoBack}
        onToggleControlMode={screenState.handleToggleControlMode}
        onToggleSdkMode={screenState.handleToggleSdkMode}
        onOpenSpeedPopover={screenState.handleOpenSpeedPopover}
        onToggleVideo={screenState.setShowVideo}
        onCapturePhoto={screenState.handleCapturePhoto}
        onOpenSettings={screenState.handleOpenSettings}
        onEmergencyStop={screenState.handleEmergencyStop}
        onToggleMic={screenState.handleToggleMic}
      />

      <View style={styles.videoArea}>
        {screenState.showVideo ? (
          robotIp ? (
            <RtspVideoPlayer robotIp={robotIp} />
          ) : (
            <View
              style={[
                styles.placeholder,
                { backgroundColor: palette.surfaceAlt },
              ]}
            >
              <Text
                style={[styles.placeholderText, { color: palette.textMuted }]}
              >
                未配置机器人 IP，无法获取视频流
              </Text>
            </View>
          )
        ) : (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: palette.surfaceAlt },
            ]}
          >
            <Text style={[styles.placeholderText, { color: palette.textMuted }]}>
              视频已关闭
            </Text>
          </View>
        )}

        <RobotOperationOverlay
          insets={insets}
          audioMethods={screenState.audioMethods}
          leftJoystick={joystick.leftJoystick}
          rightJoystick={joystick.rightJoystick}
          updateJoystickLayout={joystick.updateJoystickLayout}
          touchHandlers={joystick.touchHandlers}
          twoLegStandActive={screenState.twoLegStandActive}
          danmakuMessages={screenState.danmakuMessages}
          onExpireDanmaku={screenState.expireDanmaku}
          onOpenChat={() => screenState.setChatVisible(true)}
          onActionPress={screenState.handleActionPress}
        />

        <ChatDrawer
          visible={screenState.chatVisible}
          onClose={() => screenState.setChatVisible(false)}
          robotUuid={robotUuid}
          robotName={robotName}
        />
      </View>

      <RobotOperationSpeedPopover
        visible={screenState.speedPopoverVisible}
        position={screenState.speedPopoverPos}
        value={screenState.speed}
        onChange={screenState.setSpeed}
        onClose={() => screenState.setSpeedPopoverVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#111827',
  },
  videoArea: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8FA2C7',
    fontSize: 16,
  },
});
