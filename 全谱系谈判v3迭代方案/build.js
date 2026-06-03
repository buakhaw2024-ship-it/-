#!/usr/bin/env node
/**
 * build.js — 打包管线（Phase 1 manifest 顺序拼接版）
 *
 * 作用：把 src/ 下的 ES Module 多文件 + styles.css 内联为单个
 *      dist/game_trainer.html，可双击在浏览器（file://）离线运行。
 *
 * 策略（简单可靠，不引第三方打包器）：
 *   1. 按 MANIFEST 顺序（依赖序）读取各模块源码
 *   2. 剥离每个模块的 import 语句与 export 关键字
 *   3. 拼接进一个 IIFE 作用域（模块间靠共享作用域互访）
 *   4. 内联 styles.css 进 <style>，拼接的 JS 进普通 <script>
 *   5. 输出 dist/game_trainer.html
 *
 * 用法： node build.js
 *
 * 新增模块时：把文件按依赖顺序加入下面的 MANIFEST（bootstrap 始终在最后）。
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// 依赖顺序：被依赖者在前，bootstrap 在最后
const MANIFEST = [
  'core/event-bus.js',
  'core/events.js',
  'core/store.js',
  'ui/router.js',
  'ui/screens/welcome.js',
  'ui/screens/main-menu.js',
  'core/bootstrap.js',
];

/** 剥离 import 语句与 export 关键字，使模块代码可在同一作用域拼接 */
function stripModuleSyntax(code) {
  const lines = code.split('\n');
  const out = [];
  let inMultilineImport = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // 处理多行 import（以 import 开头且本行未闭合到 ; ）
    if (inMultilineImport) {
      if (trimmed.includes(';') || trimmed.includes("from")) {
        if (trimmed.endsWith(';') || /from\s+['"].*['"];?$/.test(trimmed)) {
          inMultilineImport = false;
        }
      }
      continue; // 跳过 import 续行
    }

    if (/^import\s/.test(trimmed)) {
      // 单行 import 直接跳过；多行 import 进入跳过状态
      if (!trimmed.endsWith(';') && !/from\s+['"].*['"];?$/.test(trimmed)) {
        inMultilineImport = true;
      }
      continue;
    }

    // 剥离行首 export 关键字： export const / export function / export default
    line = line.replace(/^(\s*)export\s+default\s+/, '$1');
    line = line.replace(/^(\s*)export\s+/, '$1');

    out.push(line);
  }
  return out.join('\n');
}

function build() {
  // 1. 读取并处理所有模块
  const chunks = [];
  for (const rel of MANIFEST) {
    const full = path.join(SRC, rel);
    if (!fs.existsSync(full)) {
      console.error(`✗ 缺少模块：${rel}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(full, 'utf8');
    chunks.push(`/* ===== ${rel} ===== */\n${stripModuleSyntax(raw)}`);
  }

  const bundledJs = chunks.join('\n\n');

  // 2. 读取 CSS
  const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');

  // 3. 组装单文件 HTML
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>全谱系博弈实战演练系统 v3</title>
<style>
${css}
</style>
</head>
<body>
<div class="container">
  <div id="app"></div>
</div>
<script>
"use strict";
(function () {
${bundledJs}
})();
</script>
</body>
</html>
`;

  // 4. 输出
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  const outPath = path.join(DIST, 'game_trainer.html');
  fs.writeFileSync(outPath, html, 'utf8');

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`✓ 打包完成：dist/game_trainer.html (${kb} KB)`);
  console.log(`  内联模块 ${MANIFEST.length} 个 | 双击即可离线运行`);
}

build();
