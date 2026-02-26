/**
 * X2 动作数据定义
 * 对应 Android 端 SendLingChuangToX2.java / HaidilaoData.java / TaiCiActivity / NormalActivity
 */

import { buildMotionData, type ActionData, type MotionData } from './x2Api';

// ─── 通用基础动作（各场景共用）───────────────────────────────────
export const DEFAULT_ACTIONS: { label: string; data: ActionData }[] = [
  { label: '左转身', data: { csvName: 'zuoxiaohui', faceName: 'zuoxiaohui' } },
  { label: '右转身', data: { csvName: 'youxiaohui', faceName: 'youxiaohui' } },
  { label: '比心', data: { csvName: 'bixin', faceName: 'bixin' } },
  { label: '挠皮股', data: { csvName: 'naopigu', faceName: 'naopigu' } },
  { label: '鞠躬', data: { csvName: 'jugong', faceName: 'jugong' } },
  { label: '作揖', data: { csvName: 'zuoyi', faceName: 'zuoyi' } },
  { label: '右敬礼', data: { csvName: 'youjingli', faceName: 'youjingli' } },
  { label: '动感', data: { csvName: 'donggan', faceName: 'donggan' } },
];

// ─── NormalActivity 动作 ────────────────────────────────────────
export const NORMAL_ACTIONS: { label: string; data: ActionData }[] = [
  { label: '快乐崇拜', data: { audioName: 'kuaile' } },
  { label: '爱你', data: { audioName: 'aini' } },
  { label: '卡拉OK', data: { audioName: 'kalaok' } },
  { label: '五子棋', data: { audioName: 'wuziqi' } },
  { label: '扇子舞', data: { audioName: 'shanziwu' } },
  { label: '天猫舞', data: { audioName: 'tianmao' } },
  { label: '金鸡', data: { audioName: 'jinji' } },
  { label: 'Hip Pop', data: { audioName: 'hippip' } },
  { label: '拜式（完整）', data: { audioName: 'baishi', csvName: 'baishi', faceName: 'taici1' } },
  { label: '拜式（纯动作）', data: { csvName: 'baishi' } },
  { label: '电子（完整）', data: { audioName: 'dianzi', csvName: 'dianzi', faceName: 'bixin' } },
  { label: '电子（纯动作）', data: { csvName: 'dianzi' } },
  { label: '电子2（完整）', data: { audioName: 'dianzi2', csvName: 'dianzi2', faceName: 'bixin' } },
  { label: '电子2（纯动作）', data: { csvName: 'dianzi2' } },
  { label: '雇佣（完整）', data: { audioName: 'guyong', csvName: 'guyong', faceName: 'bixin' } },
  { label: '雇佣（纯动作）', data: { csvName: 'guyong' } },
  { label: '礼礼大（完整）', data: { audioName: 'lld', csvName: 'lld', faceName: 'bixin' } },
  { label: '礼礼大（纯动作）', data: { csvName: 'lld' } },
];

// ─── 灵创舞蹈动作 ─────────────────────────────────────────────────
const LINGCHUANG_NAMES = [
  '快乐崇拜', '天猫舞', '五子棋', '醒狮', '太极',
  '卡拉OK', '恭喜发财', '离开地球表面', '哈哈歌',
  '生日快乐1分半', '爱你湖南卫视跨年晚会舞蹈', '生日快乐36s',
];
const LINGCHUANG_KEYS = [
  'kuaile', 'tianmao', 'wuziqi', 'xingshi', 'taiji',
  'kalaok', 'hgongxifacai', 'dj', 'haha',
  'shengri3', 'ainidada', 'shengri1',
];

export const LINGCHUANG_MOTIONS: MotionData[] = LINGCHUANG_NAMES.map(
  (name, i) => buildMotionData(name, LINGCHUANG_KEYS[i]),
);

// ─── 海底捞舞蹈（灵创） ───────────────────────────────────────────
const HAIDILAO_DANCE_NAMES = [
  '生日快乐上肢舞蹈', '生日快乐1分半', '哈哈歌简单版', 'DJ离开地球表面', '恭喜发财',
];
const HAIDILAO_DANCE_KEYS = ['shengri1', 'shengri3', 'haha', 'dj', 'hgongxifacai'];
export const HAIDILAO_DANCE_MOTIONS: MotionData[] = HAIDILAO_DANCE_NAMES.map(
  (name, i) => buildMotionData(name, HAIDILAO_DANCE_KEYS[i]),
);

