# ClaudeCode 直接执行提示词

## 一键接入指令

> **如果使用 v5.13**：补丁已原生集成，只需将图片放入 `assets/legend/` 目录，然后在浏览器控制台执行 `LegendSceneImagePatch.markAllReady()` 即可。以下指令适用于 v5.12 手动接入。

将以下内容作为 ClaudeCode 提示词，即可自动完成补丁包接入（v5.12）：

---

### 提示词

```
请执行以下操作，将 legend_visual_patch_pack_v1 补丁包接入全谱系谈判博弈模拟系统 v5.12 HTML 文件：

1. **读取补丁文件**
   - 读取 `legend_visual_patch_pack_v1/补丁/legend_scene_image_patch.css`
   - 读取 `legend_visual_patch_pack_v1/补丁/legend_scene_image_patch.js`
   - 读取 `legend_visual_patch_pack_v1/补丁/legend_scene_image_manifest.json`

2. **CSS 注入**
   在 HTML 文件的 `</style>` 标签之前（主样式块末尾），插入 legend_scene_image_patch.css 的全部内容。
   用注释标记起止位置：
   ```
   /* ── Legend Scene Image Patch v1.0 START ── */
   ...补丁 CSS...
   /* ── Legend Scene Image Patch v1.0 END ── */
   ```

3. **JS 注入**
   在 HTML 文件的 `</script>` 之前（主脚本块末尾），插入 legend_scene_image_patch.js 中 IIFE 内的全部代码。
   用注释标记起止位置：
   ```
   /* ── Legend Scene Image Patch v1.0 START ── */
   ...补丁 JS...
   /* ── Legend Scene Image Patch v1.0 END ── */
   ```

4. **创建资产目录**
   ```
   mkdir -p assets/legend/scenes
   mkdir -p assets/legend/portraits
   ```

5. **验证接入**
   - 确认 LEGEND_SCENE_IMAGES 的 22 个条目都存在
   - 确认 LegendSceneImagePatch 全局对象已注册
   - 确认 CSS 加载状态动画已注入
   - 在浏览器控制台执行 `LegendSceneImagePatch.getStats()` 应返回 `{total: 22, ready: 0, pending: 22}`

6. **后续图片接入**
   当场景图生成完毕后，将图片放入对应目录，然后：
   - 在控制台执行 `LegendSceneImagePatch.markAllReady()` 激活全部
   - 或逐个激活：`LegendSceneImagePatch.markReady('mentor_sunzi')`
```

---

### 单文件模式（内联接入）

如果项目使用单 HTML 文件模式，不引用外部 JS/CSS 文件：

```
请将 legend_scene_image_patch.css 的内容直接插入 HTML <style> 标签内的末尾。
请将 legend_scene_image_patch.js 的 IIFE 内容直接插入 HTML <script> 标签内的末尾。
不需要创建外部文件引用。
```

---

### 图片生成工作流

```
请根据 LEGEND_IMAGE_PROMPTS 中的 scenePrompt 和 portraitPrompt，
配合 LEGEND_NEGATIVE_PROMPT，为以下人物生成场景图和肖像图：

人物列表：[指定人物 ID 或 "全部 22 位"]

图片规格：
- 场景图：1200×520px，WebP 格式
- 肖像图：400×400px，WebP 格式

生成完毕后，将图片放入 assets/legend/ 对应子目录，
并执行 LegendSceneImagePatch.markAllReady() 激活。
```
