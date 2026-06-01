// ─── js/gamificacao.js — sistema de gamificação do sincronário ────────────────
import { db } from './api.js';
import { DATA } from './data.js';
import { getSeloBase, getSeloCor, getSeloIconURL, dateToKin } from './calculos.js';

// ─── Configuração de pontos ───────────────────────────────────────────────────
export const PONTOS = {
  ACESSAR_DIA:        5,
  PRECE:             15,
  MEDITACAO:         20,
  SELF_DESIGN:       20,
  EBOOK:             10,
  COMPLETAR_TUDO:    30,
  KIN_NATAL:         10,
  FAVORITAR:          5,
  PRIMEIRO_DIA:       5,  // antes das 9h
  BONUS_1_COMPLETO:  50,  // 1º a completar tudo no dia
  BONUS_1_PRECE:     25,  // 1º a ouvir a prece
};

// Multiplicadores de streak (dias consecutivos)
export const STREAK_MULT = [
  { dias: 28, mult: 2.0 },
  { dias: 14, mult: 1.5 },
  { dias: 7,  mult: 1.2 },
  { dias: 0,  mult: 1.0 },
];

// Títulos galácticos por pontuação total
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

  // Já fez essa ação hoje?
  if (atividadesHoje[acao]) return 0;

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
    const hoje24 = new Date(); hoje24.setHours(0,0,0,0);
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
    // Registra bônus de completar tudo recursivamente sem loop
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
    mostrarToast(`+${ptsTotal + ptsCompleto} pts${ptsBonus?` (+${ptsBonus} bônus!)`:''} 🎉 Todas as tarefas concluídas!`);
    return ptsTotal + ptsCompleto;
  }

  await atualizarFirestore(uid, {
    pontos: novoTotal, streak,
    ultimoDia: dataHoje,
    atividades: { ...atividades, [dataHoje]: novasAtivHoje },
  });
  await atualizarRankingPublico(uid, nomeUsuario, fotoURL, kinNatalNum, novoTotal, streak);
  invalidarCache();
  if (ptsTotal > 0) mostrarToast(`+${ptsTotal} pts${ptsBonus?` (+${ptsBonus} bônus 🏆!)`:''}`);
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
function mostrarToast(msg) {
  let t = document.getElementById('pts-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pts-toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--card2);border:1px solid var(--border-g);border-radius:20px;padding:.4rem 1rem;font-family:Cinzel;font-size:.72rem;color:var(--gold2);letter-spacing:.05em;z-index:9999;opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap';
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
  el.innerHTML = '<div style="color:var(--text3);font-size:.8rem;font-style:italic">Carregando...</div>';
  try {
    const ativ = await getAtividade(uid);
    const { pontos = 0, streak = 0, atividades = {} } = ativ;
    const titulo = getTitulo(pontos);
    const mult = getMultStreak(streak);
    const dataHoje = hoje();
    const atividadesHoje = atividades[dataHoje] || {};
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

    el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.9rem">
      <div style="text-align:center">
        <div style="font-size:2.2rem;line-height:1">${titulo.emoji}</div>
        <div style="font-family:Cinzel;font-size:.65rem;color:var(--gold2);margin-top:.2rem;letter-spacing:.05em">${titulo.titulo}</div>
      </div>
      <div style="flex:1;min-width:160px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.25rem">
          <span style="font-family:Cinzel;font-size:1.3rem;color:var(--gold2);font-weight:600">${pontos.toLocaleString('pt-BR')}</span>
          <span style="font-size:.6rem;color:var(--text3)">pontos totais</span>
        </div>
        ${prox ? `<div style="font-size:.6rem;color:var(--text3);margin-bottom:.3rem">Faltam ${proxFalta} pts para ${prox.emoji} ${prox.titulo}</div>` : '<div style="font-size:.6rem;color:var(--gold);margin-bottom:.3rem">🌀 Nível máximo atingido!</div>'}
        <div style="background:var(--bg2);border-radius:6px;height:5px;overflow:hidden">
          ${prox ? `<div style="height:100%;width:${Math.round((pontos-getTitulo(pontos).min)/(prox.min-getTitulo(pontos).min)*100)}%;background:var(--gold);border-radius:6px;transition:width .5s"></div>` : '<div style="height:100%;width:100%;background:var(--gold);border-radius:6px"></div>'}
        </div>
      </div>
      <div style="text-align:center;min-width:60px">
        <div style="font-family:Cinzel;font-size:1.3rem;color:${streak>=7?'var(--gold2)':'var(--text2)'};font-weight:600">${streak}</div>
        <div style="font-size:.58rem;color:var(--text3);letter-spacing:.05em">dias seguidos</div>
        ${streak>=7?`<div style="font-size:.6rem;color:var(--gold2);margin-top:.1rem">×${mult}</div>`:''}
      </div>
    </div>
    <div style="margin-bottom:.5rem">
      <div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--text3);margin-bottom:.25rem">
        <span>Progresso de hoje</span>
        <span>${concluidas}/${tarefas.length} tarefas · ${pct}%</span>
      </div>
      <div style="background:var(--bg2);border-radius:6px;height:6px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--green2);border-radius:6px;transition:width .5s"></div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${tarefas.map(t => `
        <div style="display:flex;align-items:center;gap:.5rem;font-size:.72rem;color:${atividadesHoje[t.acao]?'var(--green2)':'var(--text2)'}">
          <span>${atividadesHoje[t.acao]?'✓':'○'}</span>
          <span style="flex:1">${t.label}</span>
          <span style="font-size:.6rem;color:${atividadesHoje[t.acao]?'var(--gold)':'var(--text3)'}">+${t.pts} pts</span>
        </div>`).join('')}
      ${atividadesHoje.COMPLETAR_TUDO ? `<div style="display:flex;align-items:center;gap:.5rem;font-size:.72rem;color:var(--gold2)"><span>🏆</span><span style="flex:1">Todas as tarefas concluídas hoje!</span><span style="font-size:.6rem;color:var(--gold)">+${PONTOS.COMPLETAR_TUDO} pts</span></div>` : ''}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div style="color:#e07050;font-size:.8rem">Erro ao carregar pontuação.</div>`;
    console.error('[Gamif]', e);
  }
}

// ─── Aba de Ranking ───────────────────────────────────────────────────────────
export async function renderRanking(currentUid) {
  const el = document.getElementById('ranking-lista');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--text3);font-style:italic;font-size:.82rem;padding:.5rem 0">Carregando ranking...</div>';
  try {
    // Busca admins para excluir do ranking
    const adminsSnap = await db.collection('users').where('role','==','admin').get();
    const adminUIDs = new Set(adminsSnap.docs.map(d => d.id));

    const snap = await db.collection('ranking').orderBy('pontos','desc').limit(60).get();
    if (snap.empty) { el.innerHTML = '<div style="color:var(--text3);font-style:italic;font-size:.82rem">Nenhum dado ainda.</div>'; return; }
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => !adminUIDs.has(u.id) && !adminUIDs.has(u.uid))
      .slice(0, 50);
    if (!items.length) { el.innerHTML = '<div style="color:var(--text3);font-style:italic;font-size:.82rem">Nenhum dado ainda.</div>'; return; }
    el.innerHTML = items.map((u, i) => rankingRowHTML(u, i, currentUid)).join('');
  } catch(e) {
    el.innerHTML = `<div style="color:#e07050;font-size:.82rem">Erro: ${e.message}</div>`;
  }
}

function rankingRowHTML(u, i, currentUid) {
  const pos = i + 1;
  const isMe = u.id === currentUid || u.uid === currentUid;
  const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}º`;
  const kinNatalStr = u.kinNatal && DATA.kins ? (() => {
    const kd = DATA.kins[String(u.kinNatal)];
    if (!kd) return '';
    const base = kd.selo.split(' ').slice(0,-1).join(' ');
    const cor = kd.selo.split(' ').pop();
    const icon = getSeloIconURL(kd.selo);
    return `<div style="display:flex;align-items:center;gap:4px;margin-top:2px">
      <div class="selo-icon selo-${cor.toLowerCase()}" style="width:18px;height:18px;flex-shrink:0;border-radius:3px;margin:0">
        <img src="${icon}" style="width:100%;height:100%;object-fit:contain">
      </div>
      <span style="font-size:.58rem;color:var(--text3)">Kin ${u.kinNatal} · ${base} ${cor}</span>
    </div>`;
  })() : '';

  return `<div class="ranking-row${isMe?' ranking-row-me':''}" onclick="abrirComparacao('${u.id||u.uid}')">
    <div class="ranking-pos">${medalha}</div>
    <img class="ranking-avatar" src="${u.foto||'./icon-192.png'}" onerror="this.src='./icon-192.png'" alt="">
    <div class="ranking-info">
      <div class="ranking-nome">${u.nome||'Anônimo'}${isMe?' <span style="color:var(--gold2);font-size:.55rem">(você)</span>':''}</div>
      ${kinNatalStr}
    </div>
    <div class="ranking-right">
      <div class="ranking-pts">${(u.pontos||0).toLocaleString('pt-BR')}</div>
      <div class="ranking-titulo">${u.emoji||'🌱'} ${u.titulo||'Semente'}</div>
      ${u.streak>0?`<div style="font-size:.55rem;color:var(--gold);margin-top:1px">${u.streak}🔥</div>`:''}
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
  box.innerHTML = '<div style="color:var(--text3);font-style:italic;text-align:center;padding:1rem">Carregando...</div>';
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

    box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:.5rem;align-items:center;margin-bottom:1rem">
      <div style="text-align:center">
        <img src="${r1.foto||'./icon-192.png'}" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--gold)" onerror="this.src='./icon-192.png'">
        <div style="font-family:Cinzel;font-size:.72rem;color:var(--gold2);margin-top:.3rem">${r1.nome||'Você'}</div>
        <div style="font-size:.6rem;color:var(--text3)">${r1.emoji||'🌱'} ${r1.titulo||'Semente'}</div>
      </div>
      <div style="font-family:Cinzel;font-size:.7rem;color:var(--text3);text-align:center">VS</div>
      <div style="text-align:center">
        <img src="${r2.foto||'./icon-192.png'}" style="width:48px;height:48px;border-radius:50%;border:2px solid var(--green)" onerror="this.src='./icon-192.png'">
        <div style="font-family:Cinzel;font-size:.72rem;color:var(--green2);margin-top:.3rem">${r2.nome||'Usuário'}</div>
        <div style="font-size:.6rem;color:var(--text3)">${r2.emoji||'🌱'} ${r2.titulo||'Semente'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:4px;margin-bottom:.8rem">
      <div style="text-align:right;font-family:Cinzel;font-size:1.1rem;color:var(--gold2)">${(d1.pontos||0).toLocaleString('pt-BR')}</div>
      <div style="text-align:center;font-size:.6rem;color:var(--text3);align-self:center">pontos</div>
      <div style="text-align:left;font-family:Cinzel;font-size:1.1rem;color:var(--green2)">${(d2.pontos||0).toLocaleString('pt-BR')}</div>
      <div style="text-align:right;font-size:.75rem;color:${d1.streak>=7?'var(--gold2)':'var(--text3)'}">${d1.streak||0}🔥</div>
      <div style="text-align:center;font-size:.6rem;color:var(--text3);align-self:center">streak</div>
      <div style="text-align:left;font-size:.75rem;color:${d2.streak>=7?'var(--green2)':'var(--text3)'}">${d2.streak||0}🔥</div>
    </div>
    <div style="font-family:Cinzel;font-size:.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">Tarefas de hoje</div>
    ${tarefas.map(t => `
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:4px;align-items:center;padding:.2rem 0;border-bottom:1px solid var(--border)">
      <div style="text-align:right;font-size:.75rem">${a1[t.acao]?'✓':'–'}</div>
      <div style="text-align:center;font-size:.62rem;color:var(--text3);padding:0 .5rem">${t.label}</div>
      <div style="text-align:left;font-size:.75rem">${a2[t.acao]?'✓':'–'}</div>
    </div>`).join('')}
    ${(()=>{
      const kinNatal1 = r1.kinNatal && DATA.kins ? DATA.kins[String(r1.kinNatal)] : null;
      const kinNatal2 = r2.kinNatal && DATA.kins ? DATA.kins[String(r2.kinNatal)] : null;
      if (!kinNatal1 && !kinNatal2) return '';
      const fmt = (kd, n) => kd ? `<div style="font-size:.65rem;color:var(--text)">${kd.selo.split(' ').slice(0,-1).join(' ')}<br><span style="font-size:.58rem;color:var(--text3)">Kin ${n}</span></div>` : '<div style="font-size:.65rem;color:var(--text3)">–</div>';
      return `<div style="margin-top:.8rem;font-family:Cinzel;font-size:.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">Kin Natal</div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:4px;align-items:center">
        ${fmt(kinNatal1, r1.kinNatal)}<div></div>${fmt(kinNatal2, r2.kinNatal)}
      </div>`;
    })()}`;
  } catch(e) {
    box.innerHTML = `<div style="color:#e07050;font-size:.82rem">Erro: ${e.message}</div>`;
  }
}

export { getTitulo, getMultStreak, mostrarToast };
