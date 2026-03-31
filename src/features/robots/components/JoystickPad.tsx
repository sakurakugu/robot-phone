import React, { useImperativeHandle, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  StyleSheet,
  View,
} from 'react-native';

const JOYSTICK_SIZE = 140;
const STICK_SIZE = 56;
const JOYSTICK_RADIUS = JOYSTICK_SIZE / 2;

export type JoystickMovePayload = { x: number; y: number };

/**
 * 供父组件通过 ref 命令式驱动摇杆，用于单 View 多点触控架构：
 * 父组件统一接收所有手指的触摸事件，再按坐标分配给对应摇杆调用此方法。
 */
export type JoystickPadHandle = {
  /** 传入从触摸起点到当前位置的像素偏移，内部自动按半径限幅并更新动画 */
  applyDelta: (dx: number, dy: number) => void;
  /** 松手，摇杆弹回中心并触发 onEnd 回调 */
  release: () => void;
};

type JoystickProps = {
  onMove?: (payload: JoystickMovePayload) => void;
  onEnd?: () => void;
  /** 禁用摇杆：不响应触摸，显示半透明 */
  disabled?: boolean;
  colors?: {
    outer?: string;
    outerBorder?: string;
    stick?: string;
    stickBorder?: string;
  };
};

/**
 * 模拟摇杆 —— 仿 app\cloud-server\前端\src\components\JoystickPad.vue
 * 坐标约定：上为 +x，左为 +y
 *
 * 支持两种使用模式：
 * 1. 独立模式（不传 ref）：内部用 onTouchStart/Move/End 处理单点触控，适用于 D1群控等竖屏场景。
 * 2. 命令式模式（传 ref + 父组件设 pointerEvents="none"）：摇杆仅作视觉展示，由父组件的单一
 *    触摸 View 统一调度，通过 ref.applyDelta / ref.release 驱动，解决 Android 多点触控时
 *    ACTION_POINTER_DOWN 只派发给首个触摸目标、导致兄弟 View 无法同时接收事件的限制。
 */
export const JoystickPad = React.forwardRef<JoystickPadHandle, JoystickProps>(
  function JoystickPad({ onMove, onEnd, disabled = false, colors }, ref) {
    const animX = useRef(new Animated.Value(0)).current;
    const animY = useRef(new Animated.Value(0)).current;

    const onMoveRef = useRef(onMove);
    onMoveRef.current = onMove;
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;

    // 当前跟踪的触控点 ID，null 表示摇杆未激活（独立模式使用）
    const activeTouchIdRef = useRef<string | null>(null);
    // 初始触控的屏幕绝对坐标（独立模式使用）
    const originRef = useRef<{ x: number; y: number } | null>(null);

    const springBack = () => {
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
    };

    const applyDelta = (dx: number, dy: number) => {
      const dist = Math.hypot(dx, dy);
      const scale = dist > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / dist : 1;
      const x = dx * scale;
      const y = dy * scale;
      animX.setValue(x);
      animY.setValue(y);
      const nx = JOYSTICK_RADIUS === 0 ? 0 : -y / JOYSTICK_RADIUS;
      const ny = JOYSTICK_RADIUS === 0 ? 0 : -x / JOYSTICK_RADIUS;
      onMoveRef.current?.({ x: nx, y: ny });
    };

    // 暴露给父组件的命令式接口（命令式模式）
    useImperativeHandle(ref, () => ({ applyDelta, release: springBack }));

    // ── 独立模式：内部触摸处理 ─────────────────────────────────────────────
    const handleTouchStart = (e: GestureResponderEvent) => {
      if (disabledRef.current || activeTouchIdRef.current !== null) return;
      const touch = e.nativeEvent.changedTouches[0];
      if (!touch) return;
      activeTouchIdRef.current = touch.identifier;
      originRef.current = { x: touch.pageX, y: touch.pageY };
    };

    const handleTouchMove = (e: GestureResponderEvent) => {
      if (activeTouchIdRef.current === null || !originRef.current) return;
      const touches = e.nativeEvent.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === activeTouchIdRef.current) {
          applyDelta(
            touches[i].pageX - originRef.current.x,
            touches[i].pageY - originRef.current.y,
          );
          break;
        }
      }
    };

    const handleTouchEnd = (e: GestureResponderEvent) => {
      if (activeTouchIdRef.current === null) return;
      const touches = e.nativeEvent.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === activeTouchIdRef.current) {
          activeTouchIdRef.current = null;
          originRef.current = null;
          springBack();
          break;
        }
      }
    };

    return (
      <View style={[styles.joystickWrap, disabled && styles.joystickDisabled]}>
        <View
          style={[
            styles.joystickOuter,
            {
              backgroundColor: colors?.outer ?? 'rgba(255,255,255,0.12)',
              borderColor: colors?.outerBorder ?? 'rgba(255,255,255,0.25)',
            },
          ]}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
        <Animated.View
          style={[
            styles.joystickStick,
            {
              backgroundColor: colors?.stick ?? 'rgba(255,255,255,0.45)',
              borderColor: colors?.stickBorder ?? 'rgba(255,255,255,0.5)',
            },
            { transform: [{ translateX: animX }, { translateY: animY }] },
          ]}
        />
      </View>
    </View>
  );
},
);

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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joystickStick: {
    width: STICK_SIZE,
    height: STICK_SIZE,
    borderRadius: STICK_SIZE / 2,
    borderWidth: 1,
  },
});
