// ─── js/events.js — handlers de UI, tabs, modais e ações globais ─────────────
import { DATA, DATA_PRONTO, SELF_DESIGN, MEDITACOES } from './data.js';
import { dateToKin, getRelacaoKins, getAnoGalactico, daysBetween } from './calculos.js';
import { kinHTML } from './renderer.js';
import { registrarNoHistorico, toggleFavorito, limparHistorico, limparFavoritos, renderHistorico, renderFavoritos } from './storage.js';
import { carregarPerfil, salvarKinNatal, limparKinNatal, mostrarKinNatalSalvo } from './api.js';
import * as Api from './api.js';
import { renderLeiDoTempo, esc } from './cartilha.js';

// Feedback visual (toast definido no index.html); cai para alert() se não existir
function avisar(msg, tipo) {
  if (window.mostrarToast) window.mostrarToast(msg, tipo);
  else alert(msg);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function switchTab(t, el) {
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  (el || event.target).classList.add('active');
  document.getElementById('tab-'+t).classList.add('active');
  window.scrollTo(0, 0);
  if (t === 'selos')  renderSelos();
  if (t === 'perfil') {
    renderHistorico();
    renderFavoritos();
    renderCronografoPerfil();
  }
  if (t === 'lei') {
    const el = document.getElementById('lei-content');
    // o placeholder tem 1 filho; depois de renderizado passa de 1
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
      el.innerHTML = `<div class="historico-vazio">Nenhum registro hoje ainda. Abra o Kin do Dia para preencher.</div>`;
      return;
    }
    el.innerHTML = `
      <div class="hist-data">${esc(key)}</div>
      ${campos.map(([lbl, val]) => `
      <div class="hist-campo">
        <span class="hist-lbl">${lbl}:</span>
        <span class="hist-val">${esc(val.length > 120 ? val.slice(0,120)+'...' : val)}</span>
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
        badge.className = 'relacao-badge';
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
  if (!v) { avisar('Informe a data de nascimento.', 'erro'); return; }
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
    'Mão':'mao','Estrela':'estrela','Lua':'lua',
    'Cão':'cao','Cachorro':'cao',  // ambas as variantes do JSON
    'Macaco':'macaco','Humano':'humano',
    'Caminhante':'caminhante','Caminhante do Céu':'caminhante',
    'Mago':'mago','Feiticeiro':'mago','Águia':'aguia','Guerreiro':'guerreiro',
    'Terra':'terra','Espelho':'espelho','Tormenta':'tormenta','Sol':'sol',
  };
  const CORES = ['vermelho','branco','azul','amarelo'];

  grid.innerHTML = selos.map((s, i) => {
    const nomeCompleto = s.nome || '';
    const partes = nomeCompleto.trim().split(' ');
    const cor = CORES[i % 4];
    // extrai base sem a cor — mas protege se só tiver 1 palavra
    const nomeBase = partes.length > 1 ? partes.slice(0, -1).join(' ') : nomeCompleto;
    // tenta pelo nomeBase, depois pelo primeiro token (ex: "Enlaçador"), depois pelo nome completo
    const iconeKey = ICONE_MAPA[nomeBase] || ICONE_MAPA[partes[0]] || ICONE_MAPA[nomeCompleto] || 'default';
    const iconURL = `./assets/icons/${iconeKey}.png`;
    const safe = nomeCompleto.replace(/'/g,"\\'");
    const maias = ['IMIX','IK','AKBAL','KAN','CHICCHAN','CIMI','MANIK','LAMAT','MULUC','OC','CHUEN','EB','BEN','IX','MEN','CIB','CABAN','ETZNAB','CAUAC','AHAU'];
    const nomeMaia = maias[i] || '';
    return `<div class="selo-card" onclick="abrirModalSelo('${safe}','${cor}','${iconURL}',DATA.selos[${i}])">
      <div class="selo-icon selo-${cor}" style="width:56px;height:56px;margin:0 auto"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain" alt="" onerror="this.parentElement.innerHTML='<span style=font-size:1.8rem>${['🐉','💨','🌌','🌱','🐍','☯️','✋','⭐','🌙','🐕','🐒','👤','🚶','🧙','🦅','⚔️','🌍','🪞','⛈️','☀️'][i]||'🌀'}</span>'"></div>
      <div class="selo-card-nome">${nomeCompleto}</div>
      <div class="selo-card-maya">${nomeMaia}</div>
      <div class="selo-card-acao">${s.acao||''}</div>
    </div>`;
  }).join('');
}

export function abrirModalSelo(nome, cor, iconURL, dados) {
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

    // var(--vermelho|branco|azul|amarelo) são definidas no index.html
    document.querySelector('.modal-selo-icon').style.borderColor = `var(--${cor})`;
    document.querySelector('.modal-selo-icon').innerHTML = `<img src="${iconURL}" style="width:100%;height:100%;object-fit:contain" alt="">`;
    document.querySelector('.modal-selo-titulo').textContent = dados?.nome || nome;
    document.querySelector('.modal-selo-acao').textContent   = '';
    document.querySelector('.modal-selo-maya').textContent   = '';

    const descEl = document.querySelector('.modal-selo-desc');
    descEl.innerHTML = `
      ${nomeMaia ? `<div class="selo-maya-tag">${nomeMaia}</div>` : ''}
      ${palavras.poder || palavras.qualidade ? `
      <div class="chips">
        ${[palavras.poder, palavras.qualidade, palavras.essencia].filter(Boolean).map(p =>
          `<span class="chip">${p}</span>`
        ).join('')}
      </div>` : ''}
      ${dados?.acao ? `<div class="selo-acao-txt">${dados.acao}</div>` : ''}
      ${dados?.descricao || dados?.desc ? `<div class="prose" style="margin-bottom:var(--s4)">${dados.descricao||dados.desc}</div>` : ''}
      ${familia || raca ? `
      <div class="tile-grid">
        ${raca ? `<div class="tile">
          <div class="tile-label">Raça Raiz</div>
          <div class="tile-title">${raca}</div>
          <div class="tile-sub">${rdesc.papel||''}</div>
        </div>` : ''}
        ${familia ? `<div class="tile">
          <div class="tile-label">Família</div>
          <div class="tile-title">${familia}</div>
          <div class="tile-sub">${fdesc.desc||''}</div>
        </div>` : ''}
      </div>` : ''}`;

    document.getElementById('modal-selo').classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

export function fecharModalSelo() {
  document.getElementById('modal-selo').classList.remove('active');
  document.body.style.overflow = '';
}

// ─── Modais de mídia ──────────────────────────────────────────────────────────
// Retorna true se o conteúdo abriu. O app.js só dá pontos quando isso é true.
export function abrirModalVideo(url, nomeSeloVideo) {
  if (!url) { avisar('Este conteúdo ainda não está disponível.', 'erro'); return false; }
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal || !iframe) return false;
  const videoId = url.includes('youtu') ? (url.split(/v=|youtu\.be\//)[1]||'').split(/[?&]/)[0] : '';
  // e-book e solstício definem uma altura fixa no iframe; sem limpar, o vídeo herdava 75vh
  iframe.style.height = '';
  iframe.src = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
  if (titulo) titulo.textContent = nomeSeloVideo ? `Meditação · ${nomeSeloVideo}` : 'Meditação';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  return true;
}

// Prepara o modal de vídeo para exibir HTML no lugar do iframe.
// Antes esse bloco estava copiado em 5 funções.
function prepararModalConteudo() {
  const modal  = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal || !iframe) return null;
  iframe.style.display = 'none';
  iframe.style.height = '';
  iframe.src = '';
  let box = document.getElementById('modal-kin-content');
  if (!box) {
    box = document.createElement('div');
    box.id = 'modal-kin-content';
    box.className = 'kin-modal-body';
    iframe.parentNode.insertBefore(box, iframe);
  }
  box.style.display = 'block';
  return { modal, iframe, titulo, box };
}

function abrirModalConteudo(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ─── Modal de kin (oráculo, onda, castelo) ────────────────────────────────────
// 4º parâmetro (rotulo): texto opcional que antecede o título, ex. "Lua 3 · Dia 12 · 14 de agosto".
// mostrarKinDiaLua já o enviava, mas a função só aceitava 3 parâmetros e o texto se perdia.
export function abrirKinModal(kinNum, seloNome, modoResumido = false, rotulo = '') {
  if (!kinNum || !DATA.kins) return false;
  const kD = DATA.kins[String(kinNum)];
  if (!kD) return false;
  const ctx = prepararModalConteudo();
  if (!ctx) return false;
  // importa kinHTML dinamicamente para evitar ciclo em tempo de carga
  import('./renderer.js').then(({ kinHTML: kh }) => {
    ctx.box.innerHTML = kh(kinNum, true);
  });
  if (ctx.titulo) ctx.titulo.textContent = `${rotulo ? rotulo + ' · ' : ''}Kin ${kinNum} · ${kD.selo}`;
  abrirModalConteudo(ctx.modal);
  return true;
}

export function fecharModalVideo() {
  const modal = document.getElementById('modal-video');
  if (!modal) return;
  modal.classList.remove('active');
  const iframe = document.getElementById('modal-video-iframe');
  if (iframe) { iframe.src = ''; iframe.style.display = ''; iframe.style.height = ''; }
  const kinContainer = document.getElementById('modal-kin-content');
  if (kinContainer) { kinContainer.style.display = 'none'; kinContainer.innerHTML = ''; }
  if (_ebook && _ebook.task) { try { _ebook.task.cancel(); } catch (_) {} }
  _ebook = null;
  document.body.style.overflow = '';
}

const EBOOK_FILE_ID = '1PU_VNQH61uUjHl-OESKhHH4TKrDS3JgS';
const EBOOK_EMBED   = 'https://drive.google.com/file/d/' + EBOOK_FILE_ID + '/preview';
const EBOOK_URL     = 'https://drive.google.com/file/d/' + EBOOK_FILE_ID + '/view?usp=sharing';

// ─── E-book ───────────────────────────────────────────────────────────────────
// O visualizador do Google Drive (/preview) não tem parâmetro de página, então a página
// pedida (ex.: "Leitura da página 4") nunca era respeitada: abria sempre no começo.
// Agora o e-book abre num leitor próprio (PDF.js) direto na página certa, com botões
// anterior/próxima. Ele precisa do arquivo em  ./assets/ebook.pdf  (cópia do PDF do Drive).
// Enquanto esse arquivo não existir, cai no Drive como antes e avisa o número da página.
const EBOOK_LOCAL  = './assets/ebook.pdf';
const PDFJS_URL    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let _ebook = null; // { pdf, pagina, total, task, token }

function carregarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('Não foi possível carregar o leitor de PDF.'));
    document.head.appendChild(s);
  });
}

