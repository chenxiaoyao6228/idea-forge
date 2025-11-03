import { PRESET_CONFIGS } from "./util";

export type CommandType = "preset" | "custom";

// Ensure this matches the keys in PRESET_CONFIGS
export type PresetType = keyof typeof PRESET_CONFIGS;

// Move this from util.ts if not already done
export interface AICommand {
  type: CommandType;
  preset?: PresetType;
  content: string;
  instruction?: string;
  options?: {
    contextBefore?: string;
    contextAfter?: string;
    contextLength?: number;
  };
}
