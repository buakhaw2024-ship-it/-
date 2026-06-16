# 冒烟自测 (Playwright)

在真实 Chromium 中加载单文件 `index.html`,校验:
- 页面正常渲染(无致命 JS 错误)
- 关键全局存在:`NegotiationLLMBridge` / `__aiEnhanceOptions` / `__aiGenOpponentLine`
- 本地对手台词生成器对一句对手台词能产出非空中文
- 截图保存到 `tests/output/main.png`

## 运行
```bash
npm install
npx playwright install chromium   # 首次需下载浏览器
npm run test:smoke
```

Web 会话里 `.claude/hooks/session-start.sh` 会自动装好依赖与 Chromium。

## 网络要求(重要)
Chromium 由 Playwright 从 `cdn.playwright.dev` 下载。若你的环境网络策略未放行该域名,
会出现 `Host not in allowlist: cdn.playwright.dev` 而无法安装浏览器。
解决:在环境的出站网络设置中放行 `cdn.playwright.dev`(必要时再加 `playwright.azureedge.net`),
重开会话让 `session-start` hook 自动安装;或在本机执行 `npx playwright install chromium` 后运行 `npm run test:smoke`。
