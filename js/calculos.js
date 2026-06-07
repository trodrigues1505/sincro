// ─── js/calculos.js — cálculos do sincronário (sem efeitos colaterais) ───────
import { DATA, SELOS_FEMININOS, SELOS_NOMES, TONS_NOMES, CORES_CICLO, LUA_KINS, LUAS_ANIMAIS } from './data.js';

export function ehSeloFeminino(nomeBase) {
  return [...SELOS_FEMININOS].some(f => nomeBase.includes(f));
}

export function concordarCor(corBase, nomeBase) {
  const fem = ehSeloFeminino(nomeBase);
  const mapa = {
    Vermelho: fem ? 'Vermelha' : 'Vermelho',
    Branco:   fem ? 'Branca'   : 'Branco',
    Azul:     'Azul',
    Amarelo:  fem ? 'Amarela'  : 'Amarelo',
  };
  return mapa[corBase] || corBase;
}

export function concordar(selo, tom) {
  // Normaliza para o masculino primeiro (caso venha feminizado do JSON)
  const tomMasc = tom
    .replace('Magnética','Magnético').replace('Elétrica','Elétrico')
    .replace('Harmônica','Harmônico')
    .replace('Rítmica','Rítmico').replace('Galáctica','Galáctico')
    .replace('Planetária','Planetário').replace('Cósmica','Cósmico');
  if (ehSeloFeminino(selo)) {
    return tomMasc
      .replace('Magnético','Magnética').replace('Elétrico','Elétrica')
      .replace('Harmônico','Harmônica')
      .replace('Rítmico','Rítmica').replace('Galáctico','Galáctica')
      .replace('Planetário','Planetária').replace('Cósmico','Cósmica');
  }
  return tomMasc;
}

export function getSeloBase(nomeCompleto) {
  return nomeCompleto.split(' ').slice(0, -1).join(' ');
}

export function getSeloCor(nomeCompleto) {
  const p = nomeCompleto.split(' ');
  return p[p.length - 1].toLowerCase();
}

export function getSeloIconURL(nomeCompleto) {
  if (!nomeCompleto) return './assets/icons/default.png';
  const partes = nomeCompleto.trim().split(' ');
  const nomeBase = partes.slice(0, -1).join(' ') || nomeCompleto;
  const mapa = {
    'Dragão':'dragao','Vento':'vento','Noite':'noite','Semente':'semente',
    'Serpente':'serpente','Enlaçador':'enlacador','Enlaçador de Mundos':'enlacador',
    'Mão':'mao','Estrela':'estrela','Lua':'lua',
    'Cão':'cao','Cachorro':'cao','Cão Branco':'cao','Cachorro Branco':'cao',
    'Macaco':'macaco','Humano':'humano',
    'Caminhante':'caminhante','Caminhante do Céu':'caminhante',
    'Mago':'mago','Feiticeiro':'mago',
    'Águia':'aguia','Guerreiro':'guerreiro',
    'Terra':'terra','Espelho':'espelho','Tormenta':'tormenta','Sol':'sol',
  };
  // tenta nomeBase, depois primeiro token, depois nome completo sem cor
  const arquivo = mapa[nomeBase] || mapa[partes[0]] || mapa[nomeCompleto] || null;
  return arquivo ? `./assets/icons/${arquivo}.png` : './assets/icons/default.png';
}

export function isLeapDay(d) {
  return d.getMonth() === 1 && d.getDate() === 29;
}

// ─── daysBetween ─────────────────────────────────────────────────────────────
// Diferença simples em dias corridos entre duas datas (sem descontar bissextos).
// Usado para calcular dia/lua do ano galáctico em renderer.js.
export function daysBetween(f, t) {
  const fNorm = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  const tNorm = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((tNorm - fNorm) / 86400000);
}

// ─── dateToKin ────────────────────────────────────────────────────────────────
// O calendário das 13 Luas não usa anos bissextos: 29/fev é tratado como 28/fev.
// A contagem de dias usa diferença calendária direta (Math.round) sem descontar
// os dias bissextos acumulados — isso produz o offset correto com base = 23.
export function dateToKin(dt) {
  if (isLeapDay(dt)) return dateToKin(new Date(dt.getFullYear(), 1, 28));
  const dtNorm = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const base   = new Date(1987, 6, 26); // 26 de julho de 1987
  const dias   = Math.round((dtNorm - base) / 86400000);
  return ((23 + dias) % 260 + 260) % 260 + 1;
}

