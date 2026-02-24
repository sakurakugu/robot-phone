import { http } from '../../shared/net/http';
import type { Role, RoleForm, RoleRobotUsage } from './types';

export function fetchRoles(): Promise<Role[]> {
  return http.get<Role[]>('/roles');
}

export function createRole(payload: RoleForm): Promise<Role> {
  return http.post<Role>('/roles', payload);
}

export function updateRole(uuid: string, payload: RoleForm): Promise<Role> {
  return http.put<Role>(`/roles/${uuid}`, payload);
}

export function deleteRole(uuid: string): Promise<{ success: boolean; message?: string }> {
  return http.delete<{ success: boolean; message?: string }>(`/roles/${uuid}`);
}

export function fetchRoleRobots(uuid: string): Promise<RoleRobotUsage[]> {
  return http.get<RoleRobotUsage[]>(`/roles/${uuid}/robots`);
}
