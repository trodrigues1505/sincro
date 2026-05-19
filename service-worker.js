// ════════════════════════════════════════
//  SERVICE WORKER — SINCRONÁRIO 13 LUAS
//  Estratégia: cache-first com fallback à rede
// ════════════════════════════════════════

const CACHE_VERSION = 'sincronario-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './sincronario_dados.json',
  // Fontes do Google
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;1,300&display=swap',
  // Bibliotecas externas
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

// Instala o SW e pré-cacheia os assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(err => {
        // Não falha se algum asset externo não carregar (CORS, etc)
        console.warn('[SW] Alguns assets não foram cacheados:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// Ativa o SW e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia de fetch:
//  - Para Firebase/APIs: sempre rede
//  - Para assets locais: cache-first, atualiza em background
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pula requisições não-GET
  if (event.request.method !== 'GET') return;

  // Firebase, Google APIs, Auth: sempre rede (precisa de dados frescos)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com/firebasejs')
  ) {
    return; // deixa o navegador lidar normalmente
  }

  // Para assets locais e estáticos: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Atualiza em background (stale-while-revalidate)
        fetch(event.request).then((fresh) => {
          if (fresh && fresh.ok) {
            caches.open(CACHE_VERSION).then(c => c.put(event.request, fresh.clone()));
          }
        }).catch(() => {/* offline, tudo bem */});
        return cached;
      }
      // Não tem em cache, busca na rede e armazena
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline para navegação
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ══════════════════════════════════════════════════
// NOTIFICAÇÃO DIÁRIA DO KIN
// ══════════════════════════════════════════════════

// Periodic Background Sync — dispara diariamente
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'kin-diario') {
    event.waitUntil(enviarNotificacaoKin());
  }
});

// Fallback: verificar ao abrir o app (push manual)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NOTIF_KIN') {
    enviarNotificacaoKin();
  }
});

async function enviarNotificacaoKin() {
  // Calcular kin de hoje (mesma lógica do app)
  function dateToKinSW(dt) {
    const dtN = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const base = new Date(1987, 6, 26);
    const dias = Math.round((dtN - base) / 86400000);
    return ((34 - 1 + dias) % 260 + 260) % 260 + 1;
  }
  const kin = dateToKinSW(new Date());
  const mensagens = [
    `Kin ${kin} · Bom dia! Acesse seu Sincronário.`,
    `Seu Kin de hoje é ${kin}. Abra o Sincronário! 🌀`,
    `🌀 Kin ${kin} — Que sua jornada seja plena hoje.`
  ];
  const msg = mensagens[kin % mensagens.length];
  return self.registration.showNotification('🌀 Sincronário das 13 Luas', {
    body: msg,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'kin-diario',
    renotify: true,
    data: { url: './' }
  });
}

// Abrir o app ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const app = list.find(c => c.url.includes('index.html') || c.url.endsWith('/sincro/'));
      if (app) return app.focus();
      return clients.openWindow('./');
    })
  );
});
