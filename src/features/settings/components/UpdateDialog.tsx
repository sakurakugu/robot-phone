import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import {
    downloadAndInstallApk,
    formatFileSize,
    type UpdateCheckResult,
    versionCodeToRaw,
    versionCodeToSemver,
} from '../services/updateService';

type Props = {
  visible: boolean;
  updateInfo: UpdateCheckResult | null;
  onClose: () => void;
};

export function UpdateDialog({ visible, updateInfo, onClose }: Props) {
  const palette = usePalette();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0); // 0~1
  const [error, setError] = useState<string | null>(null);
  const [showRawVersionCode, setShowRawVersionCode] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  // 关闭时重置状态
  useEffect(() => {
    if (!visible) {
      setDownloading(false);
      setProgress(0);
      setError(null);
      setShowRawVersionCode(false);
    }
  }, [visible]);

  const handleDownload = useCallback(async () => {
    if (!updateInfo?.downloadId || !updateInfo.latestVersionCode) return;
    setDownloading(true);
    setProgress(0);
    setError(null);

    try {
      const { promise, cancel } = downloadAndInstallApk(
        updateInfo.downloadId,
        updateInfo.latestVersionCode,
        (received, total) => {
          if (total > 0) {
            setProgress(received / total);
          }
        },
      );
      cancelRef.current = cancel;
      await promise;
      // 安装 Intent 已触发，关闭弹窗
      onClose();
    } catch (e: any) {
      setError(e.message || '下载失败');
    } finally {
      setDownloading(false);
      cancelRef.current = null;
    }
  }, [updateInfo, onClose]);

  const handleCancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
    }
    onClose();
  }, [onClose]);

  if (!updateInfo) return null;

  const progressPercent = Math.round(progress * 100);
  const versionText = updateInfo.latestVersionCode
    ? showRawVersionCode
      ? versionCodeToRaw(updateInfo.latestVersionCode)
      : updateInfo.latestDisplayVersion ||
        versionCodeToSemver(updateInfo.latestVersionCode)
    : updateInfo.latestVersion || '-';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: palette.surface }]}>
          {/* 标题 */}
          <Text style={[styles.title, { color: palette.text }]}>
            发现新版本
          </Text>

          {/* 版本信息 */}
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: palette.textMuted }]}>
              最新版本
            </Text>
            <View style={styles.versionRight}>
              <Pressable onPress={() => setShowRawVersionCode(prev => !prev)}>
                <Text style={[styles.versionValue, { color: palette.text }]}>
                  {versionText}
                </Text>
              </Pressable>
              {updateInfo.channel === 'beta' && (
                <View
                  style={[
                    styles.betaBadge,
                    { backgroundColor: palette.primary },
                  ]}
                >
                  <Text style={styles.betaBadgeText}>测试版</Text>
                </View>
              )}
            </View>
          </View>

          {updateInfo.fileSize && (
            <Text style={[styles.sizeText, { color: palette.textMuted }]}>
              大小: {formatFileSize(updateInfo.fileSize)}
            </Text>
          )}

          {/* 更新日志 */}
          {updateInfo.changelog ? (
            <ScrollView style={styles.changelogContainer} nestedScrollEnabled>
              <Text style={[styles.changelogTitle, { color: palette.text }]}>
                更新内容
              </Text>
              <Text
                style={[styles.changelogText, { color: palette.textMuted }]}
              >
                {updateInfo.changelog}
              </Text>
            </ScrollView>
          ) : null}

          {/* 下载进度 */}
          {downloading && (
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBg, { backgroundColor: palette.border }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: palette.primary,
                      width: `${progressPercent}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: palette.textMuted }]}>
                {progressPercent}%
              </Text>
            </View>
          )}

          {/* 错误 */}
          {error && (
            <Text style={[styles.errorText, { color: '#e53935' }]}>
              {error}
            </Text>
          )}

          {/* 按钮 */}
          <View style={styles.buttons}>
            <Pressable
              style={[
                styles.btn,
                styles.btnSecondary,
                { borderColor: palette.border },
              ]}
              onPress={handleCancel}
            >
              <Text style={[styles.btnText, { color: palette.textMuted }]}>
                {downloading ? '取消' : '稍后更新'}
              </Text>
            </Pressable>

            {!downloading ? (
              <Pressable
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { backgroundColor: palette.primary },
                ]}
                onPress={handleDownload}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>
                  立即更新
                </Text>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { backgroundColor: palette.primary, opacity: 0.7 },
                ]}
              >
                <ActivityIndicator size="small" color="#fff" />
                <Text
                  style={[styles.btnText, { color: '#fff', marginLeft: 6 }]}
                >
                  下载中...
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 14,
  },
  versionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  versionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  betaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  sizeText: {
    fontSize: 12,
    marginBottom: 12,
  },
  changelogContainer: {
    maxHeight: 160,
    marginBottom: 12,
  },
  changelogTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  changelogText: {
    fontSize: 13,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnPrimary: {},
  btnSecondary: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
