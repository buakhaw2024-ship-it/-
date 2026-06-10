#!/usr/bin/env python3
import base64
import os

AVATAR_DIR = "/tmp/flat_pkg/legendary_mentor_official_integration_package_v1_flat/assets/legendary/mentors/avatar_512/"
SCENE_DIR  = "/tmp/flat_pkg/legendary_mentor_official_integration_package_v1_flat/assets/legendary/scene_ui/preview_960/"
OUTPUT     = "/home/user/-/preview_official_assets.html"

# --- character metadata ---
groups = [
    {
        "title": "UR 传奇谈判者",
        "rarity": "UR",
        "members": [
            ("mentor_sunzi",      "孙子"),
            ("mentor_zhangyi",    "张仪"),
            ("mentor_lihongzhang","李鸿章"),
            ("mentor_inamori",    "稻盛和夫"),
            ("mentor_munger",     "查理·芒格"),
            ("mentor_trump",      "特朗普"),
        ],
    },
    {
        "title": "UR 女性传奇",
        "rarity": "UR",
        "members": [
            ("mentor_cleopatra",  "克利奥帕特拉"),
            ("mentor_wuzetian",   "武则天"),
            ("mentor_elizabeth_i","伊丽莎白一世"),
            ("mentor_catherine",  "叶卡捷琳娜二世"),
            ("mentor_thatcher",   "撒切尔夫人"),
            ("mentor_merkel",     "默克尔"),
            ("mentor_cixi",       "慈禧太后"),
        ],
    },
    {
        "title": "UR 二战三巨头",
        "rarity": "UR",
        "members": [
            ("mentor_churchill",  "丘吉尔"),
            ("mentor_roosevelt",  "罗斯福"),
            ("mentor_stalin",     "斯大林"),
        ],
    },
    {
        "title": "SSR 六大宗师",
        "rarity": "SSR",
        "members": [
            ("master_dawson",     "罗杰·道森"),
            ("master_fisher_ury", "费希尔/尤里"),
            ("master_voss",       "克里斯·沃斯"),
            ("master_cohen",      "赫布·科恩"),
            ("master_diamond",    "斯图尔特·戴蒙德"),
            ("master_shell",      "理查德·谢尔"),
        ],
    },
]

scenes = [
    ("07_legendary_mentor_scene_ui_design.jpg",    "传奇导师专属场景UI"),
    ("08_all_mentor_scene_ui_overview.jpg",         "全导师场景总览UI"),
    ("09_big_three_overall_battle_ui.jpg",          "三巨头整体对战UI"),
    ("10_churchill_personal_duel_ui.jpg",           "丘吉尔个人对抗UI"),
    ("11_negotiation_behavior_profile_ui.jpg",      "谈判行为画像UI"),
]

# --- helper: read file → base64 data URI ---
def to_data_uri(path, mime="image/jpeg"):
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{data}"

# --- encode all avatars ---
avatar_uris = {}
for group in groups:
    for key, _name in group["members"]:
        jpg = os.path.join(AVATAR_DIR, f"{key}.jpg")
        if os.path.exists(jpg):
            avatar_uris[key] = to_data_uri(jpg)
        else:
            webp = os.path.join(AVATAR_DIR, f"{key}.webp")
            avatar_uris[key] = to_data_uri(webp, "image/webp")

# --- encode all scenes ---
scene_uris = []
for fname, label in scenes:
    path = os.path.join(SCENE_DIR, fname)
    scene_uris.append((to_data_uri(path), label))

# --- build HTML ---

def avatar_card_html(key, name, rarity):
    uri = avatar_uris.get(key, "")
    if rarity == "UR":
        badge = '<span class="badge badge-ur">UR</span>'
        name_class = "name-ur"
    else:
        badge = '<span class="badge badge-ssr">SSR</span>'
        name_class = "name-ssr"
    return f"""
        <div class="avatar-card">
          <div class="avatar-frame">
            <img src="{uri}" alt="{name}" loading="lazy" />
          </div>
          <div class="card-meta">
            <span class="{name_class}">{name}</span>
            {badge}
          </div>
        </div>"""

def group_html(group):
    rarity = group["rarity"]
    title  = group["title"]
    cards  = "".join(avatar_card_html(k, n, rarity) for k, n in group["members"])
    section_class = "section-ur" if rarity == "UR" else "section-ssr"
    return f"""
      <section class="group {section_class}">
        <h2 class="group-title">{title}</h2>
        <div class="avatar-grid">
          {cards}
        </div>
      </section>"""

