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
