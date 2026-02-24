import { http } from '../../shared/net/http';
import type { Robot, RobotForm } from './types';

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
