import { http } from '../../shared/net/http';
import type { DiscoveredRobot, Robot, RobotForm } from './types';

export async function fetchRobots(): Promise<Robot[]> {
  const data = await http.get<{ robots: Robot[] }>('/robots');
  return data.robots ?? [];
}

export async function fetchRobot(uuid: string): Promise<Robot> {
  return http.get<Robot>(`/robots/${uuid}`);
}

export async function fetchRobotGroups(): Promise<string[]> {
  const data = await http.get<{ groups: string[] }>('/robots/groups');
  return data.groups ?? [];
}

export function createRobot(payload: RobotForm): Promise<Robot> {
  return http.post<Robot>('/robots', payload);
}

export function updateRobot(uuid: string, payload: RobotForm): Promise<Robot> {
  return http.put<Robot>(`/robots/${uuid}`, payload);
}

export function deleteRobot(uuid: string): Promise<{ success: boolean }> {
  return http.delete<{ success: boolean }>(`/robots/${uuid}`);
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

/**
 * 根据 mDNS 发现结果，批量同步已有机器人的基础信息。
 *
 * 对比 discovered 列表与 existingRobots：
 * - UUID 重合的 → 检测 name / ip / model 是否有变化，有变化则调用 updateRobot
 * - 返回更新后的完整机器人列表
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
