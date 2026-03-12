/**
 * 编舞系统 API 客户端
 * 对接云端后端的编舞项目接口
 */

import ReactNativeBlobUtil from 'react-native-blob-util';
import { getApiBaseUrl } from '../../shared/config/environment';
import { http } from '../../shared/net/http';
import { getAuthToken } from '../auth/AuthContext';
import type { ChoreoProject } from './types';

/**
 * 获取服务器上所有编舞工程
 */
export async function fetchServerProjects(): Promise<ChoreoProject[]> {
  return http.get<ChoreoProject[]>('/choreo/projects');
}

/**
 * 下载工程 .hhzip 文件到本地缓存
 * 返回下载后的本地路径
 */
export async function downloadProjectZip(
  projectUuid: string,
  onProgress?: (received: number, total: number) => void,
): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/choreo/projects/${encodeURIComponent(projectUuid)}/export`;
  const destPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/choreo_${projectUuid}_${Date.now()}.hhzip`;

  const token = getAuthToken();

  const task = ReactNativeBlobUtil.config({
    path: destPath,
    fileCache: false,
  }).fetch('GET', url, {
    'x-client-type': 'mobile',
    'x-device-name': 'RobotPhone',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  if (onProgress) {
    task.progress({ interval: 100 }, (received, total) => {
      onProgress(Number(received), Number(total));
    });
  }

  const res = await task;
  const status = res.info().status;
  if (status !== 200) {
    // 清理失败的下载文件
    await ReactNativeBlobUtil.fs.unlink(destPath).catch(() => {});
    throw new Error(`下载失败: HTTP ${status}`);
  }

  return res.path();
}

/**
 * 清理缓存的 zip 文件
 */
export async function cleanupZipCache(zipPath: string): Promise<void> {
  await ReactNativeBlobUtil.fs.unlink(zipPath).catch(() => {});
}
