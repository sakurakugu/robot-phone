import { Platform } from 'react-native';

export type AppEnvironment = {
  id: string;
  name: string;
  baseUrl: string;
};

const localHost = Platform.OS === 'android' ? 'http://10.0.2.2:9000' : 'http://127.0.0.1:9000';

let environments: AppEnvironment[] = [
  { id: 'local', name: '本地开发', baseUrl: localHost },
];

let activeEnvironmentId = 'local';

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
  }
}

export function addEnvironment(name: string, baseUrl: string): AppEnvironment {
  const env: AppEnvironment = {
    id: `custom-${Date.now()}`,
    name,
    baseUrl: baseUrl.replace(/\/$/, ''),
  };
  environments = [...environments, env];
  return env;
}

export function getApiBaseUrl(): string {
  return `${getActiveEnvironment().baseUrl}/api/v1`;
}
