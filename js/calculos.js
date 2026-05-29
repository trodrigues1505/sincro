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
  if (ehSeloFeminino(selo)) {
    return tom
      .replace('Magnético','Magnética').replace('Elétrico','Elétrica')
      .replace('Rítmico','Rítmica').replace('Galáctico','Galáctica')
      .replace('Planetário','Planetária').replace('Cósmico','Cósmica');
  }
  return tom;
}

export function getSeloBase(nomeCompleto) {
  return nomeCompleto.split(' ').slice(0, -1).join(' ');
}

export function getSeloCor(nomeCompleto) {
  const p = nomeCompleto.split(' ');
  return p[p.length - 1].toLowerCase();
}

export function getSeloIconURL(nomeCompleto) {
  const nomeBase = nomeCompleto.split(' ').slice(0, -1).join(' ');
  const mapa = {
    'Dragão':'./assets/icons/dragao.png','Vento':'./assets/icons/vento.png',
    'Noite':'./assets/icons/noite.png','Semente':'./assets/icons/semente.png',
    'Serpente':'./assets/icons/serpente.png','Enlaçador':'./assets/icons/enlacador.png',
    'Enlaçador de Mundos':'./assets/icons/enlacador.png','Mão':'./assets/icons/mao.png',
    'Estrela':'./assets/icons/estrela.png','Lua':'./assets/icons/lua.png',
    'Cão':'./assets/icons/cao.png','Cachorro':'./assets/icons/cao.png',
    'Macaco':'./assets/icons/macaco.png','Humano':'./assets/icons/humano.png',
    'Caminhante':'./assets/icons/caminhante.png','Caminhante do Céu':'./assets/icons/caminhante.png',
    'Mago':'./assets/icons/mago.png','Feiticeiro':'./assets/icons/mago.png',
    'Águia':'./assets/icons/aguia.png','Guerreiro':'./assets/icons/guerreiro.png',
    'Terra':'./assets/icons/terra.png','Espelho':'./assets/icons/espelho.png',
    'Tormenta':'./assets/icons/tormenta.png','Sol':'./assets/icons/sol.png',
  };
  return mapa[nomeBase] || './assets/icons/default.png';
}

export function isLeapDay(d) {
  return d.getMonth() === 1 && d.getDate() === 29;
}

export function countLeapDays(f, t) {
  let count = 0;
  for (let y = f.getFullYear(); y <= t.getFullYear(); y++) {
    if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) {
      const leapDay = new Date(y, 1, 29);
      if (leapDay > f && leapDay <= t) count++;
    }
  }
  return count;
}

export function daysBetween(f, t) {
  if (f > t) return -daysBetween(t, f);
  const fNorm = new Date(f.getFullYear(), f.getMonth(), f.getDate());
  const tNorm = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const totalDays = Math.round((tNorm - fNorm) / 86400000);
  return totalDays - countLeapDays(fNorm, tNorm);
}

export function dateToKin(dt) {
  if (isLeapDay(dt)) return dateToKin(new Date(dt.getFullYear(), 1, 28));
  const dtNorm = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const base = new Date(1987, 6, 26);
  const dias = daysBetween(base, dtNorm);
  return ((34 - 1 + dias) % 260 + 260) % 260 + 1;
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
  const luaNum = Math.floor(diasPassados / 28) + 1;
  const diaLua = (diasPassados % 28) || 28;
  const luaKinNum = LUA_KINS[luaNum - 1] || 1;
  const luaAnimal = LUAS_ANIMAIS[luaNum - 1] || '';
  const luaKinData = (DATA.kins || {})[String(luaKinNum)] || null;
  return { luaNum, diaLua, luaAnimal, luaKinData, luaKinNum };
}

export function getContextoAnelSolar(anoGal) {
  const anelKin = dateToKin(new Date(anoGal, 6, 26));
  const s = (anelKin - 1) % 20, t = (anelKin - 1) % 13;
  const nome = SELOS_NOMES[s], tom = TONS_NOMES[t], corBase = CORES_CICLO[s];
  const cor = concordarCor(corBase, nome);
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
  if (seloNatal && guia    && seloNatal === guia)    return { label:'Guia',                desc:'Seu kin natal guia o kin de hoje',              cor:'var(--gold2)', icon:'🔮' };
  if (seloNatal && analogo && seloNatal === analogo) return { label:'Análogo',             desc:'Seu kin natal é análogo ao de hoje',            cor:'var(--green2)',icon:'🌱' };
  if (seloNatal && antipoda && seloNatal === antipoda) return { label:'Antípoda',          desc:'Seu kin natal é antípoda ao de hoje',           cor:'#6080c0',      icon:'⚡' };
  if (seloNatal && oculto  && seloNatal === oculto)  return { label:'Oculto',              desc:'Seu kin natal está oculto no kin de hoje',      cor:'rgba(165,124,0,.8)', icon:'🌙' };
  if (kinDia === kinNatal)                            return { label:'Sincronicidade Total',desc:'Hoje é exatamente o seu Kin Natal!',           cor:'var(--gold3)', icon:'✨' };
  return null;
}
