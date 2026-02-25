import { Maximize2, Minimize2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { RobotChatPanel } from './RobotChatPanel';

type ChatDrawerProps = {
  visible: boolean;
  onClose: () => void;
  robotUuid?: string;
  robotName?: string;
};

/**
 * 聊天抽屉 —— 从右侧滑入，内嵌 RobotChatPanel（完整 WebSocket 聊天）
 */
export function ChatDrawer({
  visible,
  onClose,
  robotUuid,
  robotName,
}: ChatDrawerProps) {
  const palette = usePalette();
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const chatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chatAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    if (!visible) setChatFullscreen(false);
    // chatAnim is a stable Animated.Value ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const chatTranslateX = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.chatOverlay} onPress={onClose} />
      <Animated.View
        style={[
          styles.chatDrawer,
          chatFullscreen ? styles.chatDrawerFull : styles.chatDrawerHalf,
          {
            transform: [{ translateX: chatTranslateX }],
            backgroundColor: palette.background,
            borderLeftColor: palette.border,
          },
        ]}
      >
        {/* ── 抽屉头部 ──────────────────────────────────────────────────── */}
        <View style={styles.floatingActions}>
          <Pressable
            onPress={() => setChatFullscreen(v => !v)}
            style={[
              styles.smallBtn,
              styles.smallBtnMr,
              { borderColor: palette.border, backgroundColor: palette.background },
            ]}
          >
            {chatFullscreen ? (
              <Minimize2 size={14} color={palette.text} />
            ) : (
              <Maximize2 size={14} color={palette.text} />
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            style={[
              styles.smallBtn,
              { borderColor: palette.border, backgroundColor: palette.background },
            ]}
          >
            <Text style={[styles.btnText, { color: palette.text }]}>×</Text>
          </Pressable>
        </View>

        {/* ── 聊天面板 ──────────────────────────────────────────────────── */}
        {robotUuid ? (
          <RobotChatPanel robotUuid={robotUuid} robotName={robotName} />
        ) : (
          <View style={styles.noRobot}>
            <Text style={[styles.noRobotText, { color: palette.textMuted }]}>
              未指定机器人
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  chatDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#0D1628',
    borderLeftWidth: 1,
    borderLeftColor: '#2C374D',
    zIndex: 20,
    flexDirection: 'column',
  },
  chatDrawerHalf: {
    width: '50%',
  },
  chatDrawerFull: {
    width: '100%',
  },
  floatingActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeader: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#2C374D',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: {
    color: '#DCE7FF',
    fontSize: 15,
    fontWeight: '700',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallBtnMr: {
    marginRight: 6,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  btnText: {
    color: '#DCE7FF',
    fontSize: 12,
    fontWeight: '600',
  },
  noRobot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRobotText: {
    color: '#8FA2C7',
    fontSize: 14,
  },
});