async function renderEbookPagina() {
  const e = _ebook;
  const canvas = document.getElementById('pdf-canvas');
  if (!e || !canvas) return;
  const token = ++e.token;
  if (e.task) { try { e.task.cancel(); } catch (_) {} }
  const page = await e.pdf.getPage(e.pagina);
  if (token !== e.token || !document.getElementById('pdf-canvas')) return;
  const base = page.getViewport({ scale: 1 });
  const largura = canvas.parentElement.clientWidth || 340;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vp = page.getViewport({ scale: (largura / base.width) * dpr });
  canvas.width = vp.width;
  canvas.height = vp.height;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  e.task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
  try { await e.task.promise; } catch (err) { return; } // render cancelado por troca de página
  document.getElementById('pdf-info').textContent = `Página ${e.pagina} de ${e.total}`;
  document.getElementById('pdf-prev').disabled = e.pagina <= 1;
  document.getElementById('pdf-next').disabled = e.pagina >= e.total;
  const caixa = document.querySelector('#modal-video .modal-video-box');
  if (caixa) caixa.scrollTop = 0;
}

window._ebookIr = function(delta) {
  if (!_ebook) return;
  const nova = Math.min(_ebook.total, Math.max(1, _ebook.pagina + delta));
  if (nova === _ebook.pagina) return;
  _ebook.pagina = nova;
  renderEbookPagina();
};

