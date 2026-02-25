import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type AppEnvironment = {
  id: string;
  name: string;
  baseUrl: string;
};

const STORAGE_KEY_CUSTOM = '@robot:custom_environments';
const STORAGE_KEY_ACTIVE = '@robot:active_environment_id';

const localHost =
  Platform.OS === 'android' ? 'http://10.0.2.2:9000' : 'http://127.0.0.1:9000';

const DEFAULT_ENVIRONMENTS: AppEnvironment[] = [
  { id: 'local', name: '模拟器开发', baseUrl: localHost },
];

let environments: AppEnvironment[] = [...DEFAULT_ENVIRONMENTS];
let activeEnvironmentId = 'local';

/** 应用启动时调用，从 AsyncStorage 加载持久化的自定义环境 */
export async function initEnvironments(): Promise<void> {
  try {
    const [rawEnvs, rawActiveId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_CUSTOM),
      AsyncStorage.getItem(STORAGE_KEY_ACTIVE),
    ]);
    if (rawEnvs) {
      const custom: AppEnvironment[] = JSON.parse(rawEnvs);
      environments = [...DEFAULT_ENVIRONMENTS, ...custom];
    }
    if (rawActiveId) {
      const exists = environments.some(e => e.id === rawActiveId);
      if (exists) {
        activeEnvironmentId = rawActiveId;
      }
    }
  } catch {
    // 读取失败时保持默认值
  }
}

function saveCustomEnvironments(): void {
  const custom = environments.filter(e => !DEFAULT_ENVIRONMENTS.find(d => d.id === e.id));
  AsyncStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(custom)).catch(() => {});
}

function saveActiveId(): void {
  AsyncStorage.setItem(STORAGE_KEY_ACTIVE, activeEnvironmentId).catch(() => {});
}

export function listEnvironments(): AppEnvironment[] {
  return environments;
}

export function getActiveEnvironment(): AppEnvironment {
  return environments.find(item => item.id === activeEnvironmentId) || environments[0];
}

export function setActiveEnvironment(id: string): void {
  const exists = environments.some(item => item.id === id);
  if (exists) {
    activeEnvironmentId = id;
    saveActiveId();
  }
}

export function addEnvironment(name: string, baseUrl: string): AppEnvironment {
  const env: AppEnvironment = {
    id: `custom-${Date.now()}`,
    name,
    baseUrl: baseUrl.replace(/\/$/, ''),
  };
  environments = [...environments, env];
  saveCustomEnvironments();
  return env;
}

export function removeEnvironment(id: string): void {
  if (DEFAULT_ENVIRONMENTS.find(e => e.id === id)) {
    return; // 不允许删除默认环境
  }
  environments = environments.filter(e => e.id !== id);
  if (activeEnvironmentId === id) {
    activeEnvironmentId = environments[0]?.id ?? 'local';
    saveActiveId();
  }
  saveCustomEnvironments();
}

export function getApiBaseUrl(): string {
  return `${getActiveEnvironment().baseUrl}/api/v1`;
}
