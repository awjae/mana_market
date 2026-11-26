/** 처음부터 끝까지 e2e: 꾸미기 → 스토리 → 튜토리얼 8단계 → 히로인 → 업적 → 새로고침, 의뢰, axe 접근성, 걷는 중 프레임. `npm run e2e`(루트)
 *  개발 서버를 직접 띄우고(포트 5199) 끝나면 내린다. 브라우저는 playwright-core가 찾는 크롬(`E2E_CHROMIUM`으로 경로 지정 가능) */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const PORT = 5199, BASE = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', cwd: new URL('..', import.meta.url).pathname });
const kill = () => server.kill();
process.on('exit', kill);
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* 아직 */ } await new Promise((r) => setTimeout(r, 500)); }
/** playwright-core가 기대하는 빌드가 없으면 캐시에 있는 가장 새 headless shell(맥)을 쓴다. 그래도 없으면 `npx playwright install chromium` */
function findChromium() {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  const root = `${homedir()}/Library/Caches/ms-playwright`;
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
  for (const d of dirs) { const exe = `${root}/${d}/chrome-headless-shell-mac-arm64/chrome-headless-shell`; if (existsSync(exe)) return exe; }
  return undefined;
}
const exe = findChromium();
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const pg = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
await pg.addInitScript(() => { try { if (!sessionStorage.getItem('i')) { localStorage.clear(); sessionStorage.setItem('i', '1'); } } catch {} });
await pg.clock.setFixedTime(new Date('2026-11-23T13:00:00'));
await pg.goto(BASE); await pg.waitForTimeout(3500);
let failed = 0;
const step = async (name, fn) => { try { await fn(); console.log('OK  ', name); } catch (e) { failed++; console.log('FAIL', name, String(e).slice(0, 200)); } };
await step('꾸미기 화면', async () => { if (!(await pg.locator('h1:has-text("모습을 정해요")').count())) throw new Error('없음'); await pg.fill('input[placeholder="이름을 지어 주세요"]', '아리아'); await pg.click('button:has-text("이 모습으로 시작")'); });
await step('스토리 → 지원금', async () => { await pg.waitForTimeout(1200); await pg.click('button:has-text("건너뛰기")'); await pg.waitForTimeout(2500); const cash = await pg.evaluate(() => JSON.parse(localStorage.getItem('mana-market-v1')).state.cash); if (cash !== 30000) throw new Error('cash ' + cash); });
const tut = () => pg.locator('.panel.dlg b.font-display').first().innerText().catch(() => '(없음)');
await step('튜토리얼 1 걷기', async () => { if ((await tut()) !== '마을 걸어 보기') throw new Error(await tut()); await pg.keyboard.down('ArrowRight'); await pg.waitForTimeout(400); await pg.keyboard.up('ArrowRight'); await pg.waitForTimeout(500); });
await step('튜토리얼 2 장부', async () => { if ((await tut()) !== '장부 열기') throw new Error(await tut()); await pg.click('.no-scrollbar button:has-text("IRON")'); await pg.waitForTimeout(900); });
await step('튜토리얼 3 사기', async () => { if ((await tut()) !== '첫 주식 사기') throw new Error(await tut()); await pg.locator('button[data-tut="buy"]').click(); await pg.waitForTimeout(700); });
await step('튜토리얼 4 달력', async () => { if ((await tut()) !== '달력 보기') throw new Error(await tut()); await pg.click('button[data-tut="fab"]'); await pg.waitForTimeout(700); });
await step('튜토리얼 5 소식', async () => { if ((await tut()) !== '소식 읽기') throw new Error(await tut()); await pg.click('button[data-tut="tab-news"]'); await pg.waitForTimeout(700); });
await step('튜토리얼 6 자산', async () => { if ((await tut()) !== '내 자산 보기') throw new Error(await tut()); await pg.click('button[data-tut="tab-assets"]'); await pg.waitForTimeout(700); });
await step('튜토리얼 7 히로인', async () => { if ((await tut()) !== '말걸기') throw new Error(await tut()); await pg.keyboard.press('Escape'); await pg.waitForTimeout(500); await pg.locator('.npc:has(text)').first().evaluate((g) => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await pg.waitForTimeout(900); if (!(await pg.locator('.conv').count())) throw new Error('대화 안 열림'); });
await step('대화 닫고 튜토리얼 종료', async () => { await pg.keyboard.press('Escape'); await pg.waitForTimeout(800); const t = await pg.evaluate(() => JSON.parse(localStorage.getItem('mana-market-v1')).state.tutStep); if (t < 7) throw new Error('tutStep ' + t); });
await step('튜토리얼 8 생활', async () => { if ((await tut()) !== '생활 탭 보기') throw new Error(await tut()); await pg.click('button[data-tut="tab-life"]'); await pg.waitForTimeout(700); await pg.evaluate(() => { [...document.querySelectorAll('button')].find((b) => b.textContent === '걸어가기')?.click(); }); await pg.waitForTimeout(800); const t = await pg.evaluate(() => JSON.parse(localStorage.getItem('mana-market-v1')).state.tutStep); if (t < 8) throw new Error('tutStep ' + t); });
await step('업적 기록', async () => { const a = await pg.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mana-market-v1')).state.achv)); if (!a.includes('first-trade') || !a.includes('meet')) throw new Error(a.join()); console.log('     업적:', a.join(',')); });
await step('새로고침 후 유지', async () => { await pg.reload(); await pg.waitForTimeout(3500); if (await pg.locator('h1:has-text("모습을 정해요")').count()) throw new Error('꾸미기 재등장'); });
const bad = [];
await step('의뢰 퀴즈 답하기', async () => { await pg.keyboard.press('2'); await pg.waitForTimeout(600); const b0 = pg.locator('button.panel-flat:not(:disabled)').filter({ hasText: /^[A-Z]{4} |농업|무기|마법|해운|금융/ }); if (!(await b0.count())) throw new Error('의뢰 보기 없음'); await b0.first().click(); await pg.waitForTimeout(300); const q = await pg.evaluate(() => JSON.parse(localStorage.getItem('mana-market-v1')).state.quest); if (!Object.keys(q.ans).length) throw new Error('답 기록 없음'); });
await step('마을 기부(마나 소비)', async () => {
  const st = () => pg.evaluate(() => JSON.parse(localStorage.getItem('mana-market-v1')).state);
  const before = await st();
  await pg.keyboard.press('Escape'); await pg.keyboard.press('3'); await pg.waitForTimeout(600);
  const all = pg.locator('button:has-text("전부 보기")'); if (await all.count()) await all.click();
  await pg.locator('button[aria-expanded="false"]:has-text("마을 가꾸기")').click(); await pg.waitForTimeout(300); // 생활 탭의 구역은 접혀 있다
  const btn = pg.locator('button:has-text("500 마나")').first();
  await btn.scrollIntoViewIfNeeded(); await btn.click(); await pg.waitForTimeout(250);
  await pg.locator('button:has-text("마나 쓰기")').first().click(); await pg.waitForTimeout(400);
  const after = await st();
  if (Object.values(after.town ?? {}).reduce((a, b) => a + b, 0) !== 1) throw new Error('기부 기록 없음');
  if (Math.abs(before.cash - after.cash - 500) > 0.01 || after.spent !== 500) throw new Error(`현금 ${before.cash} → ${after.cash}`);
});
await step('소품 가게(마나 소비)', async () => {
  const st = () => pg.evaluate(() => JSON.parse(localStorage.getItem('mana-market-v1')).state);
  const before = await st();
  await pg.keyboard.press('Escape'); await pg.keyboard.press('p'); await pg.waitForTimeout(600);
  const grp = pg.locator('button[aria-expanded]:has-text("소품")').first();
  await grp.scrollIntoViewIfNeeded(); await grp.click(); await pg.waitForTimeout(250); // 한정 가게는 분류별로 접혀 있다
  const btn = pg.locator('button:has-text("고양이 귀")').first();
  await btn.scrollIntoViewIfNeeded(); await btn.click(); await pg.waitForTimeout(250);
  await btn.click(); await pg.waitForTimeout(400);
  const after = await st();
  if (!(after.ownedProps ?? []).includes(11) || Math.abs(before.cash - after.cash - 300) > 0.01) throw new Error('소품 구매 실패');
});
await step('접근성(axe) 위반 0', async () => {
  const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
  await pg.addScriptTag({ content: axe });
  for (const k of ['1', '2', '3', '4', 'p', 'c']) { await pg.keyboard.press('Escape'); await pg.keyboard.press(k); await pg.waitForTimeout(600); const v = await pg.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => x.id !== 'region').map((x) => x.id + '×' + x.nodes.length)); if (v.length) bad.push(k + ': ' + v.join(',')); }
  if (bad.length) throw new Error(bad.join(' | '));
});
await step('걷는 중 프레임 간격', async () => {
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(500); await pg.keyboard.down('ArrowRight');
  const fr = await pg.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 70) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); }));
  await pg.keyboard.up('ArrowRight');
  const d = fr.slice(1).map((t, i) => t - fr[i]).sort((a, c) => a - c), med = d[Math.floor(d.length / 2)];
  console.log('     중앙값(ms):', med.toFixed(1)); if (med > 40) throw new Error('프레임 중앙값 ' + med.toFixed(1));
});
console.log('오류:', errs);
if (errs.length) failed++;
await b.close();
kill();
process.exit(failed ? 1 : 0);
