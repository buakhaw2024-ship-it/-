#!/bin/bash
# Playwright Chromium 安装回退方案。
#
# 背景:本环境出站网络策略默认未放行 cdn.playwright.dev(代理返回
#   403 x-deny-reason: host_not_allowed),导致 `playwright install`
#   无法下载浏览器。但 Chrome for Testing 的官方公共桶
#   storage.googleapis.com/chrome-for-testing-public 在允许名单内,
#   而 Playwright 的 chromium/headless-shell 正是同一份 CfT 构建。
#
# 本脚本解析 `playwright install --dry-run` 给出的目标版本与安装路径,
# 把 cdn.playwright.dev 的 CfT 下载地址改写到允许的公共桶下载,
# 解压到 Playwright 期望的目录布局,并补齐可执行位。
# 仅作回退;一旦放行 cdn.playwright.dev,标准 `playwright install` 即可直接工作。
set -uo pipefail

BUCKET="https://storage.googleapis.com/chrome-for-testing-public"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

unzip_to() { # $1=zip $2=destdir
  mkdir -p "$2"
  if command -v unzip >/dev/null 2>&1; then unzip -q -o "$1" -d "$2"
  else python3 -c "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$1" "$2"; fi
}

DRY="$(npx --yes playwright install --dry-run chromium chromium-headless-shell 2>/dev/null)"
[ -z "$DRY" ] && { echo "[pw-fallback] 无法获取 playwright dry-run 输出" >&2; exit 1; }

ok=0
loc=""
while IFS= read -r line; do
  case "$line" in
    *"Install location:"*) loc="$(printf '%s' "$line" | sed 's/.*Install location:[[:space:]]*//')" ;;
    *"Download url:"*)
      url="$(printf '%s' "$line" | sed 's/.*Download url:[[:space:]]*//')"
      case "$url" in
        *"/builds/cft/"*linux64.zip)
          rel="${url##*/builds/cft/}"            # <ver>/linux64/<file>.zip
          burl="$BUCKET/$rel"
          zip="$TMP/$(basename "$rel")"
          echo "[pw-fallback] 从允许的公共桶下载: $burl -> $loc" >&2
          if curl -fsSL --max-time 300 -o "$zip" "$burl"; then
            unzip_to "$zip" "$loc"
            # CfT 全量包解压为 chrome-linux64/,Playwright 期望 chrome-linux/
            if [ -d "$loc/chrome-linux64" ] && [ ! -e "$loc/chrome-linux" ]; then
              mv "$loc/chrome-linux64" "$loc/chrome-linux"
            fi
            find "$loc" -maxdepth 2 -type f \( -name chrome -o -name chrome-headless-shell \
              -o -name chrome_sandbox -o -name chrome_crashpad_handler \) -exec chmod +x {} \; 2>/dev/null
            touch "$loc/INSTALLATION_COMPLETE"
            ok=$((ok+1))
          else
            echo "[pw-fallback] 下载失败: $burl" >&2
          fi ;;
        *) echo "[pw-fallback] 跳过非 CfT 资源(公共桶无此件): $url" >&2 ;;
      esac ;;
  esac
done <<EOF
$DRY
EOF

[ "$ok" -gt 0 ] && { echo "[pw-fallback] 已从公共桶安装 $ok 个 Chromium 构件" >&2; exit 0; } || exit 1
