/**
 * useAudioRecorder
 *
 * 封装手机端麦克风实时录音逻辑。
 * 使用 react-native-live-audio-stream 采集 PCM 16kHz 单声道音频，
 * 通过 WebSocket 音频上传通道流式发送到后端进行 ASR 识别。
 *
 * TODO: 后续将 PCM 替换为 Opus 编码以减少带宽
 */

import { useCallback, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import LiveAudioStream from 'react-native-live-audio-stream';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const FRAME_DURATION_MS = 20;
// bufferSize = sampleRate * channels * (bitsPerSample/8) * (frameDuration/1000)
// 16000 * 1 * 2 * 0.1 = 3200 字节（100ms 一帧，比 20ms 更稳定）
const BUFFER_SIZE = 3200;

type AudioSendMethods = {
  sendAudioStart: (sessionId: string, sampleRate?: number, channels?: number, frameDurationMs?: number) => void;
  sendAudioChunk: (sessionId: string, seq: number, buffer: string, frameDurationMs?: number) => void;
  sendAudioEnd: (sessionId: string, reason?: string) => void;
  isAudioUploadConnected: boolean;
};

export type UseAudioRecorderResult = {
  /** 当前是否正在录音 */
  isRecording: boolean;
  /** 开始录音（按住时调用） */
  startRecording: () => Promise<void>;
  /** 停止录音（松开时调用） */
  stopRecording: () => void;
};

/** 生成简易唯一 ID */
function generateSessionId(): string {
  return `phone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 请求麦克风权限（Android） */
async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: '麦克风权限',
      message: '需要麦克风权限来录制语音并发送给大模型',
      buttonPositive: '允许',
      buttonNegative: '拒绝',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function useAudioRecorder(audio: AudioSendMethods): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const sessionIdRef = useRef<string>('');
  const seqRef = useRef(0);
  const listenerRef = useRef<any>(null);
  const recordingRef = useRef(false);

  const startRecording = useCallback(async () => {
    if (recordingRef.current) return;

    // 检查音频通道连接状态
    if (!audio.isAudioUploadConnected) {
      Alert.alert('连接未就绪', '音频上传通道未连接，请检查网络或服务器状态');
      return;
    }

    // 请求权限
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      Alert.alert('权限被拒绝', '无法使用麦克风，请在系统设置中允许麦克风权限');
      return;
    }

    try {
      // 初始化录音参数
      LiveAudioStream.init({
        sampleRate: SAMPLE_RATE,
        channels: CHANNELS,
        bitsPerSample: BITS_PER_SAMPLE,
        audioSource: 6, // VOICE_RECOGNITION，适合语音识别
        wavFile: '', // 不保存到文件
        bufferSize: BUFFER_SIZE,
      });

      const sessionId = generateSessionId();
      sessionIdRef.current = sessionId;
      seqRef.current = 0;
      recordingRef.current = true;
      setIsRecording(true);

      // 发送音频开始消息
      audio.sendAudioStart(sessionId, SAMPLE_RATE, CHANNELS, FRAME_DURATION_MS);

      // 监听音频数据流
      listenerRef.current = LiveAudioStream.on('data', (base64Data: string) => {
        if (!recordingRef.current) return;
        const seq = seqRef.current++;
        audio.sendAudioChunk(sessionId, seq, base64Data, FRAME_DURATION_MS);
      });

      LiveAudioStream.start();
    } catch (e: any) {
      recordingRef.current = false;
      setIsRecording(false);
      Alert.alert('录音失败', e.message || '未检测到麦克风或录音初始化失败');
    }
  }, [audio]);

  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);

    try {
      LiveAudioStream.stop();
    } catch { /* 忽略停止错误 */ }

    // 发送音频结束消息
    if (sessionIdRef.current) {
      audio.sendAudioEnd(sessionIdRef.current, 'manual');
      sessionIdRef.current = '';
    }

    // 清除监听器
    listenerRef.current = null;
    seqRef.current = 0;
  }, [audio]);

  return { isRecording, startRecording, stopRecording };
}
