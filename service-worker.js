// ════════════════════════════════════════
//  SERVICE WORKER — SINCRONÁRIO 13 LUAS v9
//  Estratégia: network-first para JS/HTML, cache-first para imagens/fontes
// ════════════════════════════════════════

const CACHE_VERSION = 'sincronario-v9';

function podeCache(response) {
  return response && response.status !== 206 && response.status !== 0 && response.ok;
}

// Instala e limpa caches antigos imediatamente
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (event.request.headers.get('range')) return;

  // Firebase, Google APIs, Drive, YouTube: sempre rede, nunca cache
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('youtu.be') ||
    url.hostname.includes('ytimg') ||
    url.hostname.includes('drive.google')
  ) return;

  // Arquivos JS e HTML: SEMPRE network-first (garante versão mais nova)
  const isJS   = url.pathname.endsWith('.js');
  const isHTML = url.pathname.endsWith('.html') || event.request.mode === 'navigate';
  const isJSON = url.pathname.endsWith('.json');

  if (isJS || isHTML || isJSON) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (podeCache(response)) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Imagens, fontes, CSS: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (podeCache(response)) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Notificações ──────────────────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'kin-diario') event.waitUntil(enviarNotificacaoKin());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIF_KIN') enviarNotificacaoKin();
});

async function enviarNotificacaoKin() {
  function dateToKinSW(dt) {
    const dtN = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const base = new Date(1987, 6, 26);
    const dias = Math.round((dtN - base) / 86400000);
    return ((23 + dias) % 260 + 260) % 260 + 1; // offset 23
  }
  const kin = dateToKinSW(new Date());
  const msgs = [
    `Kin ${kin} · Bom dia! Acesse seu Sincronário.`,
    `Seu Kin de hoje é ${kin}. Abra o Sincronário! 🌀`,
    `🌀 Kin ${kin} — Que sua jornada seja plena hoje.`
  ];
  return self.registration.showNotification('🌀 Sincronário das 13 Luas', {
    body: msgs[kin % msgs.length],
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'kin-diario',
    renotify: true,
    data: { url: './' }
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const app = list.find(c => c.url.includes('sincro'));
      if (app) return app.focus();
      return clients.openWindow('./');
    })
  );
});
