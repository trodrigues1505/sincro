// ─── js/app.js — ponto de entrada, inicialização e bridge global ──────────────
import { DATA, DATA_PRONTO } from './data.js';
import {
  switchTab, mostrarDetalheOnda, loadToday, calcNatal, verKinPerfil,
  renderSelos, abrirModalSelo, fecharModalSelo,
  abrirKinModal, fecharModalVideo,
  abrirModalVideo, abrirEbook, abrirSelfDesign, abrirTextoSolsticio,
  togglePrece, compartilharKin, exportPNG,
  atualizarBotaoNotif, toggleNotificacao,
  mostrarOnboarding, proximoOnboarding, fecharOnboarding,
  carregarAviso, fecharAviso,
  exportarCalendario28, exportarPDFKin,
  abrirModalPlasma, abrirModalFaseLunar, abrirModalCastelo, mostrarKinDiaLua,
  verificarEnquete, renderEnquetePerfil,
} from './events.js';
import {
  toggleFavorito, limparHistorico, limparFavoritos,
  renderHistorico, renderFavoritos,
} from './storage.js';
import {
  initLogin, initAuthObserver, carregarPerfil,
  salvarKinNatal, limparKinNatal, excluirContaCompleta,
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
  if (!kinNum || kinNum < 1 || kinNum > 260) {
    if (window.mostrarToast) window.mostrarToast('Informe um Kin entre 1 e 260.', 'erro');
    return;
  }

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

    // Estilos vivem no CSS (.kv-row, .kv-label, .kv-val). Modificadores de cor: is-gold | is-green | is-muted
    const row = (label, val, mod = '') =>
      `<div class="kv-row">
        <span class="kv-label">${label}</span>
        <span class="kv-val ${mod}">${val}</span>
      </div>`;

    linhas.className = 'kv-list';
    linhas.innerHTML = [
      row('Kin', `${kinNum} de 260`, 'is-gold'),
      row('Selo Solar', `${nomeSelo} · ${nomeMaia}`, 'is-gold'),
      row('Tom Galáctico', `${tomIdx} · ${nomeTom}`),
      row('Kin Guia', oraculo.guia, 'is-green'),
      row('Kin Análogo', oraculo.analogo),
      row('Kin Antípoda', oraculo.antipoda),
      row('Kin Oculto', oraculo.oculto, 'is-muted'),
      row('Palavras-chave', [ps.poder, ps.qualidade, ps.essencia].filter(Boolean).join(' · '), 'is-gold'),
    ].join('');

    // ps.poder pode não existir mesmo quando ps.qualidade existe: sem o fallback, .toLowerCase()
    // lançaria TypeError antes de res.style.display = 'block' e o resultado ficaria oculto.
    poema.innerHTML = pt.poder && ps.qualidade ? `
      <div class="poema">
        <div class="poema-label">Poema ressonante do Kin ${kinNum}</div>
        Eu ${pt.poder} com o fim de ${ps.qualidade},<br>
        ${pt.acao} ${(ps.poder || '').toLowerCase()},<br>
        <span class="poema-fim">Com o tom ${pt.qualidade} do ${nomeTom.toLowerCase()}.</span>
      </div>` : '';

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
function abrirEbookComPontos(pagina) {
  abrirEbook(pagina);
  _registrarAtv('EBOOK');
}
function abrirTextoSolsticioComPontos() {
  abrirTextoSolsticio();
  _registrarAtv('SOLSTICIO_INVERNO');
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

// ─── Exclusão de conta (LGPD): duas confirmações, agora com diálogo estilizado ─
// window.confirmarModal e window.mostrarToast são definidos no index.html.
// Se não existirem, cai para confirm()/alert() como antes.
async function _confirmar(titulo, texto, confirmar) {
  if (window.confirmarModal) {
    return window.confirmarModal({ titulo, texto, confirmar, perigo: true });
  }
  return confirm(titulo + '\n\n' + texto);
}
function _avisoErro(msg) {
  if (window.mostrarToast) window.mostrarToast(msg, 'erro', 8000);
  else alert(msg);
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
  abrirTextoSolsticio: abrirTextoSolsticioComPontos,
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
  // novos modais
  abrirModalPlasma, abrirModalFaseLunar, abrirModalCastelo, mostrarKinDiaLua,
  // LGPD
  _confirmarExcluirConta: async function() {
    const passo1 = await _confirmar(
      'Excluir conta?',
      'Esta ação excluirá permanentemente sua conta e todos os seus dados. Esta operação não pode ser desfeita.',
      'Continuar'
    );
    if (!passo1) return;
    const passo2 = await _confirmar(
      'Confirmar exclusão definitiva?',
      'Você perderá todo o seu progresso, pontuação e dados.',
      'Excluir tudo'
    );
    if (!passo2) return;
    try {
      await excluirContaCompleta();
    } catch(e) {
      _avisoErro('Erro ao excluir conta: ' + e.message + '. Envie e-mail para adm.financ.espacoautonomia@gmail.com com assunto "LGPD - Excluir conta".');
    }
  },
});

// ─── switchTab estendido para carregar ranking e gamificação ──────────────────
const _switchTabOrig = switchTab;
window.switchTab = function(t, el) {
  _switchTabOrig(t, el);
  if (t === 'ranking') renderRanking(window._currentUID);
  if (t === 'perfil')  { renderGamificacaoPerfil(window._currentUID); renderEnquetePerfil(window._currentUID); }
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
  verificarEnquete(user.uid);
  atualizarBotaoNotif();
  if (!localStorage.getItem('sinc13_onboard')) mostrarOnboarding();
});
