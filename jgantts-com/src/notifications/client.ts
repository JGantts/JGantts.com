export type PushConfiguration = { enabled: boolean; publicKey: string; keyVersion: string; payloadVersion: number }
export type Installation = { credential: string; endpoint: string; keyVersion: string; id?: string; disabling?: boolean }
const STORAGE = 'jgantts.push.installation.v1';
let registration: Promise<ServiceWorkerRegistration> | undefined;
export function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
export function needsInstallation() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && !standalone();
}
export function supported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export function prepareWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return Promise.reject(new Error('This browser cannot enable notifications.'));
  if (!registration) registration = navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(async reg => {
      if (reg.active) return reg;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      return await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('Notification setup timed out. Please retry.')), 15_000); }),
      ]).finally(() => clearTimeout(timeout));
    }).catch(error => { registration = undefined; throw error; });
  return registration;
}
export function storedInstallation(): Installation | null {
  const raw = localStorage.getItem(STORAGE);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value.credential === 'string' && typeof value.endpoint === 'string' && typeof value.keyVersion === 'string') {
      return { ...value, id: typeof value.id === 'string' ? value.id : undefined };
    }
  } catch { /* Show a reset action for an orphaned browser subscription. */ }
  return null;
}
function store(value: Installation) { localStorage.setItem(STORAGE, JSON.stringify(value)); }
function newCredential() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function publicKeyBytes(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
}
export class NotificationRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new NotificationRequestError(body?.error?.message ?? 'Could not save notification settings. Please retry.', response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const getConfiguration = () => request<PushConfiguration>('/api/push/config');
export async function persistSubscription(subscription: PushSubscription, config: PushConfiguration) {
  let record = storedInstallation();
  if (record?.endpoint && record.endpoint !== subscription.endpoint) throw new Error('Reset this installation before reconnecting.');
  if (!record) throw new Error('Reset this installation before reconnecting.');
  record = { ...record, endpoint: subscription.endpoint };
  // Save before the request: retries authenticate even if the first response is lost.
  store(record);
  const result = await request<{ id: string }>('/api/push/subscriptions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), credential: record.credential, keyVersion: config.keyVersion }),
  });
  store({ ...record, id: result.id });
  return result.id;
}
export async function subscribe(reg: ServiceWorkerRegistration, config: PushConfiguration) {
  // Called directly from a click; preparation/network work happened before the button was enabled.
  let record = storedInstallation();
  if (record?.disabling) throw new Error('Finish turning off notifications before enabling them again.');
  if (record?.endpoint && record.keyVersion !== config.keyVersion) {
    throw new NotificationRequestError('Reset this installation to use the updated notification key.', 409);
  }
  if (!record) record = { credential: newCredential(), endpoint: '', keyVersion: config.keyVersion };
  // Dismissing permission leaves a credential but no enrollment. The next explicit
  // attempt can use the current signing key without relabeling an existing endpoint.
  if (!record.endpoint) record = { ...record, keyVersion: config.keyVersion };
  store(record);
  const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKeyBytes(config.publicKey) });
  return persistSubscription(subscription, config);
}
export async function disable(reg: ServiceWorkerRegistration) {
  const record = storedInstallation();
  const subscription = await reg.pushManager.getSubscription();
  if (record) {
    store({ ...record, disabling: true });
    if (record.endpoint) await request<void>('/api/push/subscriptions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-Push-Credential': record.credential },
      body: JSON.stringify({ endpoint: record.endpoint }),
    });
  }
  if (subscription) {
    await subscription.unsubscribe();
    if (await reg.pushManager.getSubscription()) throw new Error('Browser notifications could not be removed. Please retry.');
  }
  localStorage.removeItem(STORAGE);
}

// Returning to any app page reconciles prior consent, without ever asking for it.
export async function reconcileInstallation() {
  const record = storedInstallation();
  if (!record || !supported() || needsInstallation()) return;
  const reg = await prepareWorker();
  const subscription = await reg.pushManager.getSubscription();
  if (record.disabling || Notification.permission !== 'granted' || !subscription) {
    await disable(reg);
    return;
  }
  const config = await getConfiguration();
  if (config.enabled && record.keyVersion === config.keyVersion && (!record.endpoint || record.endpoint === subscription.endpoint)) {
    await persistSubscription(subscription, config);
  }
}

export type NotificationLimits = { maxPerDay: number | null; maxPerWeek: number | null }
export async function notificationLimits(limits?: NotificationLimits): Promise<NotificationLimits> {
  const record = storedInstallation();
  if (!record?.id) throw new Error('Reconnect this installation before changing limits.');
  return request(`/api/push/subscriptions/${encodeURIComponent(record.id)}/preferences`, {
    method: limits ? 'PUT' : 'GET',
    headers: { 'X-Push-Credential': record.credential, ...(limits ? { 'Content-Type': 'application/json' } : {}) },
    body: limits ? JSON.stringify(limits) : undefined,
  });
}
