# -*- coding: utf-8 -*-
"""
谈判博弈 · LLM 代理后端 (Python Flask + 官方 anthropic SDK)
客户端默认请求: POST http://localhost:8787/api/ai/negotiation-turn
同一端点按 body.task 分流:
  - task == 'rewrite_response_options' → 改写回应选项(本次新增)
  - 其他(无 task)→ 你原来的"对手回应+教练反馈"(这里给了可跑实现, 可替换成你已有逻辑)

安装:  pip install flask flask-cors anthropic
运行:  ANTHROPIC_API_KEY=sk-ant-...  python server.py
"""
import os, json
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic

app = Flask(__name__)
CORS(app)  # 允许 file:// / 任意来源(本地工具); 生产可收紧
client = anthropic.Anthropic()  # 读取 ANTHROPIC_API_KEY
MODEL = os.environ.get("LLM_MODEL", "claude-opus-4-8")  # 想更快更省可设 claude-haiku-4-5

REWRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "options": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"key": {"type": "string"}, "text": {"type": "string"}},
                "required": ["key", "text"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["options"],
    "additionalProperties": False,
}

TURN_SCHEMA = {
    "type": "object",
    "properties": {
        "opponentResponse": {"type": "string"},
        "opponentHearing": {"type": "string"},
        "coachNote": {"type": "string"},
        "betterNextMove": {"type": "string"},
        "riskSignal": {"type": "string"},
        "pressureLevel": {"type": "integer"},
    },
    "required": ["opponentResponse", "coachNote", "pressureLevel"],
    "additionalProperties": False,
}


def _text(msg):
    return next(b.text for b in msg.content if b.type == "text")


def rewrite_options(body):
    opponent = str(body.get("opponentLine", ""))[:400]
    options = body.get("options", []) or []
    if not opponent or not options:
        return {"options": []}
    lines = "\n".join(
        "- key=%s 策略=%s 原话术=%s"
        % (o.get("key"), o.get("strategy") or o.get("skill") or o.get("key"), o.get("sample", ""))
        for o in options
    )
    system = (
        "你是资深谈判教练。给定对手刚说的话，以及若干回应策略选项，"
        "把每个选项的示范话术改写成直接回应对手这句话的一句中文。"
        "必须保持每个选项原本的策略意图与语气风格(锚定仍锚定、提问仍提问)，"
        "只让语言和语境贴合对手当前台词，每条不超过40字，口语自然、可直接说出口。"
    )
    user = "对手刚说：%s\n\n需要改写的回应选项：\n%s\n\n为每个 key 各生成一句改写后的中文话术(保持原策略意图)。" % (opponent, lines)
    msg = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": REWRITE_SCHEMA}},
    )
    return json.loads(_text(msg))  # {"options": [{"key","text"}, ...]}


def negotiation_turn(body):
    system = (
        "你是谈判对手扮演者+教练。根据玩家这一手的选择与历史，生成对手的回应"
        "(opponentResponse,<=80字)、对手真实意图(opponentHearing)、教练点评(coachNote)、"
        "更优下一手(betterNextMove)、风险信号(riskSignal)、压力等级 pressureLevel(1-5 整数)。中文。"
    )
    user = "【本回合上下文】\n%s\n\n只生成本回合内容。" % json.dumps(body, ensure_ascii=False, indent=2)
    msg = client.messages.create(
        model=MODEL,
        max_tokens=700,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": TURN_SCHEMA}},
    )
    return json.loads(_text(msg))



BEAT_SCHEMA = {"type":"object","properties":{"beat":{"type":"string"}},"required":["beat"],"additionalProperties":False}
TWIST_SCHEMA = {"type":"object","properties":{"twist":{"type":"string"}},"required":["twist"],"additionalProperties":False}

def gen_opponent_beat(body):
    sys = ("你扮演谈判对手，用其口吻。这是实时博弈:直接回应玩家刚说的话(playerLine)，结合当前局势(env/指标)与历史(recent)，针对其弱项(weak)反击，可引用之前交手。"
           "若给了 persona(人物属性:风格/招式/软肋/语气voiceStyle/场景词sceneLexicon/禁用词bannedWords)，须贴合其语气、多用场景词、禁用违禁词与现代黑话，并符合谈判原则(锚定/BATNA/聚焦利益/让步必换取/制造期限/护面子)。"
           "务必每次措辞都不同、避免套路与口头禅复读，像真人即兴交锋、生动具体。1-2句、不超过55字、中文。")
    user = "上下文：" + json.dumps(body, ensure_ascii=False) + "\n(seed 仅用于让表达不雷同，不要读出)\n只生成对手这一回合的台词，换一种新鲜说法。"
    msg = client.messages.create(model=MODEL, max_tokens=300, system=sys,
        messages=[{"role":"user","content":user}],
        output_config={"effort":"low","format":{"type":"json_schema","schema":BEAT_SCHEMA}})
    return json.loads(_text(msg))

def gen_act_twist(body):
    sys = "你是剧情导演。为这一幕谈判注入一个简短情境转折(新约束/第三方介入/突发消息)，增加张力但不改变胜负规则。一句、不超过40字、中文。"
    user = "上下文：" + json.dumps(body, ensure_ascii=False) + "\n只生成本幕开场的情境转折。"
    msg = client.messages.create(model=MODEL, max_tokens=200, system=sys,
        messages=[{"role":"user","content":user}],
        output_config={"effort":"low","format":{"type":"json_schema","schema":TWIST_SCHEMA}})
    return json.loads(_text(msg))


