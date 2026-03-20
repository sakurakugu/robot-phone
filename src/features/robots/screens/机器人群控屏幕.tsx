import { pick } from '@react-native-documents/picker';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { usePalette } from '../../../app/theme/palette';
import { Screen } from '../../../shared/ui/Screen';
import { ServerProjectListModal } from '../../choreo/components/ServerProjectListModal';
import {
  deleteProject,
  getProjectIndex,
  importProject,
} from '../../choreo/services/choreoStorage';
import type { LocalProjectEntry } from '../../choreo/types';

const groupControls = [
  {
    id: 'x2',
    title: 'X2 机器人群控',
    desc: '适用于 X2 机型的多机协同控制 (未测试)',
    route: 'X2 机器人控制',
  },
  {
    id: 'd1',
    title: 'D1 机器狗群控',
    desc: '适用于 D1 机型的编队与统一调度',
    route: 'D1 机器狗群控',
  },
];

export function RobotGroupControlScreen() {
  const palette = usePalette();
  const navigation = useNavigation<any>();
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [localProjects, setLocalProjects] = useState<LocalProjectEntry[]>([]);

  const loadLocalProjects = useCallback(async () => {
    const index = await getProjectIndex();
    setLocalProjects(index);
  }, []);

  useEffect(() => {
    loadLocalProjects();
  }, [loadLocalProjects]);

  // 从本地导入 .hhzip
  const handleImportLocal = useCallback(async () => {
    try {
      const [result] = await pick({
        type: ['application/zip', 'application/octet-stream'],
      });
      if (!result?.uri) return;

      // 拷贝到缓存目录（document picker 返回的 uri 可能是临时的）
      const cachePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/import_${Date.now()}.hhzip`;
      await ReactNativeBlobUtil.fs.cp(result.uri, cachePath);

      await importProject(cachePath);
      await ReactNativeBlobUtil.fs.unlink(cachePath).catch(() => {});
      await loadLocalProjects();
    } catch (e: any) {
      if (e?.code === 'DOCUMENT_PICKER_CANCELED') return;
      Alert.alert('导入失败', e.message || '未知错误');
    }
  }, [loadLocalProjects]);

  // + 按钮操作
  const handleAdd = useCallback(() => {
    const options = ['从服务器下载', '导入工程文件', '取消'];
    const cancelIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        idx => {
          if (idx === 0) setServerModalVisible(true);
          else if (idx === 1) handleImportLocal();
        },
      );
    } else {
      // Android 用 Alert 模拟
      Alert.alert('添加舞蹈工程', undefined, [
        { text: '从服务器下载', onPress: () => setServerModalVisible(true) },
        { text: '导入工程文件', onPress: handleImportLocal },
        { text: '取消', style: 'cancel' },
      ]);
    }
  }, [handleImportLocal]);

  // 长按进入播放页
  const handleLongPress = useCallback(
    (project: LocalProjectEntry) => {
      navigation.navigate('舞蹈播放', { projectUuid: project.uuid });
    },
    [navigation],
  );

  // 删除工程
  const handleDelete = useCallback(
    (project: LocalProjectEntry) => {
      Alert.alert('删除工程', `确定删除「${project.name}」？`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.uuid);
            await loadLocalProjects();
          },
        },
      ]);
    },
    [loadLocalProjects],
  );

  return (
    <Screen palette={palette} subtitle="选择群控类型" unsafeTop={true}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 群控类型卡片 */}
        <View style={styles.section}>
          {groupControls.map(item => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed
                    ? palette.surface + 'cc'
                    : palette.surface,
                  borderColor: palette.border,
                  opacity: item.route ? 1 : 0.5,
                },
              ]}
              onPress={() => item.route && navigation.navigate(item.route)}
              disabled={!item.route}
            >
              <Text style={[styles.title, { color: palette.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.desc, { color: palette.textMuted }]}>
                {item.desc}
              </Text>
              {!item.route && (
                <Text style={[styles.coming, { color: palette.textMuted }]}>
                  即将推出
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* 舞蹈工程列表 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>
              舞蹈工程
            </Text>
            <Pressable onPress={handleAdd} hitSlop={8} style={styles.addBtn}>
              <Text style={[styles.addBtnText, { color: palette.primary }]}>
                ＋
              </Text>
            </Pressable>
          </View>
          {localProjects.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: palette.border }]}>
              <Text
                style={[
                  styles.desc,
                  styles.centerText,
                  { color: palette.textMuted },
                ]}
              >
                暂无工程，点击右侧 ＋ 添加
              </Text>
            </View>
          ) : (
            localProjects.map(project => (
              <Pressable
                key={project.uuid}
                style={({ pressed }) => [
                  styles.card,
                  styles.projectRow,
                  {
                    backgroundColor: pressed
                      ? palette.surface + 'cc'
                      : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
                onPress={() => handleLongPress(project)}
                onLongPress={() => handleDelete(project)}
              >
                <View style={styles.projectInfo}>
                  <Text
                    style={[styles.title, { color: palette.text }]}
                    numberOfLines={1}
                  >
                    {project.name}
                  </Text>
                  {project.description ? (
                    <Text
                      style={[styles.desc, { color: palette.textMuted }]}
                      numberOfLines={1}
                    >
                      {project.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.desc, { color: palette.textMuted }]}>
                    {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                  </Text>
                </View>
                <Text style={[styles.arrow, { color: palette.textMuted }]}>
                  ›
                </Text>
              </Pressable>
            ))
          )}
          {localProjects.length > 0 && (
            <Text
              style={[
                styles.desc,
                styles.centerText,
                { color: palette.textMuted },
              ]}
            >
              点击进入播放 · 长按删除
            </Text>
          )}
        </View>
      </ScrollView>

      <ServerProjectListModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
        onImported={loadLocalProjects}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  desc: {
    fontSize: 12,
    marginTop: 4,
  },
  centerText: {
    textAlign: 'center',
  },
  coming: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  addBtn: {
    paddingHorizontal: 8,
  },
  addBtnText: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
    marginRight: 8,
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
  arrow: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
