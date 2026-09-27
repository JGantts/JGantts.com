import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
const source = fs.readFileSync(path.resolve(__dirname, '../../jgantts-com/PUBLIC/sw.js'), 'utf8');
function harness(windows: unknown[] = []) {
  const handlers: Record<string, (event: any) => void> = {};
  const notifications: any[] = []; const opened: string[] = [];
  const context = { URL, self: { location: { origin: 'https://jgantts.com' }, addEventListener: (type: string, handler: any) => { handlers[type] = handler; },
    registration: { showNotification: async (...args: any[]) => { notifications.push(args); } },
    clients: { matchAll: async () => windows, openWindow: async (url: string) => { opened.push(url); } } } };
  vm.runInNewContext(source, context);
  const run = async (type: string, event: any) => { let done: Promise<unknown> | undefined; handlers[type]({ ...event, waitUntil: (promise: Promise<unknown>) => { done = promise; } }); await done; };
  return { handlers, notifications, opened, run };
}
test('worker always displays visible fallback and does not intercept fetch or force activation', async () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.handlers).sort(), ['notificationclick', 'push']);
  await h.run('push', { data: { json: () => { throw new Error(); } } });
  assert.equal(h.notifications[0][0], 'JGantts.com');
  assert.equal(h.notifications[0][1].data.url, '/photos');
});
test('worker limits click destinations and preserves revision queries', async () => {
  for (const destination of ['https://evil.test/photos/a', '/admin/posts', '//evil.test/photos/a', 'javascript:alert(1)']) {
    const h = harness();
    await h.run('notificationclick', { notification: { close() {}, data: { version: 1, url: destination } } });
    assert.deepEqual(h.opened, ['https://jgantts.com/photos']);
  }
  const h = harness();
  await h.run('push', { data: { json: () => ({ version: 1, title: 'Post', body: 'Text', eventId: 'post', url: '/photos/a?rev=2&preview=old' }) } });
  assert.equal(h.notifications[0][1].data.url, '/photos/a?rev=2');
  assert.equal(h.notifications[0][1].tag, 'post');
});
test('click focuses matching reader and leaves an admin editor alone', async () => {
  let focused = 0;
  const exact = harness([{ url: 'https://jgantts.com/photos/a', focus: async () => { focused++; } }]);
  await exact.run('notificationclick', { notification: { close() {}, data: { version: 1, url: '/photos/a' } } });
  assert.equal(focused, 1); assert.equal(exact.opened.length, 0);
  const editor = harness([{ url: 'https://jgantts.com/admin/posts', navigate: () => { throw new Error('must not navigate editor'); } }]);
  await editor.run('notificationclick', { notification: { close() {}, data: { version: 1, url: '/photos/a' } } });
  assert.deepEqual(editor.opened, ['https://jgantts.com/photos/a']);
});
