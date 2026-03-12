/**
 * 编舞系统类型定义（手机端）
 * 与后端 编舞系统/types.ts 保持一致的核心子集
 */

// 编舞项目（对应 project.json）
export interface ChoreoProject {
  uuid: string;
  name: string;
  description?: string;
  folder_path?: string;
  thumbnail_path?: string;
  last_opened?: string;
  created_at: string;
  updated_at: string;
}

// 项目中的机器人配置（对应 robots.json）
export interface ChoreoRobot {
  uuid: string;
  robot_id: string;
  name: string;
  track_index: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

// 时间轴轨道
export interface TimelineTrack {
  id: string;
  name: string;
  type: 'action' | 'audio';
  robotId?: string;
  muted?: boolean;
  locked?: boolean;
  color?: string;
  blocks?: ActionBlock[];
  audioUrl?: string;
}

// 动作块
export interface ActionBlock {
  id: string;
  name: string;
  startTime: number;    // 秒
  duration: number;     // 秒
  actionType?: string;
  actionParams?: Record<string, any>;
  robotId?: string;     // 块级机器人绑定（覆盖轨道级）
  color?: string;
}

// 时间轴配置
export interface TimelineConfig {
  duration: number;
  pixelsPerSecond: number;
  currentTime: number;
  snapToGrid: boolean;
  gridSize: number;
}

// 时间轴数据（对应 timeline.json）
export interface TimelineData {
  tracks: TimelineTrack[];
  config: TimelineConfig;
  updated_at?: string;
}

// 编排后的单条动作
export interface ScheduledAction {
  robotId: string;
  action: string;
  parameters?: Record<string, any>;
  executeAt: number;    // 毫秒
  duration: number;     // 毫秒
}

// 编译后的执行计划
export interface ExecutionPlan {
  scheduleId: string;
  projectUuid: string;
  totalDuration: number;  // 毫秒
  actions: ScheduledAction[];
  robotIds: string[];
}

// 本地工程索引条目
export interface LocalProjectEntry {
  uuid: string;
  name: string;
  description?: string;
  localPath: string;
  serverUuid?: string;    // 对应服务器端的 uuid，用于更新检测
  updatedAt: string;
  downloadedAt: string;
}
