// analytics/opponent-insight-v2.js — 结果页"对手真实想法"
// 基于 Mood / Memory / Reputation / 本局 rounds 推理对手的认知。

import { Mood } from '../engine/mood.js';
import { Memory } from '../engine/memory.js';
import { loadReputation } from '../engine/reputation.js';

export function buildOpponentInnerThought(opp, result) {
  if (!opp) return '';

  const mood = Mood.get(opp.id);
  const mem = Memory.get(opp.id);
  const rep = loadReputation(opp.id);
  const rounds = (result && result.rounds) || [];
  const outcome = result && result.outcome;

  const thoughts = [];

  if ((mood.trust || 0) < 0.35) {
    thoughts.push('你让我很难建立信任，所以我更倾向于防御或压迫。');
  } else if ((mood.trust || 0) > 0.65) {
    thoughts.push('你确实让我放松了警惕，我对你的合作意愿做了正向修正。');
  }

  if ((mood.anger || 0) > 0.6) {
    thoughts.push('你的某些动作激起了我的抵触，我不太愿意顺着你的节奏走。');
  }

  if ((mem.firmCount || 0) >= 2) {
    thoughts.push('你几次明确守住底线后，我开始重新评估你的承压能力。');
  }

  if ((mem.exposureScore || 0) >= 2) {
    thoughts.push('你识破了我的部分话术，我对你的判断变得保守。');
  }

  if ((rep.games || 0) >= 2) {
    if (rep.lastOutcome === 'win') {
      thoughts.push('你上次赢过我，所以我这局开局更警惕。');
    } else if (rep.lastOutcome === 'lose') {
      thoughts.push('你上次输过，我会试探你是否还会重复同样的弱点。');
    }
  }

  const hasFastConcession = rounds.some((r) => r.concession && r.concession >= 12);
  if (hasFastConcession) {
    thoughts.push('你有一次让步太快，我判断你的底线可能还可以继续压。');
  }

  if (outcome === 'win') {
    thoughts.push('这局你打穿了我的部分预期，我需要在下次调整策略。');
  } else if (outcome === 'lose') {
    thoughts.push('这局我抓住了你的行为模式，并持续放大你的弱点。');
  } else if (outcome === 'coop') {
    thoughts.push('我们走到了双方都能接受的方案，但这不代表下次还能这样。');
  } else {
    thoughts.push('我们都没有完全暴露底牌，结果保持在可控区间。');
  }

  return thoughts.slice(0, 4).join('<br>');
}
