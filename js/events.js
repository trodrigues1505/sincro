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
  if (t === 'perfil') {
    renderHistorico();
    renderFavoritos();
    renderCronografoPerfil();
  }
  if (t === 'lei') {
    const el = document.getElementById('lei-content');
    if (el && el.children.length <= 1) {
      import('./cartilha.js').then(({ renderLeiDoTempo, renderTabelaGuia }) => {
        el.innerHTML = renderLeiDoTempo() + renderTabelaGuia();
      });
    }
  }
}

function renderCronografoPerfil() {
  const el = document.getElementById('perfil-cronografo-preview');
  if (!el) return;
  try {
    const hoje = new Date();
    const key = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
    const todos = JSON.parse(localStorage.getItem('sinc13_cronografo') || '{}');
    const reg = todos[key] || {};
    const campos = [
      reg.afirmacao      && ['Afirmação',       reg.afirmacao],
      reg.intencao       && ['Intenção',         reg.intencao],
      reg.sincronicidade && ['Sincronicidades',  reg.sincronicidade],
      reg.gratidao       && ['Gratidão',         reg.gratidao],
    ].filter(Boolean);
    if (!campos.length) {
      el.innerHTML = `<p style="font-size:.82rem;color:var(--text3);font-style:italic">Nenhum registro hoje ainda. Acesse o Kin do Dia para preencher.</p>`;
      return;
    }
    el.innerHTML = `
      <div style="font-size:.62rem;color:var(--gold);font-family:Cinzel;letter-spacing:.08em;margin-bottom:.5rem">${key}</div>
      ${campos.map(([lbl, val]) => `
      <div style="margin-bottom:.4rem">
        <span style="font-size:.58rem;color:var(--text3);text-transform:uppercase;letter-spacing:.07em">${lbl}: </span>
        <span style="font-size:.8rem;color:var(--text2);font-style:italic">${val.length > 120 ? val.slice(0,120)+'...' : val}</span>
      </div>`).join('')}`;
  } catch(e) {
    el.innerHTML = '';
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
    const partes = nomeCompleto.split(' ');
    const cor = CORES[i % 4];
    const nomeBase = partes.slice(0, -1).join(' ') || nomeCompleto;
    const iconeKey = ICONE_MAPA[nomeBase] || ICONE_MAPA[partes[0]] || 'default';
    const iconURL = `./assets/icons/${iconeKey}.png`;
    const safe = nomeCompleto.replace(/'/g,"\\'");
    // nome maia — índice baseado na posição no grid
    const maias = ['IMIX','IK','AKBAL','KAN','CHICCHAN','CIMI','MANIK','LAMAT','MULUC','OC','CHUEN','EB','BEN','IX','MEN','CIB','CABAN','ETZNAB','CAUAC','AHAU'];
    const nomeMaia = maias[i] || '';
    return `<div class="selo-card" onclick="abrirModalSelo('${safe}','${cor}','${iconURL}',DATA.selos[${i}])">
      <div class="selo-icon selo-${cor}" style="width:56px;height:56px;margin:0 auto"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain" onerror="this.style.opacity='.3'"></div>
      <div class="selo-card-nome">${nomeCompleto}</div>
      <div style="font-size:.55rem;color:var(--gold);letter-spacing:.1em;font-family:Cinzel;margin:.1rem 0">${nomeMaia}</div>
      <div class="selo-card-acao">${s.acao||''}</div>
    </div>`;
  }).join('');
}

