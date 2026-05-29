// ─── js/renderer.js — toda renderização HTML do sincronário ──────────────────
import {
  DATA, MEDITACOES, ONDAS_PROPOSITOS, DIA_ONDA_PARA_IDX, PERGUNTAS_TOM,
  PLASMA_SVGS, SELF_DESIGN_ONDAS, SELF_DESIGN_PAGINAS,
  SELOS_NOMES, TONS_NOMES, CORES_CICLO, CASTELO_NOMES,
  LUAS_ANIMAIS, LUA_KINS, COR_BASE_NORM, ANIMAIS_FEM,
} from './data.js';
import {
  getSeloBase, getSeloCor, getSeloIconURL, concordar, concordarCor,
  ehSeloFeminino, getFaseLunar, getAnoGalactico, getContextoLua,
  getContextoAnelSolar, daysBetween,
} from './calculos.js';
import { isFavorito } from './storage.js';

// ─── Glifo do Tom ─────────────────────────────────────────────────────────────
export function gerarGlifoTom(tom, iconSize) {
  const sz = iconSize || 64;
  const barras = Math.floor(tom / 5), pontos = tom % 5;
  const bw = sz, bh = Math.max(4, Math.round(sz * 0.07));
  const bg = Math.round(sz * 0.06);
  const pr = Math.max(3, Math.round(sz * 0.06)), pg = Math.round(sz * 0.07);
  const totalH = Math.max(barras * (bh + bg) + (pontos > 0 ? pr * 2 + bg : 0), pr * 2);
  const svgH = totalH + 4;
  const cx = sz / 2;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${svgH}" viewBox="0 0 ${sz} ${svgH}">`;
  let y = svgH - 2;
  for (let b = 0; b < barras; b++) {
    y -= bh;
    svg += `<rect x="0" y="${y}" width="${bw}" height="${bh}" rx="2" fill="#c9a030" opacity=".85"/>`;
    y -= bg;
  }
  if (pontos > 0) {
    y -= pr + 1;
    const totalW = (pontos - 1) * pg + pontos * (pr * 2);
    let px = cx - totalW / 2 + pr;
    for (let p = 0; p < pontos; p++) {
      svg += `<circle cx="${px.toFixed(1)}" cy="${y}" r="${pr}" fill="#c9a030" opacity=".85"/>`;
      px += pr * 2 + pg;
    }
  }
  return svg + '</svg>';
}

// ─── Lua circular ─────────────────────────────────────────────────────────────
export function gerarLuaCircular(diaAtivo) {
  const cores = ['red','white','blue','yellow'];
  const nomesCores = [['red','Vermelha'],['white','Branca'],['blue','Azul'],['yellow','Amarela']];
  const cx = 200, cy = 200, rOut = 178, rIn = 118, rLbl = 148;
  let segs = '', labels = '';
  for (let i = 0; i < 28; i++) {
    const dia = i + 1, cor = cores[Math.floor(i / 7)];
    const a1 = (i * 360/28 - 90) * Math.PI/180, a2 = ((i+1) * 360/28 - 90) * Math.PI/180;
    const x1o = cx+rOut*Math.cos(a1), y1o = cy+rOut*Math.sin(a1);
    const x2o = cx+rOut*Math.cos(a2), y2o = cy+rOut*Math.sin(a2);
    const x1i = cx+rIn*Math.cos(a1),  y1i = cy+rIn*Math.sin(a1);
    const x2i = cx+rIn*Math.cos(a2),  y2i = cy+rIn*Math.sin(a2);
    const d = `M${x1o.toFixed(1)} ${y1o.toFixed(1)} A${rOut} ${rOut} 0 0 1 ${x2o.toFixed(1)} ${y2o.toFixed(1)} L${x2i.toFixed(1)} ${y2i.toFixed(1)} A${rIn} ${rIn} 0 0 0 ${x1i.toFixed(1)} ${y1i.toFixed(1)}Z`;
    const ativo = dia === diaAtivo ? ' active' : '';
    segs   += `<path d="${d}" class="seg ${cor}${ativo}"></path>`;
    const am = ((i+0.5)*360/28 - 90) * Math.PI/180;
    labels += `<text x="${(cx+rLbl*Math.cos(am)).toFixed(1)}" y="${(cy+rLbl*Math.sin(am)).toFixed(1)}" class="seg-label${ativo}">${dia}</text>`;
  }
  const legenda = nomesCores.map(([cor,nome]) =>
    `<span class="lua-legenda-item"><span class="lua-legenda-dot ${cor}"></span>${nome}</span>`
  ).join('');
  return `<div><svg class="lua-circular" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">${segs}${labels}<text x="${cx}" y="${cy-9}" class="center-text center-num">${diaAtivo}</text><text x="${cx}" y="${cy+13}" class="center-text center-sub">DE 28</text></svg><div class="lua-legenda">${legenda}</div></div>`;
}

