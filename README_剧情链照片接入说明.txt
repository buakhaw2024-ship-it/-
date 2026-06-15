# 传奇剧情链照片增强补丁包 v5.14.1

本包已完成：
1. 8 张剧情链场景图压缩为 JPG，全部 1536×1024，横版 3:2。
2. 图片已放入 assets/legend/story_chains/。
3. HTML 已新增 STORY_CHAIN_IMAGES 映射表。
4. renderStorySelect 已改为优先展示剧情链专属照片。
5. renderStoryPlay 已改为在剧情对局页顶部显示剧情链照片。

使用方式：
- 保持本 ZIP 解压后的目录结构不变。
- 打开：全谱系谈判博弈模拟系统_v5.14_剧情链照片增强版.html
- assets/legend/story_chains/ 文件夹必须和 HTML 位于同级目录下。

注意：
- 原 HTML 内部脚本仍保持原 bundler 结构，未破坏游戏评分、存档、胜负判定逻辑。
- 本次只接入剧情链照片，不修改剧情文本和结局算法。
