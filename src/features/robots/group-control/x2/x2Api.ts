/**
 * X2 机器人 HTTP 控制 API
 * 对应 Android 端 SendActionToX2.java / SendLingChuangToX2.java
 */

const PORT = 5000;
const DIR_WAV = '/agibot/data/resources/wav/';
const DIR_MP4 = '/agibot/data/resources/mp4/';
const DIR_CSV = '/agibot/data/resources/csv/';

export interface ActionData {
  /** 动作名称（未使用，保留扩展） */
  name?: string;
  /** wav 音频文件名（不含扩展名） */
  audioName?: string;
  /** csv 动作文件名（不含扩展名） */
  csvName?: string;
  /** mp4 表情文件名（不含扩展名） */
  faceName?: string;
}

export interface MotionData {
  /** 显示名称 */
  name: string;
  /** ONNX 动作 ID（play_body?motion_name=...） */
  act: string;
  /** 完整 wav 路径 */
  wav: string;
  /** 完整 mp4 路径 */
  mp4: string;
}

async function httpGet(url: string): Promise<void> {
  const t0 = Date.now();
  console.log(`[X2] 请求: ${url}`);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[X2] 响应(${Date.now() - t0}ms): ${text}`);
  } catch (e) {
    console.warn('[X2] 请求失败:', e);
  }
}

/** 向单个设备发送音频 + 表情 */
function sendAudioToDevice(ip: string, data: ActionData): void {
  const params: string[] = [];
  if (data.audioName) {
    params.push(`audio_path=${DIR_WAV}${data.audioName}.wav`);
  }
  if (data.faceName) {
    params.push(`emotion_path=${DIR_MP4}${data.faceName}.mp4`);
  }
  if (params.length === 0) return;
  const url = `http://${ip}:${PORT}/lingxi/interaction/play?${params.join('&')}`;
  httpGet(url);
}

/** 向单个设备发送 CSV 动作 */
function sendCSVToDevice(ip: string, data: ActionData): void {
  if (!data.csvName) return;
  const url = `http://${ip}:${PORT}/lingxi/interaction/play?motion_path=${DIR_CSV}${data.csvName}.csv`;
  httpGet(url);
}

/**
 * 发送动作到 X2（支持多 IP，用 ":" 分隔）
 * 对应 SendActionToX2.sendAction()
 */
export function sendAction(ip: string, data: ActionData): void {
  const ips = ip.includes(':') ? ip.split(':') : [ip];
  for (const singleIp of ips) {
    sendAudioToDevice(singleIp, data);
    sendCSVToDevice(singleIp, data);
  }
}

/** 发送停止音频指令 */
export function sendStop(ip: string): void {
  sendAction(ip, { audioName: 'stop' });
}

/** 向单个设备发送灵创身体动作 */
function sendLingChuangMotion(ip: string, act: string): void {
  const url = `http://${ip}:${PORT}/lingxi/interaction/play_body?motion_name=${act}`;
  httpGet(url);
}

/** 向单个设备发送灵创音频 + 表情 */
function sendLingChuangOther(ip: string, motion: MotionData): void {
  const params: string[] = [];
  if (motion.wav) params.push(`audio_path=${motion.wav}`);
  if (motion.mp4) params.push(`emotion_path=${motion.mp4}`);
  if (params.length === 0) return;
  const url = `http://${ip}:${PORT}/lingxi/interaction/play?${params.join('&')}`;
  httpGet(url);
}

/**
 * 发送灵创动作到 X2（支持多 IP，用 ":" 分隔）
 * 对应 SendLingChuangToX2.sendLingChuangAction()
 */
export function sendLingChuangAction(
  ip: string,
  motion: MotionData,
  withOther: boolean,
): void {
  const ips = ip.includes(':') ? ip.split(':') : [ip];
  for (const singleIp of ips) {
    sendLingChuangMotion(singleIp, motion.act);
    if (withOther) {
      sendLingChuangOther(singleIp, motion);
    }
  }
}

/**
 * 根据 key 生成灵创动作的完整资源路径
 * 对应 SendLingChuangToX2.getMotionData()
 */
export function buildMotionData(name: string, key: string): MotionData {
  return {
    name,
    act: `linkcraft_resource_onnx_${key}_0.0.1`,
    mp4: `/agibot/data/resources/linkcraft_resource_onnx_${key}/0.0.1/unzip/expression.mp4`,
    wav: `/agibot/data/resources/linkcraft_resource_onnx_${key}/0.0.1/unzip/audio.wav`,
  };
}
