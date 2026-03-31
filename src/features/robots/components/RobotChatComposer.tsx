import { Bot, Send } from 'lucide-react-native';
import React from 'react';
import {
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
  const disabled = !isConnected || !input.trim();

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
        <VoiceRecordButton audio={audioMethods} size={32} iconSize={14} />
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
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
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
