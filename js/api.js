// ─── js/api.js — Firebase auth, Firestore e perfil ───────────────────────────
import { DATA_PRONTO, DATA } from './data.js';
import { dateToKin } from './calculos.js';
import { renderHistorico, renderFavoritos } from './storage.js';

// Config Firebase (client-side — protegida pelas Security Rules do Firestore)
const fc = {
  apiKey: "AIzaSyDOf77LceD2eKXlewRxxJT60hiBIlRJrJY",
  authDomain: "sincro13luas.firebaseapp.com",
  projectId: "sincro13luas",
  storageBucket: "sincro13luas.firebasestorage.app",
  messagingSenderId: "886057704979",
  appId: "1:886057704979:web:31b8348110ff8649c369e6",
};
firebase.initializeApp(fc);
export const auth = firebase.auth();
export const db   = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

export let currentUserUID = null;
export let _kinNatalSalvo = null;

// ─── Login ────────────────────────────────────────────────────────────────────
export function initLogin() {
  document.getElementById('btn-login').onclick = () => {
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('login-loading').textContent = 'Entrando...';
    document.getElementById('login-loading').classList.remove('hidden');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile'); provider.addScope('email');
    auth.signInWithPopup(provider).catch(e => {
      let msg = e.message;
      if (e.code === 'auth/popup-blocked')          msg = '⚠️ Popup bloqueado! Verifique as configurações do navegador.';
      else if (e.code === 'auth/cancelled-popup-request') msg = '⚠️ Login cancelado.';
      document.getElementById('login-error').textContent = msg;
      document.getElementById('login-error').classList.remove('hidden');
      document.getElementById('login-loading').classList.add('hidden');
    });
  };
  document.getElementById('btn-logout').onclick = () => auth.signOut();
}

export function mostrarTelaAguardoAprovacao(uid) {
  document.querySelector('.login-box:not(#tela-aguardo)').classList.add('hidden');
  document.getElementById('aguardo-uid').textContent = `✓ Conta identificada: ${uid.substring(0,8)}...`;
  document.getElementById('tela-aguardo').classList.remove('hidden');
  document.getElementById('login-loading').classList.add('hidden');
  document.getElementById('login-error').classList.add('hidden');
}

