// Recebe os avisos de sono (Web Push) e abre o app ao tocar.
self.addEventListener('push', (e) => {
  let d = { title: 'Assistente', body: '', url: '/' }
  try { d = { ...d, ...e.data.json() } } catch { /* aviso sem corpo */ }
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: '/icone-192.png', data: { url: d.url } }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ('focus' in c) return c.navigate(url).then((x) => (x || c).focus())
      return self.clients.openWindow(url)
    }),
  )
})
