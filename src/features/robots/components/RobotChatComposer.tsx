import { Bot, Keyboard as KeyboardIcon, Mic, Send } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import type { MessageTarget } from '../services/robotChat';
import { VoiceRecordButton } from './VoiceRecordButton';

type RobotChatComposerProps = {
  input: string;
  isConnected: boolean;
  audioMethods: React.ComponentProps<typeof VoiceRecordButton>['audio'];
  onChangeInput: (value: string) => void;
  onSend: (target: MessageTarget) => void;
};

export function RobotChatComposer({
  input,
  isConnected,
  audioMethods,
  onChangeInput,
  onSend,
}: RobotChatComposerProps) {
  const palette = usePalette();
  const [voiceMode, setVoiceMode] = useState(false);
  const disabled = !isConnected || !input.trim();
  const handleToggleInputMode = useCallback(() => {
    if (!voiceMode) {
      Keyboard.dismiss();
    }
    setVoiceMode(current => !current);
  }, [voiceMode]);

  return (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <Pressable
        style={[
          styles.modeToggle,
          {
            borderColor: voiceMode ? palette.primary : palette.border,
            backgroundColor: voiceMode ? `${palette.primary}1A` : palette.surfaceAlt,
          },
        ]}
        onPress={handleToggleInputMode}
      >
        {voiceMode ? (
          <KeyboardIcon size={18} color={palette.primary} />
        ) : (
          <Mic size={18} color={palette.textMuted} />
        )}
      </Pressable>
      {voiceMode ? (
        <VoiceRecordButton
          audio={audioMethods}
          variant="press"
          size={44}
          style={styles.voiceButton}
        />
      ) : (
        <>
          <TextInput
            style={[
              styles.input,
              { borderColor: palette.border, color: palette.text },
            ]}
            placeholder="输入消息... (支持 {{action=xxx}} 格式)"
            placeholderTextColor={palette.textMuted}
            value={input}
            onChangeText={onChangeInput}
            multiline
            numberOfLines={2}
          />
          <View style={styles.btnGroup}>
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: palette.success },
                disabled ? styles.sendBtnDisabled : styles.sendBtnEnabled,
              ]}
              disabled={disabled}
              onPress={() => onSend('robot')}
            >
              <View style={styles.sendIconRow}>
                <Bot size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: palette.primary },
                disabled ? styles.sendBtnDisabled : styles.sendBtnEnabled,
              ]}
              disabled={disabled}
              onPress={() => onSend('ai')}
            >
              <View style={styles.sendIconRow}>
                <Send size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    padding: 10,
  },
  modeToggle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  voiceButton: {
    flex: 1,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  sendBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnEnabled: {
    opacity: 1,
  },
  sendIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
