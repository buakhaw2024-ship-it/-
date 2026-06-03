// scenarios/registry.js — 场景注册表（新增场景只改这里）

import { SCENARIO_META } from '../data/scenarios.meta.js';
import { PrisonersDilemma } from './prisoners.js';
import { UltimatumGame } from './ultimatum.js';
import { TrustGame } from './trust.js';
import { BargainingGame } from './bargaining.js';
import { CrisisNegotiation } from './crisis.js';
import { PublicGoodsGame } from './public-goods.js';
import { CoalitionGame } from './coalition.js';

const CLASSES = {
  prisoners: PrisonersDilemma,
  ultimatum: UltimatumGame,
  trust: TrustGame,
  bargaining: BargainingGame,
  crisis: CrisisNegotiation,
  publicgoods: PublicGoodsGame,
  coalition: CoalitionGame,
};

export const REGISTRY = Object.fromEntries(
  Object.entries(SCENARIO_META).map(([key, meta]) => [key, { Class: CLASSES[key], ...meta }])
);
