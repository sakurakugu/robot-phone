import { getApiBaseUrl } from '../../shared/config/environment';
import { http } from '../../shared/net/http';
import {
    getLocalRobot,
    loadLocalRobots,
    removeLocalRobot,
    upsertLocalRobot,
} from './localRobotStorage';
import type { DiscoveredRobot, Robot, RobotForm } from './types';

// ── 构造一个本地占位 Robot 对象（读取服务器时无法使用时的临时对象） ──
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
}

function buildLocalRobot(uuid: string, payload: RobotForm, now: string): Robot {
  return {
    uuid,
    name: payload.name ?? null,
    model: payload.model ?? null,
    version: null,
    ip: payload.ip ?? null,
    group_name: payload.group_name ?? null,
    tags: payload.tags ?? [],
    sn: payload.sn ?? null,
    role_uuid: payload.role_uuid ?? null,
    status: 'offline',
    last_connected_at: null,
    registered_at: null,
    updated_at: now,
    created_at: now,
  };
}

/** 从本地 AsyncStorage 读取机器人列表（快速、可离线） */
export function fetchRobotsLocal(): Promise<Robot[]> {
  return loadLocalRobots();
}

/**
 * 兼容函数：优先返回服务器+本地合并结果，服务器不可达时展降为本地数据。
 * 为了尝试导入此函数的旧代码（如群控屏幕）保持兼容。
 */
export async function fetchRobots(): Promise<Robot[]> {
  try {
    return await syncRobotsWithServer();
  } catch {
    return loadLocalRobots();
  }
}

/**
 * 从服务器拉取最新列表，与本地数据按本地优先规则合并后写回本地，返回合并结果。
 * 合并规则：
 *   - 服务器有、本地没有 → 写入本地
 *   - 本地有、服务器有 → 保留本地（避免覆盖用户在本地做的修改）
 *   - 本地有、服务器没有 → 保留本地（可能是离线创建的）
 */
export async function syncRobotsWithServer(): Promise<Robot[]> {
  const serverList = await http
    .get<{ robots: Robot[] }>('/robots')
    .then(d => d.robots ?? []);
  const localList = await loadLocalRobots();
  const localMap = new Map(localList.map(r => [r.uuid, r]));

  // 服务器独有的机器人写入本地
  const writePromises: Promise<void>[] = [];
  for (const serverRobot of serverList) {
    if (!localMap.has(serverRobot.uuid)) {
      writePromises.push(upsertLocalRobot(serverRobot));
      localMap.set(serverRobot.uuid, serverRobot);
    }
  }
  await Promise.all(writePromises);

  return Array.from(localMap.values());
}

/** 读取单个机器人：本地优先，读不到再请求服务器 */
export async function fetchRobot(uuid: string): Promise<Robot> {
  const local = await getLocalRobot(uuid);
  if (local) return local;
  const remote = await http.get<Robot>(`/robots/${uuid}`);
  // 写入本地缓存
  await upsertLocalRobot(remote).catch(() => {});
  return remote;
}

/** 从本地机器人列表中推导分组名，不再请求服务器 */
export async function fetchRobotGroups(): Promise<string[]> {
  const robots = await loadLocalRobots();
  const groups = new Set<string>();
  for (const r of robots) {
    if (r.group_name) groups.add(r.group_name);
  }
  return Array.from(groups);
}

/**
 * 创建机器人：本地优先。
 * - 立即写入本地存储（离线可用）
 * - 后台异步同步服务器，成功后用服务器返回值更新本地（补全 created_at 等元信息）
 */
export async function createRobot(payload: RobotForm): Promise<Robot> {
  const now = new Date().toISOString();
  const uuid = payload.uuid ?? generateUUID();
  const localRobot = buildLocalRobot(uuid, payload, now);
  await upsertLocalRobot(localRobot);

  // 后台同步，成功后以服务器返回值覆盖本地（保留服务器字段如 registered_at）
  // payload.uuid 已包含 uuid，服务器在支持的情况下会以此为最终 UUID
  http
    .post<Robot>('/robots', payload)
    .then(r => upsertLocalRobot(r))
    .catch(() => { /* 离线时静默失败，本地数据已保存 */ });

  return localRobot;
}

/**
 * 更新机器人：本地优先。
 * - 立即更新本地存储
 * - 后台异步同步服务器，失败时静默忽略
 */
export async function updateRobot(uuid: string, payload: RobotForm): Promise<Robot> {
  const existing = await getLocalRobot(uuid);
  const now = new Date().toISOString();
  const merged: Robot = existing
    ? {
        ...existing,
        name: payload.name !== undefined ? payload.name : existing.name,
        model: payload.model !== undefined ? payload.model : existing.model,
        ip: payload.ip !== undefined ? payload.ip : existing.ip,
        group_name: payload.group_name !== undefined ? payload.group_name : existing.group_name,
        sn: payload.sn !== undefined ? payload.sn : existing.sn,
        tags: payload.tags !== undefined ? payload.tags : existing.tags,
        role_uuid: payload.role_uuid !== undefined ? payload.role_uuid : existing.role_uuid,
        updated_at: now,
      }
    : buildLocalRobot(uuid, payload, now);
  await upsertLocalRobot(merged);

  // 后台同步服务器，成功后更新本地元信息。uuid 在 URL 中已体现，传入 body 服务器会忽略
  http
    .put<Robot>(`/robots/${uuid}`, payload)
    .then(r => upsertLocalRobot(r))
    .catch(() => {});

  return merged;
}

