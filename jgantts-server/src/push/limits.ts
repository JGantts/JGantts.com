import { pushError } from './subscription';

export interface PushLimits { maxPerDay: number | null; maxPerWeek: number | null }
export function validateLimits(value: unknown): PushLimits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw pushError(400, 'Provide daily and weekly limits.');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['maxPerDay', 'maxPerWeek'].includes(key))) throw pushError(400, 'Unknown notification setting.');
  for (const key of ['maxPerDay', 'maxPerWeek']) {
    const limit = input[key];
    if (limit !== null && (!Number.isInteger(limit) || (limit as number) < 0 || (limit as number) > 1000)) {
      throw pushError(400, 'Limits must be whole numbers from 0 to 1000, or null for unlimited.');
    }
  }
  return input as unknown as PushLimits;
}
