import { db, doc, getDocFromServer } from '../firebase.js';
import { createVersionTapGesture, validDevToolsClaims, matchesDevToolsPassword } from './devtools-access.js';

const local = ['localhost', '127.0.0.1'].includes(location.hostname);

export async function hasDevToolsAccess() {
  if (sessionStorage.getItem('buraco_devtools_disabled') === '1') return false;
  if (local) return true;
  try {
    const session = JSON.parse(sessionStorage.getItem('buraco_devtools_session') || 'null');
    const allowed = validDevToolsClaims(session);
    if (allowed) setTimeout(leaveDevTools, Math.min(3600000, Number(session.devtoolsUntil) - Date.now()));
    return allowed;
  } catch { return false; }
}

export async function leaveDevTools() {
  sessionStorage.setItem('buraco_devtools_disabled', '1');
  sessionStorage.removeItem('buraco_devtools_session');
  const url = new URL(location.href);
  url.searchParams.delete('debug');
  location.replace(url.href);
}

export function installDevToolsAccessUI() {
  const version = document.createElement('button');
  version.id = 'appVersionButton';
  version.type = 'button';
  version.textContent = 'v211';
  version.setAttribute('aria-label', 'Versão do aplicativo');
  version.style.cssText = 'position:fixed;bottom:4px;left:8px;z-index:100001;background:#0f172acc;color:#cbd5e1;border:0;border-radius:4px;padding:3px 6px;font-size:10px;touch-action:manipulation;';
  document.body.append(version);
  const dialog = document.createElement('dialog');
  dialog.id = 'devToolsAuthDialog';
  dialog.style.cssText = 'max-width:320px;border:1px solid #64748b;border-radius:12px;background:#0f172a;color:white;padding:24px;';
  dialog.innerHTML = '<form><h2>Acesso administrativo</h2><label>Senha admin<input name="password" type="password" autocomplete="current-password" required maxlength="128" style="display:block;width:100%;margin:12px 0"></label><p role="status"></p><button type="submit">Entrar</button><button type="button" data-cancel>Cancelar</button></form>';
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const status = dialog.querySelector('[role="status"]');
  let busy = false;
  version.addEventListener('click', createVersionTapGesture({ onUnlock: () => {
    if (busy || dialog.open) return;
    if (local) {
      sessionStorage.removeItem('buraco_devtools_disabled');
      location.reload();
      return;
    }
    status.textContent = '';
    input.value = '';
    dialog.showModal();
    input.focus();
  } }));
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { input.value = ''; });
  dialog.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const submit = dialog.querySelector('[type="submit"]');
    submit.disabled = true;
    status.textContent = 'Validando no Firebase…';
    const password = input.value;
    input.value = '';
    try {
      const snapshot = await getDocFromServer(doc(db, 'appConfig', 'devtools'));
      if (!snapshot.exists()) throw new Error('missing-config');
      if (!matchesDevToolsPassword(snapshot.data(), password)) {
        status.textContent = 'Senha incorreta ou acesso desativado.';
        return;
      }
      sessionStorage.setItem('buraco_devtools_session', JSON.stringify({ devtools: true, devtoolsUntil: Date.now() + 3600000 }));
      sessionStorage.removeItem('buraco_devtools_disabled');
      location.reload();
    } catch (error) {
      status.textContent = error.message === 'missing-config'
        ? 'A senha do DevTools ainda não foi configurada no banco.'
        : 'Não foi possível consultar a senha no banco. Verifique a conexão e tente novamente.';
    } finally { busy = false; submit.disabled = false; }
  });
}
