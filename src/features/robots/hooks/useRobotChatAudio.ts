import { useCallback, useEffect, useRef, useState } from 'react';
import RNBlobUtil from 'react-native-blob-util';
import type { AudioStreamState } from '../services/RobotChat';
import type { WsMessage } from './useRobotWebSocket';

function trimConversationSet(target: Set<string>) {
  if (target.size <= 200) {
    return;
  }
  const entries = Array.from(target);
  target.clear();
  entries.slice(-100).forEach(entry => {
    target.add(entry);
  });
}

export function useRobotChatAudio() {
  const [playUri, setPlayUri] = useState<string | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const tempAudioFilesRef = useRef<string[]>([]);
  const isAudioPlayingRef = useRef(false);
  const playedConversationRef = useRef<Set<string>>(new Set());
  const streamConversationRef = useRef<Set<string>>(new Set());
  const audioStreamRef = useRef<Map<string, AudioStreamState>>(new Map());

  const playNextAudio = useCallback(() => {
    if (isAudioPlayingRef.current) {
      return;
    }
    const next = audioQueueRef.current.shift();
    if (!next) {
      return;
    }
    isAudioPlayingRef.current = true;
    setPlayUri(next);
  }, []);

  const enqueueBase64Audio = useCallback(
    async (base64: string, format?: string) => {
      const normalized = (format || 'mp3').toLowerCase();
      const ext =
        normalized === 'wav' || normalized === 'aac' || normalized === 'm4a'
          ? normalized
          : 'mp3';
      const filePath = `${RNBlobUtil.fs.dirs.CacheDir}/robot-tts-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;
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
        item => item !== path,
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
      if (!force && streamState.stagedChunks.length < 1) {
        return;
      }
      const toPlay = force
        ? streamState.stagedChunks.splice(0, streamState.stagedChunks.length)
        : streamState.stagedChunks.splice(0, 1);
      if (toPlay.length === 0) {
        return;
      }
      toPlay.forEach(base64 => {
        enqueueBase64Audio(base64, streamState.format);
      });
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

  const handleAudioMessage = useCallback(
    (data: WsMessage) => {
      const payload =
        typeof data.data === 'object' && data.data
          ? (data.data as Record<string, unknown>)
          : {};

      if (data.type === 'audio_response') {
        const conversationId =
          typeof data.conversationId === 'string' ? data.conversationId : '';
        if (
          conversationId &&
          (playedConversationRef.current.has(conversationId) ||
            streamConversationRef.current.has(conversationId))
        ) {
          return true;
        }

        const base64 =
          (typeof payload.buffer === 'string' && payload.buffer) ||
          (typeof payload.base64 === 'string' && payload.base64) ||
          '';
        if (!base64) {
          return true;
        }

        if (conversationId) {
          playedConversationRef.current.add(conversationId);
          trimConversationSet(playedConversationRef.current);
        }

        enqueueBase64Audio(
          base64,
          typeof payload.format === 'string' ? payload.format : undefined,
        );
        return true;
      }

      if (data.type === 'audio_stream_start') {
        const sessionId =
          typeof payload.sessionId === 'string' ? payload.sessionId : '';
        if (!sessionId) {
          return true;
        }

        const conversationId =
          typeof data.conversationId === 'string' ? data.conversationId : '';
        if (conversationId) {
          streamConversationRef.current.add(conversationId);
          trimConversationSet(streamConversationRef.current);
        }

        audioStreamRef.current.set(sessionId, {
          format:
            typeof payload.format === 'string' && payload.format
              ? payload.format
              : 'mp3',
          nextSeq: 1,
          pendingBySeq: new Map<number, string>(),
          stagedChunks: [],
          conversationId,
        });
        return true;
      }

      if (data.type === 'audio_stream_chunk') {
        const sessionId =
          typeof payload.sessionId === 'string' ? payload.sessionId : '';
        const buffer = typeof payload.buffer === 'string' ? payload.buffer : '';
        const seqNumber =
          typeof payload.seq === 'number' ? payload.seq : Number(payload.seq);
        const seq =
          Number.isFinite(seqNumber) && seqNumber > 0 ? seqNumber : 0;
        const streamState = audioStreamRef.current.get(sessionId);

        if (!sessionId || !buffer || !streamState || seq === 0) {
          return true;
        }

        streamState.pendingBySeq.set(seq, buffer);
        consumeStreamChunks(sessionId);
        return true;
      }

      if (data.type === 'audio_stream_end') {
        const sessionId =
          typeof payload.sessionId === 'string' ? payload.sessionId : '';
        if (!sessionId) {
          return true;
        }

        consumeStreamChunks(sessionId);
        flushStreamAudio(sessionId, true);

        const streamState = audioStreamRef.current.get(sessionId);
        if (streamState?.conversationId) {
          playedConversationRef.current.add(streamState.conversationId);
          trimConversationSet(playedConversationRef.current);
        }

        audioStreamRef.current.delete(sessionId);
        return true;
      }

      return false;
    },
    [consumeStreamChunks, enqueueBase64Audio, flushStreamAudio],
  );

  useEffect(() => {
    const tempAudioFiles = tempAudioFilesRef.current;
    const playedConversations = playedConversationRef.current;
    const streamConversations = streamConversationRef.current;
    const audioStreamStates = audioStreamRef.current;
    return () => {
      tempAudioFiles.forEach(path => {
        RNBlobUtil.fs.unlink(path).catch(() => {
          // 卸载时忽略清理失败
        });
      });
      tempAudioFilesRef.current = [];
      audioQueueRef.current = [];
      isAudioPlayingRef.current = false;
      playedConversations.clear();
      streamConversations.clear();
      audioStreamStates.clear();
    };
  }, []);

  return {
    playUri,
    finalizeCurrentAudio,
    handleAudioMessage,
  };
}
