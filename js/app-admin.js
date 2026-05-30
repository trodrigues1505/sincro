// ─── js/app-admin.js — ponto de entrada do painel admin ──────────────────────
import { DATA, DATA_PRONTO } from './data.js';
import {
  switchTab, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
  abrirKinModal, fecharModalVideo,
  abrirModalVideo, abrirEbook, abrirSelfDesign,
  togglePrece, compartilharKin, exportPNG,
  atualizarBotaoNotif, toggleNotificacao,
  mostrarOnboarding, proximoOnboarding, fecharOnboarding,
  carregarAviso, fecharAviso,
  exportarCalendario28, exportarPDFKin,
  mostrarDetalheOnda,
} from './events.js';
import {
  toggleFavorito, limparHistorico, limparFavoritos,
} from './storage.js';
import {
  initAdminObserver, carregarPerfil,
  salvarKinNatal, limparKinNatal, auth,
} from './api.js';

// ─── Expõe globalmente para onclick= no HTML ──────────────────────────────────
Object.assign(window, {
  DATA,
  switchTab, mostrarDetalheOnda, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
  abrirKinModal, fecharModalVideo,
  _fecharModalVideo: fecharModalVideo,
  abrirModalVideo, abrirEbook, abrirSelfDesign,
  togglePrece, compartilharKin, exportPNG,
  atualizarBotaoNotif, toggleNotificacao,
  mostrarOnboarding, proximoOnboarding, fecharOnboarding,
  carregarAviso, fecharAviso,
  exportarCalendario28, exportarPDFKin,
  toggleFavorito, limparHistorico, limparFavoritos,
  salvarKinNatal, limparKinNatal,
});

// ─── Botão sair ───────────────────────────────────────────────────────────────
document.getElementById('btn-logout')?.addEventListener('click', () => auth.signOut()
  .then(() => window.location.href = './index.html'));

// ─── Inicialização do painel admin ────────────────────────────────────────────
initAdminObserver(async (user) => {
  await DATA_PRONTO;
  loadToday();
  carregarPerfil(user);
  carregarAviso();
  atualizarBotaoNotif();
});