// Retorna Promise<boolean>: true se o e-book abriu (o app.js só dá pontos nesse caso).
export async function abrirEbook(pagina) {
  const ctx = prepararModalConteudo();
  if (!ctx) { window.open(EBOOK_URL, '_blank'); return true; }
  const { modal, iframe, titulo, box } = ctx;
  const alvo = Math.max(1, parseInt(pagina, 10) || 1);
  box.innerHTML = '<div class="historico-vazio">Abrindo o e-book...</div>';
  if (titulo) titulo.textContent = 'E-book · Sincronário das 13 Luas';
  abrirModalConteudo(modal);

  try {
    const pdfjs = await carregarPdfJs();
    const pdf = await pdfjs.getDocument(EBOOK_LOCAL).promise;
    if (!modal.classList.contains('active')) return false; // fechou enquanto carregava
    _ebook = { pdf, pagina: Math.min(alvo, pdf.numPages), total: pdf.numPages, task: null, token: 0 };
    box.innerHTML = `
      <div class="pdf-bar">
        <button class="btn btn-secondary btn-sm" id="pdf-prev" onclick="_ebookIr(-1)" aria-label="Página anterior"><svg class="ico" aria-hidden="true"><use href="#i-chevron-left"/></svg></button>
        <span class="small muted" id="pdf-info" role="status"></span>
        <button class="btn btn-secondary btn-sm" id="pdf-next" onclick="_ebookIr(1)" aria-label="Próxima página"><svg class="ico" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>
      </div>
      <div class="pdf-wrap"><canvas id="pdf-canvas"></canvas></div>`;
    await renderEbookPagina();
    return true;
  } catch (err) {
    // sem ./assets/ebook.pdf (ou sem conexão para o leitor): usa o Drive, que abre no início
    console.warn('[E-book] leitor próprio indisponível, usando o Drive:', err && err.message);
    if (!modal.classList.contains('active')) return false;
    box.style.display = 'none';
    box.innerHTML = '';
    iframe.style.display = '';
    iframe.style.height  = '75vh';
    iframe.src = EBOOK_EMBED;
    if (titulo) titulo.textContent = `E-book · vá até a página ${alvo}`;
    avisar(`O e-book abre no início. Vá até a página ${alvo}.`);
    return true;
  }
}

