// ─── js/app.js — ponto de entrada, inicialização e bridge global ──────────────
// Expõe funções no window para os onclick= no HTML (necessário com ES Modules)
import { DATA, DATA_PRONTO } from './data.js';
import {
  switchTab, mostrarDetalheOnda, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
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
  salvarKinNatal, limparKinNatal, currentUserUID, _kinNatalSalvo,
} from './api.js';

// ─── Expõe globalmente para onclick= no HTML ──────────────────────────────────
Object.assign(window, {
  DATA,
  switchTab, mostrarDetalheOnda, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
  abrirModalVideo, abrirEbook, abrirSelfDesign,
  togglePrece, compartilharKin, exportPNG,
  atualizarBotaoNotif, toggleNotificacao,
  mostrarOnboarding, proximoOnboarding, fecharOnboarding,
  carregarAviso, fecharAviso,
  exportarCalendario28, exportarPDFKin,
  toggleFavorito, limparHistorico, limparFavoritos,
  salvarKinNatal, limparKinNatal,
});

// ─── Inicialização ────────────────────────────────────────────────────────────
initLogin();

initAuthObserver(async (user) => {
  await DATA_PRONTO;
  loadToday();
  carregarPerfil(user);
  carregarAviso();
  atualizarBotaoNotif();
  if (!localStorage.getItem('sinc13_onboard')) mostrarOnboarding();
});
