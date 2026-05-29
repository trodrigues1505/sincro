// ─── js/events.js — handlers de UI, tabs, modais e ações globais ─────────────
import { DATA, DATA_PRONTO, SELF_DESIGN, MEDITACOES } from './data.js';
import { dateToKin, getRelacaoKins, getAnoGalactico, daysBetween } from './calculos.js';
import { kinHTML } from './renderer.js';
import { registrarNoHistorico, toggleFavorito, limparHistorico, limparFavoritos, renderHistorico, renderFavoritos } from './storage.js';
import { carregarPerfil, _kinNatalSalvo, salvarKinNatal, limparKinNatal, mostrarKinNatalSalvo } from './api.js';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function switchTab(t, el) {
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  (el || event.target).classList.add('active');
  document.getElementById('tab-'+t).classList.add('active');
  if (t === 'selos')  renderSelos();
  if (t === 'perfil') { renderHistorico(); renderFavoritos(); }
}

// ─── Onda detalhe ─────────────────────────────────────────────────────────────
export function mostrarDetalheOnda(el, texto) {
  const det = document.getElementById('onda-detail');
  if (!det) return;
  if (det.textContent === texto && det.classList.contains('visible')) { det.classList.remove('visible'); return; }
  det.textContent = texto;
  det.classList.add('visible');
}

// ─── Kin do dia e Kin natal ───────────────────────────────────────────────────
export async function loadToday() {
  await DATA_PRONTO;
  const k = dateToKin(new Date());
  registrarNoHistorico(k);
  document.getElementById('res-dia').innerHTML = kinHTML(k);
  // Badge de relação com kin natal
  const { _kinNatalSalvo: natal } = await import('./api.js');
  if (natal) {
    const relacao = getRelacaoKins(k, natal);
    if (relacao) {
      const hero = document.querySelector('#res-dia .kin-hero');
      if (hero) {
        const badge = document.createElement('div');
        badge.style.cssText = 'margin-top:.8rem;display:inline-flex;align-items:center;gap:.4rem;background:rgba(165,124,0,.1);border:1px solid var(--border-g);border-radius:20px;padding:.3rem .8rem;font-family:Cinzel;font-size:.62rem;letter-spacing:.05em';
        badge.style.color = relacao.cor;
        badge.innerHTML = `${relacao.icon} <strong>${relacao.label}</strong> com seu Kin Natal · ${relacao.desc}`;
        hero.appendChild(badge);
      }
    }
  }
}

export async function calcNatal() {
  await DATA_PRONTO;
  const v = document.getElementById('nasc-inp').value;
  if (!v) return;
  const [y,m,d] = v.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  const k  = dateToKin(dt);
  registrarNoHistorico(k);
  document.getElementById('res-natal').innerHTML = kinHTML(k, true);
  document.getElementById('res-natal').classList.remove('hidden');
}

