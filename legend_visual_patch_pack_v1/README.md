# Legend Visual Patch Pack v1.0

## 传奇试炼场 22 位人物场景图片补丁包

本补丁包为「全谱系谈判博弈模拟系统 v5.12」提供 22 位传奇人物的电影化场景图与肖像图接入层。

> **v5.13 已原生集成本补丁包的全部功能**（`LegendSceneImageManager` 模块 + CSS 加载动画/稀有度光晕/安全区遮罩）。如使用 v5.13，只需将图片放入 `assets/legend/` 目录并调用 `LegendSceneImagePatch.markAllReady()` 即可。

### 目录结构

```
legend_visual_patch_pack_v1/
├── README.md                          ← 本文件
├── ClaudeCode_直接执行提示词.md        ← ClaudeCode 一键执行指令
├── 医生们/
│   └── ClaudeCode_传奇试炼场22位人物场景图片设计接入文档_v1.md
├── 补丁/
│   ├── legend_scene_image_patch.js     ← 场景图 & 肖像路径注入脚本
│   ├── legend_scene_image_patch.css    ← 增强视觉样式
│   └── legend_scene_image_manifest.json← 22 位人物图片资产清单
└── 资产/
    └── legend_22_preview_poster.png    ← 预览海报（占位）
```

### 快速接入

1. 将 `补丁/` 下三个文件放入项目目录
2. 在 HTML 的 `</head>` 前插入 CSS 引用
3. 在 HTML 的 `</body>` 前插入 JS 引用
4. 将生成的场景图放入 `assets/legend/` 目录

详见 `ClaudeCode_直接执行提示词.md`。

### 人物清单（22 位）

| # | ID | 名称 | 稀有度 | 系列 |
|---|-----|------|--------|------|
| 1 | mentor_sunzi | 孙子 | UR_LEGEND | 兵圣 |
| 2 | mentor_zhangyi | 张仪 | UR_LEGEND | 纵横家 |
| 3 | mentor_lihongzhang | 李鸿章 | UR_LEGEND | 弱势谈判 |
| 4 | mentor_inamori | 稻盛和夫 | UR_LEGEND | 经营之圣 |
| 5 | mentor_munger | 查理·芒格 | UR_LEGEND | 智慧合伙 |
| 6 | mentor_trump | 特朗普 | UR_LEGEND | 强交易 |
| 7 | mentor_cleopatra | 克利奥帕特拉 | UR_LEGEND | 战略联盟 |
| 8 | mentor_wuzetian | 武则天 | UR_LEGEND | 权力重构 |
| 9 | mentor_elizabeth_i | 伊丽莎白一世 | UR_LEGEND | 战略模糊 |
| 10 | mentor_catherine | 叶卡捷琳娜二世 | UR_LEGEND | 精英联盟 |
| 11 | mentor_thatcher | 撒切尔夫人 | UR_LEGEND | 铁线底牌 |
| 12 | mentor_merkel | 默克尔 | UR_LEGEND | 耐心共识 |
| 13 | mentor_cixi | 慈禧太后 | UR_LEGEND | 垂帘控局 |
| 14 | master_dawson | 罗杰·道森 | SSR_MASTER | 优势谈判 |
| 15 | master_fisher_ury | 费希尔/尤里 | SSR_MASTER | 原则谈判 |
| 16 | master_voss | 克里斯·沃斯 | SSR_MASTER | FBI 同理 |
| 17 | master_cohen | 赫布·科恩 | SSR_MASTER | 谈判三角 |
| 18 | master_diamond | 斯图尔特·戴蒙德 | SSR_MASTER | Getting More |
| 19 | master_shell | 理查德·谢尔 | SSR_MASTER | 风格适配 |
| 20 | mentor_churchill | 丘吉尔 | UR_LEGEND | 二战三巨头 |
| 21 | mentor_roosevelt | 罗斯福 | UR_LEGEND | 二战三巨头 |
| 22 | mentor_stalin | 斯大林 | UR_LEGEND | 二战三巨头 |

### 技术要求

- 场景图：1200×520px，WebP/PNG，左侧 38% 留安全区
- 肖像图：400×400px，圆形裁切，WebP/PNG
- 所有图片 lazy loading，fallback 为现有 CSS 渐变标题卡
