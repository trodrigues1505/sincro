// ─── js/cartilha.js — funcionalidades da Cartilha: Lei do Tempo ──────────────
import {
  DATA, SELOS_NOMES, TONS_NOMES, CORES_CICLO,
  POEMA_TOM, POEMA_SELO, SELOS_MAIAS,
  FAMILIAS_TERRESTRES, FAMILIAS_DESC, RACAS_RAIZ, RACAS_DESC,
  PERGUNTAS_LUA,
} from './data.js';
import { getSeloBase, getSeloIconURL, ehSeloFeminino } from './calculos.js';

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
    linha2: `${pt.acao} ${ps.poder.toLowerCase()},`,
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
export function renderPoema(kinNum, kData) {
  const p = gerarPoema(kinNum, kData);
  if (!p) return '';
  return `
<div class="section" style="margin-top:.5rem">
  <div class="section-title">Poema Ressonante do Kin</div>
  <div style="text-align:center;padding:.5rem 0;line-height:2.1">
    <div style="font-family:Cinzel;font-size:.62rem;color:var(--text3);letter-spacing:.1em;margin-bottom:.6rem">${p.nomeMaia} · Kin ${kinNum}</div>
    <div style="font-size:.92rem;color:var(--gold2);font-style:italic">${p.linha1}</div>
    <div style="font-size:.92rem;color:var(--text)">${p.linha2}</div>
    <div style="font-size:.92rem;color:var(--text)">${p.linha3}</div>
    <div style="font-size:.92rem;color:var(--text)">${p.linha4}</div>
    <div style="font-size:.88rem;color:var(--gold);margin-top:.4rem;font-style:italic">${p.linha5}</div>
  </div>
</div>`;
}

// ─── HTML de Família + Raça Raiz ─────────────────────────────────────────────
export function renderInfoSelo(kinNum) {
  const { familia, fdesc, raca, rdesc, nomeMaia, palavras, corClass } = gerarInfoSelo(kinNum);
  const corBg = {
    red:   'rgba(138,32,24,.1)', white: 'rgba(168,184,144,.08)',
    blue:  'rgba(26,72,96,.1)',  yellow:'rgba(165,124,0,.1)'
  }[corClass] || 'transparent';
  return `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.5rem">
  <div class="section" style="padding:.8rem;background:${corBg}">
    <div class="section-title" style="font-size:.55rem">Raça Raiz</div>
    <div style="font-family:Cinzel;font-size:.82rem;color:var(--gold2);margin-bottom:.2rem">🌈 ${raca}</div>
    <div style="font-size:.72rem;color:var(--text2);margin-bottom:.2rem;font-style:italic">${rdesc.papel || ''}</div>
    <div style="font-size:.7rem;color:var(--text3)">${rdesc.desc || ''}</div>
  </div>
  <div class="section" style="padding:.8rem">
    <div class="section-title" style="font-size:.55rem">Família Terrestre</div>
    <div style="font-family:Cinzel;font-size:.82rem;color:var(--gold2);margin-bottom:.2rem">🌍 ${familia}</div>
    <div style="font-size:.72rem;color:var(--text2);margin-bottom:.2rem;font-style:italic">${fdesc.desc || ''}</div>
    <div style="font-size:.7rem;color:var(--text3)">${fdesc.funcao || ''}</div>
  </div>
</div>
<div class="section" style="padding:.8rem;margin-top:.4rem">
  <div class="section-title" style="font-size:.55rem">Palavras-chave · ${nomeMaia}</div>
  <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.3rem">
    ${[palavras.poder, palavras.qualidade, palavras.essencia].filter(Boolean).map(p =>
      `<span style="background:rgba(165,124,0,.1);border:1px solid var(--border-g);border-radius:20px;padding:2px 10px;font-family:Cinzel;font-size:.6rem;color:var(--gold2)">${p}</span>`
    ).join('')}
  </div>
</div>`;
}

