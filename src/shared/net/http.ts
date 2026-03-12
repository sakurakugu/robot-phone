import { getAuthToken } from '../../features/auth/AuthContext';
import { getApiBaseUrl } from '../config/environment';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  connected?: boolean;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-client-type': 'mobile',
      'x-device-name': 'RobotPhone',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      const trimmed = text.trim();
      const snippet = trimmed.slice(0, 120);
      const contentType = response.headers.get('content-type') || 'unknown';
      const statusMessage = `请求失败: HTTP ${response.status}`;
      throw new Error(
        response.ok
          ? `响应解析失败: 期望 JSON，实际为 ${contentType}，响应片段: ${snippet}`
          : `${statusMessage}，响应片段: ${snippet}`,
      );
    }
  }
  const normalized = (payload ?? {}) as ApiEnvelope<T>;

  if (!response.ok || normalized.success === false) {
    throw new Error(
      normalized.error || normalized.message || `请求失败: ${response.status}`,
    );
  }

  return (normalized.data ?? normalized) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
