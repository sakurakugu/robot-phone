// src/hooks/useRobotControl.ts
import { useState, useEffect } from 'react';
import ApiService from '../services/api';

export interface Robot {
  id: string;
  name: string;
  uuid: string;
  status: 'online' | 'offline' | 'connecting';
  battery: number;
  lastConnected: string;
  model?: string;
}

export interface RobotAction {
  id: string;
  name: string;
  command: string;
  icon?: string;
}

const useRobotControl = () => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 机器人预设动作
  const robotActions: RobotAction[] = [
    { id: 'stand', name: '站立', command: 'stand', icon: '🦾' },
    { id: 'sit', name: '坐下', command: 'sit', icon: '🪑' },
    { id: 'lie', name: '趴下', command: 'lie', icon: '😴' },
    { id: 'walk_forward', name: '前进', command: 'walk_forward', icon: '🚶‍♂️' },
    { id: 'walk_backward', name: '后退', command: 'walk_backward', icon: '🚶‍♂️' },
    { id: 'turn_left', name: '左转', command: 'turn_left', icon: '↩️' },
    { id: 'turn_right', name: '右转', command: 'turn_right', icon: '↪️' },
    { id: 'wave', name: '挥手', command: 'wave', icon: '👋' },
    { id: 'dance', name: '跳舞', command: 'dance', icon: '💃' },
  ];

  // 加载机器人列表
  const loadRobots = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getRobots();
      setRobots(data);
      if (data.length > 0 && !selectedRobot) {
        setSelectedRobot(data[0]);
      }
    } catch (err) {
      setError('加载机器人失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 选择机器人
  const selectRobot = (robot: Robot) => {
    setSelectedRobot(robot);
  };

  // 发送机器人动作
  const sendAction = async (action: string) => {
    if (!selectedRobot) {
      setError('请选择一个机器人');
      return;
    }

    try {
      await ApiService.sendRobotAction(selectedRobot.uuid, action);
      console.log(`动作 ${action} 已发送到机器人 ${selectedRobot.name}`);
    } catch (err) {
      setError('发送动作失败');
      console.error(err);
    }
  };

  // 测试机器人连接
  const testConnection = async (robot: Robot) => {
    try {
      await ApiService.testRobotConnection(robot.uuid);
      console.log(`已测试机器人 ${robot.name} 的连接`);
    } catch (err) {
      setError('测试连接失败');
      console.error(err);
    }
  };

  // 初始化时加载机器人
  useEffect(() => {
    loadRobots();
  }, []);

  return {
    robots,
    selectedRobot,
    isLoading,
    error,
    robotActions,
    selectRobot,
    sendAction,
    testConnection,
    reloadRobots: loadRobots,
  };
};

export default useRobotControl;