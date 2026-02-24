export type Role = {
  uuid: string;
  name: string;
  description: string | null;
  llm_provider: string | null;
  llm_model: string | null;
  temperature: number;
  system_prompt: string | null;
  asr_provider: string | null;
  asr_model: string | null;
  voice: string | null;
  intent_strategy: string | null;
  max_history: number;
  is_default: number;
  created_at: string;
  updated_at: string;
};

export type RoleRobotUsage = {
  uuid: string;
  name: string | null;
};

export type RoleForm = {
  name: string;
  description?: string;
  llm_provider?: string;
  llm_model?: string;
  temperature?: number;
  system_prompt?: string;
  asr_provider?: string;
  asr_model?: string;
  voice?: string;
  intent_strategy?: string;
  max_history?: number;
};