// ─── Solstício de Inverno ─────────────────────────────────────────────────────
const SOLSTICIO_FILE_ID = '1jrlNwUDhukWczKBUWKSDpnwAzOQSqWPT';
const SOLSTICIO_EMBED   = 'https://drive.google.com/file/d/' + SOLSTICIO_FILE_ID + '/preview';
const SOLSTICIO_URL     = 'https://drive.google.com/file/d/' + SOLSTICIO_FILE_ID + '/view?usp=sharing';

export function abrirTextoSolsticio() {
  const modal  = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal || !iframe) { window.open(SOLSTICIO_URL, '_blank'); return true; }
  const kc = document.getElementById('modal-kin-content');
  if (kc) { kc.style.display = 'none'; kc.innerHTML = ''; }
  iframe.style.display = '';
  iframe.style.height  = '75vh';
  iframe.src = SOLSTICIO_EMBED;
  if (titulo) titulo.textContent = 'Solstício de Inverno';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  return true;
}

// FIX: abrirSelfDesign abre dentro do modal de vídeo em vez de nova aba
export function abrirSelfDesign(kin) {
  const videoId = SELF_DESIGN[String(kin)];
  if (!videoId) { avisar('O Self Design Sounds deste Kin ainda não está disponível.', 'erro'); return false; }
  return abrirModalVideo(`https://youtu.be/${videoId}`, `Self Design Sounds · Kin ${kin}`);
}

// ─── Prece ────────────────────────────────────────────────────────────────────
const TEXTO_PRECE = `
<div class="prece">
  ${[
    ['Leste da Luz',            'Que a sabedoria se abra em aurora sobre nós<br>Para que vejamos as coisas com claridade'],
    ['Norte da Noite',          'Que a sabedoria amadureça entre nós<br>Para que conheçamos tudo desde dentro'],
    ['Oeste da Transformação',  'Que a sabedoria se transforme em ação correta<br>Para que façamos o que tenha que ser feito'],
    ['Sul do Sol Eterno',       'Que a ação correta nos dê a colheita<br>Para que desfrutemos os frutos do ser planetário'],
    ['Superior do Paraíso',     'Onde se reúnem a gente das estrelas e os antepassados<br>Que suas bênçãos cheguem até nós agora'],
    ['Interior da Terra',       'Que o pulsar do coração de cristal do planeta<br>nos abençoe com suas harmonias<br>Para que acabemos com as guerras'],
  ].map(([casa, verso]) => `
  <div class="prece-bloco">
    <div class="prece-dir">Desde a Casa ${casa}</div>
    <div class="prece-verso">${verso}</div>
  </div>`).join('')}
  <div class="prece-bloco">
    <div class="prece-dir">Desde a Fonte Central da Galáxia</div>
    <div class="prece-verso">Que está em todas as partes ao mesmo tempo<br>Que tudo se reconheça como luz e amor mútuo</div>
  </div>
  <div class="prece-mantra">
    Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
    Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
    Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
    <span class="prece-fim">Salve a Harmonia da Mente e da Natureza!</span>
  </div>
</div>`;

export function togglePrece(btn) {
  const ctx = prepararModalConteudo();
  if (!ctx) return false;
  const { modal, titulo, box: kc } = ctx;
  const AUDIO_SRC   = './assets/prece.mp3';
  const DRIVE_ID    = '1hOUbkDrKGOjs_VE1f83pBgkHlcG6lRIR';
  const DRIVE_EMBED = 'https://drive.google.com/file/d/' + DRIVE_ID + '/preview';
  const audioId     = 'prece-modal-audio';
  const fallbackId  = 'prece-modal-fallback';
  kc.innerHTML = `
    <div class="prece-player">
      <div class="prece-player-titulo">Prece das 7 Direções Galácticas</div>
      <audio id="${audioId}" class="prece-audio" controls preload="auto">
        <source src="${AUDIO_SRC}" type="audio/mpeg">
      </audio>
      <div id="${fallbackId}" class="prece-fallback" style="display:none">
        <div class="small muted">Áudio indisponível. Ouça pelo Drive:</div>
        <iframe src="${DRIVE_EMBED}" style="width:100%;height:80px;border:none;border-radius:8px" allow="autoplay"></iframe>
      </div>
    </div>
    ${TEXTO_PRECE}`;
  setTimeout(() => {
    const audio    = document.getElementById(audioId);
    const fallback = document.getElementById(fallbackId);
    if (!audio || !fallback) return;
    if (audio.error || audio.readyState < 2) {
      audio.style.display = 'none';
      fallback.style.display = 'flex';
    } else {
      audio.play().catch(() => {});
    }
  }, 3000);
  if (titulo) titulo.textContent = 'Prece das 7 Direções Galácticas';
  abrirModalConteudo(modal);
  return true;
}

