export type RobotStatus = 'online' | 'offline' | 'error';

export type RoleLite = {
  uuid: string;
  name: string;
};

export type Robot = {
  uuid: string;
  name: string | null;
  model: string | null;
  version: string | null;
  ip: string | null;
  group_name: string | null;
  tags: string[];
  sn: string | null;
  role_uuid: string | null;
  status: RobotStatus;
  last_connected_at: string | null;
  registered_at: string | null;
  updated_at: string;
  created_at: string;
  role?: RoleLite | null;
};

export type RobotForm = {
  uuid?: string; // 本地创建时预分配，避免服务器不可达时生成新 UUID
  name?: string;
  ip?: string;
  group_name?: string;
  model?: string;
  sn?: string;
  tags?: string[];
  role_uuid?: string | null;
};

export type DiscoveredRobot = {
  uuid: string;
  name: string;
  model: string;
  version: string;
  ip: string;
  port: number;
};

export type ConversationRecord = {
  uuid: number;
  robot_id: string;
  conversation_id?: string | null;
  timestamp: string;
  type: 'audio' | 'text';
  user_input: string;
  ai_response: string;
  actions?: string | null;
  processing_time?: number | null;
  metadata?: string | null;
};

export type ConversationHistoryResult = {
  conversations: ConversationRecord[];
  limit: number;
  offset: number;
};
