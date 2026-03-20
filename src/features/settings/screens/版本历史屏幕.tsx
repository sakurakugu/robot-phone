import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { usePalette } from '../../../app/theme/palette';
import { Toast } from '../../../shared/ui/Toast';
import {
    downloadAndInstallApk,
    fetchVersions,
    formatFileSize,
    versionCodeToRaw,
    versionCodeToSemver,
    type AppVersionInfo,
    type ReleaseChannel,
} from '../services/updateService';

type FilterTab = 'all' | 'stable' | 'beta';

export function VersionHistoryScreen() {
  const palette = usePalette();
  const [versions, setVersions] = useState<AppVersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [showRawMap, setShowRawMap] = useState<Record<number, boolean>>({});
  const themedStyles = useMemo(
    () => ({
      card: { backgroundColor: palette.surface, borderColor: palette.border },
      versionName: { color: palette.text },
      channelBadgeStable: { backgroundColor: palette.primary },
      activeBadge: { backgroundColor: '#4caf50' },
      metaText: { color: palette.textMuted },
      progressBg: { backgroundColor: palette.border },
      progressFill: { backgroundColor: palette.primary },
      installBtn: { backgroundColor: palette.primary },
      tabActive: { backgroundColor: palette.primary },
      tabInactive: { backgroundColor: palette.surfaceAlt },
      tabTextActive: { color: '#fff' },
      tabTextInactive: { color: palette.text },
      container: { backgroundColor: palette.background },
      emptyText: { color: palette.textMuted },
      loadingColor: palette.primary,
    }),
    [palette],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ch = filter === 'all' ? undefined : (filter as ReleaseChannel);
      const list = await fetchVersions(ch);
      setVersions(list);
    } catch (e: any) {
      Toast.show(e.message || '加载失败', Toast.SHORT);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInstall = useCallback(async (item: AppVersionInfo) => {
    setDownloadingId(item.id);
    setProgress(0);
    try {
      const { promise } = downloadAndInstallApk(
        item.id,
        item.versionCode,
        (received, total) => {
          if (total > 0) setProgress(received / total);
        },
      );
      await promise;
      Toast.show('安装包已下载，正在打开安装界面', Toast.SHORT);
    } catch (e: any) {
      Toast.show(e.message || '下载失败', Toast.SHORT);
    } finally {
      setDownloadingId(null);
      setProgress(0);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AppVersionInfo }) => {
      const isDownloading = downloadingId === item.id;
      const progressPercent = Math.round(progress * 100);
      const showRaw = !!showRawMap[item.id];
      const displayVersion = showRaw
        ? versionCodeToRaw(item.versionCode)
        : versionCodeToSemver(item.versionCode);
      return (
        <View
          style={[styles.card, themedStyles.card]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.versionRow}>
              <Pressable
                onPress={() => {
                  setShowRawMap(prev => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }));
                }}
              >
                <Text style={[styles.versionName, themedStyles.versionName]}>
                  v{displayVersion}
                </Text>
              </Pressable>
              <View
                style={[
                  styles.channelBadge,
                  item.channel === 'beta'
                    ? styles.channelBadgeBeta
                    : themedStyles.channelBadgeStable,
                ]}
              >
                <Text style={styles.channelText}>
                  {item.channel === 'beta' ? '测试版' : '稳定版'}
                </Text>
              </View>
              {item.isActive && (
                <View style={[styles.activeBadge, themedStyles.activeBadge]}>
                  <Text style={styles.channelText}>当前</Text>
                </View>
              )}
            </View>
            <Text style={[styles.meta, themedStyles.metaText]}>
              版本号 {item.versionCode} · {formatFileSize(item.fileSize)} ·{' '}
              {new Date(item.uploadedAt).toLocaleDateString('zh-CN')}
            </Text>
          </View>

          {item.changelog ? (
            <Text
              style={[styles.changelog, themedStyles.metaText]}
              numberOfLines={3}
            >
              {item.changelog}
            </Text>
          ) : null}

          {/* 下载/安装按钮 */}
          <View style={styles.cardFooter}>
            {isDownloading ? (
              <View style={styles.progressRow}>
                <View
                  style={[styles.progressBg, themedStyles.progressBg]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      themedStyles.progressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.progressText, themedStyles.metaText]}
                >
                  {progressPercent}%
                </Text>
              </View>
            ) : (
              <Pressable
                style={[styles.installBtn, themedStyles.installBtn]}
                onPress={() => handleInstall(item)}
                disabled={downloadingId !== null}
              >
                <Text style={styles.installBtnText}>下载安装</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [themedStyles, downloadingId, progress, handleInstall, showRawMap],
  );

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'stable', label: '稳定版' },
    { key: 'beta', label: '测试版' },
  ];

  return (
    <View style={[styles.container, themedStyles.container]}>
      {/* 过滤标签 */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              filter === tab.key ? themedStyles.tabActive : themedStyles.tabInactive,
            ]}
            onPress={() => setFilter(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                filter === tab.key
                  ? themedStyles.tabTextActive
                  : themedStyles.tabTextInactive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themedStyles.loadingColor} />
        </View>
      ) : versions.length === 0 ? (
        <View style={styles.center}>
          <Text style={themedStyles.emptyText}>暂无版本记录</Text>
        </View>
      ) : (
        <FlatList
          data={versions}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    marginBottom: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '700',
  },
  channelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  channelBadgeBeta: {
    backgroundColor: '#ff9800',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  channelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
  },
  changelog: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  installBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  installBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