// ─── Aba Lei do Tempo ─────────────────────────────────────────────────────────
export function renderLeiDoTempo() {
  return `
<div class="section">
  <div class="section-title">T(E) = Arte · A Lei do Tempo</div>
  <p style="font-size:.88rem;color:var(--text);line-height:1.8;margin-bottom:.9rem">
    A <strong style="color:var(--gold2)">Lei do Tempo</strong> é a lei primordial da criação, descoberta em 1989 pelo Dr. José Argüelles a partir do Tzolkin maia. Sua fórmula é <strong style="color:var(--gold2)">T(E) = Arte</strong> — energia fatorada pelo tempo é igual a arte, significando que tudo no universo é uma obra de arte em constante transformação harmônica.
  </p>
  <div style="background:rgba(165,124,0,.07);border:1px solid var(--border-g);border-radius:8px;padding:.8rem 1rem;text-align:center;margin-bottom:1rem">
    <div style="font-family:Cinzel;font-size:1.4rem;color:var(--gold2);letter-spacing:.1em">T(E) = Arte</div>
    <div style="font-size:.7rem;color:var(--text3);margin-top:.3rem">Tempo × Energia = Manifestação Artística</div>
  </div>
</div>

<div class="section">
  <div class="section-title">As Duas Frequências</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
    <div style="background:rgba(26,72,96,.08);border:1px solid rgba(26,72,96,.2);border-radius:8px;padding:.8rem;text-align:center">
      <div style="font-family:Cinzel;font-size:1.1rem;color:#4a9fd4;margin-bottom:.3rem">13:20</div>
      <div style="font-family:Cinzel;font-size:.7rem;color:var(--text2);margin-bottom:.3rem">Natural · Galáctica</div>
      <div style="font-size:.72rem;color:var(--text3);line-height:1.6">13 luas × 20 selos do Tzolkin. Frequência da natureza, dos ciclos da lua, do DNA.</div>
    </div>
    <div style="background:rgba(138,32,24,.08);border:1px solid rgba(138,32,24,.2);border-radius:8px;padding:.8rem;text-align:center">
      <div style="font-family:Cinzel;font-size:1.1rem;color:#d47a4a;margin-bottom:.3rem">12:60</div>
      <div style="font-family:Cinzel;font-size:.7rem;color:var(--text2);margin-bottom:.3rem">Artificial · Mecânica</div>
      <div style="font-size:.72rem;color:var(--text3);line-height:1.6">12 meses irregulares × 60 minutos do relógio. Frequência do materialismo.</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Os Ciclos do Tempo</div>
  <div style="display:flex;flex-direction:column;gap:5px">
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
    <div style="display:flex;align-items:center;gap:.7rem;padding:.4rem .5rem;border-radius:6px;background:var(--bg2);border:1px solid var(--border)">
      <div style="min-width:54px;text-align:center;font-family:Cinzel;font-size:.65rem;color:var(--gold2);background:rgba(165,124,0,.1);padding:3px 6px;border-radius:4px">${ciclo}</div>
      <div style="min-width:72px;font-family:Cinzel;font-size:.7rem;color:var(--text)">${nome}</div>
      <div style="font-size:.72rem;color:var(--text3);flex:1;line-height:1.5">${desc}</div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">O Tzolkin</div>
  <p style="font-size:.85rem;color:var(--text);line-height:1.75;margin-bottom:.7rem">
    O <strong style="color:var(--gold2)">Tzolkin</strong> é o calendário sagrado dos Maias — a "tabela periódica do tempo". Possui 260 kins, resultado de <strong style="color:var(--gold2)">13 tons × 20 selos</strong>. Cada kin é uma frequência única que se repete a cada 260 dias.
  </p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.7rem">
    <div style="background:rgba(165,124,0,.06);border:1px solid var(--border-g);border-radius:8px;padding:.8rem;text-align:center">
      <div style="font-size:1.8rem;margin-bottom:.2rem">🌀</div>
      <div style="font-family:Cinzel;font-size:.75rem;color:var(--gold2)">260 Kins</div>
      <div style="font-size:.65rem;color:var(--text3);margin-top:.2rem">13 tons × 20 selos</div>
    </div>
    <div style="background:rgba(165,124,0,.06);border:1px solid var(--border-g);border-radius:8px;padding:.8rem;text-align:center">
      <div style="font-size:1.8rem;margin-bottom:.2rem">🏰</div>
      <div style="font-family:Cinzel;font-size:.75rem;color:var(--gold2)">5 Castelos</div>
      <div style="font-size:.65rem;color:var(--text3);margin-top:.2rem">52 dias cada · 4 ondas</div>
    </div>
  </div>
  <div style="font-size:.75rem;color:var(--text2);line-height:1.7">
    A freqüência 13:20 está no nosso corpo: os <strong style="color:var(--gold2)">13 tons</strong> nas 13 articulações principais e os <strong style="color:var(--gold2)">20 selos</strong> nos 20 dedos de pés e mãos. O Tzolkin também aparece na gestação humana: 260 dias + 13 = ciclo médio de gestação.
  </div>
</div>

<div class="section">
  <div class="section-title">Os 5 Castelos do Tzolkin</div>
  <div style="display:flex;flex-direction:column;gap:6px">
    ${[
      ['🔴','Vermelho','Leste · Girar','Nascimento','Dragão, Mago, Mão, Sol'],
      ['⚪','Branco','Norte · Cruzar','Morte/Refinamento','Caminhante, Enlaçador, Tormenta, Humano'],
      ['🔵','Azul','Oeste · Queimar','Magia/Transformação','Serpente, Espelho, Macaco, Semente'],
      ['🟡','Amarelo','Sul · Doar','Inteligência/Maturidade','Terra, Cão, Noite, Guerreiro'],
      ['🟢','Verde','Centro · Encantar','Sincronização','Lua, Vento, Águia, Estrela'],
    ].map(([emoji, cor, dir, tema, ondas]) => `
    <div style="padding:.5rem .7rem;background:var(--bg2);border-radius:7px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.2rem">
        <span>${emoji}</span>
        <span style="font-family:Cinzel;font-size:.72rem;color:var(--gold2)">Castelo ${cor} · ${dir}</span>
      </div>
      <div style="font-size:.68rem;color:var(--text2);margin-bottom:.15rem"><em>${tema}</em></div>
      <div style="font-size:.65rem;color:var(--text3)">Ondas: ${ondas}</div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">Os 7 Plasmas Radiais</div>
  <p style="font-size:.82rem;color:var(--text3);margin-bottom:.7rem">Os plasmas são a matéria quântica mínima — cada dia da semana ativa um chacra diferente.</p>
  <div style="display:flex;flex-direction:column;gap:5px">
    ${[
      ['Dali','☀️','Coroa','Sahasrara','Meu pai é a consciência intrínseca. Eu sinto o calor.'],
      ['Seli','🌊','Raiz','Muladhara','Minha mãe é a esfera absoluta. Eu vejo a luz.'],
      ['Gama','👁','Terceiro Olho','Ajña','Minha linhagem é a união da consciência. Eu alcanço a paz.'],
      ['Kali','🔥','Sexual','Svadhistana','Meu nome é o glorioso nascido do lótus. Eu cataliso a luz.'],
      ['Alfa','🌬','Laríngeo','Visudha','Meu país é a esfera absoluta não nascida. Eu libero o elétron.'],
      ['Limi','🌙','Plexo Solar','Manipura','Eu consumo pensamentos dualísticos. Eu purifico o elétron.'],
      ['Silio','💚','Cardíaco','Anahata','O meu papel é cumprir as ações de Bhuda. Eu descarrego.'],
    ].map(([nome, emoji, chacra, sansc, afirm]) => `
    <div style="display:flex;align-items:flex-start;gap:.6rem;padding:.4rem .5rem;background:var(--bg2);border-radius:6px;border:1px solid var(--border)">
      <span style="font-size:1.2rem;flex-shrink:0">${emoji}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.15rem">
          <span style="font-family:Cinzel;font-size:.72rem;color:var(--gold2)">${nome}</span>
          <span style="font-size:.6rem;color:var(--text3)">· ${chacra} · ${sansc}</span>
        </div>
        <div style="font-size:.68rem;color:var(--text2);font-style:italic;line-height:1.4">${afirm}</div>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">Prece às 7 Direções Galácticas</div>
  <div style="font-size:.85rem;color:var(--text);line-height:1.95;text-align:center;padding:.5rem 0">
    ${[
      ['Leste','Que a sabedoria se abra em aurora sobre nós<br>Para que vejamos as coisas com claridade'],
      ['Norte','Que a sabedoria amadureça entre nós<br>Para que conheçamos tudo desde dentro'],
      ['Oeste','Que a sabedoria se transforme em ação correta<br>Para que façamos o que tenha que ser feito'],
      ['Sul','Que a ação correta nos dê a colheita<br>Para que desfrutemos os frutos do ser planetário'],
      ['Superior','Onde se reúnem a gente das estrelas e os antepassados<br>Que suas bênçãos cheguem até nós agora'],
      ['Interior da Terra','Que o pulsar do coração de cristal do planeta<br>nos abençoe com suas harmonias'],
      ['Fonte Central','Que está em todas as partes ao mesmo tempo<br>Que tudo se reconheça como luz e amor mútuo'],
    ].map(([dir, verso]) => `
    <div style="margin-bottom:.8rem">
      <div style="font-family:Cinzel;font-size:.6rem;color:var(--gold);text-transform:uppercase;letter-spacing:.12em;margin-bottom:.2rem">Desde a Casa ${dir}</div>
      <div style="color:var(--text2);font-style:italic;font-size:.85rem">${verso}</div>
    </div>`).join('')}
    <div style="margin-top:1rem;color:var(--gold2);font-family:Cinzel;font-size:.78rem;letter-spacing:.06em">
      Ah Yum Hunab Ku Evam Maya E Ma Ho!<br>
      <span style="font-size:.68rem;color:var(--text3)">Salve a Harmonia da Mente e da Natureza!</span>
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
  const ps = POEMA_SELO[seloIdx] || {};
  const pt = POEMA_TOM[tomIdx]   || {};
  const nomeSelo = SELOS_NOMES[seloIdx] || '';
  const nomeMaia = SELOS_MAIAS[seloIdx] || '';
  const nomeTom  = TONS_NOMES[tomIdx-1] || '';
  const familia  = FAMILIAS_TERRESTRES[seloIdx] || '';

  const field = (id, label, val, placeholder='') => `
    <div style="margin-bottom:.5rem">
      <label style="font-size:.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;font-family:Cinzel;display:block;margin-bottom:.2rem">${label}</label>
      <textarea id="cron-${id}" rows="2"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.4rem .6rem;font-family:inherit;font-size:.82rem;resize:vertical;transition:border-color .2s"
        placeholder="${placeholder}"
        onfocus="this.style.borderColor='var(--green)'"
        onblur="this.style.borderColor='var(--border)';salvarCronografo()"
      >${val||''}</textarea>
    </div>`;

  return `
<div class="section" id="cronografo-section">
  <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
    <span>📋 Cronógrafo Diário</span>
    <span style="font-size:.58rem;color:var(--text3);font-style:italic">${hoje}</span>
  </div>

  <!-- Dados fixos do dia -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:.8rem">
    ${[
      ['Kin do Dia', `Kin ${kinNum}`],
      ['Lua · Dia', `${luaNum}ª Lua · Dia ${diaLua}`],
      ['Plasma', plasmaHoje || '–'],
      ['Selo', `${nomeSelo} · ${nomeMaia}`],
      ['Tom', nomeTom],
      ['Família', familia],
    ].map(([lbl, val]) => `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:.4rem .5rem;text-align:center">
      <div style="font-size:.55rem;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.15rem">${lbl}</div>
      <div style="font-family:Cinzel;font-size:.68rem;color:var(--gold2)">${val}</div>
    </div>`).join('')}
  </div>

  <!-- Oráculo resumido -->
  <div style="background:rgba(165,124,0,.05);border:1px solid var(--border-g);border-radius:7px;padding:.6rem .8rem;margin-bottom:.7rem">
    <div style="font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;font-family:Cinzel;margin-bottom:.4rem">Oráculo do Dia</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.3rem;font-size:.72rem">
      ${kData.oraculo ? [
        ['Destino', kData.oraculo.destino || `Kin ${kinNum}`],
        ['Guia', kData.oraculo.guia ? kData.oraculo.guia.split(' ').slice(0,-1).join(' ') : '–'],
        ['Análogo', kData.oraculo.analogo ? kData.oraculo.analogo.split(' ').slice(0,-1).join(' ') : '–'],
        ['Oculto', kData.oraculo.oculto ? kData.oraculo.oculto.split(' ').slice(0,-1).join(' ') : '–'],
        ['Antípoda', kData.oraculo.antipoda ? kData.oraculo.antipoda.split(' ').slice(0,-1).join(' ') : '–'],
        ['Onda', `${Math.floor((kinNum-1)/13)+1}ª · Dia ${((kinNum-1)%13)+1}`],
      ].map(([lbl, val]) => `
      <div><span style="color:var(--text3)">${lbl}:</span> <span style="color:var(--text)">${val}</span></div>`).join('') : ''}
    </div>
  </div>

  <!-- Poema do Kin -->
  ${pt.poder && ps.qualidade ? `
  <div style="background:rgba(165,124,0,.05);border:1px solid var(--border-g);border-radius:7px;padding:.6rem .8rem;margin-bottom:.7rem;font-size:.8rem;line-height:1.9;text-align:center;color:var(--text2);font-style:italic">
    <div style="font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;font-family:Cinzel;margin-bottom:.4rem">Poema Ressonante</div>
    Eu ${pt.poder} com o fim de ${ps.qualidade},<br>
    ${pt.acao} ${ps.poder.toLowerCase()},<br>
    <span style="color:var(--text3);font-size:.75rem">Com o tom ${pt.qualidade} do ${nomeTom.toLowerCase()}.</span>
  </div>` : ''}

  <!-- Campos editáveis -->
  <div style="margin-top:.5rem">
    ${field('afirmacao', 'Afirmação da Semana', reg.afirmacao, 'Escreva sua afirmação da semana...')}
    ${field('plasma-afirm', 'Afirmação do Plasma', reg.plasma_afirm, 'Afirmação de Padma Sambhava do dia...')}
    ${field('pergunta', 'Pergunta da Lua', reg.pergunta, PERGUNTAS_LUA[luaNum] || 'Reflexão do dia...')}
    ${field('intencao', 'Intenção do Dia', reg.intencao, 'O que pretendo cultivar hoje...')}
    ${field('sincronicidade', 'Sincronicidades', reg.sincronicidade, 'Registro de sincronicidades percebidas...')}
    ${field('gratidao', 'Gratidão', reg.gratidao, 'Por que sou grato hoje...')}
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.6rem">
    <div id="cron-status" style="font-size:.68rem;color:var(--text3);font-style:italic"></div>
    <div style="display:flex;gap:.5rem">
      <button onclick="verHistoricoCronografo()" style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);padding:4px 10px;font-size:.6rem;font-family:Cinzel;cursor:pointer;text-transform:uppercase;letter-spacing:.07em">📅 Histórico</button>
      <button onclick="salvarCronografo(true)" style="background:var(--green);border:none;border-radius:4px;color:#fff;padding:4px 12px;font-size:.6rem;font-family:Cinzel;cursor:pointer;text-transform:uppercase;letter-spacing:.07em">💾 Salvar</button>
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
    if (el) { el.textContent = '✓ Salvo!'; setTimeout(()=>{ el.textContent=''; }, 2000); }
  }
};

