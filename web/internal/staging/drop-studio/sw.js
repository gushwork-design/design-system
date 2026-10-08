/* Gushwork Agent Studio: shows a push message and opens the agent it is about. Scope: this folder only. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Gushwork Agent Studio', {
    body: d.body || '',
    tag: d.tag || 'drop-studio',
    data: { url: d.url || '/internal/staging/drop-studio/' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || '/internal/staging/drop-studio/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(self.location.origin + '/internal/staging/drop-studio') === 0 && 'focus' in list[i]) {
        return list[i].navigate(url).then(function (c) { return c && c.focus(); });
      }
    }
    return self.clients.openWindow(url);
  }));
});
