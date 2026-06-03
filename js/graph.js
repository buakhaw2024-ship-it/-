(function () {
  'use strict';

  const TYPE_COLORS = {
    'Master':        '#f0c040',
    'Tactic':        '#5b9af0',
    'Strategy':      '#9b6af0',
    'Communication': '#5bc4a0',
    'Defense':       '#f0a05b',
    'Concept':       '#80e05b',
    'Scenario':      '#f05b9b',
    'Opponent':      '#e05c5c',
    'PsychProfile':  '#aab0c0',
    '_default':      '#7a85a0',
  };

  const NODE_RADIUS = {
    'Master':        24,
    'Strategy':      15,
    'Concept':       14,
    'Scenario':      15,
    'Tactic':        12,
    'Communication': 12,
    'Defense':       12,
    'Opponent':      13,
    'PsychProfile':  11,
    '_default':      12,
  };

  let allNodes = [], allEdges = [];
  let hiddenTypes = new Set();
  let selectedNode = null;
  let simulation = null;
  let svg, g, linkGroup, nodeGroup, labelGroup;
  let zoom;

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = [];
      let cur = '', inQ = false;
      for (let ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      values.push(cur.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = values[i] || '');
      return obj;
    });
  }

  async function loadCSV(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Cannot load ${path}`);
    return res.text();
  }

  async function initData() {
    try {
      const [nodeText, edgeText] = await Promise.all([
        loadCSV('data/nodes.csv'),
        loadCSV('data/edges.csv'),
      ]);
      allNodes = parseCSV(nodeText);
      allEdges = parseCSV(edgeText);
      hideLoading();
      buildGraph();
    } catch (e) {
      document.getElementById('loading').innerHTML =
        `<p style="color:#e05c5c">加载数据失败：${e.message}</p>`;
    }
  }

  function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.remove();
  }

  function buildGraph() {
    updateStats();
    buildTypeLegend();
    renderGraph();
  }

  function updateStats() {
    const visible = visibleNodes();
    document.getElementById('stat-nodes').textContent = visible.length;
    document.getElementById('stat-edges').textContent = visibleEdges(visible).length;
  }

  function visibleNodes() {
    return allNodes.filter(n => !hiddenTypes.has(n.type));
  }

  function visibleEdges(vNodes) {
    const ids = new Set(vNodes.map(n => n.id));
    return allEdges.filter(e => ids.has(e.source) && ids.has(e.target));
  }

  function buildTypeLegend() {
    const types = {};
    allNodes.forEach(n => { types[n.type] = (types[n.type] || 0) + 1; });
    const container = document.getElementById('type-filter');
    container.innerHTML = '<label>节点类型（点击筛选）</label>';
    const order = ['Master','Strategy','Tactic','Communication','Defense','Concept','Scenario','Opponent','PsychProfile'];
    const sorted = [...order.filter(t => types[t]), ...Object.keys(types).filter(t => !order.includes(t))];
    sorted.forEach(type => {
      const count = types[type];
      const color = TYPE_COLORS[type] || TYPE_COLORS['_default'];
      const item = document.createElement('div');
      item.className = 'type-item' + (hiddenTypes.has(type) ? ' hidden' : '');
      item.dataset.type = type;
      item.innerHTML = `
        <div class="type-dot" style="background:${color}"></div>
        <span class="type-label">${type}</span>
        <span class="type-count">${count}</span>`;
      item.addEventListener('click', () => toggleType(type, item));
      container.appendChild(item);
    });
  }

  function toggleType(type, el) {
    if (hiddenTypes.has(type)) {
      hiddenTypes.delete(type);
      el.classList.remove('hidden');
    } else {
      hiddenTypes.add(type);
      el.classList.add('hidden');
    }
    renderGraph();
    updateStats();
  }

  function renderGraph() {
    const width = document.getElementById('graph-area').clientWidth;
    const height = document.getElementById('graph-area').clientHeight;

    if (!svg) {
      svg = d3.select('#graph-svg');
      zoom = d3.zoom().scaleExtent([0.05, 4]).on('zoom', e => {
        g.attr('transform', e.transform);
      });
      svg.call(zoom);
      g = svg.append('g');
      svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('class', 'arrowhead').attr('d', 'M0,-4L8,0L0,4');
      linkGroup = g.append('g').attr('class', 'links');
      nodeGroup = g.append('g').attr('class', 'nodes');
      labelGroup = g.append('g').attr('class', 'link-labels');
    }

    const nodes = visibleNodes().map(n => ({ ...n }));
    const edges = visibleEdges(nodes).map(e => ({ ...e }));

    if (simulation) simulation.stop();

    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => nodeR(d) + 20));

    const link = linkGroup.selectAll('line').data(edges, e => `${e.source.id||e.source}-${e.target.id||e.target}`);
    link.exit().remove();
    const linkAll = link.enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#3d4165')
      .attr('stroke-width', d => Math.max(0.6, (parseFloat(d.weight) || 0.5) * 1.4))
      .attr('marker-end', 'url(#arrow)')
      .merge(link);

    const lbl = labelGroup.selectAll('text').data(edges, e => `${e.source.id||e.source}-${e.target.id||e.target}`);
    lbl.exit().remove();
    const lblAll = lbl.enter().append('text').attr('class', 'link-label')
      .merge(lbl).text(d => d.relation);

    const node = nodeGroup.selectAll('g.node').data(nodes, d => d.id);
    node.exit().remove();
    const nodeEnter = node.enter().append('g').attr('class', 'node')
      .call(d3.drag().on('start', dragStart).on('drag', dragged).on('end', dragEnd))
      .on('click', (event, d) => { event.stopPropagation(); selectNode(d, linkAll, lblAll, nodeAll); })
      .on('mouseenter', showTooltip).on('mousemove', moveTooltip).on('mouseleave', hideTooltip);

    nodeEnter.append('circle')
      .attr('r', d => nodeR(d))
      .attr('fill', d => nodeColor(d))
      .attr('stroke', d => d3.color(nodeColor(d)).brighter(0.5));
    nodeEnter.append('text')
      .attr('dy', d => nodeR(d) + 11)
      .text(d => d.label.length > 6 ? d.label.slice(0, 5) + '…' : d.label);

    const nodeAll = nodeEnter.merge(node);
    nodeAll.select('circle').attr('r', d => nodeR(d)).attr('fill', d => nodeColor(d))
      .attr('stroke', d => d3.color(nodeColor(d)).brighter(0.5));
    nodeAll.select('text').text(d => d.label.length > 6 ? d.label.slice(0, 5) + '…' : d.label);

    svg.on('click', () => { selectedNode = null; clearHighlight(linkAll, lblAll, nodeAll); clearNodeInfo(); });

    simulation.on('tick', () => {
      linkAll.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
             .attr('x2', d => targetX(d)).attr('y2', d => targetY(d));
      lblAll.attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
      nodeAll.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  function nodeR(d) { return NODE_RADIUS[d.type] || NODE_RADIUS['_default']; }
  function nodeColor(d) { return TYPE_COLORS[d.type] || TYPE_COLORS['_default']; }

  function targetX(d) {
    const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    return d.target.x - (dx/dist) * (nodeR(d.target) + 4);
  }
  function targetY(d) {
    const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    return d.target.y - (dy/dist) * (nodeR(d.target) + 4);
  }

  function dragStart(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }
  function dragged(event, d) { d.fx=event.x; d.fy=event.y; }
  function dragEnd(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; }

  function selectNode(d, linkSel, lblSel, nodeSel) {
    selectedNode = d;
    const connectedIds = new Set([d.id]);
    linkSel.each(e => {
      const sid = e.source.id||e.source, tid = e.target.id||e.target;
      if (sid===d.id) connectedIds.add(tid);
      if (tid===d.id) connectedIds.add(sid);
    });
    nodeSel.classed('highlighted', n => n.id===d.id).classed('dimmed', n => !connectedIds.has(n.id));
    linkSel
      .classed('highlighted', e => { const s=e.source.id||e.source,t=e.target.id||e.target; return s===d.id||t===d.id; })
      .classed('dimmed', e => { const s=e.source.id||e.source,t=e.target.id||e.target; return s!==d.id&&t!==d.id; })
      .attr('stroke', e => { const s=e.source.id||e.source,t=e.target.id||e.target; return (s===d.id||t===d.id)?'#5b6af0':'#3d4165'; });
    lblSel.classed('dimmed', e => { const s=e.source.id||e.source,t=e.target.id||e.target; return s!==d.id&&t!==d.id; });
    showNodeInfo(d, connectedIds);
  }

  function clearHighlight(linkSel, lblSel, nodeSel) {
    nodeSel.classed('highlighted dimmed', false);
    linkSel.classed('highlighted dimmed', false).attr('stroke', '#3d4165');
    lblSel.classed('dimmed', false);
  }

  function showNodeInfo(d, connectedIds) {
    const color = nodeColor(d);
    const neighbors = allNodes.filter(n => connectedIds.has(n.id) && n.id !== d.id);
    const chips = neighbors.map(n => `<span style="border-color:${nodeColor(n)}55">${n.label}</span>`).join('');
    const eng = d.english_name ? `<div class="nd-eng">${d.english_name}</div>` : '';
    const book = d.source_book ? `<div class="nd-meta">📖 ${d.source_book}</div>` : '';
    const tags = d.tags ? `<div class="nd-meta">🏷 ${d.tags.replace(/\//g, ' · ')}</div>` : '';
    const diff = d.difficulty ? `<div class="nd-meta">难度：${d.difficulty}</div>` : '';
    document.getElementById('node-info').innerHTML = `
      <h3>节点详情</h3>
      <div id="node-detail-name" style="color:${color}">${d.label}</div>
      <div id="node-detail-type">${d.type}</div>
      ${eng}${book}${tags}${diff}
      <div id="node-detail-desc">${d.description || '暂无描述'}</div>
      <div class="conn-list">${chips || '<span style="color:#555">无连接</span>'}</div>`;
  }

  function clearNodeInfo() {
    document.getElementById('node-info').innerHTML =
      '<h3>节点详情</h3><p style="font-size:12px;color:#555;margin-top:8px">点击节点查看详情</p>';
  }

  function showTooltip(event, d) {
    const tt = document.getElementById('tooltip');
    tt.style.display = 'block';
    tt.innerHTML = `<strong>${d.label}</strong><span class="tt-type">${d.type}${d.difficulty ? ' · ' + d.difficulty : ''}</span>`;
    moveTooltip(event);
  }
  function moveTooltip(event) {
    const tt = document.getElementById('tooltip');
    const area = document.getElementById('graph-area').getBoundingClientRect();
    let x = event.clientX - area.left + 14, y = event.clientY - area.top - 28;
    if (x + 200 > area.width) x = event.clientX - area.left - 200;
    tt.style.left = x + 'px'; tt.style.top = y + 'px';
  }
  function hideTooltip() { document.getElementById('tooltip').style.display = 'none'; }

  function setupSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        nodeGroup.selectAll('g.node').classed('highlighted dimmed', false);
        linkGroup.selectAll('line').classed('dimmed', false).attr('stroke', '#3d4165');
        labelGroup.selectAll('text').classed('dimmed', false);
        clearNodeInfo(); return;
      }
      const match = allNodes.find(n =>
        n.label.toLowerCase().includes(q) ||
        (n.english_name && n.english_name.toLowerCase().includes(q)) ||
        (n.tags && n.tags.toLowerCase().includes(q))
      );
      if (match) {
        const nodeEl = nodeGroup.selectAll('g.node').filter(d => d.id === match.id);
        if (!nodeEl.empty()) {
          const datum = nodeEl.datum();
          const w = document.getElementById('graph-area').clientWidth;
          const h = document.getElementById('graph-area').clientHeight;
          svg.transition().duration(600).call(
            zoom.transform, d3.zoomIdentity.translate(w/2 - datum.x, h/2 - datum.y).scale(1.2)
          );
          selectNode(datum, linkGroup.selectAll('line'), labelGroup.selectAll('text'), nodeGroup.selectAll('g.node'));
        }
      }
    });
  }

  function setupUpload() {
    document.getElementById('upload-nodes').addEventListener('click', () => document.getElementById('file-input-nodes').click());
    document.getElementById('upload-edges').addEventListener('click', () => document.getElementById('file-input-edges').click());
    document.getElementById('file-input-nodes').addEventListener('change', e => {
      readFile(e.target.files[0], text => { allNodes = parseCSV(text); buildGraph(); });
    });
    document.getElementById('file-input-edges').addEventListener('change', e => {
      readFile(e.target.files[0], text => { allEdges = parseCSV(text); buildGraph(); });
    });
  }

  function readFile(file, cb) {
    const reader = new FileReader();
    reader.onload = e => cb(e.target.result);
    reader.readAsText(file, 'utf-8');
  }

  function setupZoomControls() {
    document.getElementById('zoom-in').addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1.4));
    document.getElementById('zoom-out').addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 0.7));
    document.getElementById('zoom-fit').addEventListener('click', fitView);
  }

  function fitView() {
    const w = document.getElementById('graph-area').clientWidth;
    const h = document.getElementById('graph-area').clientHeight;
    const bounds = g.node().getBBox();
    if (!bounds.width) return;
    const scale = 0.85 * Math.min(w / bounds.width, h / bounds.height);
    const tx = (w - scale * (bounds.x * 2 + bounds.width)) / 2;
    const ty = (h - scale * (bounds.y * 2 + bounds.height)) / 2;
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function setupLayoutControls() {
    document.getElementById('btn-restart').addEventListener('click', () => { if (simulation) simulation.alpha(0.8).restart(); });
    document.getElementById('btn-fit').addEventListener('click', fitView);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupUpload();
    setupZoomControls();
    setupLayoutControls();
    clearNodeInfo();
    initData();
  });

})();