export function abrirModalSelo(nome, cor, iconURL, dados) {
  import('./cartilha.js').then(({ gerarInfoSelo }) => {
    import('./data.js').then(({ SELOS_NOMES, SELOS_MAIAS, POEMA_SELO, FAMILIAS_TERRESTRES, FAMILIAS_DESC, RACAS_RAIZ, RACAS_DESC }) => {
      // Descobre índice do selo pelo nome
      const nomeBase = (dados?.nome || nome || '').split(' ').slice(0,-1).join(' ') || nome;
      const seloIdx = SELOS_NOMES.findIndex(n => n === nomeBase || n === (dados?.nome||'').split(' ').slice(0,-1).join(' '));
      const nomeMaia   = seloIdx >= 0 ? (SELOS_MAIAS[seloIdx]||'') : '';
      const familia    = seloIdx >= 0 ? (FAMILIAS_TERRESTRES[seloIdx]||'') : '';
      const raca       = seloIdx >= 0 ? (RACAS_RAIZ[seloIdx]||'') : '';
      const palavras   = seloIdx >= 0 ? (POEMA_SELO[seloIdx]||{}) : {};
      const fdesc      = FAMILIAS_DESC[familia] || {};
      const rdesc      = RACAS_DESC[raca]       || {};

      const box = document.querySelector('.modal-selo-box');
      if (!box) return;

      document.querySelector('.modal-selo-icon').style.borderColor = `var(--${cor})`;
      document.querySelector('.modal-selo-icon').innerHTML = `<img src="${iconURL}" style="width:100%;height:100%;object-fit:contain">`;
      document.querySelector('.modal-selo-titulo').textContent = dados?.nome || nome;
      document.querySelector('.modal-selo-acao').textContent   = '';
      document.querySelector('.modal-selo-maya').textContent   = '';

      const descEl = document.querySelector('.modal-selo-desc');
      descEl.innerHTML = `
        ${nomeMaia ? `<div style="font-family:Cinzel;font-size:.65rem;color:var(--gold);letter-spacing:.1em;margin-bottom:.5rem">${nomeMaia}</div>` : ''}
        ${palavras.poder || palavras.qualidade ? `
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">
          ${[palavras.poder, palavras.qualidade, palavras.essencia].filter(Boolean).map(p =>
            `<span style="background:rgba(165,124,0,.1);border:1px solid var(--border-g);border-radius:20px;padding:2px 9px;font-size:.6rem;color:var(--gold2);font-family:Cinzel">${p}</span>`
          ).join('')}
        </div>` : ''}
        ${dados?.acao ? `<div style="font-size:.82rem;color:var(--text2);margin-bottom:.5rem;font-style:italic">${dados.acao}</div>` : ''}
        ${dados?.descricao || dados?.desc ? `<div style="font-size:.82rem;color:var(--text);margin-bottom:.7rem;line-height:1.7">${dados.descricao||dados.desc}</div>` : ''}
        ${familia || raca ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-top:.5rem">
          ${raca ? `<div style="background:var(--bg2);border-radius:6px;padding:.5rem;border:1px solid var(--border)">
            <div style="font-size:.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.2rem">Raça Raiz</div>
            <div style="font-family:Cinzel;font-size:.72rem;color:var(--gold2)">${raca}</div>
            <div style="font-size:.65rem;color:var(--text3);margin-top:.15rem">${rdesc.papel||''}</div>
          </div>` : ''}
          ${familia ? `<div style="background:var(--bg2);border-radius:6px;padding:.5rem;border:1px solid var(--border)">
            <div style="font-size:.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.2rem">Família</div>
            <div style="font-family:Cinzel;font-size:.72rem;color:var(--gold2)">${familia}</div>
            <div style="font-size:.65rem;color:var(--text3);margin-top:.15rem">${fdesc.desc||''}</div>
          </div>` : ''}
        </div>` : ''}`;

      document.getElementById('modal-selo').classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });
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
const TEXTO_PRECE = `
<div style="text-align:center;line-height:2.1;font-size:.88rem;color:var(--text)">
  <div style="margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Casa Leste da Luz</div>
    <div style="color:var(--text2);font-style:italic">Que a sabedoria se abra em aurora sobre nós<br>Para que vejamos as coisas com claridade</div>
  </div>
  <div style="margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Casa Norte da Noite</div>
    <div style="color:var(--text2);font-style:italic">Que a sabedoria amadureça entre nós<br>Para que conheçamos tudo desde dentro</div>
  </div>
  <div style="margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Casa Oeste da Transformação</div>
    <div style="color:var(--text2);font-style:italic">Que a sabedoria se transforme em ação correta<br>Para que façamos o que tenha que ser feito</div>
  </div>
  <div style="margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Casa Sul do Sol Eterno</div>
    <div style="color:var(--text2);font-style:italic">Que a ação correta nos dê a colheita<br>Para que desfrutemos os frutos do ser planetário</div>
  </div>
  <div style="margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Casa Superior do Paraíso</div>
    <div style="color:var(--text2);font-style:italic">Onde se reúnem a gente das estrelas e os antepassados<br>Que suas bênçãos cheguem até nós agora</div>
  </div>
  <div style="margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Casa Interior da Terra</div>
    <div style="color:var(--text2);font-style:italic">Que o pulsar do coração de cristal do planeta<br>nos abençoe com suas harmonias<br>Para que acabemos com as guerras</div>
  </div>
  <div style="margin-bottom:1.2rem">
    <div style="font-family:Cinzel;font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.3rem">Desde a Fonte Central da Galáxia</div>
    <div style="color:var(--text2);font-style:italic">Que está em todas as partes ao mesmo tempo<br>Que tudo se reconheça como luz e amor mútuo</div>
  </div>
  <div style="color:var(--gold2);font-family:Cinzel;font-size:.82rem;letter-spacing:.06em;line-height:1.9">
    Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
    Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
    Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
    <span style="font-size:.68rem;color:var(--text3)">Salve a Harmonia da Mente e da Natureza!</span>
  </div>
</div>`;

export function togglePrece(btn) {
  // Abre o modal com o texto da prece + player de áudio
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal) return;

  // Esconde iframe, mostra conteúdo da prece
  iframe.style.display = 'none';
  iframe.src = '';
  let kinContainer = document.getElementById('modal-kin-content');
  if (!kinContainer) {
    kinContainer = document.createElement('div');
    kinContainer.id = 'modal-kin-content';
    kinContainer.style.cssText = 'overflow-y:auto;max-height:70vh;padding:1rem;background:var(--bg);border-radius:var(--radius)';
    iframe.parentNode.insertBefore(kinContainer, iframe);
  }
  kinContainer.style.display = 'block';

  // Cria player de áudio inline
  const audioId = 'prece-modal-audio';
  kinContainer.innerHTML = `
    <div style="display:flex;align-items:center;gap:.8rem;background:rgba(165,124,0,.07);border:1px solid var(--border-g);border-radius:8px;padding:.7rem 1rem;margin-bottom:1.1rem">
      <span style="font-size:1.4rem">🙏</span>
      <div style="flex:1">
        <div style="font-family:Cinzel;font-size:.72rem;color:var(--gold2);margin-bottom:.3rem">Prece das 7 Direções Galácticas</div>
        <audio id="${audioId}" src="./assets/icons/prece.mpeg" controls style="width:100%;height:32px;accent-color:var(--gold2)"></audio>
      </div>
    </div>
    ${TEXTO_PRECE}`;

  // Inicia reprodução automática
  setTimeout(() => {
    const audio = document.getElementById(audioId);
    if (audio) audio.play().catch(()=>{});
  }, 200);

  if (titulo) titulo.textContent = '🙏 Prece das 7 Direções Galácticas';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
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
