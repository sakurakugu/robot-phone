import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type GestureResponderEvent,
} from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { usePalette } from '../../../app/theme/palette';
import {
  ACTION_BUTTONS,
  type RobotOperationActionButton,
} from '../operation';
import type {
  JoystickMovePayload,
  JoystickPadHandle,
} from './JoystickPad';
import { JoystickPad } from './JoystickPad';
import {
  type DanmakuItem,
  StatusDanmaku,
} from './StatusDanmaku';
import { VoiceRecordButton } from './VoiceRecordButton';

type JoystickBinding = {
  ref: React.RefObject<JoystickPadHandle | null>;
  wrapRef: React.RefObject<View | null>;
  disabled: boolean;
  onMove: (payload: JoystickMovePayload) => void;
  onEnd: () => void;
};

type RobotOperationOverlayProps = {
  insets: EdgeInsets;
  audioMethods: React.ComponentProps<typeof VoiceRecordButton>['audio'];
  leftJoystick: JoystickBinding;
  rightJoystick: JoystickBinding;
  updateJoystickLayout: (side: 'left' | 'right') => void;
  touchHandlers: {
    onTouchStart: (event: GestureResponderEvent) => void;
    onTouchMove: (event: GestureResponderEvent) => void;
    onTouchEnd: (event: GestureResponderEvent) => void;
    onTouchCancel: (event: GestureResponderEvent) => void;
  };
  twoLegStandActive: boolean;
  danmakuMessages: DanmakuItem[];
  onExpireDanmaku: (id: string) => void;
  onOpenChat: () => void;
  onActionPress: (
    actionId: RobotOperationActionButton['id'],
    label: string,
  ) => void;
};

export function RobotOperationOverlay({
  insets,
  audioMethods,
  leftJoystick,
  rightJoystick,
  updateJoystickLayout,
  touchHandlers,
  twoLegStandActive,
  danmakuMessages,
  onExpireDanmaku,
  onOpenChat,
  onActionPress,
}: RobotOperationOverlayProps) {
  const palette = usePalette();

  return (
    <View style={styles.floatingLayer} pointerEvents="box-none">
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={touchHandlers.onTouchStart}
        onTouchMove={touchHandlers.onTouchMove}
        onTouchEnd={touchHandlers.onTouchEnd}
        onTouchCancel={touchHandlers.onTouchCancel}
      />

      <Pressable
        onPress={onOpenChat}
        style={[
          styles.circleBtn,
          styles.chatPos,
          {
            backgroundColor: palette.surface + 'E6',
            borderColor: palette.border,
            right: 20 + insets.right,
          },
        ]}
      >
        <Text style={[styles.btnText, { color: palette.text }]}>对话</Text>
      </Pressable>

      <View style={[styles.micPos, { right: 20 + insets.right }]}>
        <VoiceRecordButton audio={audioMethods} size={56} iconSize={22} />
      </View>

      <View
        style={[
          styles.leftJoystick,
          { left: 16 + insets.left, bottom: 20 + insets.bottom },
        ]}
        ref={leftJoystick.wrapRef}
        onLayout={() => updateJoystickLayout('left')}
        pointerEvents="none"
      >
        <JoystickPad
          ref={leftJoystick.ref}
          disabled={leftJoystick.disabled}
          onMove={leftJoystick.onMove}
          onEnd={leftJoystick.onEnd}
        />
      </View>

      <View
        style={[
          styles.rightJoystick,
          { right: 100 + insets.right, bottom: 20 + insets.bottom },
        ]}
        ref={rightJoystick.wrapRef}
        onLayout={() => updateJoystickLayout('right')}
        pointerEvents="none"
      >
        <JoystickPad
          ref={rightJoystick.ref}
          disabled={rightJoystick.disabled}
          onMove={rightJoystick.onMove}
          onEnd={rightJoystick.onEnd}
        />
      </View>

      {ACTION_BUTTONS.map(item => {
        const isActive = item.id === 'two_leg_stand' && twoLegStandActive;
        return (
          <Pressable
            key={item.id}
            onPress={() => onActionPress(item.id, item.label)}
            style={[
              styles.actionBtn,
              {
                left: `${item.x}%` as DimensionValue,
                top: `${item.y}%` as DimensionValue,
                backgroundColor: isActive
                  ? palette.primary + 'CC'
                  : palette.surface + '80',
                borderColor: isActive ? palette.primary : palette.border,
              },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: palette.text }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}

      <StatusDanmaku
        messages={danmakuMessages}
        onExpire={onExpireDanmaku}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  circleBtn: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPos: {
    top: 18,
    right: 20,
  },
  micPos: {
    position: 'absolute',
    top: 88,
    right: 20,
  },
  leftJoystick: {
    position: 'absolute',
    left: 16,
    bottom: 20,
  },
  rightJoystick: {
    position: 'absolute',
    right: 100,
    bottom: 20,
  },
  actionBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: -22,
    marginTop: -22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
