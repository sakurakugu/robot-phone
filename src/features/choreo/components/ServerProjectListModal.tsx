/**
 * 服务器工程选择弹窗
 * 列出服务器上的编舞工程，支持下载/更新到本地
 */

import React, { useCallback, useEffect, useState } from 'react';
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
    cleanupZipCache,
    downloadProjectZip,
    fetchServerProjects,
} from '../api';
import { getProjectIndex, importProject } from '../services/choreoStorage';
import type { ChoreoProject, LocalProjectEntry } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
};

export function ServerProjectListModal({
  visible,
  onClose,
  onImported,
}: Props) {
  const palette = usePalette();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ChoreoProject[]>([]);
  const [localIndex, setLocalIndex] = useState<LocalProjectEntry[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [serverList, localList] = await Promise.all([
        fetchServerProjects(),
        getProjectIndex(),
      ]);
      setProjects(serverList);
      setLocalIndex(localList);
    } catch (e: any) {
      setError(e.message || '获取工程列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleDownload = useCallback(
    async (project: ChoreoProject) => {
      if (downloadingId) return;
      setDownloadingId(project.uuid);
      setProgress(0);

      try {
        const zipPath = await downloadProjectZip(
          project.uuid,
          (received, total) => {
            if (total > 0) {
              setProgress(Math.round((received / total) * 100));
            }
          },
        );

        await importProject(zipPath, project.uuid);
        await cleanupZipCache(zipPath);

        // 刷新本地索引
        const newIndex = await getProjectIndex();
        setLocalIndex(newIndex);
        onImported();
      } catch (e: any) {
        setError(e.message || '下载失败');
      } finally {
        setDownloadingId(null);
        setProgress(0);
      }
    },
    [downloadingId, onImported],
  );

  const isLocal = (uuid: string) =>
    localIndex.some(e => e.serverUuid === uuid || e.uuid === uuid);

  const hasUpdate = (project: ChoreoProject) => {
    const local = localIndex.find(
      e => e.serverUuid === project.uuid || e.uuid === project.uuid,
    );
    if (!local) return false;
    return new Date(project.updated_at) > new Date(local.updatedAt);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[styles.container, { backgroundColor: palette.background }]}
        >
          {/* 头部 */}
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <Text style={[styles.headerTitle, { color: palette.text }]}>
              服务器工程
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.closeBtn, { color: palette.textMuted }]}>
                关闭
              </Text>
            </Pressable>
          </View>

          {/* 内容 */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={palette.primary} />
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                加载中...
              </Text>
            </View>
          ) : error && projects.length === 0 ? (
            <View style={styles.center}>
              <Text style={[styles.errorText, { color: palette.danger }]}>
                {error}
              </Text>
              <Pressable
                onPress={loadData}
                style={[styles.retryBtn, { borderColor: palette.primary }]}
              >
                <Text style={{ color: palette.primary }}>重试</Text>
              </Pressable>
            </View>
          ) : projects.length === 0 ? (
            <View style={styles.center}>
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                服务器暂无工程
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
            >
              {error ? (
                <Text style={[styles.inlineError, { color: palette.danger }]}>
                  {error}
                </Text>
              ) : null}
              {projects.map(project => {
                const isDownloading = downloadingId === project.uuid;
                const local = isLocal(project.uuid);
                const needsUpdate = hasUpdate(project);

                return (
                  <Pressable
                    key={project.uuid}
                    style={[
                      styles.projectCard,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.surface,
                      },
                    ]}
                    onPress={() => handleDownload(project)}
                    disabled={!!downloadingId || (local && !needsUpdate)}
                  >
                    <View style={styles.projectInfo}>
                      <Text
                        style={[styles.projectName, { color: palette.text }]}
                        numberOfLines={1}
                      >
                        {project.name}
                      </Text>
                      {project.description ? (
                        <Text
                          style={[
                            styles.projectDesc,
                            { color: palette.textMuted },
                          ]}
                          numberOfLines={2}
                        >
                          {project.description}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.projectDate,
                          { color: palette.textMuted },
                        ]}
                      >
                        {new Date(project.updated_at).toLocaleDateString(
                          'zh-CN',
                        )}
                      </Text>
                    </View>

                    <View style={styles.projectAction}>
                      {isDownloading ? (
                        <View style={styles.downloadingWrap}>
                          <ActivityIndicator
                            size="small"
                            color={palette.primary}
                          />
                          <Text
                            style={[
                              styles.progressText,
                              { color: palette.primary },
                            ]}
                          >
                            {progress}%
                          </Text>
                        </View>
                      ) : local && !needsUpdate ? (
                        <Text
                          style={[
                            styles.statusText,
                            { color: palette.success },
                          ]}
                        >
                          已下载
                        </Text>
                      ) : needsUpdate ? (
                        <Text
                          style={[
                            styles.statusText,
                            { color: palette.warning },
                          ]}
                        >
                          更新
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.statusText,
                            { color: palette.primary },
                          ]}
                        >
                          下载
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  hint: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  inlineError: {
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  projectCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
  },
  projectDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  projectDate: {
    fontSize: 11,
    marginTop: 4,
  },
  projectAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  downloadingWrap: {
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
