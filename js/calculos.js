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
// Usado em renderer.js para o dia/lua do ano galáctico. NÃO usar para Kin: veja dateToKin.
export function daysBetween(f, t) {
  const fNorm = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  const tNorm = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((tNorm - fNorm) / 86400000);
}

// ─── dateToKin ────────────────────────────────────────────────────────────────
// O calendário das 13 Luas não conta o 29 de fevereiro: o dia é "pulado" (29/fev usa o mesmo
// Kin de 28/fev e 1º/mar segue direto). Por isso o número de dias entre duas datas precisa
// DESCONTAR os 29/fev que existem entre elas.
//
// Histórico do erro: a versão anterior contava todos os dias corridos e compensava isso com
// um offset de 23, calibrado só para 07/06/2026 (Kin 180). Com o desconto correto, o offset
// certo é 33 (26/07/1987 = Kin 34), e a diferença de 10 é exatamente a quantidade de 29/fev
// entre 1987 e 2026. A versão antiga só acertava datas sem nenhum 29/fev entre elas e 2026
// (ou seja, só nascidos depois de 29/02/2024) e passaria a errar o Kin do dia em 01/03/2028.
// Referências conferidas: 07/06/2026 = 180, 15/05/1985 = 12 (Humano Amarelo),
// 21/12/2012 = 207, 26/07/1987 = 34.

// Quantidade de 29/fev ocorridos até a data (inclusive). `d` nunca é 29/fev (já normalizado).
function bissextosAte(d) {
  const y = d.getFullYear();
  const anosBissextosAte = (n) => Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400);
  const bissextoEsteAno = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  // em jan/fev (até 28/fev) o 29/fev deste ano ainda não aconteceu
  return anosBissextosAte(y - 1) + ((bissextoEsteAno && d.getMonth() >= 2) ? 1 : 0);
}

const KIN_BASE_DATA   = new Date(1987, 6, 26); // 26 de julho de 1987 = Kin 34
const KIN_BASE_OFFSET = 33;                    // (33 + 0) % 260 + 1 = 34

export function dateToKin(dt) {
  if (isLeapDay(dt)) return dateToKin(new Date(dt.getFullYear(), 1, 28));
  const dtNorm = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diasCorridos = Math.round((dtNorm - KIN_BASE_DATA) / 86400000);
  const dias = diasCorridos - (bissextosAte(dtNorm) - bissextosAte(KIN_BASE_DATA));
  return ((KIN_BASE_OFFSET + dias) % 260 + 260) % 260 + 1;
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
