import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Video, { VideoRef } from 'react-native-video';

type Props = {
  /** 机器狗 IP，如 192.168.234.1，端口与路径固定为 :8554/test */
  robotIp: string;
};

/** RTSP 视频流播放器，直连机器狗本体摄像头。
 *  Android：基于 ExoPlayer，原生支持 RTSP。
 *  iOS：AVPlayer 不支持 RTSP，暂不可用。
 */
export function RtspVideoPlayer({ robotIp }: Props) {
  const videoRef = useRef<VideoRef>(null);
  const [error, setError] = useState<string | null>(null);

  /** 构造 RTSP 地址，强制使用 TCP 传输以降低延迟 */
  const rtspUrl = `rtsp://${robotIp}:8554/test`;

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>iOS 暂不支持 RTSP 直连，请使用安卓设备</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>视频流连接失败</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <Text style={styles.url}>{rtspUrl}</Text>
      </View>
    );
  }

  return (
    <Video
      ref={videoRef}
      source={{ uri: rtspUrl }}
      style={styles.video}
      resizeMode="contain"
      /* 低延迟配置 */
      bufferConfig={{
        minBufferMs: 500,
        maxBufferMs: 1000,
        bufferForPlaybackMs: 200,
        bufferForPlaybackAfterRebufferMs: 500,
      }}
      /* 自动播放、循环、无音频 */
      muted
      repeat
      /* 事件回调 */
      onError={e =>
        setError(
          e.error?.localizedDescription ?? e.error?.errorString ?? '未知错误',
        )
      }
      onLoad={() => setError(null)}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  hint: {
    color: '#8FA2C7',
    fontSize: 14,
    textAlign: 'center',
  },
  errorDetail: {
    color: '#FF8A8A',
    fontSize: 12,
    textAlign: 'center',
  },
  url: {
    color: '#4A5568',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