export function verKinPerfil(kinNum) {
  const tabNatal = document.querySelector('[onclick*="natal"]');
  if (tabNatal) switchTab('natal', tabNatal);
  document.getElementById('nasc-inp').value = '';
  document.getElementById('res-natal').innerHTML = kinHTML(kinNum, true);
  document.getElementById('res-natal').classList.remove('hidden');
  document.getElementById('res-natal').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ─── Selos ────────────────────────────────────────────────────────────────────
export async function renderSelos() {
  await DATA_PRONTO;
  const grid = document.getElementById('selos-grid');
  if (!grid || grid.children.length > 0) return;
  const selos = DATA.selos || [];
  grid.innerHTML = selos.map((s,i) => {
    const cor = ['vermelho','branco','azul','amarelo'][i%4];
    const iconURL = `./assets/icons/${['dragao','vento','noite','semente','serpente','enlacador','mao','estrela','lua','cao','macaco','humano','caminhante','mago','aguia','guerreiro','terra','espelho','tormenta','sol'][i]||'default'}.png`;
    return `<div class="selo-card" onclick="abrirModalSelo('${s.nome||''}','${cor}','${iconURL}',DATA.selos[${i}])">
      <div class="selo-icon selo-${cor}" style="width:56px;height:56px;margin:0 auto"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="selo-card-nome">${s.nome||''}</div>
      <div class="selo-card-acao">${s.acao||''}</div>
    </div>`;
  }).join('');
}

export function abrirModalSelo(nome, cor, iconURL, dados) {
  const box = document.querySelector('.modal-selo-box');
  if (!box) return;
  document.querySelector('.modal-selo-icon').style.borderColor = `var(--${cor})`;
  document.querySelector('.modal-selo-icon').innerHTML = `<img src="${iconURL}" style="width:100%;height:100%;object-fit:contain">`;
  document.querySelector('.modal-selo-titulo').textContent = dados.nome||nome;
  document.querySelector('.modal-selo-acao').textContent   = dados.acao||'';
  document.querySelector('.modal-selo-maya').textContent   = dados.maya||'';
  document.querySelector('.modal-selo-desc').textContent   = dados.descricao||dados.desc||'';
  document.getElementById('modal-selo').classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function fecharModalSelo() {
  document.getElementById('modal-selo').classList.remove('active');
  document.body.style.overflow = '';
}

// ─── Modais de mídia ──────────────────────────────────────────────────────────
export function abrirModalVideo(url, nomeSeloVideo) {
  if (!url) return;
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal || !iframe) return;
  const videoId = url.includes('youtu') ? (url.split(/v=|youtu\.be\//)[1]||'').split(/[?&]/)[0] : '';
  iframe.src = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
  if (titulo) titulo.textContent = nomeSeloVideo ? `Meditação · ${nomeSeloVideo}` : 'Meditação';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function abrirEbook(url, pagina) {
  if (!url || url === '#') return;
  window.open(url, '_blank');
}

export function abrirSelfDesign(kin) {
  const videoId = SELF_DESIGN[String(kin)];
  if (!videoId) return;
  window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// ─── Prece ────────────────────────────────────────────────────────────────────
export function togglePrece(btn) {
  let audio = document.getElementById('audio-prece');
  if (!audio) { audio = document.createElement('audio'); audio.id = 'audio-prece'; audio.src = './assets/icons/prece.mpeg'; document.body.appendChild(audio); }
  if (!audio.paused) { audio.pause(); audio.currentTime = 0; btn.textContent = '▶ ouvir'; btn.classList.remove('tocando'); return; }
  audio.load();
  const p = audio.play();
  if (p !== undefined) {
    p.then(() => {
      btn.textContent = '■ parar'; btn.classList.add('tocando');
      audio.onended = () => { btn.textContent = '▶ ouvir'; btn.classList.remove('tocando'); };
    }).catch(e => { console.error('Prece erro:', e); window.open('./assets/prece.mpeg','_blank'); });
  }
}

// ─── Compartilhar e exportar ──────────────────────────────────────────────────
export async function compartilharKin() {
  const area = document.getElementById('export-area');
  if (!area) return;
  if (navigator.share) {
    try { await navigator.share({ title: 'Sincronário das 13 Luas', text: area.querySelector('.kin-title')?.textContent||'', url: window.location.href }); } catch(e) {}
  } else {
    navigator.clipboard?.writeText(window.location.href);
    alert('Link copiado!');
  }
}

export async function exportPNG() {
  const area = document.getElementById('export-area');
  const canvas = await html2canvas(area, { backgroundColor:'#0a0c14', scale:2 });
  const link = document.createElement('a');
  link.download = `sincronario-${new Date().toISOString().split('T')[0]}.png`;
  link.href = canvas.toDataURL(); link.click();
}

// ─── Notificações ─────────────────────────────────────────────────────────────
export function atualizarBotaoNotif() {
  const btn = document.getElementById('btn-notif');
  if (!btn) return;
  const ativo = Notification?.permission === 'granted' && localStorage.getItem('sinc13_notif') === '1';
  btn.textContent = ativo ? 'Desativar' : 'Ativar';
  btn.classList.toggle('ativo', ativo);
}

export async function toggleNotificacao() {
  if (Notification?.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
  }
  const ativo = localStorage.getItem('sinc13_notif') === '1';
  localStorage.setItem('sinc13_notif', ativo ? '0' : '1');
  if (!ativo) agendarNotificacaoDiaria();
  atualizarBotaoNotif();
}

function agendarNotificacaoDiaria() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_NOTIF' });
  }
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
let onboardStep = 0;
const ONBOARD_STEPS = 5;

export function mostrarOnboarding() {
  document.getElementById('onboarding').classList.add('active');
  onboardStep = 0; atualizarOnboarding();
}

function atualizarOnboarding() {
  document.querySelectorAll('.onboarding-step').forEach((s,i) => s.classList.toggle('active', i===onboardStep));
  document.querySelectorAll('.onboarding-dot').forEach((d,i) => d.classList.toggle('active', i===onboardStep));
}

export function proximoOnboarding() {
  onboardStep++;
  if (onboardStep >= ONBOARD_STEPS) fecharOnboarding(); else atualizarOnboarding();
}

export function fecharOnboarding() {
  document.getElementById('onboarding').classList.remove('active');
  localStorage.setItem('sinc13_onboard','1');
}

// ─── Aviso banner ─────────────────────────────────────────────────────────────
export async function carregarAviso() {
  const { db } = await import('./api.js');
  try {
    const snap = await db.collection('config').doc('aviso').get();
    if (!snap.exists) return;
    const d = snap.data();
    if (!d.ativo || !d.mensagem) return;
    const chave = 'sinc13_aviso_' + (d.versao||'1');
    if (localStorage.getItem(chave)) return;
    const banner = document.createElement('div');
    banner.className = 'aviso-banner';
    banner.innerHTML = `<span class="aviso-banner-icon">📢</span><span class="aviso-banner-texto">${d.mensagem}</span><button class="aviso-banner-close" onclick="fecharAviso(this,'${chave}')">✕</button>`;
    document.querySelector('.container')?.prepend(banner);
  } catch(e) {}
}

export function fecharAviso(btn, chave) {
  localStorage.setItem(chave, '1');
  btn.closest('.aviso-banner').remove();
}

// ─── Exportar calendário e PDF ────────────────────────────────────────────────
export async function exportarCalendario28() {
  await DATA_PRONTO;
  const hoje = new Date();
  const anoGal = getAnoGalactico();
  const dias = daysBetween(new Date(anoGal,6,26), hoje);
  const luaAtual = Math.floor(dias/28)+1;
  const inicioLua = new Date(anoGal,6,26);
  inicioLua.setDate(inicioLua.getDate() + (luaAtual-1)*28);
  const rows = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(inicioLua); d.setDate(d.getDate()+i);
    const k = dateToKin(d);
    const kD = DATA.kins[k];
    if (!kD) continue;
    rows.push(`${d.toLocaleDateString('pt-BR')}\tKin ${k}\t${kD.selo}\t${kD.tom_nome}`);
  }
  const blob = new Blob([rows.join('\n')], { type:'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `calendario-lua-${luaAtual}.txt`; a.click();
}

export async function exportarPDFKin() {
  const area = document.getElementById('export-area');
  if (!area || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') return;
  const canvas = await html2canvas(area, { backgroundColor:'#0a0c14', scale:2 });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation:'portrait', unit:'px', format:'a4' });
  const imgW = pdf.internal.pageSize.getWidth();
  const imgH = (canvas.height * imgW) / canvas.width;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
  pdf.save(`sincronario-kin-${new Date().toISOString().split('T')[0]}.pdf`);
}
