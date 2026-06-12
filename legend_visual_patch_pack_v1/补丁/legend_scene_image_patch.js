/* ════════════════════════════════════════════════════════════════════════════
   Legend Scene Image Patch v1.0
   传奇试炼场 22 位人物场景图 & 肖像图注入脚本
   ────────────────────────────────────────────────────────────────────────────
   接入方式：在 HTML </body> 前通过 <script src="legend_scene_image_patch.js">
   加载，或将内容合并进主 HTML 的 <script> 区块末尾。
   ════════════════════════════════════════════════════════════════════════════ */

(function LegendSceneImagePatch() {
  'use strict';

  // ── 配置 ──────────────────────────────────────────────────────────
  var BASE_PATH = 'assets/legend/';

  // ── 22 位人物图片路径映射 ──────────────────────────────────────────
  // status: 'ready' 表示图片已就位，'pending' 表示等待生成
  var SCENE_IMAGE_REGISTRY = {
    mentor_sunzi:        { scene: BASE_PATH + 'scenes/mentor_sunzi_scene.webp',        portrait: BASE_PATH + 'portraits/mentor_sunzi_portrait.webp',        status: 'pending' },
    mentor_zhangyi:      { scene: BASE_PATH + 'scenes/mentor_zhangyi_scene.webp',      portrait: BASE_PATH + 'portraits/mentor_zhangyi_portrait.webp',      status: 'pending' },
    mentor_lihongzhang:  { scene: BASE_PATH + 'scenes/mentor_lihongzhang_scene.webp',  portrait: BASE_PATH + 'portraits/mentor_lihongzhang_portrait.webp',  status: 'pending' },
    mentor_inamori:      { scene: BASE_PATH + 'scenes/mentor_inamori_scene.webp',      portrait: BASE_PATH + 'portraits/mentor_inamori_portrait.webp',      status: 'pending' },
    mentor_munger:       { scene: BASE_PATH + 'scenes/mentor_munger_scene.webp',       portrait: BASE_PATH + 'portraits/mentor_munger_portrait.webp',       status: 'pending' },
    mentor_trump:        { scene: BASE_PATH + 'scenes/mentor_trump_scene.webp',        portrait: BASE_PATH + 'portraits/mentor_trump_portrait.webp',        status: 'pending' },
    mentor_cleopatra:    { scene: BASE_PATH + 'scenes/mentor_cleopatra_scene.webp',    portrait: BASE_PATH + 'portraits/mentor_cleopatra_portrait.webp',    status: 'pending' },
    mentor_wuzetian:     { scene: BASE_PATH + 'scenes/mentor_wuzetian_scene.webp',     portrait: BASE_PATH + 'portraits/mentor_wuzetian_portrait.webp',     status: 'pending' },
    mentor_elizabeth_i:  { scene: BASE_PATH + 'scenes/mentor_elizabeth_i_scene.webp',  portrait: BASE_PATH + 'portraits/mentor_elizabeth_i_portrait.webp',  status: 'pending' },
    mentor_catherine:    { scene: BASE_PATH + 'scenes/mentor_catherine_scene.webp',    portrait: BASE_PATH + 'portraits/mentor_catherine_portrait.webp',    status: 'pending' },
    mentor_thatcher:     { scene: BASE_PATH + 'scenes/mentor_thatcher_scene.webp',     portrait: BASE_PATH + 'portraits/mentor_thatcher_portrait.webp',     status: 'pending' },
    mentor_merkel:       { scene: BASE_PATH + 'scenes/mentor_merkel_scene.webp',       portrait: BASE_PATH + 'portraits/mentor_merkel_portrait.webp',       status: 'pending' },
    mentor_cixi:         { scene: BASE_PATH + 'scenes/mentor_cixi_scene.webp',         portrait: BASE_PATH + 'portraits/mentor_cixi_portrait.webp',         status: 'pending' },
    master_dawson:       { scene: BASE_PATH + 'scenes/master_dawson_scene.webp',       portrait: BASE_PATH + 'portraits/master_dawson_portrait.webp',       status: 'pending' },
    master_fisher_ury:   { scene: BASE_PATH + 'scenes/master_fisher_ury_scene.webp',   portrait: BASE_PATH + 'portraits/master_fisher_ury_portrait.webp',   status: 'pending' },
    master_voss:         { scene: BASE_PATH + 'scenes/master_voss_scene.webp',         portrait: BASE_PATH + 'portraits/master_voss_portrait.webp',         status: 'pending' },
    master_cohen:        { scene: BASE_PATH + 'scenes/master_cohen_scene.webp',        portrait: BASE_PATH + 'portraits/master_cohen_portrait.webp',        status: 'pending' },
    master_diamond:      { scene: BASE_PATH + 'scenes/master_diamond_scene.webp',      portrait: BASE_PATH + 'portraits/master_diamond_portrait.webp',      status: 'pending' },
    master_shell:        { scene: BASE_PATH + 'scenes/master_shell_scene.webp',        portrait: BASE_PATH + 'portraits/master_shell_portrait.webp',        status: 'pending' },
    mentor_churchill:    { scene: BASE_PATH + 'scenes/mentor_churchill_scene.webp',    portrait: BASE_PATH + 'portraits/mentor_churchill_portrait.webp',    status: 'pending' },
    mentor_roosevelt:    { scene: BASE_PATH + 'scenes/mentor_roosevelt_scene.webp',    portrait: BASE_PATH + 'portraits/mentor_roosevelt_portrait.webp',    status: 'pending' },
    mentor_stalin:       { scene: BASE_PATH + 'scenes/mentor_stalin_scene.webp',       portrait: BASE_PATH + 'portraits/mentor_stalin_portrait.webp',       status: 'pending' }
  };

  // ── 图片预加载与验证 ──────────────────────────────────────────────
  function preloadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(src); };
      img.onerror = function () { reject(src); };
      img.src = src;
    });
  }

  function validateAndInject() {
    if (typeof LEGEND_SCENE_IMAGES === 'undefined') {
      console.warn('[LegendPatch] LEGEND_SCENE_IMAGES not found — patch skipped');
      return;
    }

    var injected = 0;
    var ids = Object.keys(SCENE_IMAGE_REGISTRY);

    ids.forEach(function (id) {
      var reg = SCENE_IMAGE_REGISTRY[id];
      if (reg.status !== 'ready') return;

      var target = LEGEND_SCENE_IMAGES[id];
      if (!target) return;

      if (!target.scene && reg.scene) {
        target.scene = reg.scene;
        injected++;
      }
      if (!target.portrait && reg.portrait) {
        target.portrait = reg.portrait;
        injected++;
      }
    });

    if (injected > 0) {
      console.log('[LegendPatch] Injected ' + injected + ' image paths into LEGEND_SCENE_IMAGES');
    }
  }

  // ── 场景图加载状态管理 ────────────────────────────────────────────
  function setupSceneLoadingStates() {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;

          var scenes = node.classList && node.classList.contains('legend-scene-visual')
            ? [node]
            : (node.querySelectorAll ? Array.from(node.querySelectorAll('.legend-scene-visual')) : []);

          scenes.forEach(function (el) {
            var bg = el.style.backgroundImage || '';
            if (!bg || bg === 'none') return;

            var match = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (!match) return;

            var imgUrl = match[1];
            if (imgUrl.startsWith('data:')) return;

            el.classList.add('legend-scene-loading');

            preloadImage(imgUrl).then(function () {
              el.classList.remove('legend-scene-loading');
              el.classList.add('legend-scene-loaded');
            }).catch(function () {
              el.classList.remove('legend-scene-loading');
              el.classList.add('legend-scene-error');
            });
          });
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── 批量预加载（可选，提前预热缓存） ─────────────────────────────
  function preloadReadyAssets() {
    var ids = Object.keys(SCENE_IMAGE_REGISTRY);
    var ready = ids.filter(function (id) {
      return SCENE_IMAGE_REGISTRY[id].status === 'ready';
    });

    if (ready.length === 0) return;

    var queue = [];
    ready.forEach(function (id) {
      var reg = SCENE_IMAGE_REGISTRY[id];
      if (reg.scene)    queue.push(reg.scene);
      if (reg.portrait) queue.push(reg.portrait);
    });

    var batchSize = 4;
    var i = 0;
    function loadBatch() {
      var batch = queue.slice(i, i + batchSize);
      if (batch.length === 0) return;
      Promise.all(batch.map(function (src) {
        return preloadImage(src).catch(function () { return null; });
      })).then(function () {
        i += batchSize;
        if (i < queue.length) {
          setTimeout(loadBatch, 100);
        }
      });
    }
    loadBatch();
  }

  // ── 外部 API ─────────────────────────────────────────────────────
  window.LegendSceneImagePatch = {
    registry: SCENE_IMAGE_REGISTRY,

    setBasePath: function (path) {
      BASE_PATH = path.endsWith('/') ? path : path + '/';
      var ids = Object.keys(SCENE_IMAGE_REGISTRY);
      ids.forEach(function (id) {
        var reg = SCENE_IMAGE_REGISTRY[id];
        reg.scene    = BASE_PATH + 'scenes/' + id + '_scene.webp';
        reg.portrait = BASE_PATH + 'portraits/' + id + '_portrait.webp';
      });
    },

    markReady: function (mentorId) {
      if (SCENE_IMAGE_REGISTRY[mentorId]) {
        SCENE_IMAGE_REGISTRY[mentorId].status = 'ready';
        validateAndInject();
      }
    },

    markAllReady: function () {
      Object.keys(SCENE_IMAGE_REGISTRY).forEach(function (id) {
        SCENE_IMAGE_REGISTRY[id].status = 'ready';
      });
      validateAndInject();
      preloadReadyAssets();
    },

    getStats: function () {
      var ids = Object.keys(SCENE_IMAGE_REGISTRY);
      var ready = ids.filter(function (id) { return SCENE_IMAGE_REGISTRY[id].status === 'ready'; });
      return {
        total: ids.length,
        ready: ready.length,
        pending: ids.length - ready.length,
        readyIds: ready
      };
    },

    reinject: validateAndInject
  };

  // ── 初始化 ────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      validateAndInject();
      setupSceneLoadingStates();
      preloadReadyAssets();
    });
  } else {
    validateAndInject();
    setupSceneLoadingStates();
    preloadReadyAssets();
  }

})();
