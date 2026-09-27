// Integração de inicialização e lobby com Firebase em memória; nunca inicia partida.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = new URL('../', import.meta.url);
const authStub = `
window.accountFixture={user:{uid:'fixture-user',email:'maria@example.test'},writes:[],listeners:[],data:{lobby:{mode:'1x1',names:['Pessoa existente',''],pixKeys:['pix-existente',''],ready:[false,false],variant:'aberto',betToggle:'nao',deckTheme:'classico',tableTheme:'feltro'}}};
export const getAuth=()=>({currentUser:window.accountFixture.user});
export function onAuthStateChanged(auth,fn){queueMicrotask(()=>fn(auth.currentUser));return ()=>{};}
export async function signInWithEmailAndPassword(){throw Error('not expected');}
export async function createUserWithEmailAndPassword(){throw Error('not expected');}
export async function sendPasswordResetEmail(){throw Error('not expected');}
export async function signOut(){}
`;
const dbStub = `
export const db={},firebaseApp={};
export const doc=(_db,collection,id)=>({collection,id});
export async function getDocFromServer(ref){if(ref.collection!=='userProfiles')throw Error('unexpected read'); return {exists:()=>true,data:()=>window.accountFixture.profile||({name:'Maria Silva',pixKey:'maria-pix@example.test'})};}
const snapshot=()=>({exists:()=>true,data:()=>structuredClone(window.accountFixture.data)});
const emit=()=>window.accountFixture.listeners.forEach(fn=>setTimeout(()=>fn(snapshot()),0));
export function onSnapshot(ref,fn){window.accountFixture.listeners.push(fn);setTimeout(()=>fn(snapshot()),0);return ()=>{};}
export async function setDoc(ref,data){if(data.stateJson)throw Error('fixture must not start a match');if(ref.collection==='userProfiles'){window.accountFixture.profile=data;return;}window.accountFixture.writes.push(data);Object.assign(window.accountFixture.data,data);emit();}
export const updateDoc=setDoc;
export async function deleteDoc(){throw Error('unexpected delete');}
export async function runTransaction(_db,fn){return fn({get:async()=>snapshot(),update:(ref,data)=>setDoc(ref,data),set:(ref,data)=>setDoc(ref,data)});}
`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://localhost') return route.abort();
    if (url.pathname === '/auth-stub.js') return route.fulfill({ contentType: 'text/javascript', body: authStub });
    if (url.pathname === '/js/firebase.js') return route.fulfill({ contentType: 'text/javascript', body: dbStub });
    if (url.pathname === '/js/history-store.js') return route.fulfill({ contentType: 'text/javascript', body: 'export async function loadHistoryPage(){return {matches:[],cursor:null,hasMore:false};}' });
    const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!/^[\w/.-]+$/.test(path) || !/\.(js|css|html)$/.test(path)) return route.abort();
    try {
      let source = await readFile(new URL(path, root), 'utf8');
      if (path === 'js/account-auth.js') source = source.replace('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js', '/auth-stub.js');
      return route.fulfill({ contentType: path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html', body: source });
    } catch {
      return route.abort();
    }
  });
  await page.goto('http://localhost/?game=offline-fixture&player=1');
  await page.waitForFunction(() => window.accountFixture?.data?.lobby?.names?.[1] === 'Maria Silva');
  await page.locator('.account-name').getByText('Maria Silva', { exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('.account-stats')?.textContent === '0 partidas · 0% vitórias');
  assert.equal(await page.locator('#configSection > .account-bar').count(), 0);
  assert.equal(await page.locator('#configSection .section > .account-bar').count(), 1);
  if (process.env.ACCOUNT_MENU_SCREENSHOT) await page.locator('#configSection .section').screenshot({ path: process.env.ACCOUNT_MENU_SCREENSHOT });
  await page.waitForFunction(() => document.getElementById('pixTeam2').value === 'maria-pix@example.test');
  assert.equal(await page.locator('#p2Name').inputValue(), 'Maria Silva');
  assert.equal(await page.locator('#p1Name').inputValue(), 'Pessoa existente');
  assert.equal(await page.locator('#pixTeam2').isEnabled(), true);
  assert.equal(await page.locator('#pixTeam1').isDisabled(), true);
  assert.equal(await page.locator('#configSection').isVisible(), true);
  await page.locator('#localPlayerSelect').selectOption('0');
  await page.waitForFunction(() => window.accountFixture.data.lobby.names[0] === 'Maria Silva' && window.accountFixture.data.lobby.names[1] === '');
  await page.waitForFunction(() => document.getElementById('p2Name').value === '');
  assert.equal(await page.evaluate(() => window.accountFixture.data.lobby.pixKeys[1]), '');
  await page.locator('#localPlayerSelect').selectOption('1');
  await page.waitForFunction(() => window.accountFixture.data.lobby.names[1] === 'Maria Silva' && window.accountFixture.data.lobby.names[0] === '');
  await page.waitForFunction(() => document.getElementById('p1Name').value === '');
  assert.equal(await page.evaluate(() => window.accountFixture.writes.some((w) => w.stateJson)), false);
  await page.locator('button.account-identity').click();
  await page.locator('#settingsTab').click();
  await page.locator('#settingsPanel [name=name]').fill('Maria Nova');
  await page.locator('#settingsPanel [name=pixKey]').fill('nova-chave');
  await page.locator('#settingsPanel [type=submit]').click();
  await page.waitForFunction(() => window.accountFixture.data.lobby.names[1] === 'Maria Nova');
  assert.equal(await page.evaluate(() => window.accountFixture.profile.pixKey), 'nova-chave');
  await page.locator('[data-back]').click();
  assert.equal(await page.locator('.account-name').textContent(), 'Maria Nova');
  await page.locator('#configSection .section').evaluate(async (section) => {
    await Promise.all(section.getAnimations().map((animation) => animation.finished));
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 850 });
    const layout = await page.locator('.account-bar').evaluate((bar) => {
      const b = bar.getBoundingClientRect();
      const button = bar.querySelector('button').getBoundingClientRect();
      return { inside: b.left >= 0 && b.right <= innerWidth, buttonInside: button.right <= b.right, targetHeight: button.height };
    });
    assert.equal(layout.inside, true);
    assert.equal(layout.buttonInside, true);
    assert.ok(layout.targetHeight >= 43.9, JSON.stringify({ width, ...layout }));
  }
  assert.deepEqual(failures, []);
  console.log('PASS: sessão restaurada, inicialização após login, cadeira 2 preenchida, Pix adversário preservado, lobby visível. Nenhuma partida iniciada.');
} finally {
  await browser.close();
}
