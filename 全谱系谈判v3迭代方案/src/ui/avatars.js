// ui/avatars.js — 角色专属风格化头像（纯 SVG 字符串，无外部资源）
// 每个 SVG 视口 64×64，外部由 .nego-avatar-ring 提供圆形裁切与光环动画。
// 设计原则：单一主色 + 强对比标志元素，小尺寸下仍可识别角色性格。

const SVG = {
  // 陈逻辑 — 理性分析型：黑色侧分短发、方框眼镜、青色眼瞳、严肃直线嘴
  rational: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#2a3550"/>
  <path d="M10 58 Q32 46 54 58 L54 64 L10 64 Z" fill="#3a4a6a"/>
  <path d="M28 52 L36 52 L34 64 L30 64 Z" fill="#5a6a8a"/>
  <ellipse cx="32" cy="30" rx="14" ry="16" fill="#d8c8b8"/>
  <path d="M18 24 Q18 12 32 12 Q46 12 46 24 Q42 18 32 18 Q22 18 18 24 Z" fill="#1a1a28"/>
  <rect x="19" y="26" width="11" height="9" rx="2" fill="none" stroke="#0a0a14" stroke-width="1.5"/>
  <rect x="34" y="26" width="11" height="9" rx="2" fill="none" stroke="#0a0a14" stroke-width="1.5"/>
  <line x1="30" y1="30" x2="34" y2="30" stroke="#0a0a14" stroke-width="1.5"/>
  <circle cx="24.5" cy="30.5" r="1.6" fill="#00d4ff"/>
  <circle cx="39.5" cy="30.5" r="1.6" fill="#00d4ff"/>
  <line x1="27" y1="40.5" x2="37" y2="40.5" stroke="#5a4030" stroke-width="1.6" stroke-linecap="round"/>
</svg>`,

  // 林敏感 — 情感驱动型：紫色波浪长发、湿润大眼、颤抖小嘴
  emotional: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#3a2855"/>
  <path d="M10 58 Q32 46 54 58 L54 64 L10 64 Z" fill="#5a4a8a"/>
  <ellipse cx="32" cy="32" rx="15" ry="17" fill="#f0d0c0"/>
  <path d="M15 28 Q12 10 32 10 Q52 10 49 28 Q46 18 40 16 Q32 14 24 16 Q18 18 15 28 Z" fill="#6a3aa0"/>
  <path d="M15 28 Q12 38 18 46 Q14 36 15 28 Z" fill="#6a3aa0"/>
  <path d="M49 28 Q52 38 46 46 Q50 36 49 28 Z" fill="#6a3aa0"/>
  <path d="M16 30 Q14 24 20 22" stroke="#8a5ac0" stroke-width="1.5" fill="none"/>
  <path d="M48 30 Q50 24 44 22" stroke="#8a5ac0" stroke-width="1.5" fill="none"/>
  <ellipse cx="24" cy="33" rx="3.2" ry="3.8" fill="#fff"/>
  <ellipse cx="40" cy="33" rx="3.2" ry="3.8" fill="#fff"/>
  <circle cx="24.5" cy="34" r="2" fill="#4070c0"/>
  <circle cx="40.5" cy="34" r="2" fill="#4070c0"/>
  <circle cx="25.5" cy="33" r="0.8" fill="#fff"/>
  <circle cx="41.5" cy="33" r="0.8" fill="#fff"/>
  <circle cx="21" cy="38" r="1.2" fill="#90c0ff" opacity="0.7"/>
  <path d="M28 43 Q30 45 32 43 Q34 45 36 43" stroke="#a04050" stroke-width="1.2" fill="none" stroke-linecap="round"/>
</svg>`,

  // 钢铁王 — 强硬鹰派型：军装+金扣、平头、浓眉、鹰钩鼻、咬牙
  aggressive: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#3a1818"/>
  <path d="M10 58 Q32 46 54 58 L54 64 L10 64 Z" fill="#5a1a1a"/>
  <circle cx="22" cy="58" r="1.6" fill="#e8b850"/>
  <circle cx="42" cy="58" r="1.6" fill="#e8b850"/>
  <ellipse cx="32" cy="30" rx="14" ry="16" fill="#c89878"/>
  <path d="M18 22 Q18 10 32 10 Q46 10 46 22 L46 18 Q32 13 18 18 Z" fill="#2a1a0a"/>
  <path d="M18 26 L28 28 L26 25 Z" fill="#1a1a1a"/>
  <path d="M46 26 L36 28 L38 25 Z" fill="#1a1a1a"/>
  <ellipse cx="24" cy="32" rx="2" ry="1" fill="#1a1a1a"/>
  <ellipse cx="40" cy="32" rx="2" ry="1" fill="#1a1a1a"/>
  <path d="M32 32 L29 41 L35 41 Z" fill="#a07858" opacity="0.55"/>
  <line x1="26" y1="44" x2="38" y2="44" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="28" y1="44" x2="28" y2="46" stroke="#fff" stroke-width="0.8"/>
  <line x1="32" y1="44" x2="32" y2="46" stroke="#fff" stroke-width="0.8"/>
  <line x1="36" y1="44" x2="36" y2="46" stroke="#fff" stroke-width="0.8"/>
</svg>`,

  // 和谐李 — 合作共赢型：自然短发、弯月眼、大笑、腮红
  cooperative: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#1a4a3a"/>
  <path d="M10 58 Q32 46 54 58 L54 64 L10 64 Z" fill="#2a6a4a"/>
  <ellipse cx="32" cy="32" rx="15" ry="16" fill="#e8c898"/>
  <path d="M17 24 Q17 12 32 11 Q47 12 47 24 Q43 18 32 16 Q21 18 17 24 Z" fill="#604030"/>
  <path d="M20 30 Q24 35 28 30" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M36 30 Q40 35 44 30" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <circle cx="20" cy="38" r="2.4" fill="#ff90a0" opacity="0.55"/>
  <circle cx="44" cy="38" r="2.4" fill="#ff90a0" opacity="0.55"/>
  <path d="M23 40 Q32 48 41 40 Z" fill="#fff" stroke="#a04050" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M25 41 Q32 44 39 41" stroke="#a04050" stroke-width="0.8" fill="none"/>
</svg>`,

  // 影子张 — 操纵控制型：黑色油亮发、紫色半面具、狡黠侧眼
  manipulative: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#1a1024"/>
  <path d="M10 58 Q32 46 54 58 L54 64 L10 64 Z" fill="#1a1a2a"/>
  <ellipse cx="32" cy="32" rx="14" ry="17" fill="#d8b8a8"/>
  <path d="M18 22 Q16 8 32 8 Q48 8 46 22 Q40 12 32 14 Q24 12 18 22 Z" fill="#0a0a14"/>
  <path d="M18 20 Q24 16 32 18 Q40 16 46 22" stroke="#3a3a4a" stroke-width="0.6" fill="none" opacity="0.7"/>
  <path d="M30 22 Q34 20 50 22 L52 28 L50 36 Q44 40 36 38 Q30 34 30 22 Z" fill="#5a1a8a" stroke="#a040c0" stroke-width="1"/>
  <path d="M30 22 Q34 24 50 22" stroke="#c060e0" stroke-width="0.8" fill="none"/>
  <ellipse cx="40" cy="30" rx="3.5" ry="2.3" fill="#0a0a14"/>
  <circle cx="40.5" cy="30" r="1.2" fill="#c084fc"/>
  <ellipse cx="24" cy="32" rx="2.6" ry="1.5" fill="#1a1a1a"/>
  <circle cx="24.5" cy="32" r="0.9" fill="#c084fc"/>
  <path d="M23 42 Q28 45 33 42" stroke="#a04050" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`,

  // 稳健吴 — 风险规避型：中分褐发带灰、眯眼警惕、抿嘴、领口盾徽
  riskAverse: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#2a2a2a"/>
  <path d="M10 58 Q32 46 54 58 L54 64 L10 64 Z" fill="#4a4a4a"/>
  <ellipse cx="32" cy="30" rx="14" ry="16" fill="#d8c0a8"/>
  <path d="M18 22 Q18 10 32 10 Q46 10 46 22 Q42 14 32 14 Q22 14 18 22 Z" fill="#604848"/>
  <path d="M28 14 L36 14 L34 22 L30 22 Z" fill="#a08888"/>
  <ellipse cx="24" cy="30" rx="3" ry="1" fill="#1a1a1a"/>
  <ellipse cx="40" cy="30" rx="3" ry="1" fill="#1a1a1a"/>
  <path d="M19 27 L29 28" stroke="#604848" stroke-width="1.2" fill="none"/>
  <path d="M45 27 L35 28" stroke="#604848" stroke-width="1.2" fill="none"/>
  <path d="M26 41 Q32 39 38 41" stroke="#5a3030" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M29 54 L35 54 L35 59 Q32 62 29 59 Z" fill="#3a8a5a" stroke="#fff" stroke-width="0.6"/>
  <path d="M32 56 L32 60" stroke="#fff" stroke-width="0.6"/>
</svg>`,

  // 极限交易者（特朗普 Boss）— 金色蓬松后梳发、橘肤、皱眉眯眼、噘嘴、深蓝西装、红领带
  trumpBoss: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="32" cy="32" rx="22" ry="22" fill="#2a1a1a"/>
  <path d="M6 58 Q32 44 58 58 L58 64 L6 64 Z" fill="#152848"/>
  <path d="M18 56 L28 50 L32 56 L36 50 L46 56 L40 60 L32 58 L24 60 Z" fill="#f5f5f5"/>
  <path d="M28 52 L36 52 L35 64 L29 64 Z" fill="#b02828"/>
  <path d="M29 52 L35 52 L35 53 L29 53 Z" fill="#d04848"/>
  <ellipse cx="32" cy="32" rx="16" ry="18" fill="#e89060"/>
  <ellipse cx="20" cy="36" rx="3" ry="4" fill="#e89060"/>
  <ellipse cx="44" cy="36" rx="3" ry="4" fill="#e89060"/>
  <path d="M12 26 Q14 8 32 8 Q50 8 52 26 Q52 16 44 14 Q32 11 20 14 Q12 16 12 26 Z" fill="#e8b040"/>
  <path d="M14 22 Q22 14 32 18 Q42 14 50 22 Q50 19 40 16 Q32 18 24 16 Q14 19 14 22 Z" fill="#f0c860"/>
  <path d="M16 24 Q26 18 36 22 Q44 18 50 24" stroke="#c89028" stroke-width="0.8" fill="none" opacity="0.6"/>
  <path d="M19 27 Q24 26 28 28" stroke="#a87018" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M45 27 Q40 26 36 28" stroke="#a87018" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="32" rx="2.6" ry="0.9" fill="#1a1a1a"/>
  <ellipse cx="40" cy="32" rx="2.6" ry="0.9" fill="#1a1a1a"/>
  <ellipse cx="32" cy="44" rx="4.5" ry="2.2" fill="#a83548"/>
  <ellipse cx="32" cy="43.5" rx="3" ry="0.8" fill="#c85868"/>
  <path d="M27.5 44 Q32 42 36.5 44" stroke="#601820" stroke-width="0.7" fill="none"/>
</svg>`,
};

export function avatarSvg(oppId) {
  return SVG[oppId] || SVG.cooperative;
}

export const AVATAR_IDS = Object.keys(SVG);
