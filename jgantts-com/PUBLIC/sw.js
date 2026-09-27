/* Shared push worker. Deliberately no fetch handler, precache, or forced reload. */
function notificationModel(value) {
  const fallback = { title: 'JGantts.com', body: 'Open to see the latest posts.', url: '/photos', eventId: 'jgantts-update' };
  if (!value || value.version !== 1) return fallback;
  let url = '/photos';
  try {
    const destination = new URL(value.url, self.location.origin);
    if (destination.origin === self.location.origin && /^\/photos(?:\/[^/]+)?$/.test(destination.pathname)
      && !destination.username && !destination.password) {
      destination.hash = '';
      for (const key of [...destination.searchParams.keys()]) if (key !== 'rev') destination.searchParams.delete(key);
      url = destination.pathname + destination.search;
    }
  } catch { /* Keep the safe gallery fallback. */ }
  return {
    title: typeof value.title === 'string' && value.title ? value.title.slice(0, 100) : fallback.title,
    body: typeof value.body === 'string' ? value.body.slice(0, 200) : fallback.body,
    eventId: typeof value.eventId === 'string' ? value.eventId.slice(0, 100) : fallback.eventId,
    url,
  };
}
self.addEventListener('push', event => {
  let value;
  try { value = event.data?.json(); } catch { /* Still display a visible notification. */ }
  const model = notificationModel(value);
  event.waitUntil(self.registration.showNotification(model.title, {
    body: model.body, tag: model.eventId, icon: '/app-icons/icon-192.png',
    data: { version: 1, url: model.url },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const model = notificationModel(event.notification.data);
  const url = new URL(model.url, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const exact = windows.find(client => client.url === url);
    if (exact) { await exact.focus(); return; }
    const reader = windows.find(client => {
      const current = new URL(client.url);
      return current.origin === self.location.origin && /^\/photos(?:\/|$)|^\/posts(?:\/|$)|^\/notifications$/.test(current.pathname);
    });
    if (reader) {
      try { const navigated = await reader.navigate(url); if (navigated) { await navigated.focus(); return; } } catch { /* Open a fresh window below. */ }
    }
    await self.clients.openWindow(url);
  })());
});
