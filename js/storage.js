// ─── js/storage.js — histórico e favoritos (localStorage) ────────────────────
import { DATA } from './data.js';
import { getSeloCor, getSeloBase, getSeloIconURL } from './calculos.js';

const HIST_KEY = 'sinc13_historico';
const FAV_KEY  = 'sinc13_favoritos';
const HIST_MAX = 20;

export function getHistorico() { try { return JSON.parse(localStorage.getItem(HIST_KEY)||'[]'); } catch { return []; } }
export function getFavoritos()  { try { return JSON.parse(localStorage.getItem(FAV_KEY)||'[]');  } catch { return []; } }
function salvarHistorico(lista) { localStorage.setItem(HIST_KEY, JSON.stringify(lista)); }
function salvarFavoritos(lista)  { localStorage.setItem(FAV_KEY,  JSON.stringify(lista)); }

export function registrarNoHistorico(kinNum) {
  const lista = getHistorico().filter(e => e.kin !== kinNum);
  lista.unshift({ kin: kinNum, ts: Date.now() });
  if (lista.length > HIST_MAX) lista.pop();
  salvarHistorico(lista);
}

export function isFavorito(kinNum) {
  return getFavoritos().some(e => e.kin === kinNum);
}

export function toggleFavorito(kinNum, btn) {
  let lista = getFavoritos();
  if (isFavorito(kinNum)) {
    lista = lista.filter(e => e.kin !== kinNum);
    if (btn) { btn.textContent = '☆'; btn.classList.remove('ativo'); btn.title = 'Salvar nos favoritos'; }
  } else {
    lista.unshift({ kin: kinNum, ts: Date.now() });
    if (btn) { btn.textContent = '★'; btn.classList.add('ativo'); btn.title = 'Remover dos favoritos'; }
  }
  salvarFavoritos(lista);
  renderFavoritos();
}

export function limparHistorico() { salvarHistorico([]); renderHistorico(); }
export function limparFavoritos()  { salvarFavoritos([]); renderFavoritos(); }

function kinListItem(entry, onClickFn, showFav = false) {
  if (!DATA || !DATA.kins) return '';
  const kd = DATA.kins[String(entry.kin)];
  if (!kd) return '';
  const cor   = getSeloCor(kd.selo);
  const base  = getSeloBase(kd.selo);
  const icon  = getSeloIconURL(kd.selo);
  const data  = new Date(entry.ts).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  const fav   = showFav ? `<button class="btn-fav ativo" onclick="toggleFavorito(${entry.kin},this);event.stopPropagation()" title="Remover dos favoritos">★</button>` : '';
  return `<div class="historico-item" onclick="${onClickFn}(${entry.kin})">
    <div class="historico-item-icon selo-icon selo-${cor}"><img src="${icon}" style="width:100%;height:100%;object-fit:contain"></div>
    <div class="historico-item-info">
      <div class="historico-item-nome">${base} ${kd.tom_nome}</div>
      <div class="historico-item-sub">${data}</div>
    </div>
    <span class="historico-item-kin">Kin ${entry.kin}</span>
    ${fav}
  </div>`;
}

export function renderHistorico() {
  const el = document.getElementById('historico-lista');
  if (!el) return;
  const lista = getHistorico();
  el.innerHTML = lista.length
    ? lista.map(e => kinListItem(e, 'verKinPerfil', false)).join('')
    : '<div class="historico-vazio">Nenhuma consulta ainda.</div>';
}

export function renderFavoritos() {
  const el = document.getElementById('favoritos-lista');
  if (!el) return;
  const lista = getFavoritos();
  el.innerHTML = lista.length
    ? lista.map(e => kinListItem(e, 'verKinPerfil', true)).join('')
    : '<div class="historico-vazio">Nenhum kin favoritado ainda. Use a ★ no Kin do Dia ou Natal.</div>';
}   
