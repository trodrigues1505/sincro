// ─── js/gamificacao.js — sistema de gamificação do sincronário ────────────────
import { db } from './api.js';
import { DATA } from './data.js';
import { getSeloBase, getSeloCor, getSeloIconURL, dateToKin } from './calculos.js';

// Escapa texto vindo do Firestore (nome, foto, título) antes de usar em innerHTML.
// Os docs de `ranking` são lidos por todos os usuários, então o conteúdo não é confiável.
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

// ─── Configuração de pontos ───────────────────────────────────────────────────
export const PONTOS = {
  ACESSAR_DIA:        5,
  PRECE:             15,
  MEDITACAO:         20,
  SELF_DESIGN:       20,
  EBOOK:             10,
  SOLSTICIO_INVERNO: 10,
  COMPLETAR_TUDO:    30,
  KIN_NATAL:         10,
  FAVORITAR:          5,
  PRIMEIRO_DIA:       5,  // antes das 9h
  BONUS_1_COMPLETO:  50,  // 1º a completar tudo no dia
  BONUS_1_PRECE:     25,  // 1º a ouvir a prece
};

// Ações que só podem ser realizadas uma vez na vida do usuário (não por dia)
const ACOES_UNICAS = ['SOLSTICIO_INVERNO'];

// Multiplicadores de streak (dias consecutivos)
export const STREAK_MULT = [
  { dias: 28, mult: 2.0 },
  { dias: 14, mult: 1.5 },
  { dias: 7,  mult: 1.2 },
  { dias: 0,  mult: 1.0 },
];

