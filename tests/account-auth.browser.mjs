// Fluxos reais da interface, Firebase substituído em memória. Não cria conta/partida real.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = new URL('../', import.meta.url);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const authStub = `
const state = window.fixture = { currentUser: null, profiles: {}, creates: 0, writes: [], failWrite: false, badLogin: false, resets: 0 };
export const getAuth = () => state;
export function onAuthStateChanged(auth, fn) { queueMicrotask(()=>fn(auth.currentUser)); return ()=>{}; }
export async function createUserWithEmailAndPassword(auth,email,password) { state.creates++; auth.currentUser = {uid:'test-user',email}; return {user:auth.currentUser}; }
export async function signInWithEmailAndPassword(auth,email,password) { if(state.badLogin) throw {code:'auth/invalid-credential'}; auth.currentUser = {uid:'test-user',email}; return {user:auth.currentUser}; }
export async function signOut(auth) { auth.currentUser=null; }
export async function sendPasswordResetEmail() { state.resets++; }
`;
const dbStub = `
export const firebaseApp = {}, db = {};
export const doc = (_db, collection, uid) => ({collection,uid});
export async function getDocFromServer(ref) { const data=window.fixture.profiles[ref.uid]; return {exists:()=>!!data,data:()=>data}; }
export async function setDoc(ref,data) { if(ref.collection!=='userProfiles') throw Error('unexpected collection'); if(window.fixture.failWrite) {window.fixture.failWrite=false;throw {code:'permission-denied'};} window.fixture.writes.push({ref,data}); window.fixture.profiles[ref.uid]=data; }
`;
try {
  for (const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:800}]) {
    const page = await browser.newPage({viewport});
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://account.test') return route.abort();
      if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:`<link rel="stylesheet" href="/styles/account.css"><body class="account-pending"><div id="configSection"></div><script type="module">import {requireAccount,installAccountMenu} from '/js/account-auth.js'; const account=await requireAccount(); window.accepted=account; installAccountMenu(account);</script>`});
      if (url.pathname === '/auth-stub.js') return route.fulfill({contentType:'text/javascript',body:authStub});
      if (url.pathname === '/js/firebase.js') return route.fulfill({contentType:'text/javascript',body:dbStub});
      const path = url.pathname.slice(1);
      if (!['js/account-auth.js','js/account-profile.js','styles/account.css'].includes(path)) return route.abort();
      const source = (await readFile(new URL(path,root),'utf8')).replace('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js','/auth-stub.js');
      return route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:source});
    });
    await page.goto('http://account.test');
    await page.locator('#accountSubmit:enabled').waitFor();
    assert.equal(await page.evaluate(()=>!!window.accepted),false);
    await page.locator('[name=email]').fill('maria@example.test');
    await page.locator('#accountReset').click();
    await page.waitForFunction(()=>window.fixture.resets===1);
    await page.evaluate(()=>window.fixture.badLogin=true);
    await page.locator('[name=password]').fill('wrongpass');
    await page.locator('#accountSubmit').click();
    await page.getByText('E-mail ou senha incorretos.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>!!window.accepted),false);
    await page.locator('#accountSwitch').click();
    await page.locator('[name=name]').fill('Maria Silva');
    await page.locator('[name=password]').fill('samplepassword');
    await page.locator('[name=pixKey]').fill('maria-pix@example.test');
    if (process.env.ACCOUNT_SCREENSHOT && viewport.width === 390) await page.screenshot({path:process.env.ACCOUNT_SCREENSHOT,fullPage:true});
    await page.evaluate(()=>window.fixture.failWrite=true);
    await page.locator('#accountSubmit').click();
    await page.getByText('Complete seu perfil',{exact:true}).waitFor();
    await page.locator('#accountSubmit:enabled').waitFor();
    assert.equal(await page.evaluate(()=>!!window.accepted),false);
    assert.equal(await page.locator('[name=password]').inputValue(),'');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#accountSubmit').click();
    await page.waitForFunction(()=>!!window.accepted);
    const result = await page.evaluate(()=>({accepted:window.accepted,creates:window.fixture.creates,writes:window.fixture.writes,pending:document.body.classList.contains('account-pending')}));
    assert.equal(result.creates,1);
    assert.equal(result.pending,false);
    assert.deepEqual(result.writes[0].data,{name:'Maria Silva',pixKey:'maria-pix@example.test'});
    assert.equal(result.accepted.uid,'test-user');
    await page.goto('http://account.test');
    await page.locator('#accountSubmit:enabled').waitFor();
    await page.evaluate(()=>{window.fixture.profiles['test-user']={name:'Maria Silva',pixKey:'maria-pix@example.test'};});
    await page.locator('[name=email]').fill('maria@example.test');
    await page.locator('[name=password]').fill('samplepassword');
    await page.locator('#accountSubmit').click();
    await page.waitForFunction(()=>!!window.accepted);
    assert.equal(await page.evaluate(()=>window.fixture.creates),0);
    assert.equal(await page.evaluate(()=>window.fixture.writes.length),0);
    assert.deepEqual(failures,[]);
    await page.close();
  }
  console.log('PASS: login, erro, recuperação, cadastro, recuperação de falha no perfil e layout em 3 telas; nenhuma requisição Firebase real.');
} finally { await browser.close(); }