// ─── Auth state observer ──────────────────────────────────────────────────────
export function initAuthObserver(onAuthorized) {
  let isProcessingAuth = false, authCheckInterval = null;
  auth.onAuthStateChanged(async u => {
    if (isProcessingAuth) return;
    isProcessingAuth = true;
    try {
      if (!u) {
        document.getElementById('login-screen').style.display = '';
        document.getElementById('app-screen').classList.remove('active');
        return;
      }
      const uR = db.collection('users').doc(u.uid);
      let uD = await uR.get();
      if (!uD.exists) {
        await uR.set({ email: u.email, nome: u.displayName, authorized: false, role: 'user', criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
        uD = await uR.get();
      }
      if (uD.exists) {
        const d = uD.data();
        if (d.authorized === true) {
          document.getElementById('login-screen').style.display = 'none';
          document.getElementById('app-screen').classList.add('active');
          document.getElementById('user-avatar').src = u.photoURL||'';
          document.getElementById('user-name').textContent = u.displayName;
          const roleEl = document.getElementById('user-role');
          if (roleEl) roleEl.textContent = d.role||'usuário';
          if (d.role === 'admin') document.getElementById('btn-admin')?.classList.remove('hidden');
          db.collection('users').doc(u.uid).update({ ultimoAcesso: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
          currentUserUID = u.uid;
          if (authCheckInterval) { clearInterval(authCheckInterval); authCheckInterval = null; }
          onAuthorized(u);
        } else {
          mostrarTelaAguardoAprovacao(u.uid);
          if (!authCheckInterval) {
            authCheckInterval = setInterval(async () => {
              try { const upd = await uR.get(); if (upd.exists && upd.data().authorized === true) { clearInterval(authCheckInterval); authCheckInterval = null; window.location.reload(); } } catch(err) {}
            }, 10000);
          }
          setTimeout(() => { if (authCheckInterval) { clearInterval(authCheckInterval); authCheckInterval = null; auth.signOut(); } }, 1800000);
        }
      }
    } finally { isProcessingAuth = false; }
  });
}

// Observer específico para admin.html — não depende de login-screen
export function initAdminObserver(onAuthorized) {
  const appScreen = document.getElementById('app-screen');
  const loading = document.getElementById('admin-loading');

  auth.onAuthStateChanged(async u => {
    console.log('[Admin] onAuthStateChanged:', u ? u.email : 'null');
    if (!u) {
      console.log('[Admin] Sem usuário — redirecionando para index');
      window.location.href = './index.html';
      return;
    }
    try {
      console.log('[Admin] Verificando Firestore para uid:', u.uid);
      const snap = await db.collection('users').doc(u.uid).get();
      console.log('[Admin] snap.exists:', snap.exists, 'data:', snap.data());
      if (!snap.exists || !snap.data().authorized) {
        console.log('[Admin] Não autorizado — redirecionando');
        window.location.href = './index.html';
        return;
      }
      const d = snap.data();
      console.log('[Admin] role:', d.role);
      if (d.role !== 'admin') {
        console.log('[Admin] Não é admin — redirecionando');
        window.location.href = './index.html';
        return;
      }
      console.log('[Admin] Acesso liberado!');
      if (loading) loading.style.display = 'none';
      if (appScreen) appScreen.style.display = '';
      if (appScreen) appScreen.classList.add('active');
      const avatarEl = document.getElementById('user-avatar');
      if (avatarEl) avatarEl.src = u.photoURL||'';
      const nameEl = document.getElementById('user-name');
      if (nameEl) nameEl.textContent = u.displayName;
      const roleEl = document.getElementById('user-role');
      if (roleEl) roleEl.textContent = 'Admin';
      currentUserUID = u.uid;
      onAuthorized(u);
    } catch(e) {
      console.error('[Admin] Erro:', e);
      window.location.href = './index.html';
    }
  });
}

// ─── Perfil ───────────────────────────────────────────────────────────────────
export async function carregarPerfil(user) {
  const avatarEl = document.getElementById('perfil-avatar');
  if (avatarEl) { avatarEl.src = user.photoURL||''; }
  document.getElementById('perfil-nome').textContent  = user.displayName||'';
  document.getElementById('perfil-email').textContent = user.email||'';
  if (!currentUserUID) return;
  const snap = await db.collection('users').doc(currentUserUID).get();
  if (snap.exists) {
    const data = snap.data();
    if (data.kinNatalData) {
      document.getElementById('perfil-nasc-inp').value = data.kinNatalData;
      const kinNatalNum = data.kinNatalNum || dateToKin(new Date(data.kinNatalData+'T12:00:00'));
      _kinNatalSalvo = kinNatalNum;
      mostrarKinNatalSalvo(data.kinNatalData, kinNatalNum);
    } else {
      document.getElementById('perfil-kin-salvo').innerHTML = '<p class="perfil-sem-kin">Nenhum Kin Natal salvo ainda.</p>';
    }
  }
}

export function mostrarKinNatalSalvo(dataStr, kinNum) {
  if (!kinNum || !DATA.kins) return;
  const kD = DATA.kins[kinNum];
  if (!kD) return;
  const partes = kD.selo.split(' ');
  const base = partes.slice(0,-1).join(' ');
  const cor  = partes[partes.length-1];
  const el   = document.getElementById('perfil-kin-salvo');
  if (!el) return;
  el.innerHTML = `<div class="perfil-kin-card">
    <div class="perfil-kin-label">Meu Kin Natal</div>
    <div class="perfil-kin-nome">${base} ${kD.tom_nome} ${cor}</div>
    <div class="perfil-kin-sub">Kin ${kinNum} · ${dataStr}</div>
    <button class="btn-limpar-natal" onclick="limparKinNatal()">Remover</button>
  </div>`;
}

export async function salvarKinNatal() {
  if (!currentUserUID) return;
  const v = document.getElementById('perfil-nasc-inp').value;
  if (!v) return;
  const dt = new Date(v+'T12:00:00'), k = dateToKin(dt);
  try {
    await db.collection('users').doc(currentUserUID).update({ kinNatalData: v, kinNatalNum: k });
    _kinNatalSalvo = k;
    // Sincroniza kin natal no ranking público
    await db.collection('ranking').doc(currentUserUID).set({ kinNatal: k }, { merge: true });
    mostrarKinNatalSalvo(v, k);
    document.getElementById('nasc-inp').value = v;
    window.calcNatal && window.calcNatal();
    window.loadToday && window.loadToday();
  } catch(e) { alert('Erro ao salvar: ' + e.message); }
}

export async function limparKinNatal() {
  if (!currentUserUID) return;
  await db.collection('users').doc(currentUserUID).update({
    kinNatalData: firebase.firestore.FieldValue.delete(),
    kinNatalNum:  firebase.firestore.FieldValue.delete(),
  });
  _kinNatalSalvo = null;
  document.getElementById('perfil-kin-salvo').innerHTML = '<p class="perfil-sem-kin">Nenhum Kin Natal salvo ainda.</p>';
  document.getElementById('perfil-nasc-inp').value = '';
  window.loadToday && window.loadToday();
}    