/**
 * 删除机器人：本地优先。
 * - 立即从本地删除
 * - 后台异步同步服务器，失败时静默忽略
 */
export async function deleteRobot(uuid: string): Promise<{ success: boolean }> {
  await removeLocalRobot(uuid);
  http.delete<{ success: boolean }>(`/robots/${uuid}`).catch(() => {});
  return { success: true };
}

export function getRobotVolume(uuid: string): Promise<{ volume: number; muted: boolean }> {
  return http.get<{ volume: number; muted: boolean }>(`/robots/${uuid}/volume`);
}

export function setRobotVolume(uuid: string, volume: number): Promise<{ success: boolean; message?: string }> {
  return http.post<{ success: boolean; message?: string }>(`/robots/${uuid}/volume`, { volume });
}

export function setRobotMute(uuid: string, mute: boolean): Promise<{ success: boolean; message?: string }> {
  return http.post<{ success: boolean; message?: string }>(`/robots/${uuid}/volume/mute`, { mute });
}

export function capturePhoto(uuid: string): Promise<{ image: string; format: string }> {
  return http.post<{ image: string; format: string }>(`/robots/${uuid}/camera/capture`);
}

export function getRobotConfig(uuid: string): Promise<any> {
  return http.get<any>(`/robots/${uuid}/config`);
}

export function updateRobotConfig(uuid: string, config: any): Promise<any> {
  return http.post<any>(`/robots/${uuid}/config`, config);
}

export type RobotAudioRouteMode = 'robot' | 'phone' | 'mute';
export type RobotAudioRouteFallback = 'drop' | 'robot';

export type RobotAudioRouteConfig = {
  mode: RobotAudioRouteMode;
  targetPhoneDeviceId: string | null;
  fallback: RobotAudioRouteFallback;
  updatedAt: string;
};

export function getRobotAudioRoute(uuid: string): Promise<RobotAudioRouteConfig> {
  return http.get<RobotAudioRouteConfig>(`/robots/${uuid}/audio-route`);
}

export function updateRobotAudioRoute(
  uuid: string,
  config: Partial<RobotAudioRouteConfig>,
): Promise<RobotAudioRouteConfig> {
  return http.put<RobotAudioRouteConfig>(`/robots/${uuid}/audio-route`, config);
}

/**
 * 根据 mDNS 发现结果，批量同步已有机器人的基础信息。
 *
 * 对比 discovered 列表与 existingRobots：
 * - UUID 重合的 → 检测 name / ip / model 是否有变化，有变化则调用 updateRobot（含本地存储）
 * - UUID 不重合的 → 返回为 newDiscovered（由上层决定是否添加）
 */
export async function syncDiscoveredRobots(
  discovered: DiscoveredRobot[],
  existingRobots: Robot[],
): Promise<{ updated: Robot[]; newDiscovered: DiscoveredRobot[] }> {
  const existingMap = new Map(existingRobots.map(r => [r.uuid, r]));
  const updated: Robot[] = [];
  const newDiscovered: DiscoveredRobot[] = [];

  const updatePromises: Promise<void>[] = [];

  for (const d of discovered) {
    const existing = existingMap.get(d.uuid);
    if (!existing) {
      newDiscovered.push(d);
      continue;
    }

    // 检查是否需要更新
    const needsUpdate =
      existing.name !== d.name ||
      existing.ip !== d.ip ||
      existing.model !== d.model;

    if (needsUpdate) {
      const payload: RobotForm = {
        name: d.name,
        ip: d.ip,
        model: d.model,
      };
      // updateRobot 已内置本地存储写入
      updatePromises.push(
        updateRobot(d.uuid, payload)
          .then(r => { updated.push(r); })
          .catch(() => { /* 静默忽略单个更新失败 */ }),
      );
    }
  }

  await Promise.all(updatePromises);
  return { updated, newDiscovered };
}

/** 安装包信息 */
export type PackageFileInfo = {
  fileName: string;
  fileSize: number;
  fileHash: string;
};

export type ActivePackageInfo = {
  id: number;
  versionCode: number;
  channel: string;
  changelog: string | null;
  uploadedAt: string;
  agent: PackageFileInfo | null;
  server: PackageFileInfo | null;
  common: PackageFileInfo | null;
};

export type PackageType = 'agent' | 'server' | 'common';

/** 获取云端当前活跃安装包信息 */
export async function getActivePackage(channel = 'stable'): Promise<ActivePackageInfo | null> {
  return http.get<ActivePackageInfo | null>(`/robot-packages/active?channel=${channel}`);
}

/** 获取安装包下载 URL（直接指向文件流） */
export function getPackageDownloadUrl(type: PackageType, channel = 'stable'): string {
  return `${getApiBaseUrl()}/robot-packages/download/${type}?channel=${channel}`;
}
