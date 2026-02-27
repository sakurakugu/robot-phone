import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
    MediaStream,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCView,
} from 'react-native-webrtc';

type Props = {
  /** WHEP 服务端点，例如 http://192.168.1.1:8889/test/whep */
  whepUrl: string;
};

type State = 'connecting' | 'playing' | 'error';

/**
 * WHEP（WebRTC-HTTP Egress Protocol）视频播放器。
 *
 * mediamtx 在 RTSP 之外默认同时开启 WebRTC/WHEP 服务（端口 8889），
 * 本组件直接向机器狗发起 WHEP 握手，通过 WebRTC 接收 H.264 视频流，
 * 无需经过任何云端服务器，延迟比 RTSP/VLC 更低。
 *
 * 握手流程：
 * 1. 创建 RTCPeerConnection，添加 recvonly 方向的 video/audio transceiver
 * 2. createOffer → setLocalDescription
 * 3. 等待 ICE 候选收集完成（局域网内通常极快）
 * 4. POST localDescription.sdp 到 whepUrl（Content-Type: application/sdp）
 * 5. 将响应 SDP 设为 remoteDescription
 * 6. ontrack 事件触发后渲染视频
 */
export function WhepVideoPlayer({ whepUrl }: Props) {
  const [streamURL, setStreamURL] = useState<string | null>(null);
  const [state, setState] = useState<State>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      streamRef.current = null;
    };

    const connect = async () => {
      cleanup();
      setState('connecting');
      setStreamURL(null);
      setErrorMsg('');

      try {
        const pc = new RTCPeerConnection({
          iceServers: [], // 仅局域网直连，不需要 STUN/TURN
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
        });
        pcRef.current = pc;

        // 监听远端轨道
        pc.ontrack = event => {
          if (cancelled) return;
          // event.streams[0] 含有所有轨道
          const remoteStream = event.streams?.[0];
          if (remoteStream) {
            streamRef.current = remoteStream;
            setStreamURL(remoteStream.toURL());
            setState('playing');
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (cancelled) return;
          const s = pc.iceConnectionState;
          if (s === 'failed' || s === 'disconnected' || s === 'closed') {
            if (!cancelled) {
              setState('error');
              setErrorMsg(`ICE 连接断开（${s}），请重试`);
            }
          }
        };

        // 添加仅接收的 transceiver（告知对端我们只接收视频/音频）
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        // 创建 SDP Offer
        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);

        // 等待 ICE 候选收集完成（局域网通常 < 1s，超时 5s 后直接发送）
        await waitForIceGathering(pc, 5000);

        if (cancelled) return;

        const localSdp = pc.localDescription?.sdp;
        if (!localSdp) throw new Error('无法获取本地 SDP');

        // 向 mediamtx WHEP 端点发送 Offer
        const resp = await fetch(whepUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: localSdp,
        });

        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          throw new Error(
            `WHEP 握手失败: HTTP ${resp.status}${body ? ' – ' + body : ''}`,
          );
        }

        const answerSdp = await resp.text();
        if (cancelled) return;

        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
        );
      } catch (e: any) {
        if (!cancelled) {
          setState('error');
          setErrorMsg(e?.message ?? String(e));
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [whepUrl, retryKey]);

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>WebRTC 连接失败</Text>
        <Text style={styles.errorDetail}>{errorMsg}</Text>
        <Text style={styles.url}>{whepUrl}</Text>
        <Pressable
          onPress={() => setRetryKey(k => k + 1)}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>重新连接</Text>
        </Pressable>
      </View>
    );
  }

  if (!streamURL || state === 'connecting') {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          {state === 'connecting' ? '正在建立 WebRTC 连接...' : '等待视频流...'}
        </Text>
        <Text style={styles.url}>{whepUrl}</Text>
      </View>
    );
  }

  return (
    <RTCView
      streamURL={streamURL}
      style={styles.video}
      objectFit="contain"
      mirror={false}
      zOrder={0}
    />
  );
}

// ─── 等待 ICE 候选收集完成 ──────────────────────────────────────────────────
function waitForIceGathering(
  pc: RTCPeerConnection,
  timeoutMs: number,
): Promise<void> {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        (pc as any).removeEventListener?.(
          'icegatheringstatechange',
          onStateChange,
        );
        resolve();
      }
    };
    (pc as any).addEventListener?.('icegatheringstatechange', onStateChange);
  });
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
