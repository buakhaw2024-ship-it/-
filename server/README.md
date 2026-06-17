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

### task = `generate_opponent_beat`(LLM 动态对手台词:记忆+抓软肋)
请求含 `opponentName / recent(近几手) / weak(最弱项) / priorBeat / focus / chainId / actIndex / round / playerLine / env / persona(人物属性:风格/招式/软肋/语气/场景词/禁用词) / seed(变化种子)`。
响应:`{ "beat": "对手这一回合的台词(针对你最弱项、可引用之前)" }`

> 随机性:`seed` 与缓存键含 `playerLine`,使台词不每局雷同;后端应据 `persona` 贴合语气/场景词、禁用违禁词、符合谈判原则,且每次换新鲜说法。
> 无大模型时前端本地生成同样做了随机化:模板池扩为4变体并按"每回合随机种子(局内稳定·跨局变化)"选取,避免每局一模一样的语言套路。

### task = `generate_act_twist`(LLM 剧情微事件/转折)
请求含 `chainId / actIndex / actTitle / opponentName`。
响应:`{ "twist": "本幕开场的情境转折(一句)" }`

> 前端解析容错:也接受裸字符串或 `{text:...}`。仅在 AI增强开启且对应开关打开时调用;
> 不可用/出错时:对手台词回退原脚本+本地生成,剧情转折则不显示。direct 模式无需本服务即可工作。

### task = `generate_duel_scenario`(传奇试炼场:由人物属性生成剧情+对抗台词)
请求含 `persona`(该传奇人物的属性设定:`name/style/passive/weakness/signature/styleTags/mentorSeries/voiceStyle/sceneLexicon/bannedWords/coreTrap`)与 `seed`(随机种子,使每局剧情不同)。
响应:
```
{ "director": { "time","location","visual","playerRole","opponent","stakes","hiddenPressure","firstQuestion" },
  "phases": [ { "title","openingLine(对手主动发起的对抗性逼问)","setting","best","trap" }, … 恰好6幕 ] }
```

> 约束:台词须贴合该人物时代/身份/风格,用其语气(voiceStyle)、多用场景词(sceneLexicon)、禁用违禁词(bannedWords)与现代黑话;
> 每幕 openingLine 暗含其核心陷阱(coreTrap);且必须符合谈判原则(锚定、BATNA、聚焦利益而非立场、让步必换取、制造期限、护面子)。
> 前端仅覆盖"叙事层":AI 的 director/phases 叠加到原剧本之上,引擎字段(actions→指标映射、endings、method)保持不变 → 不影响胜负计算。
> 开局(round 0)按 `duelistId+随机key` 生成一次并缓存(每局不同),返回后重渲染;不可用/出错时回退原静态剧本。
> 由"LLM剧情(按人物属性生成试炼场)"开关(`ai_fl_plot`)控制。

### task = `generate_coach_note`(针对玩家这句话的可点开复盘详解)
请求含 `playerLine(玩家刚说的话) / facts(系统记录的可核对事实串:本手造成的指标变化) / env(当前局势) / priorBeat(对手上一句) / weak / opponentName`。
响应:`{ "review": "一句话总评(<=40字)", "detail": "逐条呼应 facts 的诊断(<=120字)", "better": "更优说法(<=30字)" }`

> 反幻觉约束:`facts` 由前端用系统真实指标(玩家点击前/后快照)计算,模型只能据此诊断,严禁编造事实里没有的数字或效果;信息不足须直说「依现有数据」。
> 前端始终先用 `facts` 渲染本地可核对的复盘(诊断真实、逻辑可验证),大模型仅在其上增强 review/detail/better 的表达;后端不可用时本地复盘照常显示。
