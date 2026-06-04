// ui/avatars.js — 角色专属泡泡马特风格 Q 版头像（纯 SVG，64×64 viewBox）
// 设计语言：超大圆头、大圆眼+高光、简洁配饰、撞色背景、Q 版萌系。
// 7 个角色各借鉴一个潮玩 IP 的视觉符号（Skullpanda/Crybaby/Molly/Dimoo/Pucky/Hirono/原创 Boss）。

const SVG = {
  // 陈逻辑（理性）— Skullpanda 灵感：冷色调、黑白头盖、呆毛、面无表情
  rational: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#2a3550"/>
  <circle cx="32" cy="33" r="22" fill="#f4e8d8"/>
  <path d="M10 30 Q10 10 32 10 Q54 10 54 30 Q48 16 32 16 Q16 16 10 30 Z" fill="#1a1a28"/>
  <path d="M14 28 Q18 24 22 26 Q26 22 30 26 Q34 22 38 26 Q42 24 46 26 Q50 24 50 28 Q44 26 32 26 Q20 26 14 28 Z" fill="#0a0a14"/>
  <path d="M29 12 L35 12 L32 4 Z" fill="#1a1a28"/>
  <circle cx="24" cy="36" r="4" fill="#1a1a28"/>
  <circle cx="40" cy="36" r="4" fill="#1a1a28"/>
  <circle cx="25.5" cy="34.5" r="1.3" fill="#fff"/>
  <circle cx="41.5" cy="34.5" r="1.3" fill="#fff"/>
  <line x1="29" y1="46" x2="35" y2="46" stroke="#9090a0" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  // 林敏感（情感）— Crybaby 灵感：水蓝色调、泪滴、粉腮红、颤抖嘴
  emotional: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#7ea7d8"/>
  <circle cx="32" cy="33" r="22" fill="#fbe4d6"/>
  <path d="M10 28 Q10 10 32 10 Q54 10 54 28 Q48 16 32 16 Q16 16 10 28 Z" fill="#5a7dc0"/>
  <path d="M14 24 Q18 20 22 24 Q24 21 28 24 Q32 21 36 24 Q40 21 42 24 Q46 20 50 24 Q48 22 32 22 Q16 22 14 24 Z" fill="#4a6db0"/>
  <path d="M18 14 L20 10 L22 14 Z M30 8 L32 4 L34 8 Z M44 14 L46 10 L42 14 Z" fill="#7ea7d8" opacity=".6"/>
  <circle cx="24" cy="36" r="4.5" fill="#1a1a28"/>
  <circle cx="40" cy="36" r="4.5" fill="#1a1a28"/>
  <circle cx="25.5" cy="34.5" r="1.5" fill="#fff"/>
  <circle cx="41.5" cy="34.5" r="1.5" fill="#fff"/>
  <path d="M22 40 Q21 44 23 46 Q25 44 24 40 Z" fill="#7ac0ff"/>
  <path d="M40 40 Q39 44 41 46 Q43 44 42 40 Z" fill="#7ac0ff"/>
  <ellipse cx="20" cy="42" rx="3" ry="2" fill="#ff90a0" opacity=".6"/>
  <ellipse cx="44" cy="42" rx="3" ry="2" fill="#ff90a0" opacity=".6"/>
  <path d="M28 48 Q30 50 32 48 Q34 50 36 48" stroke="#a04050" stroke-width="1.4" fill="none" stroke-linecap="round"/>
</svg>`,

  // 钢铁王（鹰派）— Molly 灵感：红色头带、金发、怒眉、抿嘴
  aggressive: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#7d2828"/>
  <circle cx="32" cy="33" r="22" fill="#fbe4d6"/>
  <path d="M10 30 Q10 8 32 8 Q54 8 54 30 Q48 16 32 16 Q16 16 10 30 Z" fill="#f0c850"/>
  <path d="M14 26 Q22 22 32 24 Q42 22 50 26 Q44 24 32 24 Q20 24 14 26 Z" fill="#d8a830"/>
  <rect x="10" y="22" width="44" height="5" rx="1" fill="#e84040"/>
  <rect x="10" y="22" width="44" height="1.5" fill="#c02020"/>
  <path d="M19 28 L29 31 L27 27 Z" fill="#5a3010"/>
  <path d="M45 28 L35 31 L37 27 Z" fill="#5a3010"/>
  <circle cx="24" cy="36" r="3.8" fill="#1a1a28"/>
  <circle cx="40" cy="36" r="3.8" fill="#1a1a28"/>
  <circle cx="25" cy="35" r="1.2" fill="#fff"/>
  <circle cx="41" cy="35" r="1.2" fill="#fff"/>
  <path d="M28 45 Q32 43 36 45" stroke="#a04050" stroke-width="2.2" fill="none" stroke-linecap="round"/>
</svg>`,

  // 和谐李（合作）— Dimoo 灵感：温暖棕、云朵头饰、弯月笑眼、大笑嘴
  cooperative: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#3a7a5a"/>
  <circle cx="32" cy="33" r="22" fill="#fbe4d6"/>
  <path d="M10 28 Q10 10 32 10 Q54 10 54 28 Q48 16 32 16 Q16 16 10 28 Z" fill="#8a5a3a"/>
  <ellipse cx="20" cy="14" rx="6" ry="4" fill="#fff" opacity=".92"/>
  <ellipse cx="32" cy="10" rx="7" ry="4" fill="#fff" opacity=".92"/>
  <ellipse cx="44" cy="14" rx="6" ry="4" fill="#fff" opacity=".92"/>
  <path d="M19 34 Q24 39 29 34" stroke="#1a1a28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M35 34 Q40 39 45 34" stroke="#1a1a28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="42" rx="4" ry="2.8" fill="#ff90a0" opacity=".55"/>
  <ellipse cx="44" cy="42" rx="4" ry="2.8" fill="#ff90a0" opacity=".55"/>
  <path d="M24 44 Q32 52 40 44 Z" fill="#ff7080" stroke="#a04050" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M27 44 L37 44" stroke="#fff" stroke-width="1.6"/>
</svg>`,

  // 影子张（操纵）— Pucky 灵感：紫色调、小恶魔角、坏笑、露齿
  manipulative: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#2a0a48"/>
  <circle cx="32" cy="33" r="22" fill="#e8d4f0"/>
  <path d="M10 28 Q10 10 32 10 Q54 10 54 28 Q48 16 32 16 Q16 16 10 28 Z" fill="#7028a0"/>
  <path d="M16 12 L20 4 L23 14 Z" fill="#3a0a50"/>
  <path d="M48 12 L44 4 L41 14 Z" fill="#3a0a50"/>
  <path d="M17 13 L20 6 L22 12 Z" fill="#5018a0" opacity=".7"/>
  <path d="M47 13 L44 6 L42 12 Z" fill="#5018a0" opacity=".7"/>
  <path d="M20 28 Q24 26 28 28" stroke="#3a0a50" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M36 28 Q40 26 44 28" stroke="#3a0a50" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M19 35 Q24 39 29 35" stroke="#1a1a28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M35 35 Q40 39 45 35" stroke="#1a1a28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M24 44 Q32 50 40 44" stroke="#a04050" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M30 45 L30 47 L32 48.5 L34 47 L34 45 Z" fill="#fff" stroke="#a04050" stroke-width="0.6"/>
</svg>`,

  // 稳健吴（规避）— Hirono 灵感：灰连帽衫、半遮帽子、害羞闭眼、帽绳
  riskAverse: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#4a4a5a"/>
  <path d="M4 32 Q4 4 32 4 Q60 4 60 32 L60 42 Q60 36 50 30 L14 30 Q4 36 4 42 Z" fill="#6a6a7a"/>
  <path d="M10 24 Q14 14 32 12 Q50 14 54 24 Q44 22 32 22 Q20 22 10 24 Z" fill="#5a5a6a"/>
  <circle cx="32" cy="34" r="20" fill="#fbe4d6"/>
  <path d="M14 28 Q14 14 32 14 Q50 14 50 28 Q44 20 32 20 Q20 20 14 28 Z" fill="#6a6a7a"/>
  <path d="M20 36 Q24 33 28 36" stroke="#1a1a28" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M36 36 Q40 33 44 36" stroke="#1a1a28" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <ellipse cx="21" cy="42" rx="3" ry="2" fill="#ff90a0" opacity=".5"/>
  <ellipse cx="43" cy="42" rx="3" ry="2" fill="#ff90a0" opacity=".5"/>
  <path d="M29 46 Q32 44 35 46" stroke="#a04050" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <line x1="22" y1="48" x2="22" y2="60" stroke="#3a3a4a" stroke-width="2"/>
  <line x1="42" y1="48" x2="42" y2="60" stroke="#3a3a4a" stroke-width="2"/>
  <circle cx="22" cy="60" r="2.2" fill="#9090a0"/>
  <circle cx="42" cy="60" r="2.2" fill="#9090a0"/>
</svg>`,

  // 极限交易者（Boss）— 自创 Q 版：金色蓬松发、橘脸、眯眼噘嘴、深蓝礼服+红领带
  trumpBoss: `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#1a3055"/>
  <circle cx="32" cy="34" r="22" fill="#f0a070"/>
  <path d="M8 28 Q6 6 32 4 Q58 6 56 28 Q52 12 44 10 Q32 6 20 10 Q12 12 8 28 Z" fill="#e8b040"/>
  <path d="M12 24 Q22 14 32 20 Q42 14 52 24 Q50 18 40 16 Q32 18 24 16 Q14 18 12 24 Z" fill="#f0c860"/>
  <path d="M14 22 Q24 12 32 18 Q40 12 50 22" stroke="#d09028" stroke-width="0.8" fill="none" opacity=".7"/>
  <path d="M19 30 Q24 28 28 32" stroke="#a87018" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M36 32 Q40 28 45 30" stroke="#a87018" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="36" rx="3" ry="1.2" fill="#1a1a28"/>
  <ellipse cx="40" cy="36" rx="3" ry="1.2" fill="#1a1a28"/>
  <ellipse cx="25" cy="35.5" rx="0.8" ry="0.6" fill="#fff"/>
  <ellipse cx="41" cy="35.5" rx="0.8" ry="0.6" fill="#fff"/>
  <ellipse cx="32" cy="46" rx="5" ry="2.6" fill="#b04050"/>
  <ellipse cx="32" cy="45.5" rx="3.2" ry="0.9" fill="#d06070"/>
  <path d="M4 56 Q32 50 60 56 L60 64 L4 64 Z" fill="#152848"/>
  <path d="M22 54 L32 60 L42 54 L42 56 L32 62 L22 56 Z" fill="#fbfbfb"/>
  <path d="M28 56 L36 56 L34 64 L30 64 Z" fill="#c02020"/>
  <path d="M29 56 L35 56 L35 57 L29 57 Z" fill="#e04040"/>
</svg>`,
};

export function avatarSvg(oppId) {
  return SVG[oppId] || SVG.cooperative;
}

export const AVATAR_IDS = Object.keys(SVG);
