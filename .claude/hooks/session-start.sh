#!/bin/bash
set -euo pipefail
# 仅在 Claude Code on the web (远程容器) 运行,安装自测依赖
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

npm install

# Chromium 下载需放行 cdn.playwright.dev 出站访问;失败不阻断会话启动
if ! npx --yes playwright install chromium; then
  echo "[session-start] 警告: Chromium 下载失败(通常是出站网络未放行 cdn.playwright.dev)。" >&2
  echo "[session-start] 需要浏览器自测时,请在环境网络策略中放行 cdn.playwright.dev 后重开会话,或本地运行 npm run test:smoke。" >&2
fi
