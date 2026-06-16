#!/bin/bash
set -euo pipefail
# 仅在 Claude Code on the web (远程容器) 运行,安装自测依赖
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

npm install

# Chromium:优先走标准下载(需放行 cdn.playwright.dev);
# 被出站策略拦截时,回退到允许的 Chrome-for-Testing 公共桶安装。失败均不阻断会话启动。
if ! npx --yes playwright install chromium chromium-headless-shell; then
  echo "[session-start] cdn.playwright.dev 不可达,尝试 Chrome-for-Testing 公共桶回退安装..." >&2
  if bash "${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/install-pw-chromium.sh"; then
    echo "[session-start] Chromium 已通过公共桶回退安装完成,可运行 npm run test:smoke。" >&2
  else
    echo "[session-start] 警告: Chromium 安装失败。请在环境网络策略中放行 cdn.playwright.dev 后重开会话,或本地运行 npm run test:smoke。" >&2
  fi
fi
