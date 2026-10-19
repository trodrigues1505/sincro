// ─── js/cartilha.js — funcionalidades da Cartilha: Lei do Tempo ──────────────
import {
  DATA, SELOS_NOMES, TONS_NOMES, CORES_CICLO,
  POEMA_TOM, POEMA_SELO, SELOS_MAIAS,
  FAMILIAS_TERRESTRES, FAMILIAS_DESC, RACAS_RAIZ, RACAS_DESC,
  PERGUNTAS_LUA,
} from './data.js';
import { getSeloBase, getSeloIconURL, ehSeloFeminino } from './calculos.js';

// Escapa texto digitado pelo usuário antes de colocar em innerHTML
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

// ─── Poema Ressonante ─────────────────────────────────────────────────────────
export function gerarPoema(kinNum, kData) {
  if (!kData || !POEMA_TOM || !POEMA_SELO) return null;
  const seloIdx = (kinNum - 1) % 20;
  const tomIdx  = ((kinNum - 1) % 13) + 1;
  const ps = POEMA_SELO[seloIdx];
  const pt = POEMA_TOM[tomIdx];
  if (!ps || !pt) return null;

  const nomeSelo  = SELOS_NOMES[seloIdx] || '';
  const nomeMaia  = SELOS_MAIAS[seloIdx]  || '';
  const nomeTom   = TONS_NOMES[tomIdx-1]  || '';
  const isFem     = ehSeloFeminino(nomeSelo);
  const art       = isFem ? 'a' : 'o';
  const da        = isFem ? 'da' : 'do';
  const a_        = isFem ? 'à'  : 'ao';

  // Tom guiado — tons 1,6,11 = poder próprio; outros consultam oráculo
  const tomGuia = tomIdx % 5 === 1 ? null : (kData.oraculo?.guia || null);
  const guiaBase = tomGuia ? getSeloBase(tomGuia) : null;
  const guiaLinha = guiaBase
    ? `Eu sou guiad${art} pelo poder ${ehSeloFeminino(guiaBase) ? 'da' : 'do'} ${guiaBase}`
    : `Eu sou guiad${art} pelo meu próprio poder duplicado`;

  return {
    nomeSelo, nomeMaia, nomeTom,
    linha1: `Eu ${pt.poder} com o fim de ${ps.qualidade},`,
    linha2: `${pt.acao} ${(ps.poder || '').toLowerCase()},`,
    linha3: `Sel${isFem?'a':'o'} ${art} ${nomeSelo} ${da} ${ps.essencia},`,
    linha4: `Com o tom ${pt.qualidade} ${da} ${nomeTom.toLowerCase()},`,
    linha5: guiaLinha + '.',
  };
}

// ─── Card de Família Terrestre + Raça Raiz ────────────────────────────────────
export function gerarInfoSelo(kinNum) {
  const seloIdx  = (kinNum - 1) % 20;
  const familia  = FAMILIAS_TERRESTRES[seloIdx];
  const raca     = RACAS_RAIZ[seloIdx];
  const fdesc    = FAMILIAS_DESC[familia]   || {};
  const rdesc    = RACAS_DESC[raca]         || {};
  const nomeMaia = SELOS_MAIAS[seloIdx]     || '';
  const palavras = POEMA_SELO[seloIdx]      || {};
  const corClass = { Vermelha:'red', Branca:'white', Azul:'blue', Amarela:'yellow' }[raca] || 'white';

  return { familia, fdesc, raca, rdesc, nomeMaia, palavras, corClass, seloIdx };
}

// ─── HTML do Poema Ressonante ─────────────────────────────────────────────────
// gerarPoema() é a ÚNICA fonte do texto. Todas as telas (card do Kin, cronógrafo e tabela guia)
// usam poemaLinhasHTML(), então o poema completo (5 linhas) aparece igual em todas.
function linhasHTML(p) {
  return `<div class="poema-l1">${p.linha1}</div>
    <div>${p.linha2}</div>
    <div>${p.linha3}</div>
    <div>${p.linha4}</div>
    <div class="poema-l5">${p.linha5}</div>`;
}

// Só as 5 linhas (sem moldura), para quem monta o próprio cartão. '' se não houver dados.
export function poemaLinhasHTML(kinNum, kData) {
  const p = gerarPoema(kinNum, kData);
  return p ? linhasHTML(p) : '';
}

