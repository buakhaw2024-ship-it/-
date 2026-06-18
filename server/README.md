# 后端安全代理 · negotiation-ai-proxy

把《全谱系谈判博弈模拟系统》「后端安全模式」的话术生成请求转发到
**OpenRouter**（OpenAI 兼容）。API Key 只存在服务端，浏览器永远拿不到，
适合多人/分享场景，也没有前端直连的跨域烦恼。

游戏默认后端地址就是 `http://localhost:8787/api/ai/negotiation-turn`，
而 `wrangler dev` 默认正好监听 `localhost:8787` —— 所以本地开发**零配置**即可连通。

```
server/
├─ src/ai-logic.js     # 核心：按 task 构造提示词 → 调 OpenRouter → 整形成游戏要的 JSON
├─ src/worker.js       # Cloudflare Worker 入口（推荐，含 CORS / 路由）
├─ src/node-server.js  # 纯 Node 入口（无依赖，喜欢 Node 的用这个）
├─ test/contract.test.mjs  # 契约测试（mock 上游，验证 5 种 task 返回结构）
├─ wrangler.toml
└─ package.json
```

## 它处理的请求（与游戏前端完全对齐）

游戏会向同一个地址 POST 不同 `task` 的请求，代理按 `body.task` 分支：

| task | 触发处 | 返回结构 |
|------|--------|----------|
| *(无 task)* | 结构化回合 | `{opponentResponse,opponentHearing,coachNote,betterNextMove,riskSignal,pressureLevel,provider,model}` |
| `rewrite_response_options` | 选项话术改写 | `{options:{选项key:话术}}` |
| `generate_turn` | 动态对手台词 + 选项 | `{beat, options:{key:话术}}` |
| `generate_coach_note` | 教练实时复盘 | `{review, detail, better}` |
| `generate_duel_scenario` | 按人物属性生成试炼场 | `{director:{…}, phases:[{…}]}` |

非 2xx 时游戏会自动回退本地话术，所以即使代理临时不可用，游戏照常能玩。

---

## 方式 A：Cloudflare Worker（推荐）

```bash
cd server
npm install                 # 装 wrangler
echo 'OPENROUTER_API_KEY = "sk-or-你的key"' > .dev.vars   # 本地用，已被 .gitignore
npm run dev                 # → http://localhost:8787 ，游戏后端模式直接连通
```

部署到云端（全球边缘、HTTPS）：

```bash
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY   # 粘贴你的 key
npm run deploy
# 部署后把游戏「设置 → 大模型语境增强层 → 后端接口」改成
#   https://negotiation-ai-proxy.<你的子域>.workers.dev/api/ai/negotiation-turn
```

## 方式 B：纯 Node（无需 Cloudflare）

```bash
cd server
OPENROUTER_API_KEY=sk-or-你的key npm start    # 默认监听 8787，游戏零配置连通
# 自定义端口：PORT=9000 OPENROUTER_API_KEY=... npm start
```

> 用 `file://` 直接打开游戏时，请求来自 `Origin: null`；代理已设
> `Access-Control-Allow-Origin: *` 并正确响应预检，跨域没问题。

## 方式 C：GitHub Actions 一键部署 Worker

在仓库 **Settings → Secrets and variables → Actions** 配置三个 secret：

| Secret | 取得方式 |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens，用 “Edit Cloudflare Workers” 模板 |
| `CLOUDFLARE_ACCOUNT_ID` | Workers 概览页右侧的 Account ID |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys |

配好后有两种触发方式：

- **自动**：push 到 `main` 且改动了 `server/**`（或本工作流）时自动部署；
- **手动**：**Actions → Deploy Worker → Run workflow** 点一下即可（可选填模型 id 覆盖默认）。

工作流会先跑契约测试，再 `wrangler deploy`，并把 `OPENROUTER_API_KEY` 写入 Worker 密钥。
部署完成后，在游戏 **设置 → 大模型语境增强层 → 后端接口** 输入框填入
`https://negotiation-ai-proxy.<你的子域>.workers.dev/api/ai/negotiation-turn`
（若设了 `PROXY_ACCESS_TOKEN`，地址末尾加 `?k=<令牌>`），点「保存后端地址」即可。

---

## 配置项（环境变量 / wrangler 变量）

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENROUTER_API_KEY` | ✅ | OpenRouter 密钥（https://openrouter.ai/keys） |
| `OPENROUTER_MODEL` | | 默认 `deepseek/deepseek-chat`（中文强、便宜），可换任意 OpenRouter 模型 |
| `OPENROUTER_BASE_URL` | | 默认 `https://openrouter.ai/api/v1`；想直连 DeepSeek 等可改成其 `/v1` |
| `PROXY_ACCESS_TOKEN` | | **公开部署强烈建议设置**：访问令牌。设了之后游戏「后端接口」要带 `?k=<令牌>` |
| `PORT` | | 仅 Node 版，默认 8787 |

默认已是 DeepSeek（`deepseek/deepseek-chat`，中文强、便宜）。想换其它主流模型，
把 `OPENROUTER_MODEL` 设成 `qwen/qwen-2.5-72b-instruct`、
`deepseek/deepseek-chat-v3-0324`、`anthropic/claude-3.5-sonnet` 等即可。

---

## 安全：公开部署务必设访问令牌

代理用**服务端的** OpenRouter Key 转发请求。一旦部署到公网（如 `workers.dev`），
**任何知道 URL 的人都能 POST 来烧你的额度**。本地 `wrangler dev` 自用没关系，
但公开部署请务必加一道门：

```bash
# Cloudflare（手动）：
npx wrangler secret put PROXY_ACCESS_TOKEN        # 输入一个随机串
# —— 或：用 GitHub Actions 部署时，把 PROXY_ACCESS_TOKEN 加成仓库 Actions secret，部署会自动写入 Worker
# Node：
PROXY_ACCESS_TOKEN=随机串 OPENROUTER_API_KEY=... npm start
```

设了之后，未带正确令牌的请求一律 `401`。把游戏「后端接口」填成带令牌的地址即可：

```
https://negotiation-ai-proxy.<你的子域>.workers.dev/api/ai/negotiation-turn?k=随机串
```

代理还会拒绝 >16KB 的请求体（`413`），`max_tokens` 也在服务端按 task 封顶，进一步限制被滥用时的成本。
令牌仅写在你自己的游戏配置里，不会广播给第三方网站，足以挡住顺着 URL 来的盗刷。

## 验证

```bash
npm test           # 契约测试：mock 上游，校验 5 种 task 的返回结构（无需 key/联网）
```

连通真实模型后，可直接 curl 一发：

```bash
curl -s http://localhost:8787/api/ai/negotiation-turn \
  -H 'Content-Type: application/json' \
  -d '{"task":"generate_turn","opponentName":"开发商本人","priorBeat":"第五大道均价没这么高。","weak":"压力权","options":[{"key":"info","strategy":"查敌情"},{"key":"lock","strategy":"锁条款"}]}'
# 期望返回：{"beat":"…","options":{"info":"…","lock":"…"}}
```

游戏侧：设置里开启「AI 增强」并选「后端安全模式」，确认「后端接口」指向本服务即可。
