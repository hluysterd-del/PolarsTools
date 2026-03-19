(function () {
  'use strict';

  // --- DOM refs ---
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const levelListEl = document.getElementById('level-list');
  const mergeSettings = document.getElementById('merge-settings');
  const spacingXInput = document.getElementById('spacing-x');
  const spacingZInput = document.getElementById('spacing-z');
  const mergedTitleInput = document.getElementById('merged-title');
  const mergeBtn = document.getElementById('merge-btn');
  const downloadBtn = document.getElementById('download-btn');
  const statusArea = document.getElementById('status-area');
  const resultInfo = document.getElementById('result-info');
  const resultNodes = document.getElementById('result-nodes');
  const resultComplexity = document.getElementById('result-complexity');

  // --- State ---
  let levels = []; // { file, filename, decoded, obj, title, nodeCount }
  let mergedData = null; // Uint8Array of encoded merged level

  // --- Helpers ---
  function showStatus(msg, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = msg;
  }

  function hideStatus() {
    statusArea.style.display = 'none';
    statusArea.className = 'status-area';
    statusArea.innerHTML = '';
  }

  function updateUI() {
    // Render level list
    levelListEl.innerHTML = '';
    levels.forEach(function (entry, index) {
      var item = document.createElement('div');
      item.className = 'level-item';
      item.innerHTML =
        '<div class="level-item-info">' +
          '<div class="level-item-name">' + escapeHtml(entry.filename) + '</div>' +
          '<div class="level-item-meta">' +
            'Title: ' + escapeHtml(entry.title) + ' &middot; Nodes: ' + entry.nodeCount +
          '</div>' +
        '</div>' +
        '<button class="btn-remove" data-index="' + index + '" title="Remove">&times;</button>';
      levelListEl.appendChild(item);
    });

    // Show/hide settings
    var hasLevels = levels.length >= 2;
    mergeSettings.style.display = hasLevels ? '' : 'none';
    mergeBtn.disabled = !hasLevels;

    // Reset merge result when list changes
    mergedData = null;
    downloadBtn.style.display = 'none';
    downloadBtn.disabled = true;
    resultInfo.style.display = 'none';
    hideStatus();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // --- File handling ---
  async function processFiles(fileList) {
    var newFiles = Array.from(fileList).filter(function (f) {
      return f.name.endsWith('.level');
    });

    if (newFiles.length === 0) {
      showStatus('No .level files found. Please upload files with the .level extension.', 'error');
      return;
    }

    showStatus('<span class="loading"></span> Decoding ' + newFiles.length + ' file(s)...', '');

    try {
      var Level = await ProtoHelper.loadProto();

      for (var i = 0; i < newFiles.length; i++) {
        var file = newFiles[i];
        var arrayBuffer = await file.arrayBuffer();
        var decoded = await ProtoHelper.decodeLevel(arrayBuffer);
        var obj = Level.toObject(decoded, { defaults: true });
        var title = obj.title || 'Untitled';
        var nodeCount = obj.levelNodes ? obj.levelNodes.length : 0;

        levels.push({
          file: file,
          filename: file.name,
          decoded: decoded,
          obj: obj,
          title: title,
          nodeCount: nodeCount
        });
      }

      hideStatus();
      updateUI();
    } catch (err) {
      showStatus('Error decoding file: ' + err.message, 'error');
    }
  }

  // --- Upload zone events ---
  uploadZone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      processFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  uploadZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', function () {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  });

  // --- Remove button ---
  levelListEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-remove');
    if (!btn) return;
    var index = parseInt(btn.getAttribute('data-index'), 10);
    levels.splice(index, 1);
    updateUI();
  });

  // --- Position offsetting ---
  function offsetNode(node, offsetX, offsetZ) {
    var types = [
      'levelNodeStatic', 'levelNodeStart', 'levelNodeFinish',
      'levelNodeSign', 'levelNodeGroup', 'levelNodeGravity',
      'levelNodeTrigger', 'levelNodeParticleEmitter', 'levelNodeSound'
    ];
    for (var t = 0; t < types.length; t++) {
      var type = types[t];
      if (node[type] && node[type].position) {
        node[type].position.x += offsetX;
        node[type].position.z += offsetZ;
      }
    }
    // Recurse into group child nodes
    if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
      var children = node.levelNodeGroup.childNodes;
      for (var c = 0; c < children.length; c++) {
        offsetNode(children[c], offsetX, offsetZ);
      }
    }
  }

  // --- Merge logic ---
  async function handleMerge() {
    if (levels.length < 2) {
      showStatus('Please upload at least 2 levels to merge.', 'error');
      return;
    }

    showStatus('<span class="loading"></span> Merging levels...', '');
    mergeBtn.disabled = true;

    try {
      var Level = await ProtoHelper.loadProto();

      var spacingX = parseFloat(spacingXInput.value) || 50;
      var spacingZ = parseFloat(spacingZInput.value) || 0;
      var arrangement = document.querySelector('input[name="arrangement"]:checked').value;
      var title = mergedTitleInput.value.trim() || 'Merged Level';

      // Deep-clone all level objects
      var clones = levels.map(function (entry) {
        return JSON.parse(JSON.stringify(entry.obj));
      });

      // Calculate grid dimensions for grid arrangement
      var gridCols = Math.ceil(Math.sqrt(clones.length));

      // Offset nodes for each level
      for (var i = 0; i < clones.length; i++) {
        var offsetX, offsetZ;
        if (arrangement === 'grid') {
          var col = i % gridCols;
          var row = Math.floor(i / gridCols);
          offsetX = col * spacingX;
          offsetZ = row * spacingZ;
        } else {
          // Side by side along X
          offsetX = i * spacingX;
          offsetZ = i * spacingZ;
        }

        if (offsetX !== 0 || offsetZ !== 0) {
          var nodes = clones[i].levelNodes || [];
          for (var n = 0; n < nodes.length; n++) {
            offsetNode(nodes[n], offsetX, offsetZ);
          }
        }
      }

      // Collect all nodes, handling start/finish deduplication
      var allNodes = [];

      for (var i = 0; i < clones.length; i++) {
        var nodes = clones[i].levelNodes || [];
        for (var n = 0; n < nodes.length; n++) {
          var node = nodes[n];
          var isStart = !!node.levelNodeStart;
          var isFinish = !!node.levelNodeFinish;

          // Keep start only from first level
          if (isStart && i !== 0) continue;
          // Keep finish only from last level
          if (isFinish && i !== clones.length - 1) continue;

          allNodes.push(node);
        }
      }

      // Build merged level using first level as base
      var base = clones[0];
      var merged = {
        formatVersion: base.formatVersion,
        title: title,
        creators: base.creators || '',
        description: 'Merged from ' + levels.length + ' levels',
        complexity: allNodes.length,
        levelNodes: allNodes,
        ambienceSettings: base.ambienceSettings
      };

      // Encode
      var levelMsg = Level.fromObject(merged);
      var encoded = Level.encode(levelMsg).finish();

      mergedData = encoded;

      // Show result
      resultNodes.textContent = allNodes.length;
      resultComplexity.textContent = allNodes.length;
      resultInfo.style.display = '';

      downloadBtn.style.display = '';
      downloadBtn.disabled = false;

      showStatus('Merge complete! ' + allNodes.length + ' total nodes.', 'success');
    } catch (err) {
      showStatus('Merge failed: ' + err.message, 'error');
    } finally {
      mergeBtn.disabled = levels.length < 2 ? true : false;
    }
  }

  // --- Download ---
  function handleDownload() {
    if (!mergedData) return;
    var title = mergedTitleInput.value.trim() || 'Merged Level';
    var safeName = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'merged';
    var filename = safeName + '.level';
    var blob = new Blob([mergedData], { type: 'application/octet-stream' });
    GrabAPI.triggerDownload(blob, filename);
  }

  // --- Event listeners ---
  mergeBtn.addEventListener('click', handleMerge);
  downloadBtn.addEventListener('click', handleDownload);
})();
