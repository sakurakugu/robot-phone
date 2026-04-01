/**
 * VoiceRecordButton
 *
 * 按住录音按钮组件 —— 按住开始录音，松开发送给后端 ASR。
 * 录音中显示红色脉冲动画。
 */

import { Mic } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

type AudioSendMethods = {
  sendAudioStart: (
    sessionId: string,
    sampleRate?: number,
    channels?: number,
    frameDurationMs?: number,
  ) => void;
  sendAudioChunk: (
    sessionId: string,
    seq: number,
    buffer: string,
    frameDurationMs?: number,
  ) => void;
  sendAudioEnd: (sessionId: string, reason?: string) => void;
  isAudioUploadConnected: boolean;
};

type VoiceRecordButtonProps = {
  audio: AudioSendMethods;
  /** 按钮尺寸，默认 36 */
  size?: number;
  /** 图标尺寸，默认 18 */
  iconSize?: number;
  /** 展示样式 */
  variant?: 'icon' | 'press';
  /** 未录音时文案 */
  idleText?: string;
  /** 录音中文案 */
  recordingText?: string;
  /** 额外样式 */
  style?: StyleProp<ViewStyle>;
  /** 文案样式 */
  textStyle?: StyleProp<TextStyle>;
};

export function VoiceRecordButton({
  audio,
  size = 36,
  iconSize = 18,
  variant = 'icon',
  idleText = '按住说话',
  recordingText = '松开发送',
  style,
  textStyle,
}: VoiceRecordButtonProps) {
  const palette = usePalette();
  const { isRecording, startRecording, stopRecording } =
    useAudioRecorder(audio);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // 录音中脉冲动画
  useEffect(() => {
    if (isRecording) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.current = anim;
      anim.start();
    } else {
      animRef.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handlePressIn = useCallback(
    (_e: GestureResponderEvent) => {
      startRecording();
    },
    [startRecording],
  );

  const handlePressOut = useCallback(
    (_e: GestureResponderEvent) => {
      stopRecording();
    },
    [stopRecording],
  );

  const isPressVariant = variant === 'press';
  const btnSize = isPressVariant
    ? {
        minHeight: size,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }
    : { width: size, height: size, borderRadius: size / 2 };
  const bgColor = isRecording
    ? palette.danger
    : isPressVariant
      ? palette.surfaceAlt
      : palette.surface;
  const borderColor = isRecording ? palette.danger : palette.border;
  const iconColor = isRecording ? '#FFFFFF' : palette.text;
  const labelColor = isRecording ? '#FFFFFF' : palette.text;

  return (
    <Animated.View
      style={[
        isPressVariant ? styles.pressWrapper : null,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.btn,
          isPressVariant ? styles.pressBtn : null,
          btnSize,
          { backgroundColor: bgColor, borderColor },
          style,
        ]}
      >
        {isPressVariant ? (
          <Text
            style={[
              styles.pressLabel,
              { color: labelColor },
              textStyle,
            ]}
          >
            {isRecording ? recordingText : idleText}
          </Text>
        ) : (
          <Mic size={iconSize} color={iconColor} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressWrapper: {
    flex: 1,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressBtn: {
    flex: 1,
    minWidth: 0,
  },
  pressLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
