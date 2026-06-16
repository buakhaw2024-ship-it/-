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
    sys = "你扮演谈判对手，用其口吻。这是实时博弈:直接回应玩家刚说的话(playerLine)，结合当前局势(env/指标)与历史(recent)，针对其弱项(weak)反击，可引用之前交手。1-2句、不超过55字、中文、像真人即兴交锋。"
    user = "上下文：" + json.dumps(body, ensure_ascii=False) + "\n只生成对手这一回合的台词。"
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


COACH_SCHEMA = {"type":"object","properties":{"review":{"type":"string"},"better":{"type":"string"}},"required":["review","better"],"additionalProperties":False}

def gen_coach_note(body):
    sys = "你是谈判教练。针对玩家刚说的这句话(playerLine)，结合当前局势(env)与对手上一句(priorBeat)，简评其得失(为何加分/丢分)，并给一句更优说法。中文、犀利具体。"
    user = "上下文：" + json.dumps(body, ensure_ascii=False) + "\n只点评玩家这句的得失并给更优说法。"
    msg = client.messages.create(model=MODEL, max_tokens=300, system=sys,
        messages=[{"role":"user","content":user}],
        output_config={"effort":"low","format":{"type":"json_schema","schema":COACH_SCHEMA}})
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
        else: out = negotiation_turn(body)
        return jsonify(out)
    except Exception as e:
        app.logger.error("[LLM backend error] %s", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8787)))
