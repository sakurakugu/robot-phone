import {
    // BrainCircuit,
    Bot,
    Send,
} from 'lucide-react-native';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import Video from 'react-native-video';
import { usePalette } from '../../../app/theme/palette';
import { useRobotWebSocket } from '../hooks/useRobotWebSocket';
import { VoiceRecordButton } from './VoiceRecordButton';

export type MessageTarget = 'ai' | 'robot';

export type RobotChatMessage = {
  id: string;
  /** 'user' = 用户发出；'ai' = 服务器/AI 回复 */
  role: 'user' | 'ai';
  target?: MessageTarget;
  text: string;
  imageUrl?: string;
  timestamp: number;
  actions?: string[];
  /** 等待服务器回复中 */
  loading?: boolean;
};

type AudioStreamState = {
  sessionId: string;
  format: string;
  nextSeq: number;
  pendingBySeq: Map<number, string>;
  stagedChunks: string[];
  started: boolean;
  conversationId: string;
};

type RobotChatPanelProps = {
  robotUuid: string;
  robotName?: string;
  showStatusHeader?: boolean;
};

/** 解析动作格式 {{action=xxx}} 或 {{action=xxx,param=value}} */
function parseActionFormat(
  text: string,
): { action: string; parameters: Record<string, any> } | null {
  const actionRegex =
    /^\{\{action=([a-zA-Z_][a-zA-Z0-9_]*)((?:,[a-zA-Z_][a-zA-Z0-9_]*=[^,}]+)*)\}\}$/;
  const match = text.match(actionRegex);
  if (!match) return null;

  const action = match[1];
  const paramsStr = match[2];
  const parameters: Record<string, any> = {};

  if (paramsStr) {
    const paramPairs = paramsStr.slice(1).split(',');
    for (const pair of paramPairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        parameters[key.trim()] = isNaN(Number(value)) ? value : Number(value);
      }
    }
  }
  return { action, parameters };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '00');
  return `${hh}:${mm}:${ss}`;
}

/**
 * 机器人聊天面板 —— 自包含 WebSocket 连接 + 聊天 UI
 * 可嵌入到 Screen 全屏页面或 ChatDrawer 抽屉中
 */
