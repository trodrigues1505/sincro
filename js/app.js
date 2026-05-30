// ─── js/app.js — ponto de entrada, inicialização e bridge global ──────────────
import { DATA, DATA_PRONTO } from './data.js';
import {
  switchTab, mostrarDetalheOnda, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
  abrirKinModal, fecharModalVideo,
  abrirModalVideo, abrirEbook, abrirSelfDesign,
  togglePrece, compartilharKin, exportPNG,
  atualizarBotaoNotif, toggleNotificacao,
  mostrarOnboarding, proximoOnboarding, fecharOnboarding,
  carregarAviso, fecharAviso,
  exportarCalendario28, exportarPDFKin,
} from './events.js';
import {
  toggleFavorito, limparHistorico, limparFavoritos,
  renderHistorico, renderFavoritos,
} from './storage.js';
import {
  initLogin, initAuthObserver, carregarPerfil,
  salvarKinNatal, limparKinNatal,
} from './api.js';
import * as Api from './api.js';
import {
  registrarAtividade, renderGamificacaoPerfil,
  renderRanking, abrirComparacao,
} from './gamificacao.js';
import { calcOraculo, calcGuia } from './cartilha.js';

// Função global para a tabela guia
window.calcularTabelaGuia = function() {
  const inp = document.getElementById('tabela-guia-inp');
  const kinNum = parseInt(inp?.value);
  if (!kinNum || kinNum < 1 || kinNum > 260) return;

  Promise.all([
    import('./cartilha.js'),
    import('./data.js'),
  ]).then(([cartilha, data]) => {
    const { calcOraculo } = cartilha;
    const { SELOS_NOMES, TONS_NOMES, POEMA_TOM, POEMA_SELO, SELOS_MAIAS } = data;

    const seloIdx = (kinNum - 1) % 20;
    const tomIdx  = ((kinNum - 1) % 13) + 1;
    const oraculo = calcOraculo(kinNum);
    const nomeSelo = SELOS_NOMES[seloIdx] || '';
    const nomeTom  = TONS_NOMES[tomIdx-1] || '';
    const nomeMaia = SELOS_MAIAS[seloIdx]  || '';
    const ps = POEMA_SELO[seloIdx] || {};
    const pt = POEMA_TOM[tomIdx]   || {};

    const linhas = document.getElementById('tabela-guia-linhas');
    const poema  = document.getElementById('tabela-guia-poema');
    const res    = document.getElementById('tabela-guia-resultado');
    if (!linhas || !res) return;

    const row = (label, val, cor='var(--text)') =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:.35rem .6rem;background:var(--bg2);border-radius:5px;border:1px solid var(--border)">
        <span style="font-size:.62rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:Cinzel">${label}</span>
        <span style="font-family:Cinzel;font-size:.75rem;color:${cor}">${val}</span>
      </div>`;

    linhas.innerHTML = [
      row('Kin', `${kinNum} de 260`, 'var(--gold2)'),
      row('Selo Solar', `${nomeSelo} · ${nomeMaia}`, 'var(--gold2)'),
      row('Tom Galáctico', `${tomIdx} · ${nomeTom}`, 'var(--text)'),
      row('Kin Guia', oraculo.guia, 'var(--green2)'),
      row('Kin Análogo', oraculo.analogo, 'var(--text)'),
      row('Kin Antípoda', oraculo.antipoda, 'var(--text)'),
      row('Kin Oculto', oraculo.oculto, 'var(--text3)'),
      row('Palavras-chave', [ps.poder, ps.qualidade, ps.essencia].filter(Boolean).join(' · '), 'var(--gold)'),
    ].join('');

    poema.innerHTML = pt.poder && ps.qualidade ? `
      <div style="font-size:.6rem;color:var(--gold);font-family:Cinzel;letter-spacing:.1em;margin-bottom:.5rem">POEMA RESSONANTE · KIN ${kinNum}</div>
      Eu ${pt.poder} com o fim de ${ps.qualidade},<br>
      ${pt.acao} ${ps.poder.toLowerCase()},<br>
      <span style="color:var(--text3);font-size:.8rem">Com o tom ${pt.qualidade} do ${nomeTom.toLowerCase()}.</span>` : '';

    res.style.display = 'block';
  });
};

// ─── Bridge de gamificação para onclick= no HTML ──────────────────────────────
function _registrarAtv(acao) {
  if (!window._currentUID) return;
  const u = Api.auth.currentUser;
  registrarAtividade(
    window._currentUID, acao,
    u?.displayName||'', u?.photoURL||'',
    Api._kinNatalSalvo
  );
}

// Wrappers que registram pontos ao chamar a ação
function togglePreceComPontos(btn) {
  togglePrece(btn);
  _registrarAtv('PRECE');
}
function abrirModalVideoComPontos(url, nome) {
  abrirModalVideo(url, nome);
  _registrarAtv('MEDITACAO');
}
function abrirSelfDesignComPontos(kin) {
  abrirSelfDesign(kin);
  _registrarAtv('SELF_DESIGN');
}
function abrirEbookComPontos(url, pag) {
  abrirEbook(url, pag);
  _registrarAtv('EBOOK');
}
function abrirKinNatalComPontos(kinNum, selo, modal) {
  abrirKinModal(kinNum, selo, modal);
  _registrarAtv('KIN_NATAL');
}
function toggleFavoritoComPontos(kinNum, btn) {
  toggleFavorito(kinNum, btn);
  _registrarAtv('FAVORITAR');
}
function fecharComparacao() {
  const m = document.getElementById('modal-comparacao');
  if (m) m.classList.remove('active');
  document.body.style.overflow = '';
}

// ─── Expõe globalmente para onclick= no HTML ──────────────────────────────────
Object.assign(window, {
  DATA,
  switchTab, mostrarDetalheOnda, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
  abrirKinModal: abrirKinNatalComPontos,
  fecharModalVideo,
  _fecharModalVideo: fecharModalVideo,
  abrirModalVideo: abrirModalVideoComPontos,
  abrirEbook: abrirEbookComPontos,
  abrirSelfDesign: abrirSelfDesignComPontos,
  togglePrece: togglePreceComPontos,
  compartilharKin, exportPNG,
  atualizarBotaoNotif, toggleNotificacao,
  mostrarOnboarding, proximoOnboarding, fecharOnboarding,
  carregarAviso, fecharAviso,
  exportarCalendario28, exportarPDFKin,
  toggleFavorito: toggleFavoritoComPontos,
  limparHistorico, limparFavoritos,
  salvarKinNatal, limparKinNatal,
  // gamificação
  renderRanking,
  abrirComparacao,
  fecharComparacao,
  renderGamificacaoPerfil,
});

// ─── switchTab estendido para carregar ranking e gamificação ──────────────────
const _switchTabOrig = switchTab;
window.switchTab = function(t, el) {
  _switchTabOrig(t, el);
  if (t === 'ranking') renderRanking(window._currentUID);
  if (t === 'perfil')  renderGamificacaoPerfil(window._currentUID);
};

// ─── Inicialização ────────────────────────────────────────────────────────────
initLogin();

initAuthObserver(async (user) => {
  window._currentUID = user.uid;
  await DATA_PRONTO;

  // Registra acesso do dia e ganha pontos
  registrarAtividade(
    user.uid, 'ACESSAR_DIA',
    user.displayName||'', user.photoURL||'',
    Api._kinNatalSalvo
  );

  // Atualiza snapshot público com nome/foto/kinNatal
  loadToday();
  carregarPerfil(user);
  carregarAviso();
  atualizarBotaoNotif();
  if (!localStorage.getItem('sinc13_onboard')) mostrarOnboarding();
});
