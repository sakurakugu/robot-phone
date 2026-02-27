import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
import { WhepVideoPlayer } from './WhepVideoPlayer';

type Props = {
  /** 机器狗 IP，如 192.168.234.1
   *  - WebRTC/WHEP 端口固定为 8889（mediamtx 默认）
   *  - RTSP 备选端口为 8554
   */
  robotIp: string;
};

/** 视频播放器，直连机器狗本体摄像头。
 *
 *  主方案：WebRTC/WHEP（Android + iOS 均支持，低延迟）
 *    机器狗运行 mediamtx，自动将 RTSP 流转换为 WebRTC，
 *    WHEP 端点：http://<robotIp>:8889/test/whep
 *
 *  备用方案：RTSP + VLC（仅 Android，点击"切换 RTSP"启用）
 */
export function RtspVideoPlayer({ robotIp }: Props) {
  /** true = WebRTC/WHEP（默认），false = RTSP/VLC（备用） */
  const [useWebRtc, setUseWebRtc] = useState(true);
  const [rtspError, setRtspError] = useState<string | null>(null);
  const [rtspRetryKey, setRtspRetryKey] = useState(0);

  /** WHEP 端点（mediamtx 默认端口 8889） */
  const whepUrl = `http://${robotIp}:8889/test/whep`;
  /** 备用 RTSP 地址 */
  const rtspUrl = `rtsp://${robotIp}:8554/test`;

  // ── 切换按钮（浮于右下角）──────────────────────────────────────────────
  const toggleBtn = (
    <View style={styles.toggleContainer} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          setUseWebRtc(v => !v);
          setRtspError(null);
        }}
        style={styles.toggleBtn}
      >
        <Text style={styles.toggleText}>
          切换至 {useWebRtc ? 'RTSP' : 'WebRTC'}
        </Text>
      </Pressable>
    </View>
  );

  // ── WebRTC/WHEP 主方案 ─────────────────────────────────────────────────
  if (useWebRtc) {
    return (
      <View style={styles.container}>
        <WhepVideoPlayer whepUrl={whepUrl} />
        {toggleBtn}
      </View>
    );
  }

  // ── RTSP/VLC 备用方案（仅 Android）────────────────────────────────────
  if (rtspError) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.hint}>视频流连接失败</Text>
          <Text style={styles.errorDetail}>{rtspError}</Text>
          <Text style={styles.url}>{rtspUrl}</Text>
          <Pressable
            onPress={() => {
              setRtspError(null);
              setRtspRetryKey(k => k + 1);
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>重新连接</Text>
          </Pressable>
        </View>
        {toggleBtn}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VLCPlayer
          key={rtspRetryKey}
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
            setRtspError(`VLC 播放失败：${raw}`);
          }}
          onLoad={() => setRtspError(null)}
        />
      </View>
      {toggleBtn}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
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
  // ── 切换方案按钮（右下角浮层）
  toggleContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  toggleBtn: {
    backgroundColor: 'rgba(23,33,52,0.75)',
    borderWidth: 1,
    borderColor: '#41506F',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleText: {
    color: '#8FA2C7',
    fontSize: 11,
  },
});