export function getFaseLunar(d) {
  const lc = 29.53, nk = new Date(2000, 0, 6, 18, 14);
  const df = (d - nk) / (1000 * 60 * 60 * 24), ph = (df % lc) / lc;
  if (ph < 0.03 || ph > 0.97) return '🌑 Nova';
  if (ph < 0.28) return '🌒 Crescente';
  if (ph < 0.53) return '🌕 Cheia';
  if (ph < 0.78) return '🌘 Minguante';
  return '🌑 Nova';
}

export function getAnoGalactico() {
  const hoje = new Date();
  return hoje >= new Date(hoje.getFullYear(), 6, 26) ? hoje.getFullYear() : hoje.getFullYear() - 1;
}

export function getContextoLua(diasPassados) {
  const luaNum    = Math.floor(diasPassados / 28) + 1;
  const diaLua    = (diasPassados % 28) || 28;
  const luaKinNum = LUA_KINS[luaNum - 1] || 1;
  const luaAnimal = LUAS_ANIMAIS[luaNum - 1] || '';
  const luaKinData = (DATA.kins || {})[String(luaKinNum)] || null;
  return { luaNum, diaLua, luaAnimal, luaKinData, luaKinNum };
}

export function getContextoAnelSolar(anoGal) {
  const anelKin = dateToKin(new Date(anoGal, 6, 26));
  const s = (anelKin - 1) % 20, t = (anelKin - 1) % 13;
  const nome = SELOS_NOMES[s], tom = TONS_NOMES[t], corBase = CORES_CICLO[s];
  const cor  = concordarCor(corBase, nome);
  const selo = (DATA.selos || {})[s] || {};
  return {
    anelKin, anelTomNum: t + 1,
    anelNomeCompleto: `${nome} ${tom} ${cor}`,
    anelIconURL: getSeloIconURL(`${nome} ${corBase}`),
    anelAcao: selo.acao || '',
    anelCorSelo: corBase.toLowerCase(),
    anoGal,
  };
}

export function getRelacaoKins(kinDia, kinNatal) {
  if (!kinDia || !kinNatal || !DATA.kins) return null;
  const kd = DATA.kins[String(kinDia)];
  if (!kd || !kd.oraculo) return null;
  const seloNatal = (DATA.kins[String(kinNatal)] || {}).selo || '';
  const { guia, analogo, antipoda, oculto } = kd.oraculo;
  if (seloNatal && guia     && seloNatal === guia)     return { label:'Guia',                 desc:'Seu kin natal guia o kin de hoje',           cor:'var(--gold2)',        icon:'🔮' };
  if (seloNatal && analogo  && seloNatal === analogo)  return { label:'Análogo',              desc:'Seu kin natal é análogo ao de hoje',         cor:'var(--green2)',       icon:'🌱' };
  if (seloNatal && antipoda && seloNatal === antipoda) return { label:'Antípoda',             desc:'Seu kin natal é antípoda ao de hoje',        cor:'#6080c0',            icon:'⚡' };
  if (seloNatal && oculto   && seloNatal === oculto)   return { label:'Oculto',               desc:'Seu kin natal está oculto no kin de hoje',   cor:'rgba(165,124,0,.8)', icon:'🌙' };
  if (kinDia === kinNatal)                             return { label:'Sincronicidade Total', desc:'Hoje é exatamente o seu Kin Natal!',         cor:'var(--gold3)',        icon:'✨' };
  return null;
}

export function calcPoemaKin(kinNum, kData, poema_tom, poema_selo, selos_nomes) {
  if (!kData) return null;
  const seloIdx  = (kinNum - 1) % 20;
  const tomIdx   = ((kinNum - 1) % 13) + 1;
  const ps = poema_selo[seloIdx];
  const pt = poema_tom[tomIdx];
  if (!ps || !pt) return null;
  const nomeSelo = selos_nomes[seloIdx] || '';
  const femininos = new Set(['Noite','Serpente','Mão','Estrela','Lua','Águia','Terra','Semente','Tormenta']);
  const isFem    = femininos.has(nomeSelo);
  const daArticle = isFem ? 'da' : 'do';
  const guiaLinha = kData.oraculo?.guia
    ? `Eu sou guiado pelo poder ${daArticle} ${kData.oraculo.guia.split(' ').slice(0,-1).join(' ')}`
    : `Eu sou guiado pelo meu próprio poder duplicado`;
  return {
    linha1: `Eu ${pt.poder} com o fim de ${ps.qualidade},`,
    linha2: `${pt.acao} ${ps.poder},`,
    linha3: `Sel${isFem?'a':'o'} ${isFem?'a':'o'} ${nomeSelo} d${daArticle} ${ps.essencia},`,
    linha4: `Com o tom ${pt.qualidade} d${daArticle === 'da' ? 'a' : 'o'} ${pt.acao.toLowerCase().replace('ando','ação').replace('endo','ção')},`,
    linha5: guiaLinha,
  };
}   
