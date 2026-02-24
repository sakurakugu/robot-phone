import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';

type RouteParams = {
  robotUuid: string;
  robotName?: string;
};

type Message = {
  id: string;
  role: 'user' | 'robot';
  text: string;
};

export function RobotChatScreen() {
  const palette = usePalette();
  const route = useRoute<any>();
  const { robotUuid, robotName } = (route.params || {}) as RouteParams;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'robot', text: '你好，我已准备好接收指令。' },
  ]);

  const subtitle = useMemo(
    () => `${robotName || '未命名机器人'} · ${robotUuid || ''}`,
    [robotName, robotUuid],
  );

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const userMessage: Message = { id: `${Date.now()}_u`, role: 'user', text };
    const robotMessage: Message = {
      id: `${Date.now()}_r`,
      role: 'robot',
      text: `已收到：${text}`,
    };
    setMessages(prev => [...prev, userMessage, robotMessage]);
    setInput('');
  }

  return (
    <Screen
      palette={palette}
      title="机器人对话"
      subtitle={subtitle}
    >
      <View style={styles.container}>
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: palette.primary }
                  : { alignSelf: 'flex-start', backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
              ]}
            >
              <Text style={{ color: item.role === 'user' ? '#FFFFFF' : palette.text }}>{item.text}</Text>
            </View>
          )}
        />
        <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            placeholder="输入消息..."
            placeholderTextColor={palette.textMuted}
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={[styles.sendBtn, { backgroundColor: palette.primary }]} onPress={sendMessage}>
            <Text style={styles.sendBtnText}>发送</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
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
  },
  sendBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