export function renderPoema(kinNum, kData) {
  const p = gerarPoema(kinNum, kData);
  if (!p) return '';
  return `
<div class="section">
  <div class="section-title">Poema Ressonante do Kin</div>
  <div class="poema-centro">
    <div class="poema-meta">${p.nomeMaia} · Kin ${kinNum}</div>
    ${linhasHTML(p)}
  </div>
</div>`;
}

// ─── HTML de Família + Raça Raiz ─────────────────────────────────────────────
export function renderInfoSelo(kinNum) {
  const { familia, fdesc, raca, rdesc, nomeMaia, palavras, corClass } = gerarInfoSelo(kinNum);
  return `
<div class="grid-2">
  <div class="section tint-${corClass}" style="margin-bottom:0">
    <div class="section-title">Raça Raiz</div>
    <div class="tile-title">${raca}</div>
    <div class="tile-sub"><em>${rdesc.papel || ''}</em></div>
    <div class="tile-sub">${rdesc.desc || ''}</div>
  </div>
  <div class="section" style="margin-bottom:0">
    <div class="section-title">Família Terrestre</div>
    <div class="tile-title">${familia}</div>
    <div class="tile-sub"><em>${fdesc.desc || ''}</em></div>
    <div class="tile-sub">${fdesc.funcao || ''}</div>
  </div>
</div>
<div class="section" style="margin-top:var(--s3)">
  <div class="section-title">Palavras-chave · ${nomeMaia}</div>
  <div class="chips" style="margin-bottom:0">
    ${[palavras.poder, palavras.qualidade, palavras.essencia].filter(Boolean).map(p =>
      `<span class="chip">${p}</span>`
    ).join('')}
  </div>
</div>`;
}

