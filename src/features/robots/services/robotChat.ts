import type { ConversationRecord } from '../types';

export type MessageTarget = 'ai' | 'robot';

export type RobotChatMessage = {
  id: string;
  /** `user` = 用户发出；`ai` = 服务器/AI 回复 */
  role: 'user' | 'ai';
  target?: MessageTarget;
  text: string;
  imageUrl?: string;
  targetPosition?: {
    label: string;
    cx: number;
    cy: number;
    w: number;
    h: number;
  };
  timestamp: number;
  actions?: string[];
  /** 等待服务器回复中 */
  loading?: boolean;
};

export type AudioStreamState = {
  format: string;
  sampleRate: number;
  channels: number;
  useNativeStream: boolean;
  nextSeq: number;
  pendingBySeq: Map<number, string>;
  stagedChunks: string[];
  conversationId: string;
};

type ConversationMetadata = {
  from?: string;
  targetPosition?: RobotChatMessage['targetPosition'];
  visionImage?: {
    base64?: string;
    format?: string;
  };
};

type ConversationAction = {
  name?: string;
};

export const MESSAGE_IMAGE_WIDTH = 220;
export const MESSAGE_IMAGE_HEIGHT = 160;
export const HISTORY_PAGE_SIZE = 20;

function 解析JSON<T>(value?: string | null): T | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

export function formatChatTime(ts: number): string {
  const date = new Date(ts);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function parseActionFormat(
  text: string,
): { action: string; parameters: Record<string, unknown> } | null {
  const actionRegex =
    /^\{\{action=([a-zA-Z_][a-zA-Z0-9_]*)((?:,[a-zA-Z_][a-zA-Z0-9_]*=[^,}]+)*)\}\}$/;
  const match = text.match(actionRegex);
  if (!match) {
    return null;
  }

  const action = match[1];
  const paramsStr = match[2];
  const parameters: Record<string, unknown> = {};

  if (paramsStr) {
    const paramPairs = paramsStr.slice(1).split(',');
    for (const pair of paramPairs) {
      const [key, value] = pair.split('=');
      if (!key || value === undefined) {
        continue;
      }
      const trimmedValue = value.trim();
      const numericValue = Number(trimmedValue);
      parameters[key.trim()] = Number.isNaN(numericValue)
        ? trimmedValue
        : numericValue;
    }
  }

  return { action, parameters };
}

export function buildVisionImageUrl(visionImage?: {
  base64?: string;
  format?: string;
}): string | undefined {
  if (!visionImage?.base64) {
    return undefined;
  }
  return `data:image/${visionImage.format || 'jpeg'};base64,${visionImage.base64}`;
}

export function buildTargetBoxStyle(
  target: NonNullable<RobotChatMessage['targetPosition']>,
) {
  const cx = clampUnit(target.cx);
  const cy = clampUnit(target.cy);
  const width = clampUnit(target.w);
  const height = clampUnit(target.h);
  const left = clampUnit(cx - width / 2);
  const top = clampUnit(cy - height / 2);
  const boundedWidth = clampUnit(Math.min(width, 1 - left));
  const boundedHeight = clampUnit(Math.min(height, 1 - top));

  return {
    left: left * MESSAGE_IMAGE_WIDTH,
    top: top * MESSAGE_IMAGE_HEIGHT,
    width: boundedWidth * MESSAGE_IMAGE_WIDTH,
    height: boundedHeight * MESSAGE_IMAGE_HEIGHT,
  };
}

function normalizeActions(actions?: Array<ConversationAction> | string[]): string[] {
  if (!Array.isArray(actions)) {
    return [];
  }
  return actions
    .map(action =>
      typeof action === 'string'
        ? action
        : typeof action?.name === 'string'
          ? action.name
          : '',
    )
    .filter(Boolean);
}

export function mapConversationRecordsToChatMessages(
  conversations: ConversationRecord[],
): RobotChatMessage[] {
  return conversations
    .slice()
    .reverse()
    .flatMap((item: ConversationRecord) => {
      const timestamp = new Date(item.timestamp).getTime();
      const metadata = 解析JSON<ConversationMetadata>(item.metadata);
      const actions = normalizeActions(
        解析JSON<Array<ConversationAction> | string[]>(item.actions),
      );
      const imageUrl = buildVisionImageUrl(metadata?.visionImage);
      const fromController = String(metadata?.from || '') === 'controller';

      return [
        {
          id: `history-user-${item.uuid}`,
          role: 'user' as const,
          target: (fromController ? 'robot' : 'ai') as MessageTarget,
          text: item.user_input,
          timestamp,
        },
        {
          id: `history-ai-${item.uuid}`,
          role: 'ai' as const,
          text: item.ai_response,
          imageUrl,
          targetPosition: metadata?.targetPosition,
          timestamp,
          actions,
        },
      ];
    });
}
