import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseApp, db, doc, getDocFromServer, setDoc } from './firebase.js';
import { normalizeProfile } from './account-profile.js';

const auth = getAuth(firebaseApp);
export let activeAccount = null;
const errors = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já tem cadastro. Entre ou recupere a senha.',
  'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Confira sua internet e tente novamente.',
  'auth/operation-not-allowed': 'O login por e-mail ainda precisa ser habilitado no Firebase.',
  'auth/configuration-not-found': 'O Authentication ainda precisa ser habilitado no Firebase.',
  'permission-denied': 'Não foi possível acessar seu perfil. Verifique as regras do Firebase.',
  'unavailable': 'O banco está indisponível. Confira sua conexão e tente novamente.',
};

export async function requireAccount() {
  const overlay = document.createElement('section');
  overlay.id = 'accountGate';
  overlay.innerHTML = `<form class="account-card" aria-labelledby="accountTitle">
    <p class="account-eyebrow">BURACO • SUA CONTA</p>
    <h1 id="accountTitle">Entre para jogar</h1>
    <p id="accountIntro">Seu nome e Pix acompanham você nas partidas.</p>
    <label data-profile hidden>Nome<input name="name" autocomplete="name" maxlength="60"></label>
    <label data-credentials>E-mail<input name="email" type="email" autocomplete="username" required maxlength="254"></label>
    <label data-credentials>Senha<input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="128"></label>
    <label data-profile hidden>Chave Pix<input name="pixKey" autocomplete="off" maxlength="140"><small>CPF/CNPJ, telefone, e-mail ou chave aleatória. A chave será usada no campo Pix do seu time.</small></label>
    <p id="accountStatus" role="status" aria-live="polite"></p>
    <button type="submit" id="accountSubmit">Entrar</button>
    <button type="button" id="accountSwitch" class="account-secondary">Não tenho conta — cadastrar</button>
    <button type="button" id="accountReset" class="account-link">Esqueci minha senha</button>
    <button type="button" id="accountCancel" class="account-link" hidden>Sair desta conta</button>
  </form>`;
  document.body.append(overlay);
  const form = overlay.querySelector('form');
  const field = name => form.elements.namedItem(name);
  const status = overlay.querySelector('#accountStatus');
  let mode = 'login';
  let busy = false;
  let acceptedUid = null;
  let finish;
  const ready = new Promise(resolve => { finish = resolve; });

  function setMode(next) {
    mode = next;
    const profileMode = mode !== 'login';
    const completing = mode === 'profile';
    overlay.querySelectorAll('[data-profile]').forEach(el => { el.hidden = !profileMode; });
    overlay.querySelectorAll('[data-credentials]').forEach(el => { el.hidden = completing; });
    field('name').required = field('pixKey').required = profileMode;
    field('email').required = field('password').required = !completing;
    field('password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    overlay.querySelector('#accountTitle').textContent = completing ? 'Complete seu perfil' : mode === 'register' ? 'Crie sua conta' : 'Entre para jogar';
    overlay.querySelector('#accountSubmit').textContent = completing ? 'Salvar e entrar' : mode === 'register' ? 'Cadastrar e entrar' : 'Entrar';
    overlay.querySelector('#accountSwitch').textContent = mode === 'register' ? 'Já tenho conta — entrar' : 'Não tenho conta — cadastrar';
    overlay.querySelector('#accountSwitch').hidden = completing;
    overlay.querySelector('#accountReset').hidden = mode !== 'login';
    overlay.querySelector('#accountCancel').hidden = !completing;
    status.textContent = '';
  }

  function setBusy(value) {
    busy = value;
    form.querySelectorAll('button,input').forEach(el => { el.disabled = value; });
    form.setAttribute('aria-busy', String(value));
  }

  function accept(user, profile) {
    acceptedUid = user.uid;
    activeAccount = { uid: user.uid, email: user.email, ...profile };
    field('password').value = '';
    overlay.remove();
    document.body.classList.remove('account-pending');
    finish(activeAccount);
  }

  async function loadProfile(user) {
    // Sempre do servidor: não reutilizar o perfil de outra sessão ou aceitar cache vencido.
    const snap = await getDocFromServer(doc(db, 'userProfiles', user.uid));
    if (snap.exists()) {
      try { accept(user, normalizeProfile(snap.data())); return; } catch { /* perfil antigo incompleto */ }
    }
    setMode('profile');
    status.textContent = 'Falta salvar seu nome e sua chave Pix para entrar.';
  }

  overlay.querySelector('#accountSwitch').onclick = () => { setMode(mode === 'login' ? 'register' : 'login'); field('password').value = ''; };
  overlay.querySelector('#accountCancel').onclick = async () => {
    setBusy(true);
    try { await signOut(auth); form.reset(); setMode('login'); } catch (e) { status.textContent = errors[e.code] || 'Não foi possível sair. Tente novamente.'; }
    finally { setBusy(false); }
  };
  overlay.querySelector('#accountReset').onclick = async () => {
    if (!field('email').reportValidity()) return;
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, field('email').value.trim());
      status.textContent = 'Se houver uma conta para esse e-mail, enviaremos a recuperação. Confira também o spam.';
    } catch (e) { status.textContent = e.code === 'auth/user-not-found' ? 'Confira seu e-mail e a caixa de spam.' : errors[e.code] || 'Não foi possível enviar o e-mail. Tente novamente.'; }
    finally { setBusy(false); }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    status.textContent = 'Aguarde…';
    try {
      if (mode === 'login') {
        const result = await signInWithEmailAndPassword(auth, field('email').value.trim(), field('password').value);
        await loadProfile(result.user);
      } else {
        const profile = normalizeProfile({ name: field('name').value, pixKey: field('pixKey').value });
        const user = mode === 'profile' ? auth.currentUser : (await createUserWithEmailAndPassword(auth, field('email').value.trim(), field('password').value)).user;
        // Se o cadastro Auth funcionar e o banco falhar, continuar nesta etapa, sem criar outra conta.
        setMode('profile');
        field('password').value = '';
        await setDoc(doc(db, 'userProfiles', user.uid), profile);
        accept(user, profile);
      }
    } catch (e) { status.textContent = errors[e.code] || (e.code ? 'Não foi possível entrar. Tente novamente.' : e.message); }
    finally { setBusy(false); }
  };

  setBusy(true);
  status.textContent = 'Conferindo sua sessão…';
  const user = await new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, value => { off(); resolve(value); }, reject);
  });
  try { if (user) await loadProfile(user); else status.textContent = ''; }
  catch (e) {
    // Nunca liberar o jogo sem perfil. Permitir nova tentativa e troca de conta.
    status.textContent = errors[e.code] || 'Não foi possível carregar seu perfil. Entre novamente para tentar.';
  } finally { setBusy(false); }
  onAuthStateChanged(auth, user => {
    if (acceptedUid && user?.uid !== acceptedUid) { document.body.classList.add('account-pending'); location.reload(); }
  });
  return ready;
}

