import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
// import Video, { VideoRef } from 'react-native-video';

type Props = {
  /** 机器狗 IP，如 192.168.234.1，端口与路径固定为 :8554/test */
  robotIp: string;
};

/** RTSP 视频流播放器，直连机器狗本体摄像头。
 *  Android：优先使用 VLC，避免 ExoPlayer 的运行时校验异常。
 *  iOS：AVPlayer 不支持 RTSP，暂不可用。
 */
export function RtspVideoPlayer({ robotIp }: Props) {
  // const videoRef = useRef<VideoRef>(null);
  const [error, setError] = useState<string | null>(null);
  // 用 key 强制重新挂载播放器组件以实现重试
  const [retryKey, setRetryKey] = useState(0);

  /** 构造 RTSP 地址 */
  const rtspUrl = `rtsp://${robotIp}:8554/test`;

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryKey(k => k + 1);
  }, []);

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
        <Pressable onPress={handleRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>重新连接</Text>
        </Pressable>
      </View>
    );
  }

  return (
    // <Video
    //   ref={videoRef}
    //   source={{ uri: rtspUrl }}
    //   style={styles.video}
    //   resizeMode="contain"
    //   /* 低延迟配置 */
    //   bufferConfig={{
    //     minBufferMs: 500,
    //     maxBufferMs: 1000,
    //     bufferForPlaybackMs: 200,
    //     bufferForPlaybackAfterRebufferMs: 500,
    //   }}
    //   /* 自动播放、循环、无音频 */
    //   muted
    //   repeat
    //   /* 事件回调 */
    //   onError={e =>
    //     setError(
    //       e.error?.localizedDescription ?? e.error?.errorString ?? '未知错误',
    //     )
    //   }
    //   onLoad={() => setError(null)}
    // />
    <View style={styles.videoContainer}>
      <VLCPlayer
        key={retryKey}
        autoplay
        muted
        repeat
        resizeMode="contain"
        source={{
          uri: rtspUrl,
          initType: 2,
          initOptions: [
            '--rtsp-tcp',
            '--network-caching=120',
            '--avcodec-hw=none',
          ],
        }}
        style={styles.video}
        onError={e => {
          const raw =
            typeof e === 'string'
              ? e
              : ((e as { message?: string })?.message ?? JSON.stringify(e));
          setError(`VLC 播放失败：${raw}`);
        }}
        onLoad={() => setError(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
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
  retryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#DCE7FF',
    fontSize: 13,
    fontWeight: '600',
  },
});
