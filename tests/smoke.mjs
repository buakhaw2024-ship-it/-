// Playwright 冒烟自测: 在真实 Chromium 中加载单文件 index.html,
// 校验渲染、关键全局、以及本地对手台词生成器,并截图。
// 运行: npm run test:smoke   (需先 npx playwright install chromium)
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'index.html');
const outDir = path.join(root, 'tests', 'output');
fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(htmlPath)) { console.error('index.html not found at ' + htmlPath); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });

await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000); // 应用在 DOMContentLoaded 后 babel 转换并渲染

const checks = await page.evaluate(() => {
  const out = {};
  out.hasEnhance = typeof window.__aiEnhanceOptions === 'function';
  out.hasGenOpp = typeof window.__aiGenOpponentLine === 'function';
  out.hasBridge = !!window.NegotiationLLMBridge;
  try { out.oppLine = window.__aiGenOpponentLine ? window.__aiGenOpponentLine({ opp: '这铁路，洋人掺了多少股？' }) : ''; }
  catch (e) { out.oppErr = String(e); }
  out.bodyLen = ((document.body && document.body.innerText) || '').length;
  return out;
});

await page.screenshot({ path: path.join(outDir, 'main.png') });
await browser.close();

console.log('checks:', JSON.stringify(checks, null, 2));
console.log('console/page errors:', errors.length);
if (errors.length) console.log(errors.slice(0, 5).map((e) => '  - ' + e).join('\n'));

const fail = [];
if (!checks.hasBridge) fail.push('window.NegotiationLLMBridge 缺失');
if (!checks.hasEnhance) fail.push('window.__aiEnhanceOptions 缺失');
if (!checks.hasGenOpp) fail.push('window.__aiGenOpponentLine 缺失');
if (!checks.oppLine) fail.push('对手台词本地生成返回空 (' + (checks.oppErr || '') + ')');
if (!(checks.bodyLen > 50)) fail.push('页面正文过短,疑似未渲染');

if (fail.length) { console.error('SMOKE FAIL:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('SMOKE PASS · 截图: tests/output/main.png · 对手台词样例: ' + checks.oppLine);