COACH_SCHEMA = {"type":"object","properties":{"review":{"type":"string"},"detail":{"type":"string"},"better":{"type":"string"}},"required":["review","detail","better"],"additionalProperties":False}

def gen_coach_note(body):
    # body["facts"] 是前端用系统真实指标算出的可核对事实串(玩家这句话造成的指标变化)。
    # 教练只能据此诊断，严禁编造事实中没有的数字或效果，避免幻觉。
    sys = "你是谈判教练。只能依据下方【事实】中系统记录的指标数据(facts)做诊断，严禁编造事实里没有的数字、指标或效果；信息不足就直说「依现有数据」。结合对手上一句(priorBeat)与当前局势(env)解读玩家这句话(playerLine)的得失。给三项：一句话总评review(不超过40字)、逐条对应事实的诊断detail(不超过120字)、一句更优说法better(不超过30字)。中文、犀利具体、可验证。"
    user = "【事实】" + str(body.get("facts") or "(无系统记录)") + "\n上下文：" + json.dumps(body, ensure_ascii=False) + "\n只据上述事实点评玩家这句的得失，detail需逐条呼应事实里的指标变化，better给更优说法。"
    msg = client.messages.create(model=MODEL, max_tokens=400, system=sys,
        messages=[{"role":"user","content":user}],
        output_config={"effort":"low","format":{"type":"json_schema","schema":COACH_SCHEMA}})
    return json.loads(_text(msg))

# ---- task: generate_duel_scenario (传奇试炼场:由人物属性生成剧情+对抗台词) ----
_PHASE_PROPS = {"title":{"type":"string"},"openingLine":{"type":"string"},"setting":{"type":"string"},"best":{"type":"string"},"trap":{"type":"string"}}
SCENARIO_SCHEMA = {"type":"object","properties":{
    "director":{"type":"object","properties":{
        "time":{"type":"string"},"location":{"type":"string"},"visual":{"type":"string"},
        "playerRole":{"type":"string"},"opponent":{"type":"string"},"stakes":{"type":"string"},
        "hiddenPressure":{"type":"string"},"firstQuestion":{"type":"string"}},
      "required":["time","location","visual","playerRole","opponent","stakes","hiddenPressure","firstQuestion"],"additionalProperties":False},
    "phases":{"type":"array","items":{"type":"object","properties":_PHASE_PROPS,
        "required":["title","openingLine","setting","best","trap"],"additionalProperties":False}}},
  "required":["director","phases"],"additionalProperties":False}

def gen_duel_scenario(body):
    # persona = 该传奇人物的属性设定;只生成叙事层(剧情+六幕对抗台词),不触碰分数计算。
    p = body.get("persona") or {}
    sys = ("你是历史谈判剧本的导演。依据给定【传奇人物属性】，为一场与该人物的高强度谈判对抗,"
           "生成一段全新的剧情(director)与六幕(phases)。要求:\n"
           "1) 剧情与台词必须贴合该人物的时代、身份、谈判风格(style)、招式(passive)、签名语(signature)与软肋(weakness);\n"
           "2) 对手台词用其语气(voiceStyle),多用场景词(sceneLexicon),严禁出现违禁词(bannedWords)与现代商业黑话;\n"
           "3) 每一幕 openingLine 是对手主动发起的「对抗性挑战/逼问」,要制造真实压力,并暗含其核心陷阱(coreTrap);\n"
           "4) 必须符合谈判原则:体现锚定、BATNA/最佳替代、聚焦利益而非立场、让步必换取对等、制造期限与稀缺、维护关系与面子等真实博弈逻辑;每一幕 best 给「符合谈判原则的最优思路」, trap 给「违背原则的常见陷阱」;\n"
           "5) firstQuestion 是开场要玩家立刻回答的核心议题;hiddenPressure 是暗线压力;\n"
           "6) 全中文。phases 恰好 6 幕,题名精炼。只产出叙事,不决定胜负、不输出指标数字。")
    user = ("【传奇人物属性】\n" + json.dumps(p, ensure_ascii=False, indent=2) +
            "\n随机种子(用于让本局剧情区别于其它局): " + str(body.get("seed") or "") +
            "\n请据此生成贴合该人物属性、语境与谈判原则的剧情(director)与六幕(phases,各含对抗性 openingLine)。")
    msg = client.messages.create(model=MODEL, max_tokens=1600, system=sys,
        messages=[{"role":"user","content":user}],
        output_config={"effort":"low","format":{"type":"json_schema","schema":SCENARIO_SCHEMA}})
    return json.loads(_text(msg))

@app.post("/api/ai/negotiation-turn")
def handler():
    body = request.get_json(silent=True) or {}
    try:
        task = body.get("task")
        if task == "rewrite_response_options": out = rewrite_options(body)
        elif task == "generate_opponent_beat": out = gen_opponent_beat(body)
        elif task == "generate_act_twist": out = gen_act_twist(body)
        elif task == "generate_coach_note": out = gen_coach_note(body)
        elif task == "generate_duel_scenario": out = gen_duel_scenario(body)
        else: out = negotiation_turn(body)
        return jsonify(out)
    except Exception as e:
        app.logger.error("[LLM backend error] %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8787)))
