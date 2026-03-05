import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    checkForUpdate,
    type ReleaseChannel,
    type UpdateCheckResult,
} from '../../features/settings/services/updateService';

const STORAGE_KEY_AUTO_UPDATE = '@robot:auto_update';
const STORAGE_KEY_BETA_CHANNEL = '@robot:beta_channel';

let hasAutoCheckedThisSession = false;
let isAutoChecking = false;

/**
 * 应用启动时自动检查更新
 * 返回检查结果供全局 UpdateDialog 使用
 */
export function useAutoUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      return;
    }

    if (hasAutoCheckedThisSession || isAutoChecking) {
      return;
    }

    let alive = true;
    isAutoChecking = true;

    (async () => {
      try {
        let rawAuto = await AsyncStorage.getItem(STORAGE_KEY_AUTO_UPDATE);
        if (rawAuto === null) {
          await AsyncStorage.setItem(STORAGE_KEY_AUTO_UPDATE, 'true');
          rawAuto = 'true';
        }
        if (rawAuto !== 'true') return;

        const rawBeta = await AsyncStorage.getItem(STORAGE_KEY_BETA_CHANNEL);
        const channel: ReleaseChannel = rawBeta === 'true' ? 'beta' : 'stable';

        const result = await checkForUpdate(channel);
        if (alive && result.hasUpdate) {
          setUpdateInfo(result);
          setDialogVisible(true);
        }
      } catch {
        // 静默失败
      } finally {
        hasAutoCheckedThisSession = true;
        isAutoChecking = false;
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const dismiss = () => setDialogVisible(false);

  return { updateInfo, dialogVisible, dismiss };
}
