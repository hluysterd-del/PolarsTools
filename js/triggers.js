(function () {
  'use strict';

  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const statusArea = document.getElementById('status-area');
  const results = document.getElementById('results');
  const triggerList = document.getElementById('trigger-list');
  const canvas = document.getElementById('trigger-canvas');
  const ctx = canvas.getContext('2d');

  const SOURCE_NAMES = {
    0: 'HAND', 1: 'HEAD', 2: 'FEET', 3: 'BODY', 4: 'GRAB', 5: 'ANY'
  };

  const TARGET_TYPES = {
    0: 'animation', 1: 'sound', 2: 'ambience', 3: 'level_finish',
    4: 'node_visibility', 5: 'checkpoint', 6: 'teleport'
  };

  const ZONE_COLORS = [
    'rgba(108,92,231,0.4)', 'rgba(0,206,209,0.4)', 'rgba(255,107,107,0.4)',
    'rgba(46,213,115,0.4)', 'rgba(255,165,2,0.4)', 'rgba(255,71,87,0.4)',
    'rgba(30,144,255,0.4)', 'rgba(255,215,0,0.4)'
  ];

  function showStatus(msg, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = msg;
  }

  function hideStatus() {
    statusArea.style.display = 'none';
  }

  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    hideStatus();
    results.style.display = 'none';
    triggerList.innerHTML = '';

    showStatus('<span class="loading"></span> Decoding level...', '');

    try {
      const buf = await file.arrayBuffer();
      const level = await ProtoHelper.decodeLevel(buf);
      const nodes = level.nodes || [];

      // Find trigger nodes — triggers typically have a triggerZone or similar property
      const triggers = [];
      nodes.forEach((node, idx) => {
        // Check for trigger-related properties
        if (node.isTriggered || node.triggerZone || node.trigger ||
            (node.levelNodeStatic && node.levelNodeStatic.shape === 1000) ||
            (node.type != null && (node.type === 'trigger' || node.type === 1000)) ||
            (node.scripts && node.scripts.length > 0)) {
          triggers.push({ node, index: idx });
        }
      });

      // Also look for nodes with specific naming patterns in their properties
      nodes.forEach((node, idx) => {
        if (triggers.find(t => t.index === idx)) return;
        const props = node.levelNodeStatic || node.levelNodeGroup || {};
        if (props.name && /trigger/i.test(props.name)) {
          triggers.push({ node, index: idx });
        }
      });

      if (triggers.length === 0) {
        showStatus('No triggers found in this level. The level contains ' + nodes.length + ' node(s) total.', 'error');
        return;
      }

      hideStatus();
      showStatus('Found ' + triggers.length + ' trigger(s) in ' + nodes.length + ' total nodes.', 'success');
      renderTriggers(triggers, nodes);
      renderCanvas(triggers, nodes);
      results.style.display = 'block';

    } catch (err) {
      showStatus('Error decoding level: ' + err.message, 'error');
    }
  }

  function getPosition(node) {
    if (node.position) return node.position;
    if (node.levelNodeStatic && node.levelNodeStatic.position) return node.levelNodeStatic.position;
    return { x: 0, y: 0, z: 0 };
  }

  function getScale(node) {
    if (node.scale) return node.scale;
    if (node.levelNodeStatic && node.levelNodeStatic.scale) return node.levelNodeStatic.scale;
    return { x: 1, y: 1, z: 1 };
  }

  function renderTriggers(triggers, allNodes) {
    triggerList.innerHTML = '';
    triggers.forEach((t, i) => {
      const pos = getPosition(t.node);
      const scale = getScale(t.node);
      const card = document.createElement('div');
      card.className = 'trigger-card';

      const sources = [];
      if (t.node.triggerSources) {
        t.node.triggerSources.forEach(s => sources.push(SOURCE_NAMES[s] || 'UNKNOWN(' + s + ')'));
      }
      if (sources.length === 0) sources.push('ANY');

      const targets = [];
      if (t.node.triggerTargets) {
        t.node.triggerTargets.forEach(tgt => {
          const typeName = TARGET_TYPES[tgt.type] || 'unknown(' + tgt.type + ')';
          targets.push('Node #' + (tgt.nodeId || '?') + ' (' + typeName + ')');
        });
      }
      if (t.node.connectedNodes) {
        t.node.connectedNodes.forEach(id => {
          targets.push('Node #' + id);
        });
      }

      card.innerHTML =
        '<h3>Trigger #' + (i + 1) + ' (Node Index: ' + t.index + ')</h3>' +
        '<div class="detail"><strong>Position:</strong> X=' + (pos.x || 0).toFixed(2) + ', Y=' + (pos.y || 0).toFixed(2) + ', Z=' + (pos.z || 0).toFixed(2) + '</div>' +
        '<div class="detail"><strong>Scale:</strong> X=' + (scale.x || 1).toFixed(2) + ', Y=' + (scale.y || 1).toFixed(2) + ', Z=' + (scale.z || 1).toFixed(2) + '</div>' +
        '<div class="detail"><strong>Sources:</strong> ' + sources.join(', ') + '</div>' +
        '<div class="detail"><strong>Targets:</strong> ' + (targets.length ? targets.join('; ') : 'None specified') + '</div>';

      triggerList.appendChild(card);
    });
  }

  function renderCanvas(triggers, allNodes) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    if (triggers.length === 0) return;

    // Compute bounding box of all triggers
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    triggers.forEach(t => {
      const pos = getPosition(t.node);
      const scale = getScale(t.node);
      minX = Math.min(minX, (pos.x || 0) - Math.abs(scale.x || 1));
      maxX = Math.max(maxX, (pos.x || 0) + Math.abs(scale.x || 1));
      minZ = Math.min(minZ, (pos.z || 0) - Math.abs(scale.z || 1));
      maxZ = Math.max(maxZ, (pos.z || 0) + Math.abs(scale.z || 1));
    });

    const padding = 40;
    const rangeX = (maxX - minX) || 10;
    const rangeZ = (maxZ - minZ) || 10;
    const scaleX = (w - padding * 2) / rangeX;
    const scaleZ = (h - padding * 2) / rangeZ;
    const scaleFactor = Math.min(scaleX, scaleZ);

    function toCanvasX(x) { return padding + ((x || 0) - minX) * scaleFactor; }
    function toCanvasZ(z) { return padding + ((z || 0) - minZ) * scaleFactor; }

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * (w - padding * 2);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      const y = padding + (i / 10) * (h - padding * 2);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Draw trigger zones
    triggers.forEach((t, i) => {
      const pos = getPosition(t.node);
      const scale = getScale(t.node);
      const cx = toCanvasX(pos.x || 0);
      const cz = toCanvasZ(pos.z || 0);
      const sw = Math.abs(scale.x || 1) * scaleFactor * 2;
      const sh = Math.abs(scale.z || 1) * scaleFactor * 2;

      const color = ZONE_COLORS[i % ZONE_COLORS.length];
      ctx.fillStyle = color;
      ctx.fillRect(cx - sw / 2, cz - sh / 2, sw, sh);

      ctx.strokeStyle = color.replace('0.4', '0.9');
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - sw / 2, cz - sh / 2, sw, sh);

      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('T' + (i + 1), cx, cz + 4);
    });

    // Legend
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Top-down view (X/Z plane)', padding, h - 10);
  }

})();
