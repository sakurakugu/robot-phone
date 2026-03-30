import { useCallback, useEffect, useRef } from 'react';
import type {
  GestureResponderEvent,
  LayoutRectangle,
  View,
} from 'react-native';
import type {
  JoystickMovePayload,
  JoystickPadHandle,
} from '../components/JoystickPad';
import type { ControlMode } from '../operation';
import { JOYSTICK_HIT_RADIUS } from '../operation';
import type { UseDirectRobotControlResult } from './useDirectRobotControl';

type UseRobotOperationJoystickOptions = {
  controlMode: ControlMode;
  twoLegStandActive: boolean;
  speed: number;
  sendJoystick: UseDirectRobotControlResult['sendJoystick'];
  sendJoystickStop: UseDirectRobotControlResult['sendJoystickStop'];
};

type JoystickSide = 'left' | 'right';

export function useRobotOperationJoystick(
  options: UseRobotOperationJoystickOptions,
) {
  const leftJoyRef = useRef<JoystickPadHandle>(null);
  const rightJoyRef = useRef<JoystickPadHandle>(null);
  const leftJoyWrapRef = useRef<View>(null);
  const rightJoyWrapRef = useRef<View>(null);
  const leftJoyLayoutRef = useRef<LayoutRectangle | null>(null);
  const rightJoyLayoutRef = useRef<LayoutRectangle | null>(null);

  const leftJoyThrottleRef = useRef(0);
  const rightJoyThrottleRef = useRef(0);
  const joyTouchSideRef = useRef(new Map<string, JoystickSide>());
  const joyTouchOriginRef = useRef(new Map<string, { x: number; y: number }>());

  const controlModeRef = useRef(options.controlMode);
  const twoLegStandActiveRef = useRef(options.twoLegStandActive);
  const speedRef = useRef(options.speed);
  const sendJoystickRef = useRef(options.sendJoystick);
  const sendJoystickStopRef = useRef(options.sendJoystickStop);

  useEffect(() => {
    controlModeRef.current = options.controlMode;
  }, [options.controlMode]);

  useEffect(() => {
    twoLegStandActiveRef.current = options.twoLegStandActive;
  }, [options.twoLegStandActive]);

  useEffect(() => {
    speedRef.current = options.speed;
  }, [options.speed]);

  useEffect(() => {
    sendJoystickRef.current = options.sendJoystick;
  }, [options.sendJoystick]);

  useEffect(() => {
    sendJoystickStopRef.current = options.sendJoystickStop;
  }, [options.sendJoystickStop]);

  const updateJoystickLayout = useCallback((side: JoystickSide) => {
    const targetRef = side === 'left' ? leftJoyWrapRef : rightJoyWrapRef;
    targetRef.current?.measureInWindow((x, y, width, height) => {
      const layout = { x, y, width, height };
      if (side === 'left') {
        leftJoyLayoutRef.current = layout;
        return;
      }
      rightJoyLayoutRef.current = layout;
    });
  }, []);

  const isTouchInsideJoystick = useCallback(
    (touchX: number, touchY: number, side: JoystickSide) => {
      const layout =
        side === 'left' ? leftJoyLayoutRef.current : rightJoyLayoutRef.current;
      if (!layout) {
        return false;
      }
      const centerX = layout.x + layout.width / 2;
      const centerY = layout.y + layout.height / 2;
      const dx = touchX - centerX;
      const dy = touchY - centerY;
      return dx * dx + dy * dy <= JOYSTICK_HIT_RADIUS * JOYSTICK_HIT_RADIUS;
    },
    [],
  );

  const handleJoystickTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const { changedTouches } = event.nativeEvent;
      for (let index = 0; index < changedTouches.length; index += 1) {
        const touch = changedTouches[index];
        let side: JoystickSide | null = null;
        if (isTouchInsideJoystick(touch.pageX, touch.pageY, 'left')) {
          side = 'left';
        } else if (isTouchInsideJoystick(touch.pageX, touch.pageY, 'right')) {
          side = 'right';
        }
        if (!side) {
          continue;
        }
        if (
          side === 'left' &&
          controlModeRef.current === 'pose' &&
          !twoLegStandActiveRef.current
        ) {
          continue;
        }
        if (side === 'right' && twoLegStandActiveRef.current) {
          continue;
        }
        joyTouchSideRef.current.set(touch.identifier, side);
        joyTouchOriginRef.current.set(touch.identifier, {
          x: touch.pageX,
          y: touch.pageY,
        });
      }
    },
    [isTouchInsideJoystick],
  );

  const handleJoystickTouchMove = useCallback((event: GestureResponderEvent) => {
    const { changedTouches } = event.nativeEvent;
    for (let index = 0; index < changedTouches.length; index += 1) {
      const touch = changedTouches[index];
      const side = joyTouchSideRef.current.get(touch.identifier);
      const origin = joyTouchOriginRef.current.get(touch.identifier);
      if (!side || !origin) {
        continue;
      }
      const dx = touch.pageX - origin.x;
      const dy = touch.pageY - origin.y;
      if (side === 'left') {
        leftJoyRef.current?.applyDelta(dx, dy);
      } else {
        rightJoyRef.current?.applyDelta(dx, dy);
      }
    }
  }, []);

  const handleJoystickTouchEnd = useCallback((event: GestureResponderEvent) => {
    const { changedTouches } = event.nativeEvent;
    for (let index = 0; index < changedTouches.length; index += 1) {
      const touch = changedTouches[index];
      const side = joyTouchSideRef.current.get(touch.identifier);
      if (!side) {
        continue;
      }
      joyTouchSideRef.current.delete(touch.identifier);
      joyTouchOriginRef.current.delete(touch.identifier);
      if (side === 'left') {
        leftJoyRef.current?.release();
      } else {
        rightJoyRef.current?.release();
      }
    }
  }, []);

  const handleLeftJoystickMove = useCallback((payload: JoystickMovePayload) => {
    const { x, y } = payload;
    if (controlModeRef.current === 'pose' && !twoLegStandActiveRef.current) {
      return;
    }
    if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
      return;
    }
    const now = Date.now();
    if (now - leftJoyThrottleRef.current < 50) {
      return;
    }
    leftJoyThrottleRef.current = now;
    sendJoystickRef.current(
      twoLegStandActiveRef.current ? 'two_leg' : controlModeRef.current,
      'move',
      x,
      y,
      speedRef.current,
    );
  }, []);

  const handleLeftJoystickEnd = useCallback(() => {
    if (controlModeRef.current === 'pose' && !twoLegStandActiveRef.current) {
      return;
    }
    leftJoyThrottleRef.current = 0;
    sendJoystickStopRef.current(
      twoLegStandActiveRef.current ? 'two_leg' : controlModeRef.current,
      'move',
    );
  }, []);

  const handleRightJoystickMove = useCallback((payload: JoystickMovePayload) => {
    const { x, y } = payload;
    if (twoLegStandActiveRef.current) {
      return;
    }
    if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
      return;
    }
    const now = Date.now();
    if (now - rightJoyThrottleRef.current < 50) {
      return;
    }
    rightJoyThrottleRef.current = now;
    const channel = controlModeRef.current === 'pose' ? 'pose' : 'look';
    sendJoystickRef.current(
      controlModeRef.current,
      channel,
      x,
      y,
      speedRef.current,
    );
  }, []);

  const handleRightJoystickEnd = useCallback(() => {
    if (twoLegStandActiveRef.current) {
      return;
    }
    rightJoyThrottleRef.current = 0;
    const channel = controlModeRef.current === 'pose' ? 'pose' : 'look';
    sendJoystickStopRef.current(controlModeRef.current, channel);
  }, []);

  return {
    leftJoystick: {
      ref: leftJoyRef,
      wrapRef: leftJoyWrapRef,
      disabled: options.controlMode === 'pose' && !options.twoLegStandActive,
      onMove: handleLeftJoystickMove,
      onEnd: handleLeftJoystickEnd,
    },
    rightJoystick: {
      ref: rightJoyRef,
      wrapRef: rightJoyWrapRef,
      disabled: options.twoLegStandActive,
      onMove: handleRightJoystickMove,
      onEnd: handleRightJoystickEnd,
    },
    updateJoystickLayout,
    touchHandlers: {
      onTouchStart: handleJoystickTouchStart,
      onTouchMove: handleJoystickTouchMove,
      onTouchEnd: handleJoystickTouchEnd,
      onTouchCancel: handleJoystickTouchEnd,
    },
  };
}
