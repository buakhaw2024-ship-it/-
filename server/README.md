# LLM 代理后端（回应选项改写 / 对手回应）

为「全谱系谈判博弈模拟系统」提供大模型能力。前端 `NegotiationLLMBridge`（backend 模式）会把请求 POST 到
`http://localhost:8787/api/ai/negotiation-turn`，本服务按 `body.task` 分流。

> 说明：前端的**本地话术贴合**与**打字机显示**不依赖本服务，纯离线即可工作（见主 HTML 内 `__aiEnhanceOptions`）。
> 本服务用于「接入大模型」后获得更自然的改写与对手回应。direct 模式（OpenAI 兼容 `/chat/completions`）则无需本服务。

## 运行

Node：
```bash
cd server
npm i express cors @anthropic-ai/sdk
ANTHROPIC_API_KEY=sk-ant-... node server.mjs
# 可选：LLM_MODEL=claude-haiku-4-5 PORT=8787
```

Python：
```bash
cd server
pip install flask flask-cors anthropic
ANTHROPIC_API_KEY=sk-ant-... python server.py
```

## 接口契约

`POST /api/ai/negotiation-turn`

### task = `rewrite_response_options`（回应选项改写）
请求：
```json
{ "task":"rewrite_response_options",
  "opponentLine":"这铁路，洋人掺了多少股？",
  "options":[{"key":"probe","strategy":"查敌情","skill":"信息获取","sample":"原始静态话术"}] }
```
响应（键用传入的 `key`）：
```json
{ "options": { "probe": "针对对手这句话改写后的中文话术" } }
```
前端 `_aiParse` 兼容：`{options:{...}}`、`{options:[{key,text}]}`、扁平 `{key:话术}`、按序字符串数组；
应用时按 key 匹配，匹配不上再按顺序回退。

### 其它（无 task）：对手回应 + 教练反馈
返回 `normalizeResult` 期望字段：
`{ opponentResponse, opponentHearing, coachNote, betterNextMove, riskSignal, pressureLevel(1-5) }`

## 实现要点
- 官方 Anthropic SDK + 结构化输出（`output_config.format` JSON Schema）保证形状稳定。
- 默认模型 `claude-opus-4-8`；改写是轻任务，`effort:'low'` 控延迟，可换 `claude-haiku-4-5`。
- CORS 已开（本地 `file://` 可直接调用）；上生产请收紧来源。
- API Key 只在后端，前端不带 key。

## 流式（可选，未默认启用）
前端当前对改写结果用**客户端打字机**逐字显现（`ai_fl_type` 开关），已有「流式视觉」。
若需真正的服务端 token 流式（SSE），需后端改 `stream:true` 并在前端按 SSE 增量渲染——
因选项改写是结构化 JSON、增量应用价值有限，暂以打字机覆盖该体验。
