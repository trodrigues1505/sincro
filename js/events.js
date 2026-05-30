// ─── js/events.js — handlers de UI, tabs, modais e ações globais ─────────────
import { DATA, DATA_PRONTO, SELF_DESIGN, MEDITACOES } from './data.js';
import { dateToKin, getRelacaoKins, getAnoGalactico, daysBetween } from './calculos.js';
import { kinHTML } from './renderer.js';
import { registrarNoHistorico, toggleFavorito, limparHistorico, limparFavoritos, renderHistorico, renderFavoritos } from './storage.js';
import { carregarPerfil, salvarKinNatal, limparKinNatal, mostrarKinNatalSalvo } from './api.js';
import * as Api from './api.js';
import { renderLeiDoTempo } from './cartilha.js';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function switchTab(t, el) {
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  (el || event.target).classList.add('active');
  document.getElementById('tab-'+t).classList.add('active');
  if (t === 'selos')  renderSelos();
  if (t === 'perfil') { renderHistorico(); renderFavoritos(); }
  if (t === 'lei') {
    const el = document.getElementById('lei-content');
    if (el && el.children.length <= 1) el.innerHTML = renderLeiDoTempo();
  }
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
  const natal = Api._kinNatalSalvo;
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
  const selosObj = DATA.selos || {};
  const selos = Array.isArray(selosObj) ? selosObj : Object.values(selosObj);

  // Mapa nome do selo → nome do arquivo de ícone
  const ICONE_MAPA = {
    'Dragão':'dragao','Vento':'vento','Noite':'noite','Semente':'semente',
    'Serpente':'serpente','Enlaçador':'enlacador','Enlaçador de Mundos':'enlacador',
    'Mão':'mao','Estrela':'estrela','Lua':'lua','Cão':'cao','Macaco':'macaco',
    'Humano':'humano','Caminhante':'caminhante','Caminhante do Céu':'caminhante',
    'Mago':'mago','Feiticeiro':'mago','Águia':'aguia','Guerreiro':'guerreiro',
    'Terra':'terra','Espelho':'espelho','Tormenta':'tormenta','Sol':'sol',
  };
  const CORES = ['vermelho','branco','azul','amarelo'];

  grid.innerHTML = selos.map((s, i) => {
    const nomeCompleto = s.nome || '';
    // extrai a base (sem a cor no final) para buscar o ícone
    const partes = nomeCompleto.split(' ');
    const cor = CORES[i % 4];
    // tenta achar o ícone pelo nome completo, depois pelo primeiro token
    const nomeBase = partes.slice(0, -1).join(' ') || nomeCompleto;
    const iconeKey = ICONE_MAPA[nomeBase] || ICONE_MAPA[partes[0]] || 'default';
    const iconURL = `./assets/icons/${iconeKey}.png`;
    const safe = nomeCompleto.replace(/'/g,"\\'");
    return `<div class="selo-card" onclick="abrirModalSelo('${safe}','${cor}','${iconURL}',DATA.selos[${i}])">
      <div class="selo-icon selo-${cor}" style="width:56px;height:56px;margin:0 auto"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="selo-card-nome">${nomeCompleto}</div>
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

// ─── Modal de kin (oráculo, onda, castelo) ────────────────────────────────────
export function abrirKinModal(kinNum, seloNome, modoResumido = false) {
  if (!kinNum || !DATA.kins) return;
  const kD = DATA.kins[String(kinNum)];
  if (!kD) return;
  const { kinHTML } = window._renderer || {};
  // Reusa o modal-video para exibir o kinHTML resumido
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal) return;
  // Esconde o iframe e insere HTML do kin no lugar
  iframe.style.display = 'none';
  iframe.src = '';
  let kinContainer = document.getElementById('modal-kin-content');
  if (!kinContainer) {
    kinContainer = document.createElement('div');
    kinContainer.id = 'modal-kin-content';
    kinContainer.style.cssText = 'overflow-y:auto;max-height:80vh;padding:1rem;background:var(--bg);border-radius:var(--radius)';
    iframe.parentNode.insertBefore(kinContainer, iframe);
  }
  kinContainer.style.display = 'block';
  // importa kinHTML dinamicamente para evitar ciclo em tempo de carga
  import('./renderer.js').then(({ kinHTML: kh }) => {
    kinContainer.innerHTML = kh(kinNum, true);
  });
  if (titulo) titulo.textContent = `Kin ${kinNum} · ${kD.selo}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function fecharModalVideo() {
  const modal = document.getElementById('modal-video');
  if (!modal) return;
  modal.classList.remove('active');
  const iframe = document.getElementById('modal-video-iframe');
  if (iframe) { iframe.src = ''; iframe.style.display = ''; }
  const kinContainer = document.getElementById('modal-kin-content');
  if (kinContainer) { kinContainer.style.display = 'none'; kinContainer.innerHTML = ''; }
  document.body.style.overflow = '';
}

export function abrirEbook(url, pagina) {
  if (!url || url === '#') return;
  window.open(url, '_blank');
}

// FIX: abrirSelfDesign abre dentro do modal de vídeo em vez de nova aba
export function abrirSelfDesign(kin) {
  const videoId = SELF_DESIGN[String(kin)];
  if (!videoId) return;
  abrirModalVideo(`https://youtu.be/${videoId}`, `Self Design Sounds · Kin ${kin}`);
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
  try {
    const snap = await Api.db.collection('config').doc('aviso').get();
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