def scene_section_html():
    items = ""
    for uri, label in scene_uris:
        items += f"""
        <div class="scene-item">
          <img src="{uri}" alt="{label}" loading="lazy" />
          <p class="scene-label">{label}</p>
        </div>"""
    return f"""
      <section class="scenes">
        <h2 class="section-heading">场景 UI 预览</h2>
        {items}
      </section>"""

body = "".join(group_html(g) for g in groups)
body += scene_section_html()

html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>传奇导师官方资产预览</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    background: #080810;
    color: #e0e0e0;
    font-family: "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
    padding: 2rem 1rem 4rem;
  }}

  h1.page-title {{
    text-align: center;
    font-size: clamp(1.4rem, 4vw, 2.4rem);
    color: #d4af37;
    letter-spacing: 0.12em;
    margin-bottom: 2.5rem;
    text-shadow: 0 0 18px rgba(212,175,55,.55);
  }}

  /* ── group sections ── */
  .group {{
    margin-bottom: 3rem;
  }}

  .group-title {{
    font-size: clamp(1rem, 2.5vw, 1.5rem);
    margin-bottom: 1.25rem;
    padding: 0.4rem 1rem;
    border-left: 4px solid #d4af37;
    letter-spacing: 0.06em;
  }}

  .section-ur .group-title {{ color: #f7e07a; }}
  .section-ssr .group-title {{ color: #c8a84b; }}

  /* ── avatar grid ── */
  .avatar-grid {{
    display: flex;
    flex-wrap: wrap;
    gap: 1.4rem 1.6rem;
    justify-content: flex-start;
  }}

  .avatar-card {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.55rem;
  }}

  /* ── avatar frame ── */
  .avatar-frame {{
    width:  clamp(100px, 14vw, 160px);
    height: clamp(100px, 14vw, 160px);
    border-radius: 50%;
    border: 2px solid rgba(246,196,83,.4);
    box-shadow:
      0 0 10px  rgba(246,196,83,.35),
      0 0 28px  rgba(246,196,83,.18),
      inset 0 0 8px rgba(246,196,83,.12);
    overflow: hidden;
    flex-shrink: 0;
  }}

  .avatar-frame img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: block;
  }}

  /* ── card meta ── */
  .card-meta {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    max-width: clamp(100px, 14vw, 160px);
  }}

  .name-ur {{
    font-size: 0.82rem;
    font-weight: 600;
    background: linear-gradient(90deg,
      #ff6b6b, #ffd700, #00e5ff, #ff6bff, #ffd700, #ff6b6b);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: rainbow-shift 4s linear infinite;
    text-align: center;
    line-height: 1.3;
  }}

  @keyframes rainbow-shift {{
    0%   {{ background-position: 0%   center; }}
    100% {{ background-position: 200% center; }}
  }}

  .name-ssr {{
    font-size: 0.82rem;
    font-weight: 600;
    color: #d4af37;
    text-align: center;
    line-height: 1.3;
  }}

  .badge {{
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.12em 0.5em;
    border-radius: 4px;
    letter-spacing: 0.08em;
  }}

  .badge-ur {{
    background: linear-gradient(90deg, #8b00ff, #ff4500, #ffd700);
    color: #fff;
    text-shadow: 0 1px 3px rgba(0,0,0,.6);
  }}

  .badge-ssr {{
    background: linear-gradient(90deg, #b8860b, #ffd700, #b8860b);
    color: #1a1000;
  }}

  /* ── scene section ── */
  .scenes {{
    margin-top: 4rem;
    border-top: 1px solid rgba(212,175,55,.25);
    padding-top: 2rem;
  }}

  .section-heading {{
    font-size: clamp(1rem, 2.5vw, 1.5rem);
    color: #d4af37;
    margin-bottom: 1.5rem;
    letter-spacing: 0.08em;
    padding: 0.4rem 1rem;
    border-left: 4px solid #d4af37;
  }}

  .scene-item {{
    margin-bottom: 2.5rem;
  }}

  .scene-item img {{
    width: 100%;
    height: auto;
    object-fit: contain;
    display: block;
    border: 1px solid rgba(212,175,55,.2);
    border-radius: 8px;
  }}

  .scene-label {{
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #b8a060;
    text-align: center;
    letter-spacing: 0.05em;
  }}

  /* ── divider between groups ── */
  .group + .group {{
    border-top: 1px solid rgba(255,255,255,.06);
    padding-top: 2rem;
  }}
</style>
</head>
<body>
  <h1 class="page-title">传奇导师官方资产预览</h1>
  {body}
</body>
</html>
"""

with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(html)

size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
print(f"Written: {OUTPUT}")
print(f"File size: {size_mb:.2f} MB")
