// src/services/api.ts
const BASE_URL = 'http://localhost:3000/api'; // 根据实际后端地址调整

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BASE_URL;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // 机器人相关API
  getRobots() {
    return this.request('/robots');
  }

  getRobot(uuid: string) {
    return this.request(`/robots/${uuid}`);
  }

  sendRobotAction(uuid: string, action: string) {
    return this.request(`/robots/${uuid}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  updateRobot(uuid: string, data: any) {
    return this.request(`/robots/${uuid}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteRobot(uuid: string) {
    return this.request(`/robots/${uuid}`, {
      method: 'DELETE',
    });
  }

  testRobotConnection(uuid: string) {
    return this.request(`/robots/${uuid}/test`, {
      method: 'POST',
    });
  }

  // 角色相关API
  getRoles() {
    return this.request('/roles');
  }

  getRole(id: string) {
    return this.request(`/roles/${id}`);
  }

  createRole(data: any) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateRole(id: string, data: any) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteRole(id: string) {
    return this.request(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // 对话相关API
  sendMessage(robotUuid: string, message: string) {
    return this.request('/conversation/send', {
      method: 'POST',
      body: JSON.stringify({ robotUuid, message }),
    });
  }

  getConversationHistory(robotUuid: string) {
    return this.request(`/conversation/history/${robotUuid}`);
  }

  // 设置相关API
  getSettings() {
    return this.request('/settings');
  }

  updateSettings(data: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();