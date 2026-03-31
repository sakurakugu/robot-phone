import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Robot } from './types';

const STORAGE_KEY = 'robot_list';

async function readAll(): Promise<Robot[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Robot[];
  } catch {
    return [];
  }
}

async function writeAll(robots: Robot[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(robots));
}

export async function loadLocalRobots(): Promise<Robot[]> {
  return readAll();
}

export async function getLocalRobot(uuid: string): Promise<Robot | null> {
  const all = await readAll();
  return all.find(r => r.uuid === uuid) ?? null;
}

/** 按 uuid 新增或覆盖更新 */
export async function upsertLocalRobot(robot: Robot): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex(r => r.uuid === robot.uuid);
  if (idx >= 0) {
    all[idx] = robot;
  } else {
    all.push(robot);
  }
  await writeAll(all);
}

export async function removeLocalRobot(uuid: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter(r => r.uuid !== uuid));
}