export function installAccountMenu(account) {
  const menu = document.getElementById('configSection');
  const bar = document.createElement('div');
  bar.className = 'account-bar';
  bar.setAttribute('aria-label', 'Sua conta');
  const avatar = document.createElement('span');
  avatar.className = 'account-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  const words = account.name.trim().split(/\s+/);
  avatar.textContent = (words[0][0] + (words.length > 1 ? words.at(-1)[0] : '')).toLocaleUpperCase('pt-BR');
  const identity = document.createElement('div');
  identity.className = 'account-identity';
  const welcome = document.createElement('span');
  welcome.className = 'account-welcome';
  welcome.textContent = 'BOA PARTIDA';
  const label = document.createElement('span');
  label.className = 'account-name';
  label.textContent = account.name;
  label.title = account.name;
  identity.append(welcome, label);
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'account-logout';
  logout.setAttribute('aria-label', 'Sair da conta');
  logout.title = 'Sair da conta';
  logout.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H5v16h4M13 8l4 4-4 4M9 12h11"/></svg><span>Sair</span>';
  logout.onclick = async () => {
    logout.disabled = true;
    try {
      sessionStorage.removeItem('buraco_devtools_session');
      await signOut(auth);
      location.reload();
    } catch { logout.disabled = false; label.textContent = 'Não foi possível sair. Tente novamente.'; }
  };
  bar.append(avatar, identity, logout);
  const header = menu.querySelector('.section-header');
  if (header) header.after(bar);
  else menu.prepend(bar);
}
