/**
 * 本地编舞工程存储管理
 * 管理 .hhzip 解压后的工程文件，维护索引缓存
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { unzip } from 'react-native-zip-archive';
import type {
    ChoreoProject,
    ChoreoRobot,
    LocalProjectEntry,
    TimelineData,
} from '../types';

const PROJECTS_DIR = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ChoreoProjects`;
const INDEX_KEY = '@choreo:project_index';

// 确保工程目录存在
async function ensureDir(dir: string): Promise<void> {
  const exists = await ReactNativeBlobUtil.fs.isDir(dir);
  if (!exists) {
    await ReactNativeBlobUtil.fs.mkdir(dir);
  }
}

/**
 * 获取本地工程索引
 */
export async function getProjectIndex(): Promise<LocalProjectEntry[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalProjectEntry[];
  } catch {
    return [];
  }
}

/**
 * 保存工程索引
 */
async function saveProjectIndex(entries: LocalProjectEntry[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

/**
 * 在目录中递归查找 project.json
 */
async function findProjectJson(dir: string, depth = 0): Promise<string | null> {
  if (depth > 3) return null;

  const directPath = `${dir}/project.json`;
  if (await ReactNativeBlobUtil.fs.exists(directPath)) {
    return dir;
  }

  // 遍历子目录
  if (await ReactNativeBlobUtil.fs.isDir(dir)) {
    const items = await ReactNativeBlobUtil.fs.ls(dir);
    for (const item of items) {
      const sub = `${dir}/${item}`;
      if (await ReactNativeBlobUtil.fs.isDir(sub)) {
        const found = await findProjectJson(sub, depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * 从 zip 文件导入工程
 * 解压 → 读取 project.json → 保存到本地
 */
export async function importProject(
  zipPath: string,
  serverUuid?: string,
): Promise<LocalProjectEntry> {
  await ensureDir(PROJECTS_DIR);

  // 解压到临时目录
  const tempDir = `${PROJECTS_DIR}/_temp_${Date.now()}`;
  await ensureDir(tempDir);

  try {
    await unzip(zipPath, tempDir);

    // 查找 project.json
    const projectDir = await findProjectJson(tempDir);
    if (!projectDir) {
      throw new Error('无效的工程文件：找不到 project.json');
    }

    const projectJsonStr = await ReactNativeBlobUtil.fs.readFile(
      `${projectDir}/project.json`,
      'utf8',
    );
    const projectMeta = JSON.parse(projectJsonStr) as ChoreoProject;

    if (!projectMeta.name) {
      throw new Error('无效的工程文件：project.json 缺少 name 字段');
    }

    const uuid = projectMeta.uuid || `local_${Date.now()}`;
    const finalDir = `${PROJECTS_DIR}/${uuid}`;

    // 如果目标目录已存在（更新场景），先删除旧的
    if (await ReactNativeBlobUtil.fs.exists(finalDir)) {
      await ReactNativeBlobUtil.fs.unlink(finalDir);
    }

    // 将解压后的工程目录移动到最终位置
    // 如果 projectDir === tempDir，直接重命名
    // 如果有嵌套，把内层目录移到最终位置
    if (projectDir === tempDir) {
      // 创建最终目录并移动文件
      await ensureDir(finalDir);
      const items = await ReactNativeBlobUtil.fs.ls(tempDir);
      for (const item of items) {
        if (item.startsWith('_temp_')) continue;
        // react-native-blob-util 没有原生 move，用 cp + rm 方式
        // 但对于目录，我们逐文件读写
        const src = `${tempDir}/${item}`;
        const dst = `${finalDir}/${item}`;
        if (await ReactNativeBlobUtil.fs.isDir(src)) {
          await copyDir(src, dst);
        } else {
          await copyFile(src, dst);
        }
      }
      await ReactNativeBlobUtil.fs.unlink(tempDir);
    } else {
      // 嵌套目录，直接把内层目录内容复制到 finalDir
      await ensureDir(finalDir);
      const items = await ReactNativeBlobUtil.fs.ls(projectDir);
      for (const item of items) {
        const src = `${projectDir}/${item}`;
        const dst = `${finalDir}/${item}`;
        if (await ReactNativeBlobUtil.fs.isDir(src)) {
          await copyDir(src, dst);
        } else {
          await copyFile(src, dst);
        }
      }
      await ReactNativeBlobUtil.fs.unlink(tempDir);
    }

    const now = new Date().toISOString();
    const entry: LocalProjectEntry = {
      uuid,
      name: projectMeta.name,
      description: projectMeta.description,
      localPath: finalDir,
      serverUuid: serverUuid || uuid,
      updatedAt: projectMeta.updated_at || now,
      downloadedAt: now,
    };

    // 更新索引
    const index = await getProjectIndex();
    const existingIdx = index.findIndex(e => e.uuid === uuid);
    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }
    await saveProjectIndex(index);

    return entry;
  } catch (err) {
    // 清理临时目录
    if (await ReactNativeBlobUtil.fs.exists(tempDir)) {
      await ReactNativeBlobUtil.fs.unlink(tempDir).catch(() => {});
    }
    throw err;
  }
}

/**
 * 删除本地工程
 */
export async function deleteProject(uuid: string): Promise<void> {
  const index = await getProjectIndex();
  const entry = index.find(e => e.uuid === uuid);

  if (entry?.localPath) {
    const exists = await ReactNativeBlobUtil.fs.exists(entry.localPath);
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(entry.localPath);
    }
  }

  const newIndex = index.filter(e => e.uuid !== uuid);
  await saveProjectIndex(newIndex);
}

/**
 * 读取工程的 timeline.json
 */
export async function getTimeline(uuid: string): Promise<TimelineData | null> {
  const index = await getProjectIndex();
  const entry = index.find(e => e.uuid === uuid);
  if (!entry) return null;

  const timelinePath = `${entry.localPath}/timeline.json`;
  const exists = await ReactNativeBlobUtil.fs.exists(timelinePath);
  if (!exists) return null;

  const raw = await ReactNativeBlobUtil.fs.readFile(timelinePath, 'utf8');
  return JSON.parse(raw) as TimelineData;
}

/**
 * 读取工程的 robots.json
 */
export async function getRobots(uuid: string): Promise<ChoreoRobot[]> {
  const index = await getProjectIndex();
  const entry = index.find(e => e.uuid === uuid);
  if (!entry) return [];

  const robotsPath = `${entry.localPath}/robots.json`;
  const exists = await ReactNativeBlobUtil.fs.exists(robotsPath);
  if (!exists) return [];

  const raw = await ReactNativeBlobUtil.fs.readFile(robotsPath, 'utf8');
  return JSON.parse(raw) as ChoreoRobot[];
}

// ── 工具函数 ──

async function copyFile(src: string, dst: string): Promise<void> {
  const data = await ReactNativeBlobUtil.fs.readFile(src, 'base64');
  await ReactNativeBlobUtil.fs.writeFile(dst, data, 'base64');
}

async function copyDir(src: string, dst: string): Promise<void> {
  await ensureDir(dst);
  const items = await ReactNativeBlobUtil.fs.ls(src);
  for (const item of items) {
    const srcItem = `${src}/${item}`;
    const dstItem = `${dst}/${item}`;
    if (await ReactNativeBlobUtil.fs.isDir(srcItem)) {
      await copyDir(srcItem, dstItem);
    } else {
      await copyFile(srcItem, dstItem);
    }
  }
}
