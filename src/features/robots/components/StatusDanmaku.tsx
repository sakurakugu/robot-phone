import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../../app/theme/palette';

export type DanmakuItem = {
  id: string;
  text: string;
};

type DanmakuMessageProps = {
  text: string;
  /** 动画结束后回调，通知父级移除该条消息 */
  onExpire: () => void;
  /** 停留时长（ms），默认 2500 */
  duration?: number;
};

/** 单条弹幕消息：从左侧滑入，停留后向上淡出 */
function DanmakuMessage({
  text,
  onExpire,
  duration = 2500,
}: DanmakuMessageProps) {
  const palette = usePalette();
  const translateX = useRef(new Animated.Value(-240)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 入场：从左滑入 + 淡入
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 停留后：向上滑出 + 淡出
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -36,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 380,
            useNativeDriver: true,
          }),
        ]).start(() => onExpire());
      }, duration);
    });
    // Animated refs and onExpire are intentionally read only once at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          transform: [{ translateX }, { translateY }],
          opacity,
          backgroundColor: palette.surface + 'D9', // 85% opacity
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.bubbleText, { color: palette.text }]}>{text}</Text>
    </Animated.View>
  );
}

type StatusDanmakuProps = {
  messages: DanmakuItem[];
  onExpire: (id: string) => void;
};

/**
 * 状态弹幕层 —— 将控制指令/状态信息以弹幕形式从左侧弹出，向上收起
 * 仿 Vue TransitionGroup 效果，但方向为左侧进入
 */
export function StatusDanmaku({ messages, onExpire }: StatusDanmakuProps) {
  const handleExpire = useCallback((id: string) => () => onExpire(id), [onExpire]);

  if (messages.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {messages.map(msg => (
        <DanmakuMessage
          key={msg.id}
          text={msg.text}
          onExpire={handleExpire(msg.id)}
        />
      ))}
    </View>
  );
}

/** Hook：方便在父组件管理弹幕消息队列 */
export function useStatusDanmaku() {
  const messagesRef = useRef<DanmakuItem[]>([]);
  const setMessagesExternal = useRef<((msgs: DanmakuItem[]) => void) | null>(null);

  const push = useCallback((text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const next = [...messagesRef.current, { id, text }];
    messagesRef.current = next;
    setMessagesExternal.current?.(next);
  }, []);

  const expire = useCallback((id: string) => {
    const next = messagesRef.current.filter(m => m.id !== id);
    messagesRef.current = next;
    setMessagesExternal.current?.(next);
  }, []);

  return { push, expire, setMessagesExternal };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    bottom: 180,
    gap: 6,
    maxWidth: 220,
    alignItems: 'flex-start',
  },
  bubble: {
    backgroundColor: 'rgba(13,22,40,0.82)',
    borderWidth: 1,
    borderColor: '#3A5080',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bubbleText: {
    color: '#F7CF72',
    fontSize: 12,
    fontWeight: '600',
  },
});
