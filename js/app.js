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
