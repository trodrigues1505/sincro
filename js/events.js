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
      <div class="selo-icon selo-${cor}" style="width:56px;height:56px;margin:0 auto"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML='<span style=font-size:1.8rem>${['🐉','💨','🌌','🌱','🐍','☯️','✋','⭐','🌙','🐕','🐒','👤','🚶','🧙','🦅','⚔️','🌍','🪞','⛈️','☀️'][i]||'🌀'}</span>'"></div>
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

const EBOOK_FILE_ID = '1PU_VNQH61uUjHl-OESKhHH4TKrDS3JgS';
const EBOOK_URL     = 'https://drive.google.com/file/d/' + EBOOK_FILE_ID + '/view?usp=sharing';
const EBOOK_EMBED   = 'https://drive.google.com/file/d/' + EBOOK_FILE_ID + '/preview';

export function abrirEbook(pagina) {
  const ua    = navigator.userAgent;
  const isIOS = /iP(ad|hone|od)/i.test(ua) || (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua));

  const modal  = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal || !iframe) { window.open(EBOOK_URL, '_blank'); return; }

  // Esconde conteudo de kin/prece anteriores
  let kinContainer = document.getElementById('modal-kin-content');
  if (kinContainer) { kinContainer.style.display = 'none'; kinContainer.innerHTML = ''; }

  if (isIOS) {
    // iOS bloqueia iframes do Drive — mostra botao direto
    iframe.style.display = 'none';
    iframe.src = '';
    if (!kinContainer) {
      kinContainer = document.createElement('div');
      kinContainer.id = 'modal-kin-content';
      kinContainer.style.cssText = 'overflow-y:auto;max-height:80vh;padding:1.5rem;background:var(--bg);border-radius:var(--radius);text-align:center';
      iframe.parentNode.insertBefore(kinContainer, iframe);
    }
    kinContainer.style.display = 'block';
    kinContainer.innerHTML =
      '<div style="font-size:2.5rem;margin-bottom:.8rem">\u{1F4D6}</div>'
      + '<div style="font-family:Cinzel;font-size:.82rem;color:var(--gold2);margin-bottom:.5rem">E-book · Sincronario das 13 Luas</div>'
      + '<div style="font-size:.78rem;color:var(--text3);margin-bottom:1.2rem">O Safari nao suporta visualizacao de PDF incorporado.<br>Toque abaixo para abrir no Google Drive.</div>'
      + '<a href="' + EBOOK_URL + '" target="_blank"'
      + ' style="display:inline-flex;align-items:center;gap:.5rem;background:var(--green);color:#fff;border-radius:6px;padding:10px 20px;font-family:Cinzel;font-size:.7rem;text-decoration:none;text-transform:uppercase;letter-spacing:.07em">'
      + '\u{1F4D6} Abrir E-book no Drive</a>';
  } else {
    // Outros navegadores: embed direto no iframe do modal
    iframe.style.display = '';
    iframe.src = EBOOK_EMBED;
    iframe.style.height = '75vh';
  }

  if (titulo) titulo.textContent = '\u{1F4D6} E-book · Sincronario das 13 Luas';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
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

  // iOS/Safari bloqueia autoplay e falha silenciosamente no onerror do <audio>.
  // Nesses casos mostramos direto o botão do Drive, sem tentar o player nativo.
  const ua = navigator.userAgent;
  const isIOS = /iP(ad|hone|od)/i.test(ua) || (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua));
  const DRIVE_URL = 'https://drive.google.com/file/d/1hOUbkDrKGOjs_VE1f83pBgkHlcG6lRIR/view?usp=sharing';
  const DRIVE_SRC = 'https://drive.google.com/uc?export=download&id=1hOUbkDrKGOjs_VE1f83pBgkHlcG6lRIR';
  const audioId   = 'prece-modal-audio';

  const playerHTML = isIOS
    ? `<a href="${DRIVE_URL}" target="_blank"
          style="display:inline-flex;align-items:center;gap:.5rem;background:var(--green);color:#fff;border-radius:4px;padding:7px 16px;font-family:Cinzel;font-size:.62rem;text-decoration:none;text-transform:uppercase;letter-spacing:.07em;margin-top:.2rem">
          &#x1F517; Ouvir a Prece no Drive
        </a>
        <div style="font-size:.58rem;color:var(--text3);margin-top:.35rem">
          O Safari bloqueia audio automatico — abre no Drive para ouvir.
        </div>`
    : `<audio id="${audioId}" controls preload="none"
          style="width:100%;height:32px;accent-color:var(--gold2)"
          onerror="document.getElementById('${audioId}-fallback').style.display='flex';this.style.display='none'">
          <source src="./assets/prece.mp3" type="audio/mpeg">
          <source src="${DRIVE_SRC}" type="audio/mpeg">
        </audio>
        <div id="${audioId}-fallback" style="display:none;align-items:center;gap:.6rem;margin-top:.4rem">
          <a href="${DRIVE_URL}" target="_blank"
            style="background:var(--green);color:#fff;border-radius:4px;padding:6px 14px;font-family:Cinzel;font-size:.62rem;text-decoration:none;text-transform:uppercase;letter-spacing:.07em;display:inline-flex;align-items:center;gap:.4rem">
            &#x1F517; Ouvir a Prece no Drive
          </a>
        </div>`;

  kinContainer.innerHTML =
    '<div style="display:flex;align-items:center;gap:.8rem;background:rgba(165,124,0,.07);border:1px solid var(--border-g);border-radius:8px;padding:.7rem 1rem;margin-bottom:1.1rem">'
    + '<span style="font-size:1.4rem">&#x1F64F;</span>'
    + '<div style="flex:1">'
    + '<div style="font-family:Cinzel;font-size:.72rem;color:var(--gold2);margin-bottom:.3rem">Prece das 7 Direcoes Galacticas</div>'
    + playerHTML
    + '</div></div>'
    + TEXTO_PRECE;

  // Autoplay apenas em navegadores que suportam (nao iOS)
  if (!isIOS) {
    setTimeout(() => {
      const audio = document.getElementById(audioId);
      if (audio) audio.play().catch(() => {});
    }, 200);
  }

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

