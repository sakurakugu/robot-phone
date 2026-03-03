import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import DeviceInfo from 'react-native-device-info';
import { getApiBaseUrl } from '../../../shared/config/environment';

export type ReleaseChannel = 'stable' | 'beta';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
  latestDisplayVersion?: string | null;
  latestVersionCode: number | null;
  changelog: string | null;
  downloadId: number | null;
  fileSize: number | null;
  channel: ReleaseChannel;
}

export interface AppVersionInfo {
  id: number;
  versionName: string;
  versionCode: number;
  channel: ReleaseChannel;
  fileName: string;
  fileSize: number;
  fileHash: string;
  changelog: string | null;
  isActive: boolean;
  uploadedAt: string;
}

const STORAGE_KEY_CACHED_APK_META = '@robot:cached_apk_meta';

type CachedApkMeta = {
  versionCode: number;
  filePath: string;
  updatedAt: number;
};

let installInFlight = false;

async function getCachedApkMeta(): Promise<CachedApkMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CACHED_APK_META);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedApkMeta;
    if (!parsed?.filePath || !parsed?.versionCode) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveCachedApkMeta(meta: CachedApkMeta): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_CACHED_APK_META, JSON.stringify(meta));
}

async function openInstallerWithFallback(filePath: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await ReactNativeBlobUtil.android.actionViewIntent(
      filePath,
      'application/vnd.android.package-archive',
    );
    return;
  } catch (installError: any) {
    try {
      await ReactNativeBlobUtil.android.actionViewIntent(filePath, '*/*');
      return;
    } catch (fallbackError: any) {
      const installMsg = installError?.message || String(installError);
      const fallbackMsg = fallbackError?.message || String(fallbackError);
      throw new Error(`安装失败，且无法使用其他应用打开。安装错误: ${installMsg}; 兜底错误: ${fallbackMsg}`);
    }
  }
}

export function versionCodeToSemver(versionCode: number): string {
  const safe = Math.max(0, Math.floor(Number(versionCode) || 0));
  const major = Math.floor(safe / 1_000_000);
  const minor = Math.floor((safe % 1_000_000) / 1_000);
  const patch = safe % 1_000;
  return `${major}.${minor}.${patch}`;
}

export function versionCodeToRaw(versionCode: number): string {
  return String(Math.max(0, Math.floor(Number(versionCode) || 0)));
}

/**
 * 检查更新
 */
export async function checkForUpdate(
  channel: ReleaseChannel = 'stable',
): Promise<UpdateCheckResult> {
  const currentVersionCode = Number(DeviceInfo.getBuildNumber());
  const url = `${getApiBaseUrl()}/updates/check?currentVersionCode=${currentVersionCode}&channel=${channel}`;
  const resp = await fetch(url);
  const json = await resp.json();
  if (!resp.ok || !json.success) {
    throw new Error(json.error || '检查更新失败');
  }
  const data = json.data as UpdateCheckResult;
  if (!data.latestDisplayVersion && data.latestVersionCode) {
    data.latestDisplayVersion = versionCodeToSemver(data.latestVersionCode);
  }
  return data;
}

/**
 * 获取版本列表（用于回滚/历史）
 */
export async function fetchVersions(
  channel?: ReleaseChannel,
): Promise<AppVersionInfo[]> {
  let url = `${getApiBaseUrl()}/updates/versions`;
  if (channel) {
    url += `?channel=${channel}`;
  }
  const resp = await fetch(url);
  const json = await resp.json();
  if (!resp.ok || !json.success) {
    throw new Error(json.error || '获取版本列表失败');
  }
  return json.data as AppVersionInfo[];
}

/**
 * 下载并安装 APK
 * @returns 取消函数
 */
export function downloadAndInstallApk(
  downloadId: number,
  versionCode: number,
  onProgress?: (received: number, total: number) => void,
): { promise: Promise<void>; cancel: () => void } {
  const url = `${getApiBaseUrl()}/updates/download/${downloadId}`;
  const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
  const filePath = `${downloadDir}/RobotPhone_update_${versionCode}.apk`;

  let cancelled = false;

  const promise = (async () => {
    if (installInFlight) {
      throw new Error('已有安装任务正在进行，请稍后再试');
    }
    installInFlight = true;

    // 先删除旧文件
    try {
      const localVersionCode = Number(DeviceInfo.getBuildNumber()) || 0;

      const cached = await getCachedApkMeta();
      if (cached) {
        const exists = await ReactNativeBlobUtil.fs.exists(cached.filePath);
        const cacheIsNewEnough = cached.versionCode >= versionCode && cached.versionCode > localVersionCode;
        if (exists && cacheIsNewEnough) {
          await openInstallerWithFallback(cached.filePath);
          return;
        }
      }

      const exists = await ReactNativeBlobUtil.fs.exists(filePath);
      if (exists) {
        await ReactNativeBlobUtil.fs.unlink(filePath);
      }

      const task = ReactNativeBlobUtil.config({
        path: filePath,
        fileCache: false,
      }).fetch('GET', url);

      // 进度回调
      if (onProgress) {
        task.progress({ interval: 100 }, (received, total) => {
          if (!cancelled) {
            onProgress(Number(received), Number(total));
          }
        });
      }

      const resp = await task;

      if (cancelled) {
        await ReactNativeBlobUtil.fs.unlink(filePath).catch(() => {});
        return;
      }

      const status = resp.info().status;
      if (status !== 200) {
        throw new Error(`下载失败，状态码: ${status}`);
      }

      await saveCachedApkMeta({
        versionCode,
        filePath,
        updatedAt: Date.now(),
      });

      await openInstallerWithFallback(filePath);
    } finally {
      installInFlight = false;
    }
  })();

  const cancel = () => {
    cancelled = true;
  };

  return { promise, cancel };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