// Títulos galácticos por pontuação total
// (o emoji é gravado no Firestore junto com o título; por isso continua aqui)
export const TITULOS = [
  { min: 7000, titulo: 'Mago',   emoji: '🌀' },
  { min: 3500, titulo: 'Sol',    emoji: '☀️' },
  { min: 1500, titulo: 'Estrela',emoji: '⭐' },
  { min: 500,  titulo: 'Lua',    emoji: '🌙' },
  { min: 0,    titulo: 'Semente',emoji: '🌱' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getTitulo(pts) {
  return TITULOS.find(t => pts >= t.min) || TITULOS[TITULOS.length-1];
}

function getMultStreak(streak) {
  return (STREAK_MULT.find(s => streak >= s.dias) || STREAK_MULT[STREAK_MULT.length-1]).mult;
}

function calcPontos(pts, streak) {
  const mult = getMultStreak(streak);
  return Math.round(pts * mult);
}

// ─── Registro de atividade ────────────────────────────────────────────────────
let _cache = null; // cache local para evitar múltiplas leituras por sessão

async function getAtividade(uid) {
  if (_cache) return _cache;
  const snap = await db.collection('gamificacao').doc(uid).get();
  _cache = snap.exists ? snap.data() : { pontos: 0, streak: 0, ultimoDia: null, atividades: {} };
  return _cache;
}

function invalidarCache() { _cache = null; }

async function atualizarFirestore(uid, dados) {
  await db.collection('gamificacao').doc(uid).set(dados, { merge: true });
  _cache = { ..._cache, ...dados };
  // Atualiza snapshot público no ranking
  const titulo = getTitulo(dados.pontos || _cache.pontos || 0);
  await db.collection('ranking').doc(uid).set({
    pontos: dados.pontos ?? _cache.pontos,
    streak: dados.streak ?? _cache.streak,
    titulo: titulo.titulo,
    emoji:  titulo.emoji,
  }, { merge: true });
}

export async function registrarAtividade(uid, acao, nomeUsuario, fotoURL, kinNatalNum) {
  if (!uid) return 0;
  const dataHoje = hoje();
  const ativ = await getAtividade(uid);

  // Calcula streak
  let { streak = 0, ultimoDia, atividades = {}, pontos = 0 } = ativ;
  const atividadesHoje = atividades[dataHoje] || {};

  // Ações únicas vitalícias: verifica se já foi feita em qualquer dia
  if (ACOES_UNICAS.includes(acao)) {
    const jaFez = Object.values(atividades).some(diaAtiv => diaAtiv[acao]);
    if (jaFez) return 0;
  } else {
    // Ações diárias: já fez hoje?
    if (atividadesHoje[acao]) return 0;
  }

  // Streak: se ultimoDia foi ontem, incrementa; se foi hoje, mantém; senão reseta
  const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
  const ontemStr = `${ontem.getFullYear()}-${String(ontem.getMonth()+1).padStart(2,'0')}-${String(ontem.getDate()).padStart(2,'0')}`;
  if (ultimoDia === ontemStr) streak++;
  else if (ultimoDia !== dataHoje) streak = 1;

  // Bônus de primeiro acesso antes das 9h
  let ptsBase = PONTOS[acao] || 0;
  if (acao === 'ACESSAR_DIA' && new Date().getHours() < 9) ptsBase += PONTOS.PRIMEIRO_DIA;

  // Bônus 1º a completar tudo / 1º a ouvir prece
  let ptsBonus = 0;
  if (acao === 'COMPLETAR_TUDO' || acao === 'PRECE') {
    const tipoBonus = acao === 'COMPLETAR_TUDO' ? 'bonus_1_completo' : 'bonus_1_prece';
    const pontosBonus = acao === 'COMPLETAR_TUDO' ? PONTOS.BONUS_1_COMPLETO : PONTOS.BONUS_1_PRECE;
    const snap = await db.collection('bonuses_dia').doc(dataHoje).get();
    const bData = snap.exists ? snap.data() : {};
    if (!bData[tipoBonus]) {
      ptsBonus = pontosBonus;
      await db.collection('bonuses_dia').doc(dataHoje).set({ [tipoBonus]: uid }, { merge: true });
    }
  }

  // Aplica multiplicador de streak
  const ptsComMult = calcPontos(ptsBase, streak);
  const ptsTotal = ptsComMult + ptsBonus;
  const novoTotal = pontos + ptsTotal;

  // Verifica se completou TODAS as tarefas hoje
  const tarefasObrig = ['ACESSAR_DIA','PRECE','MEDITACAO','SELF_DESIGN','EBOOK'];
  const novasAtivHoje = { ...atividadesHoje, [acao]: true };
  const todasFeitas = tarefasObrig.every(t => novasAtivHoje[t]);
  if (todasFeitas && !atividadesHoje.COMPLETAR_TUDO) {
    novasAtivHoje.COMPLETAR_TUDO = true;
    const snapB = await db.collection('bonuses_dia').doc(dataHoje).get();
    const bData = snapB.exists ? snapB.data() : {};
    let bExtra = 0;
    if (!bData.bonus_1_completo) {
      bExtra = PONTOS.BONUS_1_COMPLETO;
      await db.collection('bonuses_dia').doc(dataHoje).set({ bonus_1_completo: uid }, { merge: true });
    }
    const ptsCompleto = calcPontos(PONTOS.COMPLETAR_TUDO, streak) + bExtra;
    const totalComCompleto = novoTotal + ptsCompleto;
    await atualizarFirestore(uid, {
      pontos: totalComCompleto, streak,
      ultimoDia: dataHoje,
      atividades: { ...atividades, [dataHoje]: novasAtivHoje },
    });
    await atualizarRankingPublico(uid, nomeUsuario, fotoURL, kinNatalNum, totalComCompleto, streak);
    invalidarCache();
    mostrarToast(`+${ptsTotal + ptsCompleto} pts${ptsBonus?` (+${ptsBonus} de bônus)`:''}. Todas as tarefas concluídas!`);
    return ptsTotal + ptsCompleto;
  }

  await atualizarFirestore(uid, {
    pontos: novoTotal, streak,
    ultimoDia: dataHoje,
    atividades: { ...atividades, [dataHoje]: novasAtivHoje },
  });
  await atualizarRankingPublico(uid, nomeUsuario, fotoURL, kinNatalNum, novoTotal, streak);
  invalidarCache();
  if (ptsTotal > 0) mostrarToast(`+${ptsTotal} pts${ptsBonus?` (+${ptsBonus} de bônus)`:''}`);
  return ptsTotal;
}

async function atualizarRankingPublico(uid, nome, foto, kinNatal, pontos, streak) {
  if (!uid) return;
  const titulo = getTitulo(pontos);
  await db.collection('ranking').doc(uid).set({
    uid, nome: nome||'', foto: foto||'',
    kinNatal: kinNatal||null,
    pontos, streak,
    titulo: titulo.titulo,
    emoji: titulo.emoji,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// ─── Toast de pontos ─────────────────────────────────────────────────────────
// Usa o toast do index.html quando existe (mesma posição e estilo do resto do app).
// O bloco abaixo é só um plano B caso o index.html seja uma versão antiga.
function mostrarToast(msg) {
  if (window.mostrarToast) { window.mostrarToast(msg, 'sucesso'); return; }
  let t = document.getElementById('pts-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pts-toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--card2);border:1px solid var(--border-g);border-radius:20px;padding:.4rem 1rem;font-size:.85rem;color:var(--gold2);z-index:9999;opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2800);
}

// ─── Widget de pontos no perfil ───────────────────────────────────────────────
export async function renderGamificacaoPerfil(uid) {
  const el = document.getElementById('gamificacao-perfil');
  if (!el || !uid) return;
  el.innerHTML = '<div class="gm-empty">Carregando...</div>';
  try {
    const ativ = await getAtividade(uid);
    const { pontos = 0, streak = 0, atividades = {} } = ativ;
    const titulo = getTitulo(pontos);
    const mult = getMultStreak(streak);
    const dataHoje = hoje();
    const atividadesHoje = atividades[dataHoje] || {};

    // Verifica se SOLSTICIO_INVERNO já foi feito em algum dia
    const solsticioFeito = Object.values(atividades).some(d => d['SOLSTICIO_INVERNO']);

    const tarefas = [
      { acao:'ACESSAR_DIA', label:'Acessar o kin do dia', pts: PONTOS.ACESSAR_DIA },
      { acao:'PRECE',       label:'Prece das 7 direções', pts: PONTOS.PRECE },
      { acao:'MEDITACAO',   label:'Meditação do selo',    pts: PONTOS.MEDITACAO },
      { acao:'SELF_DESIGN', label:'Self Design Sounds',   pts: PONTOS.SELF_DESIGN },
      { acao:'EBOOK',       label:'Leitura do e-book',    pts: PONTOS.EBOOK },
    ];
    const concluidas = tarefas.filter(t => atividadesHoje[t.acao]).length;
    const pct = Math.round((concluidas/tarefas.length)*100);

    // Próximo título
    const prox = TITULOS.slice().reverse().find(t => t.min > pontos);
    const proxFalta = prox ? prox.min - pontos : 0;
    const pctNivel = prox
      ? Math.round((pontos-getTitulo(pontos).min)/(prox.min-getTitulo(pontos).min)*100)
      : 100;

    const check = `<span class="gm-check"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg></span>`;

    el.innerHTML = `
    <div class="gm-top">
      <div class="gm-badge">
        <div class="gm-badge-icon">${titulo.emoji}</div>
        <div class="gm-badge-nome">${titulo.titulo}</div>
      </div>
      <div class="gm-main">
        <div class="gm-points-row">
          <span class="gm-points">${pontos.toLocaleString('pt-BR')}</span>
          <span class="gm-points-label">pontos totais</span>
        </div>
        <div class="gm-next">${prox ? `Faltam ${proxFalta} pts para ${prox.titulo}` : 'Nível máximo atingido'}</div>
        <div class="gm-bar"><div class="gm-bar-fill" style="width:${pctNivel}%"></div></div>
      </div>
      <div class="gm-streak${streak>=7?' is-hot':''}">
        <div class="gm-streak-num">${streak}</div>
        <div class="gm-streak-label">dias seguidos</div>
        ${streak>=7?`<div class="gm-mult">×${mult}</div>`:''}
      </div>
    </div>

    <div class="gm-progress">
      <div class="gm-progress-head">
        <span>Progresso de hoje</span>
        <span>${concluidas} de ${tarefas.length} tarefas</span>
      </div>
      <div class="gm-bar"><div class="gm-bar-fill is-green" style="width:${pct}%"></div></div>
    </div>

    <div class="gm-tasks">
      ${tarefas.map(t => `
        <div class="gm-task${atividadesHoje[t.acao]?' is-done':''}">
          ${check}
          <span class="gm-task-label">${t.label}</span>
          <span class="gm-task-pts">+${t.pts} pts</span>
        </div>`).join('')}
      ${atividadesHoje.COMPLETAR_TUDO ? `
        <div class="gm-task is-done">
          ${check}
          <span class="gm-task-label">Todas as tarefas concluídas hoje</span>
          <span class="gm-task-pts">+${PONTOS.COMPLETAR_TUDO} pts</span>
        </div>` : ''}
      <div class="gm-task gm-task--extra${solsticioFeito?' is-done':''}">
        ${check}
        <span class="gm-task-label">Solstício de Inverno</span>
        <span class="gm-task-pts">${solsticioFeito?'conquistado':'+'+PONTOS.SOLSTICIO_INVERNO+' pts'}</span>
      </div>
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="gm-erro">Erro ao carregar pontuação.</div>`;
    console.error('[Gamif]', e);
  }
}

// ─── Aba de Ranking ───────────────────────────────────────────────────────────
export async function renderRanking(currentUid) {
  const el = document.getElementById('ranking-lista');
  if (!el) return;
  el.innerHTML = '<div class="historico-vazio">Carregando ranking...</div>';
  try {
    // Busca admins para excluir do ranking
    const adminsSnap = await db.collection('users').where('role','==','admin').get();
    const adminUIDs = new Set(adminsSnap.docs.map(d => d.id));

    const snap = await db.collection('ranking').orderBy('pontos','desc').limit(60).get();
    if (snap.empty) { el.innerHTML = '<div class="historico-vazio">Nenhum dado ainda.</div>'; return; }
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => !adminUIDs.has(u.id) && !adminUIDs.has(u.uid))
      .slice(0, 50);
    if (!items.length) { el.innerHTML = '<div class="historico-vazio">Nenhum dado ainda.</div>'; return; }
    el.innerHTML = items.map((u, i) => rankingRowHTML(u, i, currentUid)).join('');
  } catch(e) {
    el.innerHTML = `<div class="gm-erro">Erro: ${esc(e.message)}</div>`;
  }
}

function rankingRowHTML(u, i, currentUid) {
  const pos = i + 1;
  const uid = u.id || u.uid || '';
  const isMe = u.id === currentUid || u.uid === currentUid;
  const kinNatalStr = u.kinNatal && DATA.kins ? (() => {
    const kd = DATA.kins[String(u.kinNatal)];
    if (!kd) return '';
    const base = kd.selo.split(' ').slice(0,-1).join(' ');
    const cor = kd.selo.split(' ').pop();
    const icon = getSeloIconURL(kd.selo);
    return `<div class="ranking-kin">
      <div class="selo-icon selo-${cor.toLowerCase()}">
        <img src="${icon}" style="width:100%;height:100%;object-fit:contain" alt="">
      </div>
      <span>Kin ${esc(u.kinNatal)} · ${base} ${cor}</span>
    </div>`;
  })() : '';

  // data-uid em vez de interpolar o id dentro do onclick (evita quebrar o JS do atributo)
  return `<div class="ranking-row${isMe?' ranking-row-me':''}" data-uid="${esc(uid)}" onclick="abrirComparacao(this.dataset.uid)">
    <div class="ranking-pos">${pos}º</div>
    <img class="ranking-avatar" src="${esc(u.foto||'./icon-192.png')}" onerror="this.src='./icon-192.png'" alt="">
    <div class="ranking-info">
      <div class="ranking-nome">${esc(u.nome||'Anônimo')}${isMe?' <span class="ranking-voce">você</span>':''}</div>
      ${kinNatalStr}
    </div>
    <div class="ranking-right">
      <div class="ranking-pts">${(u.pontos||0).toLocaleString('pt-BR')}</div>
      <div class="ranking-titulo">${esc(u.emoji||'🌱')} ${esc(u.titulo||'Semente')}</div>
      ${u.streak>0?`<div class="ranking-streak"><svg class="ico" aria-hidden="true"><use href="#i-flame"/></svg>${esc(u.streak)}</div>`:''}
    </div>
  </div>`;
}

// ─── Comparação entre dois usuários ──────────────────────────────────────────
export async function abrirComparacao(uid2) {
  const modal = document.getElementById('modal-comparacao');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  const box = document.getElementById('comparacao-content');
  box.innerHTML = '<div class="historico-vazio">Carregando...</div>';
  try {
    const [snap1, snap2, rank1, rank2] = await Promise.all([
      db.collection('gamificacao').doc(window._currentUID).get(),
      db.collection('gamificacao').doc(uid2).get(),
      db.collection('ranking').doc(window._currentUID).get(),
      db.collection('ranking').doc(uid2).get(),
    ]);
    const d1 = snap1.exists ? snap1.data() : {};
    const d2 = snap2.exists ? snap2.data() : {};
    const r1 = rank1.exists ? rank1.data() : {};
    const r2 = rank2.exists ? rank2.data() : {};
    const dataHoje = hoje();
    const a1 = (d1.atividades||{})[dataHoje]||{};
    const a2 = (d2.atividades||{})[dataHoje]||{};
    const tarefas = [
      { acao:'PRECE',       label:'Prece' },
      { acao:'MEDITACAO',   label:'Meditação' },
      { acao:'SELF_DESIGN', label:'Self Design' },
      { acao:'EBOOK',       label:'E-book' },
      { acao:'COMPLETAR_TUDO', label:'Todas tarefas' },
    ];
    const ok  = `<svg class="ico cmp-ok" aria-label="feito" role="img"><use href="#i-check"/></svg>`;
    const nao = `<span class="cmp-no" aria-label="não feito">–</span>`;

    box.innerHTML = `
    <div class="cmp-head">
      <div class="cmp-user">
        <img class="cmp-avatar" src="${esc(r1.foto||'./icon-192.png')}" onerror="this.src='./icon-192.png'" alt="">
        <div class="cmp-nome">${esc(r1.nome||'Você')}</div>
        <div class="cmp-titulo">${esc(r1.emoji||'🌱')} ${esc(r1.titulo||'Semente')}</div>
      </div>
      <div class="cmp-vs">vs</div>
      <div class="cmp-user is-other">
        <img class="cmp-avatar" src="${esc(r2.foto||'./icon-192.png')}" onerror="this.src='./icon-192.png'" alt="">
        <div class="cmp-nome">${esc(r2.nome||'Usuário')}</div>
        <div class="cmp-titulo">${esc(r2.emoji||'🌱')} ${esc(r2.titulo||'Semente')}</div>
      </div>
    </div>

    <div class="cmp-grid">
      <div class="l cmp-big is-me">${(d1.pontos||0).toLocaleString('pt-BR')}</div>
      <div class="m">pontos</div>
      <div class="r cmp-big is-other">${(d2.pontos||0).toLocaleString('pt-BR')}</div>
      <div class="l cmp-streak${d1.streak>=7?' is-hot-me':''}">${d1.streak||0} dias</div>
      <div class="m">sequência</div>
      <div class="r cmp-streak${d2.streak>=7?' is-hot-other':''}">${d2.streak||0} dias</div>
    </div>

    <div class="cmp-sec">Tarefas de hoje</div>
    ${tarefas.map(t => `
    <div class="cmp-grid cmp-task">
      <div class="l">${a1[t.acao]?ok:nao}</div>
      <div class="m">${t.label}</div>
      <div class="r">${a2[t.acao]?ok:nao}</div>
    </div>`).join('')}

    ${(()=>{
      const kinNatal1 = r1.kinNatal && DATA.kins ? DATA.kins[String(r1.kinNatal)] : null;
      const kinNatal2 = r2.kinNatal && DATA.kins ? DATA.kins[String(r2.kinNatal)] : null;
      if (!kinNatal1 && !kinNatal2) return '';
      const fmt = (kd, n) => kd
        ? `<div>${kd.selo.split(' ').slice(0,-1).join(' ')}<br><span class="muted small">Kin ${esc(n)}</span></div>`
        : '<div class="muted">–</div>';
      return `<div class="cmp-sec">Kin Natal</div>
      <div class="cmp-grid">
        <div class="l">${fmt(kinNatal1, r1.kinNatal)}</div><div class="m"></div><div class="r">${fmt(kinNatal2, r2.kinNatal)}</div>
      </div>`;
    })()}`;
  } catch(e) {
    box.innerHTML = `<div class="gm-erro">Erro: ${esc(e.message)}</div>`;
  }
}

export { getTitulo, getMultStreak, mostrarToast };