// ─── 海底捞大招呼 ActionData ──────────────────────────────────────
export const HAIDILAO_DA_ZHAO_HU: { label: string; data: ActionData }[] = [
  {
    label: '大家好，欢迎光临海底捞，我是你的友好服务员灵犀X2',
    data: { audioName: 'dazhaohu1', csvName: 'zuoxiaohui', faceName: 'bixin' },
  },
  {
    label: '大家好，欢迎光临海底捞，我是你的开心果灵犀X2',
    data: { audioName: 'dazhaohu2', csvName: 'youxiaohui', faceName: 'bixin' },
  },
  {
    label: '你好啊，欢迎光临海底捞，我是你的好伙伴灵犀X2',
    data: { audioName: 'dazhaohu3', csvName: 'zuoxiaohui', faceName: 'bixin' },
  },
  {
    label: '您好，我是灵犀X2，祝寿星生日快乐（右手握手）',
    data: { audioName: 'dazhaohu4', csvName: 'youwoshou', faceName: 'bixin' },
  },
  {
    label: '我要开始给寿星唱生日歌了，大家一起来好吗（双手伸出）',
    data: { audioName: 'dazhaohu5', csvName: 'shuangshenchu', faceName: 'bixin' },
  },
  {
    label: '祝寿星生日快乐！我要去下一桌表演了，祝大家用餐愉快！（双手比心）',
    data: { audioName: 'dazhaohu6', csvName: 'bixin', faceName: 'bixin' },
  },
  {
    label: '尊敬的顾客您好！我是灵犀X2，我要开始表演舞蹈了，请在安全区域观看（右手碰拳）',
    data: { audioName: 'dazhaohu7', csvName: 'youpengquan', faceName: 'bixin' },
  },
];

// ─── 海底捞迎打 ActionData ────────────────────────────────────────
export const HAIDILAO_YING_DA: { label: string; data: ActionData }[] = [
  {
    label: '您好呀，我会唱歌，还会跳舞，想看什么表演呢?',
    data: { audioName: 'yingda0', csvName: 'zuoxiaohui', faceName: 'zuoxiaohui' },
  },
  {
    label: '您好呀，我会唱歌，还会跳舞，我的好兄弟还会后空翻，想看什么表演呢?',
    data: { audioName: 'yingda1', csvName: 'youxiaohui', faceName: 'youxiaohui' },
  },
  {
    label: '好呀好呀，这就来啦?',
    data: { audioName: 'yingda2', csvName: 'bixin', faceName: 'bixin' },
  },
  {
    label: '我可以回答您的问题呦，来~请拿麦克风',
    data: { audioName: 'yingda3', csvName: 'youxiaohui', faceName: 'youxiaohui' },
  },
  {
    label: '哎呀，不好意思吓到您啦，我可是很温柔的伙伴哦~',
    data: { audioName: 'yingda4', csvName: 'naopigu', faceName: 'naopigu' },
  },
  {
    label: '小朋友您好呀，欢迎来海底捞~',
    data: { audioName: 'yingda5', csvName: 'zuoxiaohui', faceName: 'zuoxiaohui' },
  },
  {
    label: '谢谢夸奖，我会骄傲的',
    data: { audioName: 'yingda6', csvName: 'jugong', faceName: 'jugong' },
  },
  {
    label: '抱歉，我会继续努力的',
    data: { audioName: 'yingda7', csvName: 'naopigu', faceName: 'naopigu' },
  },
  {
    label: '拜拜',
    data: { audioName: 'yingda8', csvName: 'youxiaohui', faceName: 'youxiaohui' },
  },
  {
    label: '拜拜啦，我要去下一桌表演了',
    data: { audioName: 'yingda9', csvName: 'zuoxiaohui', faceName: 'zuoxiaohui' },
  },
];

// ─── 台词（1~23） ─────────────────────────────────────────────────
export const TAICI_ACTIONS: { label: string; data: ActionData }[] = Array.from(
  { length: 23 },
  (_, i) => ({
    label: `台词${i + 1} 音频/表情/动作`,
    data: {
      audioName: `taici${i + 1}`,
      csvName: `taici${i + 1}`,
      faceName: `taici${i + 1}`,
    },
  }),
);

// 台词页额外基础动作
export const TAICI_DEFAULT_ACTIONS: { label: string; data: ActionData }[] = [
  { label: '左挥手', data: { csvName: 'zuowoshou', faceName: 'bixin' } },
  { label: '右挥手', data: { csvName: 'youwoshou', faceName: 'bixin' } },
  { label: '左转身', data: { csvName: 'zuoxiaohui', faceName: 'zuoxiaohui' } },
  { label: '比心', data: { csvName: 'bixin', faceName: 'bixin' } },
  { label: '挠皮股', data: { csvName: 'naopigu', faceName: 'naopigu' } },
  { label: '右转身', data: { csvName: 'youxiaohui', faceName: 'youxiaohui' } },
  { label: '鞠躬', data: { csvName: 'jugong', faceName: 'jugong' } },
  { label: '作揖', data: { csvName: 'zuoyi', faceName: 'zuoyi' } },
  { label: '右敬礼', data: { csvName: 'youjingli', faceName: 'youjingli' } },
  { label: '动感', data: { csvName: 'donggan', faceName: 'donggan' } },
];

// ─── 特技动作（灵创） ─────────────────────────────────────────────
const TEJI_NAMES = [
  '侧翻', '侧空翻', '地滚跪', '地滚站', '后空翻',
  '回旋踢', '连踢', '跑完韦伯斯特', '韦伯斯特', '站着回旋踢',
  '前空翻', '双后空翻',
];
const TEJI_KEYS = [
  'acefan', 'acekongfan', 'adigun1', 'adigun2', 'ahoukongfan',
  'ahuixuanti', 'alianti', 'apaoweibo', 'aweibo', 'azhanhuixuan',
  'qiankongfan', 'shuanghoukong',
];
export const TEJI_MOTIONS: MotionData[] = TEJI_NAMES.map(
  (name, i) => buildMotionData(name, TEJI_KEYS[i]),
);
