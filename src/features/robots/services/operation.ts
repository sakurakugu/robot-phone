export type RobotOperationRouteParams = {
  robotUuid: string;
  robotName?: string;
  /** 机器狗本体 IP，用于直连 WebRTC 视频流 */
  robotIp?: string;
};

export type ControlMode = 'move' | 'pose';

export type RobotOperationActionButton = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export const JOYSTICK_HIT_RADIUS = 70;
export const SPEED_POPOVER_WIDTH = 192;

export const ACTION_BUTTONS: readonly RobotOperationActionButton[] = [
  { id: 'stand_up', label: '起立', x: 34, y: 78 },
  { id: 'sit_down', label: '趴下', x: 44, y: 78 },
  { id: 'front_jump', label: '向前跳', x: 54, y: 78 },
  { id: 'jump', label: '向上跳', x: 64, y: 78 },
  { id: 'back_flip', label: '后空翻', x: 36, y: 88 },
  { id: 'two_leg_stand', label: '双腿站立', x: 50, y: 88 },
  { id: 'shake_hand', label: '打招呼', x: 64, y: 88 },
];

export function formatOperationTime(now = new Date()): string {
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