// ─── Aba Lei do Tempo ─────────────────────────────────────────────────────────
export function renderLeiDoTempo() {
  return `
<div class="section">
  <div class="section-title">T(E) = Arte · A Lei do Tempo</div>
  <p class="prose">
    A <strong>Lei do Tempo</strong> é a lei primordial da criação, descoberta em 1989 pelo Dr. José Argüelles a partir do Tzolkin maia. Sua fórmula é <strong>T(E) = Arte</strong> — energia fatorada pelo tempo é igual a arte, significando que tudo no universo é uma obra de arte em constante transformação harmônica.
  </p>
  <div class="formula">
    <div class="formula-big">T(E) = Arte</div>
    <div class="formula-sub">Tempo × Energia = Manifestação Artística</div>
  </div>
</div>

<div class="section">
  <div class="section-title">As Duas Frequências</div>
  <div class="tile-grid">
    <div class="freq">
      <div class="freq-num">13:20</div>
      <div class="freq-title">Natural · Galáctica</div>
      <div class="freq-desc">13 luas × 20 selos do Tzolkin. Frequência da natureza, dos ciclos da lua, do DNA.</div>
    </div>
    <div class="freq">
      <div class="freq-num is-warm">12:60</div>
      <div class="freq-title">Artificial · Mecânica</div>
      <div class="freq-desc">12 meses irregulares × 60 minutos do relógio. Frequência do materialismo.</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Os Ciclos do Tempo</div>
  <div class="stack">
    ${[
      ['1 dia','Kin','A menor unidade — um selo + um tom = uma assinatura galáctica'],
      ['4 dias','Harmônica','Ciclo das 4 cores: Vermelho → Branco → Azul → Amarelo'],
      ['7 dias','Semana / Plasma','7 plasmas radiais ativando os 7 chacras do corpo'],
      ['13 dias','Onda Encantada','Do Magnético ao Cósmico — um propósito completo'],
      ['20 dias','Vinal','Ciclo dos 20 selos solares'],
      ['28 dias','Lua Galáctica','Uma lunação completa — 4 semanas perfeitas de 7 dias'],
      ['52 dias','Castelo','4 Ondas Encantadas — um castelo dos 5 do Tzolkin'],
      ['260 dias','Tzolkin','O módulo harmônico completo — 13 × 20 kins'],
      ['364 + 1','Ano Galáctico','13 luas de 28 dias + 1 Dia Fora do Tempo (25/jul)'],
    ].map(([ciclo, nome, desc]) => `
    <div class="ciclo">
      <div class="ciclo-chip">${ciclo}</div>
      <div class="ciclo-nome">${nome}</div>
      <div class="ciclo-desc">${desc}</div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">O Tzolkin</div>
  <p class="prose" style="margin-bottom:var(--s4)">
    O <strong>Tzolkin</strong> é o calendário sagrado dos Maias — a "tabela periódica do tempo". Possui 260 kins, resultado de <strong>13 tons × 20 selos</strong>. Cada kin é uma frequência única que se repete a cada 260 dias.
  </p>
  <div class="tile-grid" style="margin-bottom:var(--s4)">
    <div class="stat">
      <div class="stat-num">260</div>
      <div class="stat-title">Kins</div>
      <div class="stat-sub">13 tons × 20 selos</div>
    </div>
    <div class="stat">
      <div class="stat-num">5</div>
      <div class="stat-title">Castelos</div>
      <div class="stat-sub">52 dias cada · 4 ondas</div>
    </div>
  </div>
  <p class="prose small">
    A freqüência 13:20 está no nosso corpo: os <strong>13 tons</strong> nas 13 articulações principais e os <strong>20 selos</strong> nos 20 dedos de pés e mãos. O Tzolkin também aparece na gestação humana: 260 dias + 13 = ciclo médio de gestação.
  </p>
</div>

<div class="section">
  <div class="section-title">Os 5 Castelos do Tzolkin</div>
  <div class="stack">
    ${[
      ['#dc5046','Vermelho','Leste · Girar','Nascimento','Dragão, Mago, Mão, Sol'],
      ['#d8e2d0','Branco','Norte · Cruzar','Morte/Refinamento','Caminhante, Enlaçador, Tormenta, Humano'],
      ['#5a9fe0','Azul','Oeste · Queimar','Magia/Transformação','Serpente, Espelho, Macaco, Semente'],
      ['#ecc45c','Amarelo','Sul · Doar','Inteligência/Maturidade','Terra, Cão, Noite, Guerreiro'],
      ['#4ade80','Verde','Centro · Encantar','Sincronização','Lua, Vento, Águia, Estrela'],
    ].map(([cor, nome, dir, tema, ondas]) => `
    <div class="row-line">
      <span class="dot" style="--c:${cor};margin-top:.4em"></span>
      <div>
        <div class="row-title">Castelo ${nome} · ${dir}</div>
        <div class="row-sub"><em>${tema}</em></div>
        <div class="row-sub">Ondas: ${ondas}</div>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">Os 7 Plasmas Radiais</div>
  <p class="help-text">Os plasmas são a matéria quântica mínima — cada dia da semana ativa um chacra diferente.</p>
  <div class="stack">
    ${[
      ['Dali','#ecc45c','Coroa','Sahasrara','Meu pai é a consciência intrínseca. Eu sinto o calor.'],
      ['Seli','#5aa0e0','Raiz','Muladhara','Minha mãe é a esfera absoluta. Eu vejo a luz.'],
      ['Gama','#9b7ee0','Terceiro Olho','Ajña','Minha linhagem é a união da consciência. Eu alcanço a paz.'],
      ['Kali','#e0675f','Sexual','Svadhistana','Meu nome é o glorioso nascido do lótus. Eu cataliso a luz.'],
      ['Alfa','#6fc2a0','Laríngeo','Visudha','Meu país é a esfera absoluta não nascida. Eu libero o elétron.'],
      ['Limi','#7b9be0','Plexo Solar','Manipura','Eu consumo pensamentos dualísticos. Eu purifico o elétron.'],
      ['Silio','#4ade80','Cardíaco','Anahata','O meu papel é cumprir as ações de Bhuda. Eu descarrego.'],
    ].map(([nome, cor, chacra, sansc, afirm]) => `
    <div class="row-line">
      <span class="dot" style="--c:${cor};margin-top:.4em"></span>
      <div style="flex:1;min-width:0">
        <div class="row-title">${nome} <span class="row-meta">${chacra} · ${sansc}</span></div>
        <div class="row-sub"><em>${afirm}</em></div>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">Prece às 7 Direções Galácticas</div>
  <div class="prece">
    ${[
      ['Leste','Que a sabedoria se abra em aurora sobre nós<br>Para que vejamos as coisas com claridade'],
      ['Norte','Que a sabedoria amadureça entre nós<br>Para que conheçamos tudo desde dentro'],
      ['Oeste','Que a sabedoria se transforme em ação correta<br>Para que façamos o que tenha que ser feito'],
      ['Sul','Que a ação correta nos dê a colheita<br>Para que desfrutemos os frutos do ser planetário'],
      ['Superior','Onde se reúnem a gente das estrelas e os antepassados<br>Que suas bênçãos cheguem até nós agora'],
      ['Interior da Terra','Que o pulsar do coração de cristal do planeta<br>nos abençoe com suas harmonias'],
      ['Fonte Central','Que está em todas as partes ao mesmo tempo<br>Que tudo se reconheça como luz e amor mútuo'],
    ].map(([dir, verso]) => `
    <div class="prece-bloco">
      <div class="prece-dir">Desde a Casa ${dir}</div>
      <div class="prece-verso">${verso}</div>
    </div>`).join('')}
    <div class="prece-mantra">
      Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
      <span class="prece-fim">Salve a Harmonia da Mente e da Natureza!</span>
    </div>
  </div>
</div>`;
}

// ─── Pergunta da Lua para o dia atual ────────────────────────────────────────
export function getPerguntaLua(luaNum) {
  return PERGUNTAS_LUA[luaNum] || '';
}

// ─── Cronógrafo Diário Digital ────────────────────────────────────────────────
const CRONOGRAFO_KEY = 'sinc13_cronografo';

function getCronografoData() {
  try { return JSON.parse(localStorage.getItem(CRONOGRAFO_KEY) || '{}'); } catch { return {}; }
}

function saveCronografoData(data) {
  localStorage.setItem(CRONOGRAFO_KEY, JSON.stringify(data));
}

function dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function renderCronografo(kinNum, kData, luaNum, diaLua, plasmaHoje) {
  if (!kData) return '';
  const hoje = dataHoje();
  const todos = getCronografoData();
  const reg = todos[hoje] || {};

  const seloIdx = (kinNum-1) % 20;
  const tomIdx  = ((kinNum-1) % 13) + 1;
  const nomeSelo = SELOS_NOMES[seloIdx] || '';
  const nomeMaia = SELOS_MAIAS[seloIdx] || '';
  const nomeTom  = TONS_NOMES[tomIdx-1] || '';
  const familia  = FAMILIAS_TERRESTRES[seloIdx] || '';

  // Texto digitado pelo usuário é escapado: um "</textarea>" no meio quebraria a tela.
  const field = (id, label, val, placeholder='') => `
    <div class="cron-field">
      <label for="cron-${id}">${label}</label>
      <textarea id="cron-${id}" rows="2"
        placeholder="${esc(placeholder)}"
        onblur="salvarCronografo()"
      >${esc(val)}</textarea>
    </div>`;

  return `
<div class="section" id="cronografo-section">
  <div class="section-title section-title--row">
    <span class="st-label"><svg class="ico" aria-hidden="true"><use href="#i-clipboard"/></svg>Cronógrafo diário</span>
    <span class="small muted">${hoje}</span>
  </div>

  <!-- Dados fixos do dia -->
  <div class="cron-grid">
    ${[
      ['Kin do Dia', `Kin ${kinNum}`],
      ['Lua · Dia', `${luaNum}ª Lua · Dia ${diaLua}`],
      ['Plasma', plasmaHoje || '–'],
      ['Selo', `${nomeSelo} · ${nomeMaia}`],
      ['Tom', nomeTom],
      ['Família', familia],
    ].map(([lbl, val]) => `
    <div class="tile">
      <div class="tile-label">${lbl}</div>
      <div class="tile-title">${val}</div>
    </div>`).join('')}
  </div>

  <!-- Oráculo resumido -->
  <div class="cron-box">
    <div class="cron-box-title">Oráculo do dia</div>
    <div class="cron-oraculo">
      ${kData.oraculo ? [
        ['Destino', kData.oraculo.destino || `Kin ${kinNum}`],
        ['Guia', kData.oraculo.guia ? kData.oraculo.guia.split(' ').slice(0,-1).join(' ') : '–'],
        ['Análogo', kData.oraculo.analogo ? kData.oraculo.analogo.split(' ').slice(0,-1).join(' ') : '–'],
        ['Oculto', kData.oraculo.oculto ? kData.oraculo.oculto.split(' ').slice(0,-1).join(' ') : '–'],
        ['Antípoda', kData.oraculo.antipoda ? kData.oraculo.antipoda.split(' ').slice(0,-1).join(' ') : '–'],
        ['Onda', `${Math.floor((kinNum-1)/13)+1}ª · Dia ${((kinNum-1)%13)+1}`],
      ].map(([lbl, val]) => `
      <div><span class="muted">${lbl}:</span> ${val}</div>`).join('') : ''}
    </div>
  </div>

  <!-- Poema do Kin (mesma função das demais telas) -->
  ${(() => {
    const linhas = poemaLinhasHTML(kinNum, kData);
    return linhas ? `<div class="cron-box">
    <div class="cron-box-title">Poema ressonante</div>
    <div class="poema-centro" style="padding:0">${linhas}</div>
  </div>` : '';
  })()}

  <!-- Campos editáveis -->
  <div>
    ${field('afirmacao', 'Afirmação da semana', reg.afirmacao, 'Escreva sua afirmação da semana...')}
    ${field('plasma-afirm', 'Afirmação do plasma', reg.plasma_afirm, 'Afirmação de Padma Sambhava do dia...')}
    ${field('pergunta', 'Pergunta da lua', reg.pergunta, PERGUNTAS_LUA[luaNum] || 'Reflexão do dia...')}
    ${field('intencao', 'Intenção do dia', reg.intencao, 'O que pretendo cultivar hoje...')}
    ${field('sincronicidade', 'Sincronicidades', reg.sincronicidade, 'Registro de sincronicidades percebidas...')}
    ${field('gratidao', 'Gratidão', reg.gratidao, 'Por que sou grato hoje...')}
  </div>

  <div class="cron-actions">
    <div id="cron-status" class="cron-status" role="status"></div>
    <div style="display:flex;gap:var(--s2)">
      <button class="btn btn-secondary btn-sm" onclick="verHistoricoCronografo()"><svg class="ico" aria-hidden="true"><use href="#i-calendar"/></svg>Histórico</button>
      <button class="btn btn-primary btn-sm" onclick="salvarCronografo(true)">Salvar</button>
    </div>
  </div>
</div>`;
}

// Salva dados do cronógrafo
window.salvarCronografo = function(feedback = false) {
  const hoje = dataHoje();
  const todos = getCronografoData();
  todos[hoje] = {
    afirmacao:      document.getElementById('cron-afirmacao')?.value || '',
    plasma_afirm:   document.getElementById('cron-plasma-afirm')?.value || '',
    pergunta:       document.getElementById('cron-pergunta')?.value || '',
    intencao:       document.getElementById('cron-intencao')?.value || '',
    sincronicidade: document.getElementById('cron-sincronicidade')?.value || '',
    gratidao:       document.getElementById('cron-gratidao')?.value || '',
    savedAt: new Date().toISOString(),
  };
  saveCronografoData(todos);
  if (feedback) {
    const el = document.getElementById('cron-status');
    if (el) { el.textContent = 'Salvo'; setTimeout(()=>{ el.textContent=''; }, 2000); }
  }
};

// Modal de histórico (reaproveita as classes do modal de comparação)
window.fecharHistoricoCronografo = function() {
  const el = document.getElementById('modal-cronografo');
  if (el) el.classList.remove('active');
  document.body.style.overflow = '';
};

window.verHistoricoCronografo = function() {
  const todos = getCronografoData();
  const datas = Object.keys(todos).sort().reverse().slice(0, 30);
  if (!datas.length) {
    if (window.mostrarToast) window.mostrarToast('Nenhum registro ainda. Preencha o cronógrafo no Kin do Dia.');
    else alert('Nenhum registro ainda.');
    return;
  }

  let el = document.getElementById('modal-cronografo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'modal-cronografo';
    el.className = 'modal-comparacao';
    // Só fecha ao clicar no fundo. (Antes, o reset do scroll do body ficava fora do if
    // e rodava a cada clique dentro do modal.)
    el.addEventListener('click', e => { if (e.target === el) window.fecharHistoricoCronografo(); });
    document.body.appendChild(el);
  }

  const blocos = datas.map(data => {
    const r = todos[data];
    const campos = [
      r.afirmacao && ['Afirmação', r.afirmacao],
      r.plasma_afirm && ['Plasma', r.plasma_afirm],
      r.pergunta && ['Pergunta da lua', r.pergunta],
      r.intencao && ['Intenção', r.intencao],
      r.sincronicidade && ['Sincronicidades', r.sincronicidade],
      r.gratidao && ['Gratidão', r.gratidao],
    ].filter(Boolean);
    if (!campos.length) return '';
    return `<div class="hist-dia">
      <div class="hist-data">${esc(data)}</div>
      ${campos.map(([lbl, val]) => `
      <div class="hist-campo"><span class="hist-lbl">${lbl}:</span> <span class="hist-val">${esc(val)}</span></div>`).join('')}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="modal-comparacao-box modal-wide">
      <div class="modal-comparacao-header">
        <span>Histórico do cronógrafo</span>
        <button class="icon-btn" onclick="fecharHistoricoCronografo()" aria-label="Fechar"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>
      </div>
      ${blocos}
    </div>`;

  el.classList.add('active');
  document.body.style.overflow = 'hidden';
};

// ─── Tabela Guia Interativa ───────────────────────────────────────────────────
// Fórmula: guia tem mesma COR que o kin
// tons 1,6,11 → guia = próprio poder duplicado
// tons 2,7,12 → subtrai 8 selos
// tons 3,8,13 → soma 4 selos
// tons 4,9    → subtrai 4 selos
// tons 5,10   → soma 8 selos
export function calcGuia(kinNum) {
  const seloIdx = (kinNum - 1) % 20; // 0–19
  const tomIdx  = ((kinNum - 1) % 13) + 1; // 1–13
  const grupos1611 = [1, 6, 11];
  const gruposS8   = [2, 7, 12];
  const gruposP4   = [3, 8, 13];
  const gruposS4   = [4, 9];
  const gruposP8   = [5, 10];
  let guiaSeloIdx;
  if (grupos1611.includes(tomIdx)) return null; // próprio poder
  else if (gruposS8.includes(tomIdx)) guiaSeloIdx = (seloIdx - 8 + 20) % 20;
  else if (gruposP4.includes(tomIdx)) guiaSeloIdx = (seloIdx + 4) % 20;
  else if (gruposS4.includes(tomIdx)) guiaSeloIdx = (seloIdx - 4 + 20) % 20;
  else if (gruposP8.includes(tomIdx)) guiaSeloIdx = (seloIdx + 8) % 20;
  else return null;
  return guiaSeloIdx;
}

export function calcOraculo(kinNum) {
  const seloIdx = (kinNum - 1) % 20;
  const tomIdx  = ((kinNum - 1) % 13) + 1;
  const guiaIdx = calcGuia(kinNum); // null = próprio poder
  const analogoIdx  = (seloIdx + 19) % 20; // soma 19
  const antipodaIdx = (seloIdx + 10) % 20; // distância 10
  const ocultoIdx   = (seloIdx + 21) % 20; // soma 21 → (seloIdx+1)%20
  return {
    guia:     guiaIdx !== null ? SELOS_NOMES[guiaIdx] : SELOS_NOMES[seloIdx] + ' (poder duplicado)',
    analogo:  SELOS_NOMES[analogoIdx],
    antipoda: SELOS_NOMES[antipodaIdx],
    oculto:   SELOS_NOMES[ocultoIdx],
  };
}

export function renderTabelaGuia() {
  return `
<div class="section">
  <div class="section-title">Tabela guia interativa</div>
  <p class="help-text">Digite um Kin para calcular Guia, Análogo, Antípoda e Oculto.</p>
  <div class="form-row">
    <div class="field" style="max-width:220px">
      <label class="field-label" for="tabela-guia-inp">Kin (1 a 260)</label>
      <input type="number" id="tabela-guia-inp" min="1" max="260" inputmode="numeric" placeholder="Ex.: 180"
        oninput="calcularTabelaGuia()">
    </div>
    <button class="btn-calc" onclick="calcularTabelaGuia(true)">Calcular</button>
  </div>
  <div id="tabela-guia-resultado" style="display:none;margin-top:var(--s5)">
    <div id="tabela-guia-linhas" class="kv-list"></div>
    <div id="tabela-guia-poema"></div>
  </div>
</div>`;
}