// Modal de histórico
window.verHistoricoCronografo = function() {
  const todos = getCronografoData();
  const datas = Object.keys(todos).sort().reverse().slice(0, 30);
  if (!datas.length) { alert('Nenhum registro ainda.'); return; }

  let el = document.getElementById('modal-cronografo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'modal-cronografo';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;align-items:flex-start;justify-content:center;padding:1rem;overflow-y:auto';
    el.onclick = e => { if(e.target===el) el.style.display='none'; document.body.style.overflow=''; };
    document.body.appendChild(el);
  }

  el.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:10px;padding:1.2rem;max-width:480px;width:100%;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem;border-bottom:1px solid var(--border);padding-bottom:.7rem">
        <span style="font-family:Cinzel;font-size:.82rem;color:var(--gold2)">📅 Histórico do Cronógrafo</span>
        <button onclick="document.getElementById('modal-cronografo').style.display='none';document.body.style.overflow=''" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:.8rem;font-family:Cinzel">✕ Fechar</button>
      </div>
      ${datas.map(data => {
        const r = todos[data];
        const campos = [
          r.afirmacao && ['Afirmação', r.afirmacao],
          r.plasma_afirm && ['Plasma', r.plasma_afirm],
          r.pergunta && ['Pergunta da Lua', r.pergunta],
          r.intencao && ['Intenção', r.intencao],
          r.sincronicidade && ['Sincronicidades', r.sincronicidade],
          r.gratidao && ['Gratidão', r.gratidao],
        ].filter(Boolean);
        if (!campos.length) return '';
        return `<div style="margin-bottom:.9rem;padding-bottom:.9rem;border-bottom:1px solid var(--border)">
          <div style="font-family:Cinzel;font-size:.68rem;color:var(--gold);margin-bottom:.4rem">${data}</div>
          ${campos.map(([lbl, val]) => `
          <div style="margin-bottom:.3rem">
            <span style="font-size:.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:.07em">${lbl}: </span>
            <span style="font-size:.8rem;color:var(--text2);font-style:italic">${val}</span>
          </div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;

  el.style.display = 'flex';
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
<div class="section" style="margin-top:.5rem">
  <div class="section-title">Tabela Guia Interativa</div>
  <p style="font-size:.82rem;color:var(--text3);margin-bottom:.8rem">Digite seu Kin para calcular automaticamente Guia, Análogo, Antípoda e Oculto.</p>
  <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.9rem">
    <input type="number" id="tabela-guia-inp" min="1" max="260" placeholder="Kin (1–260)"
      style="background:var(--bg2);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:.4rem .7rem;font-family:Cinzel;font-size:.82rem;width:120px"
      oninput="calcularTabelaGuia()">
    <button onclick="calcularTabelaGuia()" style="background:var(--green);border:none;border-radius:4px;color:#fff;padding:5px 14px;font-family:Cinzel;font-size:.62rem;cursor:pointer;text-transform:uppercase;letter-spacing:.07em">Calcular</button>
  </div>
  <div id="tabela-guia-resultado" style="display:none">
    <div style="display:flex;flex-direction:column;gap:6px" id="tabela-guia-linhas"></div>
    <div id="tabela-guia-poema" style="margin-top:.8rem;background:rgba(165,124,0,.05);border:1px solid var(--border-g);border-radius:8px;padding:.8rem;text-align:center;font-style:italic;font-size:.88rem;color:var(--text2);line-height:1.9"></div>
  </div>
</div>`;
}
