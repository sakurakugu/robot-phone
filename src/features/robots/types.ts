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
