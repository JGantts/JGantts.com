import { createECDH, createHash } from 'node:crypto';

export const isInstallationUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
// Numeric IDs remain accepted for existing server configuration during migration.
export type PushAudience = '*' | Array<string | number>;

export interface VapidKey { publicKey: string; privateKey: string }
export interface PushConfig {
  enabled: boolean;
  sendEnabled: boolean;
  publicKey: string;
  keyVersion: string;
  subject: string;
  keys: Record<string, VapidKey>;
  // Empty means nobody, '*' means public delivery, otherwise comma-separated IDs.
  audience: PushAudience;
  siteOrigin: string;
}
export const keyVersion = (key: string) => createHash('sha256').update(key).digest('hex').slice(0, 16);

export function getPushConfig(env: NodeJS.ProcessEnv, siteOrigin: string): PushConfig {
  const enabled = env.JGANTTS_PUSH_ENABLED === 'true';
  const sendEnabled = env.JGANTTS_PUSH_SEND_ENABLED === 'true';
  const publicKey = env.JGANTTS_PUSH_VAPID_PUBLIC_KEY?.trim() ?? '';
  const privateKey = env.JGANTTS_PUSH_VAPID_PRIVATE_KEY?.trim() ?? '';
  const subject = env.JGANTTS_PUSH_VAPID_SUBJECT?.trim() ?? '';
  const keys: Record<string, VapidKey> = {};
  const addKey = (key: VapidKey) => {
    try {
      const curve = createECDH('prime256v1');
      curve.setPrivateKey(Buffer.from(key.privateKey, 'base64url'));
      if (curve.getPublicKey().toString('base64url') !== key.publicKey) throw new Error();
      keys[keyVersion(key.publicKey)] = key;
    } catch { throw new Error('Push VAPID keys must be a matching P-256 pair.'); }
  };
  if (publicKey || privateKey) addKey({ publicKey, privateKey });
  if (env.JGANTTS_PUSH_PREVIOUS_KEYS) {
    let previous: VapidKey[];
    try { previous = JSON.parse(env.JGANTTS_PUSH_PREVIOUS_KEYS); } catch { throw new Error('Invalid previous push key configuration.'); }
    if (!Array.isArray(previous)) throw new Error('Previous push keys must be an array.');
    previous.forEach(addKey);
  }
  if (enabled || sendEnabled) {
    if (!publicKey || !/^https:\/\//.test(siteOrigin) || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) {
      throw new Error('Enabled push requires VAPID keys, a mailto/HTTPS subject, and HTTPS SITE_ORIGIN.');
    }
  }
  const rawAudience = env.JGANTTS_PUSH_AUDIENCE?.trim() ?? '';
  const audience = rawAudience === '*' ? '*' : rawAudience ? rawAudience.split(',').map(value => /^\d+$/.test(value.trim()) ? Number(value) : value.trim().toLowerCase()) : [];
  if (audience !== '*' && audience.some(id => typeof id === 'number' ? !Number.isSafeInteger(id) || id < 1 : !isInstallationUuid(id))) throw new Error('Invalid push audience IDs.');
  return { enabled, sendEnabled, publicKey, keyVersion: keyVersion(publicKey), subject, keys, audience, siteOrigin };
}
