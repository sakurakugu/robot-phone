const TIMEOUT = 5000;
const PORT = 8080;

export class RobotClient {
  private ip: string;
  private token: string | null = null;

  constructor(ip: string) {
    this.ip = ip;
  }

  getToken(): string | null {
    return this.token;
  }

  private get baseUrl() {
    return `http://${this.ip}:${PORT}`;
  }

  async login(username = 'sparkrobot', password = 'sparkrobot') {
    const res = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      this.token = res.token;
    }
    return res;
  }

  async request(path: string, init?: RequestInit) {
    const headers: any = {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    };

    if (this.token) {
      // Set cookie header manually
      // @ts-ignore
      headers.Cookie = `session_token=${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      } as any);
      clearTimeout(timeoutId);

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || `请求失败: ${response.status}`);
      }

      return data;
    } catch (e: any) {
      console.error(`Robot API Error [${path}]:`, e);
      throw e;
    }
  }

  // Volume 音量
  async getVolume() {
    return this.request('/api/v1/volume');
  }

  async setVolume(volume: number) {
    return this.request('/api/v1/volume', {
      method: 'POST',
      body: JSON.stringify({ volume }),
    });
  }

  async setMute(mute: boolean) {
    return this.request('/api/v1/volume/mute', {
      method: 'POST',
      body: JSON.stringify({ mute }),
    });
  }

  // Config 配置
  async getConfig() {
    return this.request('/api/v1/config');
  }

  async updateConfig(config: any) {
    return this.request('/api/v1/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // WiFi 网络
  async scanWifi() {
    return this.request('/api/v1/wifi/scan');
  }

  async connectWifi(ssid: string, password: string) {
    return this.request('/api/v1/wifi/connect', {
      method: 'POST',
      body: JSON.stringify({ ssid, password }),
    });
  }

  // Logs 日志
  async getLogs(appName?: string) {
    const query = appName ? `?app_name=${appName}` : '';
    return this.request(`/api/v1/logs${query}`);
  }

  getDownloadLogsUrl(startTime: string, endTime: string, appName?: string) {
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    });
    if (appName) {
      params.append('app_name', appName);
    }
    if (this.token) {
      params.append('session_token', this.token);
    }
    return `${this.baseUrl}/api/v1/logs/download?${params.toString()}`;
  }

  // Config Fields & Sections
  async getConfigFields() {
    return this.request('/api/v1/config/fields');
  }

  async getConfigSections() {
    return this.request('/api/v1/config/sections');
  }

  async resetConfigField(key: string) {
    return this.request('/api/v1/config/reset', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  }

  // SDK Config
  async getSdkConfig() {
    return this.request('/api/v1/sdk/config');
  }

  async updateSdkConfig(targetIp: string, targetPort: number) {
    return this.request('/api/v1/sdk/config', {
      method: 'POST',
      body: JSON.stringify({ target_ip: targetIp, target_port: targetPort }),
    });
  }

  async resetSdkConfig() {
    return this.request('/api/v1/sdk/config/reset', {
      method: 'POST',
    });
  }

  // Motion Config
  async getMotionConfig() {
    return this.request('/api/v1/sdk/motion');
  }

  async updateMotionConfig(sdkClientIp: string) {
    return this.request('/api/v1/sdk/motion', {
      method: 'POST',
      body: JSON.stringify({ sdk_client_ip: sdkClientIp }),
    });
  }

  async resetMotionConfig() {
    return this.request('/api/v1/sdk/motion/reset', {
      method: 'POST',
    });
  }

  // Motion Service
  async restartMotion() {
    return this.request('/api/v1/sdk/motion/restart', {
      method: 'POST',
    });
  }
}
