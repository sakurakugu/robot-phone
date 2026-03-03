import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WhepVideoPlayer } from './WhepVideoPlayer';

type Props = {
  /** 机器狗 IP，如 192.168.234.1
   *  - WebRTC/WHEP 端口固定为 8889（mediamtx 默认）
   */
  robotIp: string;
};

/** 视频播放器，直连机器狗本体摄像头。
 *
 *  方案：WebRTC/WHEP（Android + iOS 均支持，低延迟）
 *    机器狗运行 mediamtx，自动将 RTSP 流转换为 WebRTC，
 *    WHEP 端点：http://<robotIp>:8889/test/whep
 */
export function RtspVideoPlayer({ robotIp }: Props) {
  /** WHEP 端点（mediamtx 默认端口 8889） */
  const whepUrl = `http://${robotIp}:8889/test/whep`;

  return (
    <View style={styles.container}>
      <WhepVideoPlayer whepUrl={whepUrl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
});

