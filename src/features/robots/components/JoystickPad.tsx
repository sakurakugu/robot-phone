import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

const JOYSTICK_SIZE = 140;
const STICK_SIZE = 56;
const JOYSTICK_RADIUS = JOYSTICK_SIZE / 2;

export type JoystickMovePayload = { x: number; y: number };

type JoystickProps = {
  onMove?: (payload: JoystickMovePayload) => void;
  onEnd?: () => void;
  /** 禁用摇杆：不响应触摸，显示半透明 */
  disabled?: boolean;
};

/**
 * 模拟摇杆 —— 仿 app\robot-cloud\前端\src\components\JoystickPad.vue
 * 坐标约定：上为 +x，左为 +y
 */
export function JoystickPad({
  onMove,
  onEnd,
  disabled = false,
}: JoystickProps) {
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;

  // 使用 Ref 保存最新回调，避免 PanResponder 闭包捕获过期的 onMove/onEnd。
  // PanResponder 只在首次渲染时创建，若直接捕获 props，controlMode 切换后
  // 摇杆仍会使用旧值发送指令，导致姿态模式切换后"没反应"。
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  // disabled 同样用 Ref，让 PanResponder 始终读取最新值。
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gs) => {
        const dx = gs.dx;
        const dy = gs.dy;
        const dist = Math.hypot(dx, dy);
        const scale = dist > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / dist : 1;
        const x = dx * scale;
        const y = dy * scale;
        animX.setValue(x);
        animY.setValue(y);
        const nx = JOYSTICK_RADIUS === 0 ? 0 : -y / JOYSTICK_RADIUS;
        const ny = JOYSTICK_RADIUS === 0 ? 0 : -x / JOYSTICK_RADIUS;
        onMoveRef.current?.({ x: nx, y: ny });
      },
      onPanResponderRelease: () => {
        Animated.spring(animX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 30,
        }).start();
        Animated.spring(animY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 30,
        }).start();
        onEndRef.current?.();
      },
      onPanResponderTerminate: () => {
        Animated.spring(animX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 30,
        }).start();
        Animated.spring(animY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 30,
        }).start();
        onEndRef.current?.();
      },
    }),
  ).current;

  return (
    <View style={[styles.joystickWrap, disabled && styles.joystickDisabled]}>
      <View style={styles.joystickOuter} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.joystickStick,
            { transform: [{ translateX: animX }, { translateY: animY }] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  joystickWrap: {
    alignItems: 'center',
    gap: 6,
  },
  joystickDisabled: {
    opacity: 0.35,
  },
  joystickOuter: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joystickStick: {
    width: STICK_SIZE,
    height: STICK_SIZE,
    borderRadius: STICK_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
