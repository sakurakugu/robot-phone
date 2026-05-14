/**
 * Codegen TurboModule 规范文件 — SparkPcmAudio
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  startStream(sampleRate: number, channels: number): void;
  appendChunk(base64: string): void;
  stopStream(): void;
  reset(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SparkPcmAudio');
