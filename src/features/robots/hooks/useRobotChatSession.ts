import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import { getConversationHistory } from '../api';
import {
  buildVisionImageUrl,
  HISTORY_PAGE_SIZE,
  mapConversationRecordsToChatMessages,
  parseActionFormat,
  type MessageTarget,
  type RobotChatMessage,
} from '../services/RobotChat';
import { useRobotChatAudio } from './useRobotChatAudio';
import { useRobotWebSocket } from './useRobotWebSocket';

type UseRobotChatSessionOptions = {
  robotUuid: string;
  robotName?: string;
};

export function useRobotChatSession(options: UseRobotChatSessionOptions) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<RobotChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const flatListRef = useRef<FlatList<RobotChatMessage>>(null);
  const loadedRobotIdRef = useRef('');
  const shouldAutoScrollRef = useRef(false);
  const loadingOlderHistoryRef = useRef(false);
  const historyOffsetRef = useRef(0);
  const allowLoadOlderRef = useRef(false);

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
  const { playUri, finalizeCurrentAudio, handleAudioMessage } =
    useRobotChatAudio();

  const audioMethods = useMemo(
    () => ({
      sendAudioStart,
      sendAudioChunk,
      sendAudioEnd,
      isAudioUploadConnected,
    }),
    [
      isAudioUploadConnected,
      sendAudioChunk,
      sendAudioEnd,
      sendAudioStart,
    ],
  );

  const statusText = useMemo(() => {
    const status = isConnected ? '已连接' : '未连接';
    return `${options.robotName || '未命名机器人'} · ${status}`;
  }, [isConnected, options.robotName]);

  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  const loadHistory = useCallback(async (targetRobotId: string) => {
    if (loadingOlderHistoryRef.current) {
      return;
    }
    loadingOlderHistoryRef.current = true;
    setLoadingHistory(true);

    try {
      const data = await getConversationHistory(
        targetRobotId,
        HISTORY_PAGE_SIZE,
        0,
      );
      setMessages(mapConversationRecordsToChatMessages(data.conversations));
      loadedRobotIdRef.current = targetRobotId;
      historyOffsetRef.current = data.conversations.length;
      setHasMoreHistory(data.conversations.length >= HISTORY_PAGE_SIZE);
      allowLoadOlderRef.current = false;
    } catch {
      if (loadedRobotIdRef.current !== targetRobotId) {
        setMessages([]);
      }
      historyOffsetRef.current = 0;
      setHasMoreHistory(false);
      allowLoadOlderRef.current = false;
    } finally {
      loadingOlderHistoryRef.current = false;
      setLoadingHistory(false);
    }
  }, []);

  const loadOlderHistory = useCallback(async () => {
    if (
      !options.robotUuid ||
      loadingOlderHistoryRef.current ||
      !hasMoreHistory ||
      messages.length === 0
    ) {
      return;
    }

    loadingOlderHistoryRef.current = true;
    setLoadingHistory(true);
    try {
      const data = await getConversationHistory(
        options.robotUuid,
        HISTORY_PAGE_SIZE,
        historyOffsetRef.current,
      );
      const historyMessages = mapConversationRecordsToChatMessages(
        data.conversations,
      );
      if (historyMessages.length > 0) {
        setMessages(prev => [...historyMessages, ...prev]);
        historyOffsetRef.current += data.conversations.length;
      }
      setHasMoreHistory(data.conversations.length >= HISTORY_PAGE_SIZE);
    } finally {
      loadingOlderHistoryRef.current = false;
      setLoadingHistory(false);
    }
  }, [hasMoreHistory, messages.length, options.robotUuid]);

  useEffect(() => {
    if (options.robotUuid) {
      if (loadedRobotIdRef.current !== options.robotUuid) {
        setMessages([]);
        historyOffsetRef.current = 0;
        setHasMoreHistory(true);
        allowLoadOlderRef.current = false;
        loadHistory(options.robotUuid);
      }
      connect(options.robotUuid);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, loadHistory, options.robotUuid]);

  useEffect(() => {
    const unsubscribe = onMessage(data => {
      if (handleAudioMessage(data)) {
        return;
      }

      const payload =
        typeof data.data === 'object' && data.data
          ? (data.data as Record<string, unknown>)
          : {};

      if (data.type === 'asr_transcript') {
        const timestamp = Date.now();
        shouldAutoScrollRef.current = true;
        setMessages(prev => [
          ...prev,
          {
            id: `asr-${timestamp}`,
            role: 'user',
            target: 'ai',
            text: typeof payload.text === 'string' ? payload.text : '',
            timestamp,
          },
        ]);
        return;
      }

      if (data.type === 'text_response') {
        const timestamp = Date.now();
        const actions = Array.isArray(payload.actions)
          ? payload.actions.filter(
              (action): action is string =>
                typeof action === 'string' && action.length > 0,
            )
          : undefined;
        shouldAutoScrollRef.current = true;
        setMessages(prev => {
          const filtered = prev.filter(message => !message.loading);
          return [
            ...filtered,
            {
              id: `ai-${timestamp}`,
              role: 'ai',
              text: typeof payload.text === 'string' ? payload.text : '',
              imageUrl: buildVisionImageUrl(
                payload.visionImage as
                  | { base64?: string; format?: string }
                  | undefined,
              ),
              targetPosition: payload.targetPosition as
                | RobotChatMessage['targetPosition']
                | undefined,
              timestamp,
              actions,
            },
          ];
        });
        return;
      }

      if (data.type === 'error') {
        const message =
          typeof payload.message === 'string' ? payload.message : '未知错误';
        const code = typeof payload.code === 'string' ? payload.code : '';
        if (code === 'ASR_ERROR' || message.includes('Opus解码失败')) {
          return;
        }
        const timestamp = Date.now();
        shouldAutoScrollRef.current = true;
        setMessages(prev => {
          const filtered = prev.filter(item => !item.loading);
          return [
            ...filtered,
            {
              id: `err-${timestamp}`,
              role: 'ai',
              text: `发生错误：${message}`,
              timestamp,
            },
          ];
        });
      }
    });

    return unsubscribe;
  }, [handleAudioMessage, onMessage]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current || messages.length === 0) {
      return;
    }
    shouldAutoScrollRef.current = false;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 80);
    return () => {
      clearTimeout(timer);
    };
  }, [messages.length, options.robotUuid]);

  const handleSend = useCallback(
    (target: MessageTarget) => {
      const text = input.trim();
      if (!text || !isConnected) {
        return;
      }

      const timestamp = Date.now();
      const actionMatch = parseActionFormat(text);

      if (actionMatch) {
        shouldAutoScrollRef.current = true;
        setMessages(prev => [
          ...prev,
          {
            id: `user-${timestamp}`,
            role: 'user',
            target: 'robot',
            text,
            timestamp,
            actions: [actionMatch.action],
          },
        ]);
        sendAction(actionMatch.action, actionMatch.parameters);
      } else if (target === 'robot') {
        shouldAutoScrollRef.current = true;
        setMessages(prev => [
          ...prev,
          {
            id: `user-${timestamp}`,
            role: 'user',
            target: 'robot',
            text,
            timestamp,
          },
        ]);
        sendToRobot(text);
      } else {
        shouldAutoScrollRef.current = true;
        setMessages(prev => [
          ...prev,
          {
            id: `user-${timestamp}`,
            role: 'user',
            target: 'ai',
            text,
            timestamp,
          },
          {
            id: `loading-${timestamp}`,
            role: 'ai',
            text: '',
            timestamp,
            loading: true,
          },
        ]);
        sendToAI(text);
      }

      setInput('');
    },
    [input, isConnected, sendAction, sendToAI, sendToRobot],
  );

  const handleHistoryScrollBegin = useCallback(() => {
    allowLoadOlderRef.current = true;
  }, []);

  const handleHistoryEndReached = useCallback(() => {
    if (!allowLoadOlderRef.current) {
      return;
    }
    allowLoadOlderRef.current = false;
    loadOlderHistory();
  }, [loadOlderHistory]);

  return {
    flatListRef,
    input,
    setInput,
    messages,
    displayMessages,
    loadingHistory,
    hasMoreHistory,
    isConnected,
    statusText,
    audioMethods,
    playUri,
    finalizeCurrentAudio,
    handleSend,
    handleHistoryScrollBegin,
    handleHistoryEndReached,
  };
}
