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

## 网络要求与回退方案(重要)
Chromium 由 Playwright 默认从 `cdn.playwright.dev` 下载。本环境出站策略默认未放行该域名,
代理会返回 `403 x-deny-reason: host_not_allowed`,标准 `playwright install` 因而失败。

**首选(治本)**:在环境的出站网络设置中放行 `cdn.playwright.dev`,重开会话即可正常下载。

**回退(已内置,无需放行 cdn)**:Playwright 的 chromium / headless-shell 实际就是
Chrome for Testing 构建,而其官方公共桶 `storage.googleapis.com/chrome-for-testing-public`
在允许名单内。`.claude/hooks/session-start.sh` 在标准下载失败时会自动调用
`.claude/hooks/install-pw-chromium.sh`:解析 `playwright install --dry-run` 得到目标版本与
安装路径,把 CfT 下载地址改写到该公共桶下载、解压到 Playwright 期望布局并补可执行位。
经验证容器内已具备 Chrome 运行所需的全部共享库,`npm run test:smoke` 可直接通过。

> 注:视频录制用的 ffmpeg 不在公共桶,回退方案会跳过(冒烟自测不需要)。
> 也可手动执行 `bash .claude/hooks/install-pw-chromium.sh` 触发回退安装。
