// ─── js/acesso.js — período de teste (acesso temporário de 13 dias) ──────────
// Modelo de dados, em users/{uid}:
//   • sem `acessoExpiraEm`  → acesso permanente
//   • com `acessoExpiraEm`  → acesso de teste, que termina nesse instante
//
// IMPORTANTE: quem realmente barra o acesso são as Security Rules do Firestore (firestore.rules),
// que comparam `acessoExpiraEm` com a hora do SERVIDOR. Este módulo só cuida da interface
// (aviso de prazo, chip no perfil, tela de "teste encerrado"), usando o relógio do aparelho.

export const DIAS_TESTE = 13;
const DIA_MS = 86400000;
// setTimeout aceita no máximo ~24,8 dias; acima disso o valor estoura e dispara na hora
const MAX_TIMEOUT = 2147483000;

// Aceita o documento do Firestore (Timestamp) ou a cópia guardada no aparelho ({ expMs }).
export function expiraEmMs(d) {
  if (!d) return null;
  if (typeof d.expMs === 'number') return d.expMs;
  const e = d.acessoExpiraEm;
  if (!e) return null;
  if (typeof e.toMillis === 'function') return e.toMillis();
  return null;
}

// expMs === null → permanente → nunca encerra
export function acessoEncerrado(expMs, agora = Date.now()) {
  return expMs !== null && expMs !== undefined && expMs <= agora;
}

export function diasRestantes(expMs, agora = Date.now()) {
  return Math.ceil((expMs - agora) / DIA_MS);
}

function fmtData(ms) {
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function fmtHora(ms) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Texto do aviso. Últimas 24 h falam da data e da hora; antes disso, dos dias restantes.
export function textoPrazo(expMs, agora = Date.now()) {
  const falta = expMs - agora;
  if (falta <= DIA_MS) {
    return `Último dia: seu acesso de teste termina em ${fmtData(expMs)} às ${fmtHora(expMs)}.`;
  }
  const dias = diasRestantes(expMs, agora);
  return `Seu acesso de teste termina em ${dias} dias (${fmtData(expMs)}). Peça ao administrador para torná-lo permanente.`;
}

// Banner individual no topo do app. Dispensável, mas volta no dia seguinte (a chave guarda
// quantos dias faltavam quando foi fechado). Fica vermelho nos últimos 3 dias.
// Não usa a classe .aviso-banner: carregarAviso() (aviso do admin) trata essa classe como
// "já existe um aviso na tela" e deixaria de mostrar o aviso do admin.
export function mostrarAvisoPrazo(uid, expMs) {
  const box = document.getElementById('aviso-container');
  if (!box) return;
  box.querySelector('.prazo-banner')?.remove();
  if (expMs === null || expMs === undefined) return;
  const falta = expMs - Date.now();
  if (falta <= 0) return;

  const urgente = falta <= 3 * DIA_MS;
  const chave = `sinc13_prazo_${uid}_${diasRestantes(expMs)}`;
  try { if (localStorage.getItem(chave)) return; } catch (_) {}

  const el = document.createElement('div');
  el.className = 'prazo-banner' + (urgente ? ' is-urgente' : '');
  el.setAttribute('role', urgente ? 'alert' : 'status');
  el.innerHTML =
    '<span class="prazo-banner-icon"><svg class="ico" aria-hidden="true"><use href="#i-hourglass"/></svg></span>' +
    '<span class="prazo-banner-texto"></span>' +
    '<button type="button" class="aviso-banner-close" aria-label="Fechar aviso"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>';
  el.querySelector('.prazo-banner-texto').textContent = textoPrazo(expMs);
  el.querySelector('button').onclick = () => {
    try { localStorage.setItem(chave, '1'); } catch (_) {}
    el.remove();
  };
  box.prepend(el);
}

// Chip no perfil: "Acesso de teste · termina em dd/mm". Permanente não mostra nada.
export function mostrarAcessoPerfil(expMs) {
  const el = document.getElementById('perfil-acesso');
  if (!el) return;
  el.textContent = '';
  if (expMs === null || expMs === undefined) return;
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = `Acesso de teste · termina em ${fmtData(expMs)}`;
  el.appendChild(chip);
}

// Chama aoVencer() uma única vez quando o prazo chegar, mesmo com o app aberto.
// Celular em segundo plano atrasa timers; por isso também confere quando a aba volta a ficar visível.
export function agendarFimDoPrazo(expMs, aoVencer) {
  if (expMs === null || expMs === undefined) return;
  let disparou = false;
  const vencer = () => { if (!disparou) { disparou = true; aoVencer(); } };
  const tick = () => {
    if (disparou) return;
    const falta = expMs - Date.now();
    if (falta <= 0) { vencer(); return; }
    setTimeout(tick, Math.min(falta + 500, MAX_TIMEOUT));
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && expMs - Date.now() <= 0) vencer();
  });
  tick();
}
