// ════════════════════════════════════════
//  SERVICE WORKER — SINCRONÁRIO 13 LUAS v10
//  Estratégia: network-first para JS/HTML/JSON, cache-first para imagens/fontes
//  Novo na v10: Firebase SDK e fontes do Google passam a ser guardados no cache
//  (antes eram ignorados pelo SW, e sem eles o app não abria offline).
//  Troque CACHE_VERSION a cada publicação que mude este arquivo.
// ════════════════════════════════════════

const CACHE_VERSION = 'sincronario-v10';

function podeCache(response) {
  return response && response.status !== 206 && response.status !== 0 && response.ok;
}

// Recursos de outros domínios que o app precisa para abrir offline.
// São requisições "no-cors" (tag <script>/<link> sem crossorigin), então a resposta é
// "opaque" (status 0) e a regra podeCache() acima as recusaria.
function ehExternoCacheavel(url) {
  return (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
         url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
}
function podeCacheExterno(response) {
  return response && (response.type === 'opaque' || (response.ok && response.status !== 206));
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

function cacheFirst(request, aceita) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (aceita(response)) {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
      }
      return response;
    });
  });
}

function networkFirst(request, aceita) {
  return fetch(request)
    .then(response => {
      if (aceita(response)) {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(c => c.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (event.request.headers.get('range')) return;

  // Firebase SDK (versão fixa na URL) e fontes: cache-first, para o app abrir offline
  if (ehExternoCacheavel(url)) {
    event.respondWith(cacheFirst(event.request, podeCacheExterno));
    return;
  }

  // Firebase (Auth/Firestore), Google APIs, Drive, YouTube: sempre rede, nunca cache
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
    event.respondWith(networkFirst(event.request, podeCache));
    return;
  }

  // Imagens, CSS, PDF do e-book: cache-first
  event.respondWith(cacheFirst(event.request, podeCache));
});

// ── Notificações ──────────────────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'kin-diario') event.waitUntil(enviarNotificacaoKin());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIF_KIN') enviarNotificacaoKin();
});

async function enviarNotificacaoKin() {
  // Mesmo cálculo de js/calculos.js (dateToKin): o dia 29/fev não conta no calendário.
  // Base 26/07/1987 = Kin 34. Mantenha as duas cópias iguais.
  function dateToKinSW(dt) {
    if (dt.getMonth() === 1 && dt.getDate() === 29) dt = new Date(dt.getFullYear(), 1, 28);
    const bissextosAte = (d) => {
      const y = d.getFullYear();
      const ate = (n) => Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400);
      const bis = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      return ate(y - 1) + ((bis && d.getMonth() >= 2) ? 1 : 0);
    };
    const dtN  = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const base = new Date(1987, 6, 26);
    const dias = Math.round((dtN - base) / 86400000) - (bissextosAte(dtN) - bissextosAte(base));
    return ((33 + dias) % 260 + 260) % 260 + 1;
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