// ─── Compartilhar e exportar ──────────────────────────────────────────────────
export async function compartilharKin() {
  const area = document.getElementById('export-area');
  if (!area) return;
  if (navigator.share) {
    try { await navigator.share({ title: 'Sincronário das 13 Luas', text: area.querySelector('.kin-title')?.textContent||'', url: window.location.href }); } catch(e) {}
  } else {
    navigator.clipboard?.writeText(window.location.href);
    avisar('Link copiado.', 'sucesso');
  }
}

// #export-area só tem conteúdo nas abas Kin do Dia e Kin Natal. Nas demais ele fica com
// altura 0 e o html2canvas falhava sem nenhuma mensagem.
function areaExportavel() {
  const area = document.getElementById('export-area');
  if (!area || area.offsetHeight < 10) {
    avisar('Abra o Kin do Dia ou o Kin Natal para exportar como imagem.', 'erro');
    return null;
  }
  return area;
}

export async function exportPNG() {
  const area = areaExportavel();
  if (!area) return;
  try {
    const canvas = await html2canvas(area, { backgroundColor:'#060d09', scale:2 });
    const link = document.createElement('a');
    link.download = `sincronario-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL(); link.click();
  } catch(e) {
    console.error('[exportPNG]', e);
    avisar('Não foi possível gerar a imagem. Tente novamente.', 'erro');
  }
}

// ─── Notificações ─────────────────────────────────────────────────────────────
// `Notification?.permission` NÃO protege quando a API não existe: identificador não declarado
// lança ReferenceError antes do `?.`. É o caso do Safari no iPhone fora do app instalado, e o
// erro derrubava a inicialização (onboarding incluído) logo depois do login.
const notifSuportada = () => typeof Notification !== 'undefined';

export function atualizarBotaoNotif() {
  const btn = document.getElementById('btn-notif');
  if (!btn) return;
  const ativo = notifSuportada() && Notification.permission === 'granted' && localStorage.getItem('sinc13_notif') === '1';
  btn.textContent = ativo ? 'Desativar' : 'Ativar';
  btn.classList.toggle('ativo', ativo);
}

export async function toggleNotificacao() {
  if (!notifSuportada()) {
    avisar('Este navegador não oferece notificações. No iPhone, instale o app na tela de início.', 'erro');
    return;
  }
  if (Notification.permission !== 'granted') {
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

// ─── Enquete ───────────────────────────────────────────────────────────────────
export async function verificarEnquete(uid) {
  try {
    const snap = await Api.db.collection('config').doc('enquete_ativa').get();
    if (!snap.exists || !snap.data().ativa) return;
    const d = snap.data();
    const eSnap = await Api.db.collection('enquetes').doc(d.enqueteId).get();
    if (!eSnap.exists) return;
    if ((eSnap.data().votos || {})[uid] !== undefined) return;
    _mostrarModalEnquete(uid, d);
  } catch(e) { console.warn('[Enquete]', e); }
}

function _mostrarModalEnquete(uid, d) {
  document.getElementById('modal-enquete')?.remove();
  const multipla = !!d.multipla;
  const opcoesHTML = d.opcoes.map(o =>
    `<label class="enq-opt">
      <input type="${multipla ? 'checkbox' : 'radio'}" name="enq-opt" value="${esc(o)}">
      <span>${esc(o)}</span>
    </label>`
  ).join('');
  const el = document.createElement('div');
  el.id = 'modal-enquete';
  el.className = 'dialog active';
  el.innerHTML = `
    <div class="dialog-box enquete-box">
      <div class="enq-head">
        <div class="enq-pergunta">${esc(d.pergunta)}</div>
        <div class="enq-hint">${multipla ? 'Selecione uma ou mais opções' : 'Selecione uma opção'}</div>
      </div>
      <div id="enq-opcoes-aluno" class="enq-opcoes">
        ${opcoesHTML}
      </div>
      <div class="enq-actions">
        <button class="btn btn-ghost" onclick="_cancelarEnquete()">Agora não</button>
        <button class="btn btn-primary" onclick="_enviarVotoEnquete()">Votar</button>
      </div>
      <div id="enq-msg-aluno" class="enq-msg" role="alert"></div>
    </div>`;
  el.dataset.uid = uid;
  el.dataset.enqueteId = d.enqueteId;
  el.dataset.multipla  = multipla ? '1' : '';
  document.body.appendChild(el);
}

window._cancelarEnquete = function() {
  document.getElementById('modal-enquete')?.remove();
};

window._enviarVotoEnquete = async function() {
  const modal = document.getElementById('modal-enquete');
  if (!modal) return;
  const uid       = modal.dataset.uid;
  const enqueteId = modal.dataset.enqueteId;
  const multipla  = !!modal.dataset.multipla;
  const selecionadas = [...modal.querySelectorAll('#enq-opcoes-aluno input[name="enq-opt"]')].filter(i => i.checked).map(i => i.value);
  const msgEl = document.getElementById('enq-msg-aluno');
  if (!selecionadas.length) { if (msgEl) { msgEl.className = 'enq-msg msg-erro'; msgEl.textContent = 'Selecione pelo menos uma opção.'; } return; }
  const voto = multipla ? selecionadas : selecionadas[0];
  try {
    await Api.db.collection('enquetes').doc(enqueteId).update({ [`votos.${uid}`]: voto });
    const snap = await Api.db.collection('enquetes').doc(enqueteId).get();
    _mostrarResultadoEnquete(modal, snap.data(), voto);
    renderEnquetePerfil(uid);
  } catch(e) {
    if (msgEl) { msgEl.className = 'enq-msg msg-erro'; msgEl.textContent = 'Erro: ' + e.message; }
  }
};

// Barras de resultado (usadas no modal e no perfil)
function _barrasEnquete(dados, meuVoto) {
  const votos = dados.votos || {};
  const total = Object.keys(votos).length;
  const contagem = {};
  (dados.opcoes || []).forEach(o => contagem[o] = 0);
  Object.values(votos).forEach(v => { (Array.isArray(v) ? v : [v]).forEach(s => { if (s in contagem) contagem[s]++; }); });
  const minhas = Array.isArray(meuVoto) ? meuVoto : [meuVoto];
  const barras = (dados.opcoes || []).map(o => {
    const cnt = contagem[o] || 0;
    const pct = total ? Math.round(cnt / total * 100) : 0;
    const dest = minhas.includes(o);
    return `<div class="bar-row${dest ? ' is-mine' : ''}">
      <div class="bar-head">
        <span>${esc(o)}${dest ? ' <span class="chip chip-sm">seu voto</span>' : ''}</span>
        <span>${cnt} (${pct}%)</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  return { barras, total };
}

function _mostrarResultadoEnquete(modal, dados, meuVoto) {
  const { barras, total } = _barrasEnquete(dados, meuVoto);
  modal.querySelector('div').innerHTML = `
    <div class="enq-head">
      <div class="enq-hint" style="margin:0 0 var(--s2)">Voto registrado</div>
      <div class="enq-pergunta">${esc(dados.pergunta)}</div>
      <div class="enq-hint">${total} voto(s) no total</div>
    </div>
    ${barras}
    <div class="enq-actions">
      <button class="btn btn-primary" onclick="document.getElementById('modal-enquete').remove()">Fechar</button>
    </div>`;
}

export async function renderEnquetePerfil(uid) {
  const el = document.getElementById('perfil-enquete-conteudo');
  if (!el) return;
  try {
    const snap = await Api.db.collection('config').doc('enquete_ativa').get();
    if (!snap.exists || !snap.data().ativa) {
      el.innerHTML = '<div class="historico-vazio">Nenhuma enquete ativa no momento.</div>';
      return;
    }
    const d = snap.data();
    const eSnap = await Api.db.collection('enquetes').doc(d.enqueteId).get();
    if (!eSnap.exists) { el.innerHTML = '<div class="historico-vazio">Enquete indisponível.</div>'; return; }
    const dados  = eSnap.data();
    const votos  = dados.votos || {};
    const meuVoto = votos[uid];
    if (meuVoto === undefined) {
      // verificarEnquete precisa estar em window (agora exposta no app.js)
      el.innerHTML = `<p class="help-text">${esc(d.pergunta)}</p>
        <button class="btn btn-primary btn-sm" onclick="verificarEnquete('${esc(uid)}')">Responder enquete</button>`;
      return;
    }
    const { barras, total } = _barrasEnquete(dados, meuVoto);
    el.innerHTML = `<div class="enq-pergunta" style="font-size:.9375rem;margin-bottom:var(--s4)">${esc(d.pergunta)}</div>
      ${barras}
      <div class="bar-total">${total} voto(s) registrado(s)</div>`;
  } catch(e) {
    el.innerHTML = '<div class="gm-erro">Erro: ' + esc(e.message) + '</div>';
  }
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
    if (document.querySelector('.aviso-banner')) return; // já exibido
    const banner = document.createElement('div');
    banner.className = 'aviso-banner';
    banner.innerHTML = `<span class="aviso-banner-icon"><svg class="ico" aria-hidden="true"><use href="#i-bell"/></svg></span><span class="aviso-banner-texto">${d.mensagem}</span><button class="aviso-banner-close" onclick="fecharAviso(this,'${chave}')" aria-label="Fechar aviso"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>`;
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
  // O index.html não carrega a biblioteca jsPDF; antes a função só retornava sem avisar.
  if (!area || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
    avisar('Exportação em PDF indisponível no momento.', 'erro');
    return;
  }
  if (!areaExportavel()) return;
  try {
    const canvas = await html2canvas(area, { backgroundColor:'#060d09', scale:2 });
    const { jsPDF } = window.jspdf;
    // a tela do Kin é bem mais alta que uma A4; com format:'a4' o PDF saía cortado.
    // Página única com as dimensões da própria imagem (scale:2 → divide por 2).
    const imgW = canvas.width / 2, imgH = canvas.height / 2;
    const pdf = new jsPDF({ orientation: imgW > imgH ? 'landscape' : 'portrait', unit:'px', format:[imgW, imgH] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
    pdf.save(`sincronario-kin-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch(e) {
    console.error('[exportarPDFKin]', e);
    avisar('Não foi possível gerar o PDF.', 'erro');
  }
}

// ─── Modais informativos ───────────────────────────────────────────────────────
export function abrirModalPlasma(chave, emoji, chakra, afirm, desc) {
  const ctx = prepararModalConteudo();
  if (!ctx) return;
  const cores = {'Dali':'#ecc45c','Seli':'#5aa0e0','Gama':'#9b7ee0','Kali':'#e0675f','Alfa':'#6fc2a0','Limi':'#7b9be0','Silio':'#4ade80'};
  const cor = cores[chave] || 'var(--gold2)';
  ctx.box.innerHTML = `
    <div class="im-head" style="--c:${cor}">
      <div class="im-emoji">${emoji}</div>
      <div class="im-title">${chave}</div>
      <div class="im-sub">${desc}</div>
      ${chakra ? `<div class="im-chip">Chacra: ${chakra}</div>` : ''}
    </div>
    <div class="im-quote">${afirm}</div>
    <p class="im-note">Os plasmas radiais são a matéria quântica mínima do universo. Cada dia da semana ativa um plasma diferente, correspondendo a um chacra do corpo quadridimensional. Ao visualizar e recitar a afirmação do plasma, harmonizamos nossa energia com o campo quântico do dia.</p>`;
  if (ctx.titulo) ctx.titulo.textContent = `Plasma ${chave}`;
  abrirModalConteudo(ctx.modal);
}

export function abrirModalFaseLunar(emoji, nome, desc) {
  const ctx = prepararModalConteudo();
  if (!ctx) return;
  const infos = {
    'Nova':      { qual:'Início',      cor:'#7b9be0', dica:'Plante intenções, abra-se ao novo.' },
    'Crescente': { qual:'Expansão',    cor:'#6fc27a', dica:'Aja, construa, ganhe momentum.' },
    'Cheia':     { qual:'Plenitude',   cor:'#ecc45c', dica:'Integre, celebre, ilumine.' },
    'Minguante': { qual:'Liberação',   cor:'#e0675f', dica:'Desapegue, reflita, agradeça.' },
  };
  const info = infos[nome] || { qual:'', cor:'var(--gold2)', dica:'' };
  ctx.box.innerHTML = `
    <div class="im-head" style="--c:${info.cor}">
      <div class="im-emoji" style="font-size:3.5rem">${emoji}</div>
      <div class="im-title">Lua ${nome}</div>
      <div class="im-sub">${info.qual}</div>
    </div>
    <div class="im-quote">${desc}</div>
    ${info.dica ? `<div class="im-tip" style="--c:${info.cor}">${info.dica}</div>` : ''}
    <p class="im-note">A lua possui três ciclos: sinódico (29,5 dias), sideral (27 dias) e ápside (28 dias). O Sincronário usa 28 dias — a média dos ciclos lunares — dividido em 4 semanas de 7 dias, cada uma correspondendo a uma cor galáctica: Vermelha, Branca, Azul e Amarela.</p>`;
  if (ctx.titulo) ctx.titulo.textContent = `Lua ${nome}`;
  abrirModalConteudo(ctx.modal);
}

export function abrirModalCastelo(casteloNum) {
  const ctx = prepararModalConteudo();
  if (!ctx) return;
  const castelos = [
    { cor:'Vermelho', dir:'Leste', poder:'Girar',   corte:'Nascimento', desc:'Inicia o Guerreiro. O Leste é o lugar do nascer do Sol, do começo de todos os ciclos. Aqui a consciência desperta e o propósito se estabelece.',    ondas:'Dragão, Mago, Mão e Sol', hex:'#dc5046' },
    { cor:'Branco',   dir:'Norte', poder:'Cruzar',  corte:'Morte',      desc:'Refina o Guerreiro. O Norte é o lugar da sabedoria ancestral e do aprofundamento. Aqui a consciência é purificada e refinada através dos desafios.',  ondas:'Caminhante, Enlaçador, Tormenta e Humano', hex:'#d8e2d0' },
    { cor:'Azul',     dir:'Oeste', poder:'Queimar',  corte:'Magia',      desc:'Transforma o Guerreiro. O Oeste é o lugar da transformação e da magia. Aqui a consciência mergulha na sombra para emergir transformada.',           ondas:'Serpente, Espelho, Macaco e Semente', hex:'#5a9fe0' },
    { cor:'Amarelo',  dir:'Sul',   poder:'Doar',     corte:'Inteligência',desc:'Amadurece o Guerreiro. O Sul é o lugar da maturidade e da colheita. Aqui a consciência produz frutos e manifesta sua inteligência cósmica.',        ondas:'Terra, Cão, Noite e Guerreiro', hex:'#ecc45c' },
    { cor:'Verde',    dir:'Centro',poder:'Encantar', corte:'Sincronização',desc:'Sincroniza o Guerreiro. O Centro é o lugar do encantamento e da integração. Aqui todos os ciclos convergem e a consciência se sincroniza com o todo.', ondas:'Lua, Vento, Águia e Estrela', hex:'#4ade80' },
  ];
  // se o número vier fora de 0–4, a descrição caía no castelo 0 mas a faixa de Kins continuava
  // calculada com o número recebido
  const idx = castelos[casteloNum] ? casteloNum : 0;
  const c = castelos[idx];
  const kinInicio = idx * 52 + 1;
  const kinFim    = kinInicio + 51;
  ctx.box.innerHTML = `
    <div class="im-head" style="--c:${c.hex}">
      <span class="dot dot-lg" style="--c:${c.hex}"></span>
      <div class="im-title" style="margin-top:var(--s3)">Castelo ${c.cor} · ${c.dir}</div>
      <div class="im-sub">Poder do ${c.poder} · Corte da ${c.corte}</div>
      <div class="im-sub">Kins ${kinInicio} – ${kinFim}</div>
    </div>
    <div class="im-quote" style="font-style:normal">${c.desc}</div>
    <div class="tile-label">Ondas Encantadas</div>
    <div class="tile-title" style="color:var(--text);font-weight:500">${c.ondas}</div>
    <p class="im-note" style="margin-top:var(--s4)">O Tzolkin possui 5 Castelos de 52 dias cada (5 × 52 = 260 kins). Cada castelo contém 4 Ondas Encantadas de 13 dias. Os castelos formam as 4 direções cardeais mais o centro — a geometria sagrada do tempo maia.</p>`;
  if (ctx.titulo) ctx.titulo.textContent = `Castelo ${c.cor} do ${c.dir}`;
  abrirModalConteudo(ctx.modal);
}

export async function mostrarKinDiaLua(anoGal, luaNum, diaLua) {
  await DATA_PRONTO;
  // calcula a data absoluta do dia clicado na lua
  const inicioAnoGal = new Date(anoGal, 6, 26); // 26/jul
  const diasOffset   = (luaNum - 1) * 28 + (diaLua - 1);
  const dataAlvo     = new Date(inicioAnoGal);
  dataAlvo.setDate(dataAlvo.getDate() + diasOffset);
  const kinNum = dateToKin(dataAlvo);
  if (!kinNum || !DATA.kins[kinNum]) return;
  const kd = DATA.kins[kinNum];
  const dataStr = dataAlvo.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' });
  abrirKinModal(kinNum, kd.selo, true, `Lua ${luaNum} · Dia ${diaLua} · ${dataStr}`);
}