// ─── Célula clicável de kin (reutilizada em oráculo, onda, castelo) ───────────
// FIX: borda dourada removida do oráculo; todos os kins são clicáveis com abrirKinModal
function celKin(kinNum, nomeCompleto, corSelo, iconURL, largura, altura, extraStyle='') {
  const safe = (nomeCompleto||'').replace(/'/g,"\\'");
  return `<div class="kin-cel-clicavel" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px" onclick="abrirKinModal(${kinNum},'${safe}')">
    <div class="selo-icon selo-${corSelo}" style="width:${largura}px;height:${altura}px${extraStyle}"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain"></div>
  </div>`;
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function renderHeroKin(kinNum, kD, nomeCompleto, corSelo, seloCompleto, seloBase, tomNum, fraseCurta) {
  const isFav = isFavorito(kinNum);
  return `
<div class="section anim-1">
  <div class="kin-hero">
    <div style="display:flex;justify-content:center;margin-bottom:.3rem">${gerarGlifoTom(tomNum, 64)}</div>
    <div class="selo-icon selo-${corSelo}" style="width:64px;height:64px;border-radius:9px;margin:0 auto .5rem">
      <img src="${getSeloIconURL(seloCompleto)}" alt="${seloBase}" style="width:100%;height:100%;object-fit:contain">
    </div>
    <div class="kin-title">${nomeCompleto}</div>
    <div class="kin-num" style="font-size:.78rem;color:var(--gold2);letter-spacing:.12em;margin-top:.3rem">
      Kin ${kinNum} · 260
      <button class="btn-fav${isFav?' ativo':''}" onclick="toggleFavorito(${kinNum},this)" title="${isFav?'Remover dos favoritos':'Salvar nos favoritos'}">${isFav?'★':'☆'}</button>
    </div>
  </div>
  ${fraseCurta ? `<div class="kin-frase">"${fraseCurta}"</div>` : ''}
  <div class="export-btns">
    <button class="btn-share" onclick="compartilharKin()">⬆ Compartilhar</button>
    <button class="btn-share" onclick="exportPNG()" style="border-color:var(--border);color:var(--text2)">↓ PNG</button>
    <button class="btn-cal" onclick="exportarCalendario28()">📅 28 dias</button>
    <button class="btn-cal" onclick="exportarPDFKin()">📄 PDF</button>
  </div>
</div>`;
}

// ─── Oráculo — central sem style inline de tamanho (CSS controla) ────────────
export function renderOraculo(kinNum, kD, corSelo, seloBase, seloCompleto, tomNum) {
  const { guia, analogo, antipoda, oculto } = kD.oraculo;

  function kinNumDeSelo(seloNome) {
    if (!DATA.kins) return 0;
    const entry = Object.entries(DATA.kins).find(([,v]) => v.selo === seloNome);
    return entry ? Number(entry[0]) : 0;
  }

  const celOraculo = (seloNome, label, flexDir='column') => {
    const cor = getSeloCor(seloNome);
    const base = getSeloBase(seloNome);
    const icon = getSeloIconURL(seloNome);
    const kn = kinNumDeSelo(seloNome);
    const safe = seloNome.replace(/'/g,"\\'");
    const onclick = kn ? `onclick="abrirKinModal(${kn},'${safe}',true)"` : '';
    return `<div style="display:flex;flex-direction:${flexDir};align-items:center;gap:3px;cursor:${kn?'pointer':'default'}" ${onclick}>
      <span style="color:var(--text2);font-size:.48rem;letter-spacing:.08em;text-transform:uppercase;font-family:Cinzel">${label}</span>
      <div class="selo-icon oraculo-side-icon selo-${cor}"><img src="${icon}" style="width:100%;height:100%;object-fit:contain"></div>
      <span style="font-family:Cinzel;font-size:.55rem;color:var(--text);text-align:center;max-width:60px;line-height:1.2">${base}</span>
    </div>`;
  };

  // FIX: central usa apenas a classe CSS — sem style inline de width/height
  // para não sobrescrever o box-shadow definido em .oraculo-central .selo-icon
  return `
<div class="section anim-2">
  <div class="section-title">Oráculo do Destino</div>
  <div class="oraculo-wrap">
    <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(165,124,0,.20)" stroke-width=".4"/>
      <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(165,124,0,.12)" stroke-width=".3"/>
    </svg>
    <div class="oraculo-cell-top oraculo-item oraculo-side">${celOraculo(guia,'Guia')}</div>
    <div class="oraculo-cell-left oraculo-item oraculo-side">${celOraculo(analogo,'Análogo','column-reverse')}</div>
    <div class="oraculo-cell-center oraculo-item oraculo-central">
      <div style="display:flex;justify-content:center;margin-bottom:.2rem">${gerarGlifoTom(tomNum,76)}</div>
      <div class="selo-icon selo-${corSelo}"><img src="${getSeloIconURL(seloCompleto)}" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="oraculo-nome" style="color:var(--gold2);font-size:.63rem;margin-top:.3rem">${seloBase}</div>
      <div style="font-family:Cinzel;font-size:.52rem;color:rgba(165,124,0,.6);letter-spacing:.12em;margin-top:.1rem">KIN ${kinNum}</div>
    </div>
    <div class="oraculo-cell-right oraculo-item oraculo-side">${celOraculo(oculto,'Oculto','column-reverse')}</div>
    <div class="oraculo-cell-bottom oraculo-item oraculo-side">${celOraculo(antipoda,'Antípoda')}</div>
  </div>
</div>`;
}

// ─── Onda encantada — FIX: clique abre modal do kin ──────────────────────────
export function renderOndaEncantada(kinNum) {
  const ondaNum = Math.floor((kinNum-1)/13)+1;
  const ondaInicio = Math.floor((kinNum-1)/13)*13+1;
  const diaOnda = ((kinNum-1)%13)+1;
  const ondaKinInicioData = (DATA.kins||{})[String(ondaInicio)]||{};
  const ondaSeloNome = ondaKinInicioData.selo||'';
  const ondaSeloBase = ondaSeloNome ? ondaSeloNome.split(' ').slice(0,-1).join(' ') : '';
  const ondaNumCiclo = ((ondaNum-1)%20)+1;
  const ondaProposito = (ONDAS_PROPOSITOS.find(o=>o.onda===ondaNumCiclo)||{}).propositos||'';
  const prep = ehSeloFeminino(ondaSeloBase) ? 'da ' : 'do ';
  let kins = '';
  for (let i = 0; i < 13; i++) {
    const k = ondaInicio+i, kData = DATA.kins[k];
    const cor = kData ? getSeloCor(kData.selo) : 'white';
    const ativo = k===kinNum ? 'active' : '';
    const tooltip = kData ? `Kin ${k} · ${kData.selo} ${kData.tom_nome}` : '';
    const safeSelo = (kData?.selo||'').replace(/'/g,"\\'");
    // FIX: onclick abre modal com dados do kin
    kins += `<div class="onda-kin cor-${cor} ${ativo}" title="${tooltip}" onclick="abrirKinModal(${k},'${safeSelo}',true)"><img src="${getSeloIconURL(kData?kData.selo:'')}" style="width:100%;height:100%;object-fit:contain"></div>`;
  }
  return `
<div class="section">
  <div class="section-title">Onda Encantada ${ondaNum} · Dia ${diaOnda} · 13 dias</div>
  <div style="font-family:Cinzel;font-size:.78rem;color:var(--gold3);margin-bottom:.5rem;letter-spacing:.03em">Onda Encantada ${prep}${ondaSeloBase}</div>
  <p style="font-size:.88rem;color:var(--text);margin-bottom:.9rem;line-height:1.7"><span style="color:var(--gold2);font-family:Cinzel;font-size:.65rem;text-transform:uppercase;letter-spacing:.08em">Propósito: </span>${ondaProposito}</p>
  <div class="onda-wrap"><div class="onda-L">${kins}</div><div class="onda-detail" id="onda-detail"></div></div>
</div>`;
}

// ─── Castelo — FIX: marca onda atual; kins clicáveis ─────────────────────────
export function renderCastelo(kinNum) {
  const casteloNum = Math.floor((kinNum-1)/52);
  const castelo = DATA.castelos[casteloNum]||{};
  const casteloOndas = castelo.ondas||[];
  const casteloImg = ['vermelho','branco','azul','amarelo','verde'][casteloNum]||'verde';
  const ondaAtualIdx = Math.floor(((kinNum-1) % 52) / 13); // 0–3: qual onda dentro do castelo

  let ondasHTML = '<div style="display:flex;flex-direction:column;gap:6px;margin-top:.4rem">';
  casteloOndas.forEach((ondaNome, ondaIdx) => {
    const ondaKinInicio = casteloNum*52+ondaIdx*13+1;
    const ondaKinData = (DATA.kins&&DATA.kins[ondaKinInicio])||null;
    let seloBase, iconURL, seloCor;
    if (ondaKinData&&ondaKinData.selo) {
      seloBase = getSeloBase(ondaKinData.selo);
      iconURL  = getSeloIconURL(ondaKinData.selo);
      seloCor  = getSeloCor(ondaKinData.selo);
    } else {
      const cores = ['Vermelho','Branco','Azul','Amarelo'];
      seloBase = ondaNome; seloCor = cores[ondaIdx%4].toLowerCase();
      iconURL  = getSeloIconURL(`${ondaNome} ${cores[ondaIdx%4]}`);
    }
    const prep = ehSeloFeminino(seloBase) ? 'da ' : 'do ';
    const corLabel = concordarCor(COR_BASE_NORM[seloCor]||'', seloBase);
    const isAtual = ondaIdx === ondaAtualIdx;
    const safeSelo = (ondaKinData?.selo||'').replace(/'/g,"\\'");
    // FIX: ícone do kin da onda clicável + marcador "semana atual"
    ondasHTML += `<div style="display:flex;align-items:center;gap:.7rem;padding:.2rem .4rem;border-radius:5px;${isAtual?'background:rgba(165,124,0,.08);border:1px solid rgba(165,124,0,.2)':'border:1px solid transparent'}">
      <div class="selo-icon selo-${seloCor}" style="width:36px;height:36px;flex-shrink:0;margin:0;cursor:pointer" onclick="abrirKinModal(${ondaKinInicio},'${safeSelo}',true)"><img src="${iconURL}" style="width:100%;height:100%;object-fit:contain"></div>
      <span style="font-size:.75rem;color:${isAtual?'var(--gold2)':'var(--text)'};font-family:Cinzel;line-height:1.3;flex:1">Onda ${prep}${seloBase} ${corLabel}</span>
      ${isAtual ? '<span style="font-size:.5rem;color:var(--gold);font-family:Cinzel;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap">← semana atual</span>' : ''}
    </div>`;
  });
  ondasHTML += '</div>';
  return { casteloNum, casteloTexto: CASTELO_NOMES[casteloNum]||'Castelo', casteloImg, ondasHTML };
}

export function renderLuaGalactica(luaNum, diaLua, luaAnimal, luaKinData, luaKinNum) {
  const art = ANIMAIS_FEM.has(luaAnimal) ? 'da ' : 'do ';
  const luaKinCorSelo = luaKinData ? getSeloCor(luaKinData.selo) : 'red';
  const luaKinIconURL = luaKinData ? getSeloIconURL(luaKinData.selo) : '';
  const nomeKinLua    = luaKinData ? (()=>{const p=luaKinData.selo.split(' ');return p.slice(0,-1).join(' ')+' '+luaKinData.tom_nome+' '+p[p.length-1];})() : '';
  const safeSelo = (luaKinData?.selo||'').replace(/'/g,"\\'");
  const clickAttr = luaKinNum ? `onclick="abrirKinModal(${luaKinNum},'${safeSelo}',true)" style="cursor:pointer"` : '';
  return `
    <div style="margin-bottom:1.1rem;border-top:1px solid var(--border-g);padding-top:.9rem;margin-top:.9rem">
      <div class="section-title">Lua Galáctica · ${luaNum} de 13</div>
      <div style="font-family:Cinzel;font-size:.82rem;color:var(--gold2);margin-bottom:.7rem;letter-spacing:.03em">Lua Galáctica ${art}${luaAnimal}</div>
      <div style="display:flex;align-items:center;gap:.75rem">
        <div style="text-align:center" ${clickAttr}>
          <div style="display:flex;justify-content:center;margin-bottom:.2rem">${luaKinData?gerarGlifoTom(luaKinData.tom,54):''}</div>
          <div class="selo-icon selo-${luaKinCorSelo}" style="width:54px;height:54px;flex-shrink:0">${luaKinIconURL?`<img src="${luaKinIconURL}" style="width:100%;height:100%;object-fit:contain">`:''}</div>
        </div>
        <div>
          <div style="font-family:Cinzel;font-size:.78rem;color:var(--gold2)">${nomeKinLua}</div>
          <div style="font-size:.68rem;color:var(--text);margin-top:.2rem">Dia ${diaLua} de 28</div>
        </div>
      </div>
      <div style="margin-top:.8rem">${gerarLuaCircular(diaLua)}</div>
    </div>`;
}

export function renderAnelSolar(anel, anoGal) {
  const safeSelo = (anel.anelNomeCompleto||'').replace(/'/g,"\\'");
  return `
    <div style="margin-bottom:.6rem;border-top:1px solid var(--border-g);padding-top:.9rem;margin-top:.3rem">
      <div class="section-title">Anel Solar · 364 dias</div>
      <div style="font-family:Cinzel;font-size:.82rem;color:var(--gold2);margin-bottom:.6rem">${anel.anelNomeCompleto}</div>
      <div style="display:flex;align-items:center;gap:.75rem">
        <div style="text-align:center;cursor:pointer" onclick="abrirKinModal(${anel.anelKin},'${safeSelo}',true)">
          <div style="display:flex;justify-content:center;margin-bottom:.2rem">${gerarGlifoTom(anel.anelTomNum,54)}</div>
          <div class="selo-icon selo-${anel.anelCorSelo}" style="width:54px;height:54px;flex-shrink:0"><img src="${anel.anelIconURL}" style="width:100%;height:100%;object-fit:contain"></div>
        </div>
        <div>
          <div style="font-size:.72rem;color:var(--text2)">${anel.anelAcao}</div>
          <div style="font-size:.65rem;color:var(--gold);margin-top:.2rem">Kin ${anel.anelKin} · Ano ${anoGal}–${anoGal+1}</div>
        </div>
      </div>
    </div>`;
}

export function renderPlasmaFaseLunar(kinNum, faseLunar) {
  const diaSemana = (kinNum-1)%7;
  const plasma = DATA.plasmas[diaSemana]||'';
  const plasmaChave = plasma.split(' - ')[0];
  const plasmaSVGUrl = PLASMA_SVGS[plasmaChave.toLowerCase()]||'';
  return `
    <div style="margin-bottom:.6rem;border-top:1px solid var(--border-g);padding-top:.9rem;margin-top:.3rem">
      <div class="section-title">Plasma · Fase Lunar</div>
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:.6rem;flex:1;min-width:120px">
          ${plasmaSVGUrl ? `<img src="${plasmaSVGUrl}" style="width:48px;height:48px;object-fit:contain" alt="${plasmaChave}">` :
            `<span style="font-size:1.5rem;width:48px;text-align:center">${({'Dali':'☀️','Seli':'🌊','Gama':'👁','Kali':'🔥','Alfa':'🌬️','Limi':'🌙','Silio':'💚'}[plasmaChave]||'⚡')}</span>`}
          <div>
            <div style="font-family:Cinzel;font-size:.78rem;color:var(--gold2)">${plasmaChave}</div>
            <div style="font-size:.65rem;color:var(--text2);margin-top:.1rem">${plasma.split(' - ')[1]||''}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.6rem;flex:1;min-width:120px">
          <span style="font-size:2.8rem;width:54px;height:54px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${faseLunar.split(' ')[0]}</span>
          <div>
            <div style="font-family:Cinzel;font-size:.78rem;color:var(--gold2)">${faseLunar.replace(/^[^ ]+ /,'')}</div>
            <div style="font-size:.65rem;color:var(--text2);margin-top:.1rem">Fase Lunar</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Prática diária — FIX: meditação usa kin do anel (índice 1–20) ───────────
export function renderPraticaDiaria(kinNum, diaOnda, anelKin, seloBase) {
  const ondaNum = Math.floor((kinNum-1)/13)+1;
  const selfDesignOndaNum = ((ondaNum-1)%20)+1;
  const selfDesignIdx = DIA_ONDA_PARA_IDX[diaOnda]||1;
  const selfDesignURL = (SELF_DESIGN_ONDAS[selfDesignOndaNum]||[])[selfDesignIdx]||'#';
  const selfDesignPagina = SELF_DESIGN_PAGINAS[diaOnda]||2;
  // FIX: meditação usa o índice do selo do kin ATUAL (posição 0–19 no ciclo de 20 selos)
  const seloIdx = ((kinNum-1) % 20) + 1;
  const meditacaoURL = MEDITACOES[String(seloIdx)] || '';
  return `
  <div class="section">
    <div class="section-title">Prática Diária</div>
    <ul class="praticas-list">
      <li class="has-btn"><span>Ouça a prece das 7 direções galácticas</span><button class="btn-pratica" onclick="togglePrece(this)">▶ ouvir</button></li>
      <li class="has-btn"><span>Meditação do selo</span><button class="btn-pratica" onclick="abrirModalVideo('${meditacaoURL}','${seloBase}')">▶ ouvir</button></li>
      <li class="has-btn"><span>Ouça o Self Design Sounds</span><button class="btn-pratica" onclick="abrirSelfDesign(${kinNum})">▶ ouvir</button></li>
      <li class="has-btn"><span>Leitura da página ${selfDesignPagina} do e-book</span><button class="btn-pratica" onclick="abrirEbook('${selfDesignURL}',${selfDesignPagina})">▶ abrir</button></li>
      <li class="has-btn" style="justify-content:flex-start">${PERGUNTAS_TOM[diaOnda]||''}</li>
    </ul>
  </div>`;
}

// ─── kinHTML ──────────────────────────────────────────────────────────────────
export function kinHTML(kinNum, modoNatal = false) {
  const kD = DATA.kins[kinNum];
  if (!kD) return '<p>Carregando dados...</p>';
  const seloCompleto = kD.selo;
  const seloBase = getSeloBase(seloCompleto);
  const corSelo  = getSeloCor(seloCompleto);
  const tomConcordado = concordar(seloCompleto, kD.tom_nome);
  const nomeCompleto  = `${seloBase} ${tomConcordado} ${corSelo.charAt(0).toUpperCase()+corSelo.slice(1)}`;
  const diaOnda = ((kinNum-1)%13)+1;
  const anoGal  = getAnoGalactico();
  const diasPassados = daysBetween(new Date(anoGal,6,26), new Date());
  const { luaNum, diaLua, luaAnimal, luaKinData, luaKinNum } = getContextoLua(diasPassados);
  const anel = getContextoAnelSolar(anoGal);
  const faseLunar = getFaseLunar(new Date());
  const heroHTML    = renderHeroKin(kinNum, kD, nomeCompleto, corSelo, seloCompleto, seloBase, kD.tom, kD.frase_curta||'');
  const oraculoHTML = renderOraculo(kinNum, kD, corSelo, seloBase, seloCompleto, kD.tom);
  const ondaHTML    = renderOndaEncantada(kinNum);
  if (modoNatal) return `<div>${heroHTML}${oraculoHTML}${ondaHTML}</div>`;
  const { casteloNum, casteloTexto, casteloImg, ondasHTML } = renderCastelo(kinNum);
  const luaHTML     = renderLuaGalactica(luaNum, diaLua, luaAnimal, luaKinData, luaKinNum);
  const anelHTML    = renderAnelSolar(anel, anoGal);
  const plasmaHTML  = renderPlasmaFaseLunar(kinNum, faseLunar);
  const praticaHTML = renderPraticaDiaria(kinNum, diaOnda, anel.anelKin, seloBase);
  return `
<div>
${heroHTML}${oraculoHTML}${ondaHTML}
<div class="grid-2">
  <div class="section">
    <div class="section-title">Castelo · 52 dias</div>
    <div style="font-family:Cinzel;font-size:.82rem;color:var(--gold2);margin-bottom:.7rem;letter-spacing:.03em">${casteloTexto}</div>
    <div style="margin-bottom:1.1rem">
      <img src="./assets/icons/castelo-${casteloImg}.png" alt="Castelo" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 0 .8rem 0">
      ${ondasHTML}
    </div>
    ${luaHTML}${anelHTML}${plasmaHTML}
  </div>
${praticaHTML}
</div>
</div>`;
}
