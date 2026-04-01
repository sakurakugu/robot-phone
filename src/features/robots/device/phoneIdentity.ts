import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuidv7 } from '../../../shared/utils/uuid';

const PHONE_DEVICE_ID_KEY = 'robot_phone_device_id';

let cachedPhoneDeviceId: string | null = null;
const PHONE_SESSION_ID = uuidv7();

/** 获取本次 App 运行期的手机会话 ID（重连保持不变） */
export function getPhoneSessionId(): string {
  return PHONE_SESSION_ID;
}

/** 获取设备级稳定手机 ID（写入本地存储，跨重启保持不变） */
export async function getOrCreatePhoneDeviceId(): Promise<string> {
  if (cachedPhoneDeviceId) {
    return cachedPhoneDeviceId;
  }

  const existing = await AsyncStorage.getItem(PHONE_DEVICE_ID_KEY);
  if (existing && existing.trim()) {
    cachedPhoneDeviceId = existing;
    return existing;
  }

  const next = uuidv7();
  await AsyncStorage.setItem(PHONE_DEVICE_ID_KEY, next);
  cachedPhoneDeviceId = next;
  return next;
}
