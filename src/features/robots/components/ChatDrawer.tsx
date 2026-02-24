import { Maximize2, Minimize2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export type ChatMessage = {
  id: string;
  role: 'user' | 'robot';
  text: string;
};

type ChatDrawerProps = {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
};

/**
 * 聊天抽屉 —— 从右侧滑入，仿 el-drawer direction="rtl"
 */
export function ChatDrawer({ visible, onClose, messages, onSend }: ChatDrawerProps) {
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chatAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    if (!visible) setChatFullscreen(false);
  // chatAnim is a stable Animated.Value ref — no need to re-run when it changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const chatTranslateX = chatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  function handleSend() {
    const text = chatInput.trim();
    if (!text) return;
    onSend(text);
    setChatInput('');
  }

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Pressable style={styles.chatOverlay} onPress={onClose} />
      <Animated.View
        style={[
          styles.chatDrawer,
          chatFullscreen ? styles.chatDrawerFull : styles.chatDrawerHalf,
          { transform: [{ translateX: chatTranslateX }] },
        ]}
      >
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>机器人对话</Text>
          <View style={styles.chatHeaderActions}>
            <Pressable
              onPress={() => setChatFullscreen(v => !v)}
              style={[styles.smallBtn, styles.smallBtnMr]}
            >
              {chatFullscreen
                ? <Minimize2 size={14} color="#DCE7FF" />
                : <Maximize2 size={14} color="#DCE7FF" />}
            </Pressable>
            <Pressable onPress={onClose} style={styles.smallBtn}>
              <Text style={styles.btnText}>×</Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatList}
          style={styles.chatFlatList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.chatBubble,
                item.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleRobot,
              ]}
            >
              <Text style={styles.chatBubbleText}>{item.text}</Text>
            </View>
          )}
        />

        <View style={styles.chatFooter}>
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="输入消息..."
            placeholderTextColor="#8FA2C7"
            style={styles.chatInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable style={styles.chatSendBtn} onPress={handleSend}>
            <Text style={styles.btnText}>发送</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  chatOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  chatFlatList: {
    flex: 1,
  },
  chatList: {
    padding: 10,
    gap: 8,
  },
  chatBubble: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '88%',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#3A6FE6',
  },
  chatBubbleRobot: {
    alignSelf: 'flex-start',
    backgroundColor: '#1B273D',
    borderWidth: 1,
    borderColor: '#41506F',
  },
  chatBubbleText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  chatFooter: {
    borderTopWidth: 1,
    borderTopColor: '#2C374D',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#DCE7FF',
    fontSize: 14,
  },
  chatSendBtn: {
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#22314A',
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
});
