(function () {
  'use strict';

  // --- DOM refs ---
  var uploadA = document.getElementById('upload-a');
  var uploadB = document.getElementById('upload-b');
  var fileA = document.getElementById('file-a');
  var fileB = document.getElementById('file-b');
  var statusArea = document.getElementById('status-area');
  var resultsDiv = document.getElementById('results');
  var compareBody = document.getElementById('compare-body');
  var diffAMaterials = document.getElementById('diff-a-materials');
  var diffBMaterials = document.getElementById('diff-b-materials');
  var diffAShapes = document.getElementById('diff-a-shapes');
  var diffBShapes = document.getElementById('diff-b-shapes');

  // --- State ---
  var levelA = null;
  var levelB = null;

  var MATERIAL_NAMES = {
    0: 'DEFAULT', 1: 'GRABBABLE', 2: 'ICE', 3: 'LAVA',
    4: 'WOOD', 5: 'GRAPPLABLE', 6: 'GRAPPLABLE_LAVA',
    7: 'BOUNCY', 8: 'SPEED', 9: 'GLASS', 10: 'BREAKABLE'
  };

  var SHAPE_NAMES = {
    0: 'Cube', 1: 'Sphere', 2: 'Cylinder', 3: 'Pyramid',
    4: 'Prism', 5: 'Wedge', 6: 'Corner', 7: 'Pole'
  };

  var NODE_TYPES = [
    'levelNodeStatic', 'levelNodeStart', 'levelNodeFinish',
    'levelNodeSign', 'levelNodeGroup', 'levelNodeGravity',
    'levelNodeTrigger', 'levelNodeParticleEmitter', 'levelNodeSound'
  ];

  // --- Helpers ---
  function showStatus(msg, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = msg;
  }

  function hideStatus() {
    statusArea.style.display = 'none';
    statusArea.innerHTML = '';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function collectMaterials(nodes) {
    var set = {};
    function walk(node) {
      for (var i = 0; i < NODE_TYPES.length; i++) {
        var d = node[NODE_TYPES[i]];
        if (d && d.material !== undefined && d.material !== null) {
          set[MATERIAL_NAMES[d.material] || ('UNKNOWN_' + d.material)] = true;
        }
      }
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        node.levelNodeGroup.childNodes.forEach(walk);
      }
    }
    (nodes || []).forEach(walk);
    return Object.keys(set).sort();
  }

  function collectShapes(nodes) {
    var set = {};
    function walk(node) {
      for (var i = 0; i < NODE_TYPES.length; i++) {
        var d = node[NODE_TYPES[i]];
        if (d && d.shape !== undefined && d.shape !== null) {
          set[SHAPE_NAMES[d.shape] || ('Shape_' + d.shape)] = true;
        }
      }
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        node.levelNodeGroup.childNodes.forEach(walk);
      }
    }
    (nodes || []).forEach(walk);
    return Object.keys(set).sort();
  }

  function countNodes(nodes) {
    var count = 0;
    function walk(node) {
      count++;
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        node.levelNodeGroup.childNodes.forEach(walk);
      }
    }
    (nodes || []).forEach(walk);
    return count;
  }

  // --- Upload handlers ---
  function setupUploadZone(zone, input, side) {
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      if (input.files.length > 0) loadFile(input.files[0], side);
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0], side);
    });
  }

  setupUploadZone(uploadA, fileA, 'a');
  setupUploadZone(uploadB, fileB, 'b');

  async function loadFile(file, side) {
    if (!file.name.endsWith('.level')) {
      showStatus('Please upload a .level file.', 'error');
      return;
    }

    showStatus('<span class="loading"></span> Decoding ' + file.name + '...', '');

    try {
      var Level = await ProtoHelper.loadProto();
      var arrayBuffer = await file.arrayBuffer();
      var decoded = await ProtoHelper.decodeLevel(arrayBuffer);
      var obj = Level.toObject(decoded, { defaults: true, longs: Number });

      if (side === 'a') {
        levelA = obj;
        uploadA.classList.add('loaded');
        uploadA.querySelector('p').textContent = file.name + ' loaded';
      } else {
        levelB = obj;
        uploadB.classList.add('loaded');
        uploadB.querySelector('p').textContent = file.name + ' loaded';
      }

      hideStatus();

      if (levelA && levelB) {
        compare();
      } else {
        showStatus('Upload the other level to compare.', '');
      }
    } catch (err) {
      showStatus('Error decoding: ' + err.message, 'error');
    }
  }

  // --- Comparison ---
  function compare() {
    var rows = [];

    function addRow(prop, valA, valB) {
      var same = (String(valA) === String(valB));
      rows.push({ prop: prop, a: valA, b: valB, same: same });
    }

    addRow('Title', levelA.title || 'Untitled', levelB.title || 'Untitled');
    addRow('Creators', levelA.creators || 'Unknown', levelB.creators || 'Unknown');
    addRow('Description', (levelA.description || '').substring(0, 80), (levelB.description || '').substring(0, 80));

    var countA = countNodes(levelA.levelNodes);
    var countB = countNodes(levelB.levelNodes);
    addRow('Node Count', countA, countB);

    addRow('Top-Level Nodes', (levelA.levelNodes || []).length, (levelB.levelNodes || []).length);
    addRow('Complexity', levelA.complexity || countA, levelB.complexity || countB);
    addRow('Format Version', levelA.formatVersion || 'N/A', levelB.formatVersion || 'N/A');

    var matsA = collectMaterials(levelA.levelNodes);
    var matsB = collectMaterials(levelB.levelNodes);
    addRow('Materials Used', matsA.length, matsB.length);

    var shapesA = collectShapes(levelA.levelNodes);
    var shapesB = collectShapes(levelB.levelNodes);
    addRow('Shapes Used', shapesA.length, shapesB.length);

    // Render table
    compareBody.innerHTML = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var classA = row.same ? 'diff-same' : 'diff-remove';
      var classB = row.same ? 'diff-same' : 'diff-add';
      tr.innerHTML =
        '<td>' + escapeHtml(row.prop) + '</td>' +
        '<td class="' + classA + '">' + escapeHtml(String(row.a)) + '</td>' +
        '<td class="' + classB + '">' + escapeHtml(String(row.b)) + '</td>';
      compareBody.appendChild(tr);
    });

    // Material diff
    var onlyAMats = matsA.filter(function (m) { return matsB.indexOf(m) === -1; });
    var onlyBMats = matsB.filter(function (m) { return matsA.indexOf(m) === -1; });
    renderDiffList(diffAMaterials, onlyAMats);
    renderDiffList(diffBMaterials, onlyBMats);

    // Shape diff
    var onlyAShapes = shapesA.filter(function (s) { return shapesB.indexOf(s) === -1; });
    var onlyBShapes = shapesB.filter(function (s) { return shapesA.indexOf(s) === -1; });
    renderDiffList(diffAShapes, onlyAShapes);
    renderDiffList(diffBShapes, onlyBShapes);

    resultsDiv.style.display = '';
    hideStatus();
  }

  function renderDiffList(container, items) {
    container.innerHTML = '';
    if (items.length === 0) {
      var li = document.createElement('li');
      li.textContent = 'None';
      container.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      container.appendChild(li);
    });
  }
})();