export function RobotChatPanel({
  robotUuid,
  robotName,
  showStatusHeader = false,
}: RobotChatPanelProps) {
  const palette = usePalette();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<RobotChatMessage[]>([]);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [playUri, setPlayUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const audioQueueRef = useRef<string[]>([]);
  const tempAudioFilesRef = useRef<string[]>([]);
  const isAudioPlayingRef = useRef(false);
  const playedConversationRef = useRef<Set<string>>(new Set());
  const streamConversationRef = useRef<Set<string>>(new Set());
  const audioStreamRef = useRef<Map<string, AudioStreamState>>(new Map());

  const {
    isConnected,
    connect,
    disconnect,
    sendToAI,
    sendToRobot,
    sendAction,
    onMessage,
    isAudioUploadConnected,
    sendAudioStart,
    sendAudioChunk,
    sendAudioEnd,
  } = useRobotWebSocket();

  const audioMethods = useMemo(
    () => ({
      sendAudioStart,
      sendAudioChunk,
      sendAudioEnd,
      isAudioUploadConnected,
    }),
    [sendAudioStart, sendAudioChunk, sendAudioEnd, isAudioUploadConnected],
  );

  const statusText = useMemo(() => {
    const status = isConnected ? '已连接' : '未连接';
    return `${robotName || '未命名机器人'} · ${status}`;
  }, [robotName, isConnected]);
  const themedStyles = useMemo(
    () => ({
      bubbleLeft: {
        backgroundColor: palette.surface,
        borderColor: palette.border,
        borderWidth: 1,
      },
      bubbleRight: { backgroundColor: palette.primary },
      metaLabelLeft: { color: palette.textMuted },
      metaLabelRight: { color: 'rgba(255,255,255,0.7)' },
      metaTimeLeft: { color: palette.textMuted },
      metaTimeRight: { color: 'rgba(255,255,255,0.6)' },
      messageLeft: { color: palette.text },
      messageRight: { color: '#FFFFFF' },
      actionLabelLeft: { color: palette.textMuted },
      actionLabelRight: { color: 'rgba(255,255,255,0.7)' },
      statusHeader: { borderBottomColor: palette.border },
      dotConnected: { backgroundColor: palette.success },
      dotDisconnected: { backgroundColor: palette.textMuted },
      statusText: { color: palette.textMuted },
      emptyText: { color: palette.textMuted },
      footer: {
        borderTopColor: palette.border,
        backgroundColor: palette.surface,
      },
      input: {
        borderColor: palette.border,
        color: palette.text,
      },
      sendBtnRobot: { backgroundColor: palette.success },
      sendBtnAi: { backgroundColor: palette.primary },
    }),
    [palette],
  );

  /** 播放队列中的下一条音频 */
  const playNextAudio = useCallback(() => {
    if (isAudioPlayingRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next) return;
    isAudioPlayingRef.current = true;
    setPlayUri(next);
  }, []);

  /** 将 base64 音频写入缓存并排队播放 */
  const enqueueBase64Audio = useCallback(
    async (base64: string, format?: string) => {
      const normalized = (format || 'mp3').toLowerCase();
      const ext =
        normalized === 'wav' || normalized === 'aac' || normalized === 'm4a'
          ? normalized
          : 'mp3';
      const filePath = `${RNBlobUtil.fs.dirs.CacheDir}/robot-tts-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      try {
        await RNBlobUtil.fs.writeFile(filePath, base64, 'base64');
        tempAudioFilesRef.current.push(filePath);
        audioQueueRef.current.push(`file://${filePath}`);
        playNextAudio();
      } catch {
        // 写入失败直接跳过，避免阻塞聊天流程
      }
    },
    [playNextAudio],
  );

  const finalizeCurrentAudio = useCallback(() => {
    if (playUri) {
      const path = playUri.replace(/^file:\/\//, '');
      RNBlobUtil.fs.unlink(path).catch(() => {
        // 缓存文件可能已被系统清理
      });
      tempAudioFilesRef.current = tempAudioFilesRef.current.filter(
        p => p !== path,
      );
    }
    setPlayUri(null);
    isAudioPlayingRef.current = false;
    playNextAudio();
  }, [playNextAudio, playUri]);

  const flushStreamAudio = useCallback(
    (sessionId: string, force = false) => {
      const streamState = audioStreamRef.current.get(sessionId);
      if (!streamState) {
        return;
      }
      const minChunks = 1;
      if (!force && streamState.stagedChunks.length < minChunks) {
        return;
      }
      const toPlay = force
        ? streamState.stagedChunks.splice(0, streamState.stagedChunks.length)
        : streamState.stagedChunks.splice(0, minChunks);
      if (toPlay.length === 0) {
        return;
      }
      streamState.started = true;
      for (const base64 of toPlay) {
        enqueueBase64Audio(base64, streamState.format);
      }
    },
    [enqueueBase64Audio],
  );

  const consumeStreamChunks = useCallback(
    (sessionId: string) => {
      const streamState = audioStreamRef.current.get(sessionId);
      if (!streamState) {
        return;
      }
      while (streamState.pendingBySeq.has(streamState.nextSeq)) {
        const chunk = streamState.pendingBySeq.get(streamState.nextSeq);
        streamState.pendingBySeq.delete(streamState.nextSeq);
        streamState.nextSeq += 1;
        if (chunk) {
          streamState.stagedChunks.push(chunk);
        }
      }
      flushStreamAudio(sessionId);
    },
    [flushStreamAudio],
  );

  // 连接 / 断连
  useEffect(() => {
    if (robotUuid) {
      connect(robotUuid);
    }
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotUuid]);

  // 键盘事件监听
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardOffset(e.endCoordinates.height);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // 注册消息处理
  useEffect(() => {
    const unsubscribe = onMessage(data => {
      if (data.type === 'asr_transcript') {
        const ts = Date.now();
        setMessages(prev => [
          ...prev,
          {
            id: `asr-${ts}`,
            role: 'user',
            target: 'ai',
            text: data.data?.text || '',
            timestamp: ts,
          },
        ]);
        return;
      }

      if (data.type === 'text_response') {
        const ts = Date.now();
        const visionImageBase64 = data.data?.visionImage?.base64;
        const visionImageFormat = data.data?.visionImage?.format || 'jpeg';
        const imageUrl = visionImageBase64
          ? `data:image/${visionImageFormat};base64,${visionImageBase64}`
          : undefined;
        setMessages(prev => {
          const filtered = prev.filter(m => !m.loading);
          return [
            ...filtered,
            {
              id: `ai-${ts}`,
              role: 'ai',
              text: data.data?.text || '',
              imageUrl,
              timestamp: ts,
              actions: data.data?.actions,
            },
          ];
        });
        return;
      }

      if (data.type === 'error') {
        if (
          data.data?.code === 'ASR_ERROR' ||
          String(data.data?.message || '').includes('Opus解码失败')
        ) {
          return;
        }
        const ts = Date.now();
        setMessages(prev => {
          const filtered = prev.filter(m => !m.loading);
          return [
            ...filtered,
            {
              id: `err-${ts}`,
              role: 'ai',
              text: `发生错误：${data.data?.message || '未知错误'}`,
              timestamp: ts,
            },
          ];
        });
        return;
      }

      if (data.type === 'audio_response') {
        const conversationId =
          typeof data.conversationId === 'string' ? data.conversationId : '';
        if (
          conversationId &&
          (playedConversationRef.current.has(conversationId) ||
            streamConversationRef.current.has(conversationId))
        ) {
          return;
        }

        const base64 =
          (typeof data.data?.buffer === 'string' && data.data.buffer) ||
          (typeof data.data?.base64 === 'string' && data.data.base64) ||
          '';

        if (!base64) {
          return;
        }

        if (conversationId) {
          playedConversationRef.current.add(conversationId);
          if (playedConversationRef.current.size > 200) {
            const entries = Array.from(playedConversationRef.current);
            playedConversationRef.current = new Set(entries.slice(-100));
          }
        }

        enqueueBase64Audio(base64, data.data?.format);
        return;
      }

      if (data.type === 'audio_stream_start') {
        const sessionId =
          typeof data.data?.sessionId === 'string' ? data.data.sessionId : '';
        if (!sessionId) {
          return;
        }
        const conversationId =
          typeof data.conversationId === 'string' ? data.conversationId : '';
        if (conversationId) {
          streamConversationRef.current.add(conversationId);
          if (streamConversationRef.current.size > 200) {
            const entries = Array.from(streamConversationRef.current);
            streamConversationRef.current = new Set(entries.slice(-100));
          }
        }
        audioStreamRef.current.set(sessionId, {
          sessionId,
          format:
            typeof data.data?.format === 'string' && data.data.format
              ? data.data.format
              : 'mp3',
          nextSeq: 1,
          pendingBySeq: new Map<number, string>(),
          stagedChunks: [],
          started: false,
          conversationId,
        });
        return;
      }

      if (data.type === 'audio_stream_chunk') {
        const sessionId =
          typeof data.data?.sessionId === 'string' ? data.data.sessionId : '';
        const buffer =
          typeof data.data?.buffer === 'string' ? data.data.buffer : '';
        if (!sessionId || !buffer) {
          return;
        }
        const seqNumber = Number(data.data?.seq);
        const seq = Number.isFinite(seqNumber) && seqNumber > 0 ? seqNumber : 0;
        const streamState = audioStreamRef.current.get(sessionId);
        if (!streamState || seq === 0) {
          return;
        }
        streamState.pendingBySeq.set(seq, buffer);
        consumeStreamChunks(sessionId);
        return;
      }

      if (data.type === 'audio_stream_end') {
        const sessionId =
          typeof data.data?.sessionId === 'string' ? data.data.sessionId : '';
        if (!sessionId) {
          return;
        }
        consumeStreamChunks(sessionId);
        flushStreamAudio(sessionId, true);
        const streamState = audioStreamRef.current.get(sessionId);
        if (streamState?.conversationId) {
          playedConversationRef.current.add(streamState.conversationId);
          if (playedConversationRef.current.size > 200) {
            const entries = Array.from(playedConversationRef.current);
            playedConversationRef.current = new Set(entries.slice(-100));
          }
        }
        audioStreamRef.current.delete(sessionId);
      }
    });
    return unsubscribe;
  }, [consumeStreamChunks, enqueueBase64Audio, flushStreamAudio, onMessage]);

  useEffect(() => {
    const audioStreamStates = audioStreamRef.current;
    return () => {
      for (const path of tempAudioFilesRef.current) {
        RNBlobUtil.fs.unlink(path).catch(() => {
          // 卸载时忽略清理失败
        });
      }
      tempAudioFilesRef.current = [];
      audioQueueRef.current = [];
      isAudioPlayingRef.current = false;
      playedConversationRef.current.clear();
      streamConversationRef.current.clear();
      audioStreamStates.clear();
    };
  }, []);

  // 消息变化时滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [messages.length]);

  const handleSend = useCallback(
    (target: MessageTarget) => {
      const text = input.trim();
      if (!text || !isConnected) return;

      const ts = Date.now();
      const actionMatch = parseActionFormat(text);

      if (actionMatch) {
        // 动作格式 —— 直接发送 action_input
        const userMsg: RobotChatMessage = {
          id: `user-${ts}`,
          role: 'user',
          target: 'robot',
          text,
          timestamp: ts,
          actions: [actionMatch.action],
        };
        setMessages(prev => [...prev, userMsg]);
        sendAction(actionMatch.action, actionMatch.parameters);
      } else if (target === 'robot') {
        // 直接合成 TTS 推送到机器狗
        const userMsg: RobotChatMessage = {
          id: `user-${ts}`,
          role: 'user',
          target: 'robot',
          text,
          timestamp: ts,
        };
        setMessages(prev => [...prev, userMsg]);
        sendToRobot(text);
      } else {
        // 发给大模型
        const userMsg: RobotChatMessage = {
          id: `user-${ts}`,
          role: 'user',
          target: 'ai',
          text,
          timestamp: ts,
        };
        const loadingMsg: RobotChatMessage = {
          id: `loading-${ts}`,
          role: 'ai',
          text: '',
          timestamp: ts,
          loading: true,
        };
        setMessages(prev => [...prev, userMsg, loadingMsg]);
        sendToAI(text);
      }

      setInput('');
    },
    [input, isConnected, sendAction, sendToAI, sendToRobot],
  );

  const renderItem = useCallback(
    ({ item }: { item: RobotChatMessage }) => {
      const isUser = item.role === 'user';
      // 发给机器人的消息显示在左侧
      const isRight = isUser && item.target !== 'robot';

      if (item.loading) {
        return (
          <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
            <View style={[styles.bubble, themedStyles.bubbleLeft]}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.bubbleRow,
            isRight ? styles.bubbleRowRight : styles.bubbleRowLeft,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isRight ? themedStyles.bubbleRight : themedStyles.bubbleLeft,
            ]}
          >
            <View style={styles.bubbleMeta}>
              <Text
                style={[
                  styles.metaLabel,
                  isRight
                    ? themedStyles.metaLabelRight
                    : themedStyles.metaLabelLeft,
                ]}
              >
                {isUser
                  ? item.target === 'ai'
                    ? '用户 → AI'
                    : '用户 → 机器狗'
                  : 'AI助手'}
              </Text>
              <Text
                style={[
                  styles.metaTime,
                  isRight
                    ? themedStyles.metaTimeRight
                    : themedStyles.metaTimeLeft,
                ]}
              >
                {formatTime(item.timestamp)}
              </Text>
            </View>
            <Text
              style={[
                styles.messageText,
                isRight ? themedStyles.messageRight : themedStyles.messageLeft,
              ]}
            >
              {item.text}
            </Text>
            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
              />
            )}
            {item.actions && item.actions.length > 0 && (
              <View style={styles.actionTags}>
                <Text
                  style={[
                    styles.actionLabel,
                    isRight
                      ? themedStyles.actionLabelRight
                      : themedStyles.actionLabelLeft,
                  ]}
                >
                  ⚡ {item.actions.join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [palette, themedStyles],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset > 0 ? 90 : 0} // 键盘弹出时偏移 90，否则为 0
    >
      {/* 顶部状态栏 */}
      {showStatusHeader && (
        <View style={[styles.statusHeader, themedStyles.statusHeader]}>
          <View
            style={[
              styles.dot,
              isConnected
                ? themedStyles.dotConnected
                : themedStyles.dotDisconnected,
            ]}
          />
          <Text style={[styles.statusText, themedStyles.statusText]}>
            {statusText}
          </Text>
          {!isConnected && (
            <ActivityIndicator
              size="small"
              color={palette.primary}
              style={styles.statusSpinner}
            />
          )}
        </View>
      )}

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, themedStyles.emptyText]}>
            还没有对话记录，发送一条消息开始吧！
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}

      <View style={[styles.footer, themedStyles.footer]}>
        <TextInput
          style={[styles.input, themedStyles.input]}
          placeholder="输入消息... (支持 {{action=xxx}} 格式)"
          placeholderTextColor={palette.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          numberOfLines={2}
        />
        <View style={styles.btnGroup}>
          <VoiceRecordButton audio={audioMethods} size={32} iconSize={14} />
          <Pressable
            style={[
              styles.sendBtn,
              themedStyles.sendBtnRobot,
              !isConnected || !input.trim()
                ? styles.sendBtnDisabled
                : styles.sendBtnEnabled,
            ]}
            disabled={!isConnected || !input.trim()}
            onPress={() => handleSend('robot')}
          >
            <View style={styles.sendIconRow}>
              {/* <Text style={styles.sendBtnText}>发给</Text> */}
              <Bot size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          <Pressable
            style={[
              styles.sendBtn,
              themedStyles.sendBtnAi,
              !isConnected || !input.trim()
                ? styles.sendBtnDisabled
                : styles.sendBtnEnabled,
            ]}
            disabled={!isConnected || !input.trim()}
            onPress={() => handleSend('ai')}
          >
            <View style={styles.sendIconRow}>
              {/* <Text style={styles.sendBtnText}>发给</Text> */}
              <Send size={14} color="#FFFFFF" />
              {/* <View style={{ transform: [{ rotate: '90deg' }] }}>
                <BrainCircuit size={14} color="#FFFFFF" />
              </View> */}
            </View>
          </Pressable>
        </View>
      </View>

      {playUri ? (
        <Video
          source={{ uri: playUri }}
          paused={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onEnd={finalizeCurrentAudio}
          onError={finalizeCurrentAudio}
          style={styles.hiddenAudio}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  statusSpinner: {
    marginLeft: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaTime: {
    fontSize: 10,
  },
  actionTags: {
    marginTop: 6,
  },
  actionLabel: {
    fontSize: 11,
  },
  messageText: {
    lineHeight: 20,
  },
  messageImage: {
    width: 220,
    height: 160,
    marginTop: 8,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    // alignItems: 'flex-end',
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
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  hiddenAudio: {
    width: 0,
    height: 0,
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});