// ─── Modais informativos ───────────────────────────────────────────────────────
export function abrirModalPlasma(chave, emoji, chakra, afirm, desc) {
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal) return;
  iframe.style.display = 'none'; iframe.src = '';
  let box = document.getElementById('modal-kin-content');
  if (!box) {
    box = document.createElement('div');
    box.id = 'modal-kin-content';
    box.style.cssText = 'overflow-y:auto;max-height:80vh;padding:1rem;background:var(--bg);border-radius:var(--radius)';
    iframe.parentNode.insertBefore(box, iframe);
  }
  box.style.display = 'block';
  const emojis = {'Dali':'☀️','Seli':'🌊','Gama':'👁','Kali':'🔥','Alfa':'🌬️','Limi':'🌙','Silio':'💚'};
  const cores  = {'Dali':'#c9a030','Seli':'#4a9fd4','Gama':'#7c5cbf','Kali':'#c04040','Alfa':'#60a080','Limi':'#6080c0','Silio':'#40a060'};
  box.innerHTML = `
    <div style="text-align:center;padding:.5rem 0 1rem">
      <div style="font-size:3rem;margin-bottom:.5rem">${emoji}</div>
      <div style="font-family:Cinzel;font-size:1.1rem;color:${cores[chave]||'var(--gold2)'};margin-bottom:.2rem">${chave}</div>
      <div style="font-size:.75rem;color:var(--text3);margin-bottom:.8rem">${desc}</div>
      ${chakra ? `<div style="background:rgba(165,124,0,.08);border:1px solid var(--border-g);border-radius:8px;padding:.5rem 1rem;display:inline-block;font-family:Cinzel;font-size:.68rem;color:var(--gold2);margin-bottom:1rem">Chacra: ${chakra}</div>` : ''}
    </div>
    <div style="background:rgba(165,124,0,.05);border-left:3px solid ${cores[chave]||'var(--gold)'};padding:.7rem 1rem;border-radius:0 8px 8px 0;font-style:italic;font-size:.88rem;color:var(--text2);line-height:1.8;margin-bottom:.8rem">${afirm}</div>
    <p style="font-size:.8rem;color:var(--text3);line-height:1.7">Os plasmas radiais são a matéria quântica mínima do universo. Cada dia da semana ativa um plasma diferente, correspondendo a um chacra do corpo quadridimensional. Ao visualizar e recitar a afirmação do plasma, harmonizamos nossa energia com o campo quântico do dia.</p>`;
  if (titulo) titulo.textContent = `${emoji} Plasma ${chave}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function abrirModalFaseLunar(emoji, nome, desc) {
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal) return;
  iframe.style.display = 'none'; iframe.src = '';
  let box = document.getElementById('modal-kin-content');
  if (!box) {
    box = document.createElement('div');
    box.id = 'modal-kin-content';
    box.style.cssText = 'overflow-y:auto;max-height:80vh;padding:1rem;background:var(--bg);border-radius:var(--radius)';
    iframe.parentNode.insertBefore(box, iframe);
  }
  box.style.display = 'block';
  const infos = {
    'Nova':      { qual:'Início',      cor:'#6080c0', dica:'Plante intenções, abra-se ao novo.' },
    'Crescente': { qual:'Expansão',    cor:'#60a060', dica:'Aja, construa, ganhe momentum.' },
    'Cheia':     { qual:'Plenitude',   cor:'#c9a030', dica:'Integre, celebre, ilumine.' },
    'Minguante': { qual:'Liberação',   cor:'#c04040', dica:'Desapegue, reflita, agradeça.' },
  };
  const info = infos[nome] || { qual:'', cor:'var(--gold2)', dica:'' };
  box.innerHTML = `
    <div style="text-align:center;padding:.5rem 0 1rem">
      <div style="font-size:3.5rem;margin-bottom:.5rem">${emoji}</div>
      <div style="font-family:Cinzel;font-size:1.1rem;color:${info.cor};margin-bottom:.3rem">Lua ${nome}</div>
      <div style="font-size:.78rem;color:var(--text3);margin-bottom:.9rem">${info.qual}</div>
    </div>
    <div style="background:rgba(165,124,0,.05);border-left:3px solid ${info.cor};padding:.7rem 1rem;border-radius:0 8px 8px 0;font-size:.9rem;color:var(--text2);line-height:1.8;margin-bottom:.8rem;font-style:italic">${desc}</div>
    ${info.dica ? `<div style="font-family:Cinzel;font-size:.7rem;color:${info.cor};margin-bottom:.8rem;padding:.4rem .8rem;border:1px solid ${info.cor}33;border-radius:6px;display:inline-block">${info.dica}</div>` : ''}
    <p style="font-size:.8rem;color:var(--text3);line-height:1.7">A lua possui três ciclos: sinódico (29,5 dias), sideral (27 dias) e ápside (28 dias). O Sincronário usa 28 dias — a média dos ciclos lunares — dividido em 4 semanas de 7 dias, cada uma correspondendo a uma cor galáctica: Vermelha, Branca, Azul e Amarela.</p>`;
  if (titulo) titulo.textContent = `${emoji} Lua ${nome}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function abrirModalCastelo(casteloNum) {
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal) return;
  iframe.style.display = 'none'; iframe.src = '';
  let box = document.getElementById('modal-kin-content');
  if (!box) {
    box = document.createElement('div');
    box.id = 'modal-kin-content';
    box.style.cssText = 'overflow-y:auto;max-height:80vh;padding:1rem;background:var(--bg);border-radius:var(--radius)';
    iframe.parentNode.insertBefore(box, iframe);
  }
  box.style.display = 'block';
  const castelos = [
    { cor:'Vermelho', dir:'Leste', poder:'Girar',   corte:'Nascimento', desc:'Inicia o Guerreiro. O Leste é o lugar do nascer do Sol, do começo de todos os ciclos. Aqui a consciência desperta e o propósito se estabelece.',    ondas:'Dragão, Mago, Mão e Sol', emoji:'🔴' },
    { cor:'Branco',   dir:'Norte', poder:'Cruzar',  corte:'Morte',      desc:'Refina o Guerreiro. O Norte é o lugar da sabedoria ancestral e do aprofundamento. Aqui a consciência é purificada e refinada através dos desafios.',  ondas:'Caminhante, Enlaçador, Tormenta e Humano', emoji:'⚪' },
    { cor:'Azul',     dir:'Oeste', poder:'Queimar',  corte:'Magia',      desc:'Transforma o Guerreiro. O Oeste é o lugar da transformação e da magia. Aqui a consciência mergulha na sombra para emergir transformada.',           ondas:'Serpente, Espelho, Macaco e Semente', emoji:'🔵' },
    { cor:'Amarelo',  dir:'Sul',   poder:'Doar',     corte:'Inteligência',desc:'Amadurece o Guerreiro. O Sul é o lugar da maturidade e da colheita. Aqui a consciência produz frutos e manifesta sua inteligência cósmica.',        ondas:'Terra, Cão, Noite e Guerreiro', emoji:'🟡' },
    { cor:'Verde',    dir:'Centro',poder:'Encantar', corte:'Sincronização',desc:'Sincroniza o Guerreiro. O Centro é o lugar do encantamento e da integração. Aqui todos os ciclos convergem e a consciência se sincroniza com o todo.', ondas:'Lua, Vento, Águia e Estrela', emoji:'🟢' },
  ];
  const c = castelos[casteloNum] || castelos[0];
  const kinInicio = casteloNum * 52 + 1;
  const kinFim    = kinInicio + 51;
  box.innerHTML = `
    <div style="text-align:center;padding:.5rem 0 1rem">
      <div style="font-size:2.5rem;margin-bottom:.5rem">${c.emoji}</div>
      <div style="font-family:Cinzel;font-size:1rem;color:var(--gold2);margin-bottom:.2rem">Castelo ${c.cor} · ${c.dir}</div>
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:.3rem">Poder do ${c.poder} · Corte da ${c.corte}</div>
      <div style="font-size:.68rem;color:var(--text3)">Kins ${kinInicio} – ${kinFim}</div>
    </div>
    <div style="background:rgba(165,124,0,.05);border-left:3px solid var(--gold);padding:.7rem 1rem;border-radius:0 8px 8px 0;font-size:.88rem;color:var(--text2);line-height:1.8;margin-bottom:.8rem">${c.desc}</div>
    <div style="font-size:.75rem;color:var(--text3);margin-bottom:.3rem;font-family:Cinzel;text-transform:uppercase;letter-spacing:.1em">Ondas Encantadas</div>
    <div style="font-size:.82rem;color:var(--text2)">${c.ondas}</div>
    <p style="font-size:.78rem;color:var(--text3);line-height:1.7;margin-top:.8rem">O Tzolkin possui 5 Castelos de 52 dias cada (5 × 52 = 260 kins). Cada castelo contém 4 Ondas Encantadas de 13 dias. Os castelos formam as 4 direções cardeais mais o centro — a geometria sagrada do tempo maia.</p>`;
  if (titulo) titulo.textContent = `${c.emoji} Castelo ${c.cor} do ${c.dir}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
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
