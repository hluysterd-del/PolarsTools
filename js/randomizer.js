(function () {
  'use strict';

  // --- DOM refs ---
  var uploadZone = document.getElementById('upload-zone');
  var fileInput = document.getElementById('file-input');
  var optionsCard = document.getElementById('options-card');
  var optColors = document.getElementById('opt-colors');
  var optPositions = document.getElementById('opt-positions');
  var posRange = document.getElementById('pos-range');
  var posRangeVal = document.getElementById('pos-range-val');
  var optMaterials = document.getElementById('opt-materials');
  var optScale = document.getElementById('opt-scale');
  var scaleRange = document.getElementById('scale-range');
  var scaleRangeVal = document.getElementById('scale-range-val');
  var randomizeBtn = document.getElementById('randomize-btn');
  var downloadBtn = document.getElementById('download-btn');
  var statusArea = document.getElementById('status-area');

  // --- State ---
  var levelObj = null;
  var currentFilename = 'level.level';
  var randomizedData = null;

  // --- Material enum values (common ones in GRAB) ---
  var MATERIALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomColor() {
    return {
      r: Math.random(),
      g: Math.random(),
      b: Math.random(),
      a: 1
    };
  }

  // --- Range sliders ---
  posRange.addEventListener('input', function () {
    posRangeVal.textContent = posRange.value;
  });

  scaleRange.addEventListener('input', function () {
    scaleRangeVal.textContent = scaleRange.value + '%';
  });

  // --- File handling ---
  uploadZone.addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
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
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  async function handleFile(file) {
    if (!file.name.endsWith('.level')) {
      showStatus('Please upload a .level file.', 'error');
      return;
    }

    hideStatus();
    showStatus('<span class="loading"></span> Decoding level...', '');

    try {
      var Level = await ProtoHelper.loadProto();
      var arrayBuffer = await file.arrayBuffer();
      var decoded = await ProtoHelper.decodeLevel(arrayBuffer);
      levelObj = Level.toObject(decoded, { defaults: true, longs: Number });
      currentFilename = file.name;

      var nodeCount = levelObj.levelNodes ? levelObj.levelNodes.length : 0;
      showStatus('Loaded: ' + (levelObj.title || 'Untitled') + ' (' + nodeCount + ' nodes)', 'success');

      optionsCard.style.display = '';
      randomizeBtn.disabled = false;
      downloadBtn.style.display = 'none';
      downloadBtn.disabled = true;
      randomizedData = null;
    } catch (err) {
      showStatus('Decode error: ' + err.message, 'error');
    }
  }

  // --- Node type keys ---
  var NODE_TYPES = [
    'levelNodeStatic', 'levelNodeStart', 'levelNodeFinish',
    'levelNodeSign', 'levelNodeGroup', 'levelNodeGravity',
    'levelNodeTrigger', 'levelNodeParticleEmitter', 'levelNodeSound'
  ];

  function getNodeData(node) {
    for (var i = 0; i < NODE_TYPES.length; i++) {
      if (node[NODE_TYPES[i]]) return { key: NODE_TYPES[i], data: node[NODE_TYPES[i]] };
    }
    return null;
  }

  // --- Randomize a single node ---
  function randomizeNode(node, opts) {
    var info = getNodeData(node);
    if (!info) return;

    var d = info.data;

    // Randomize colors
    if (opts.colors && d.color) {
      d.color = randomColor();
    }
    if (opts.colors && d.color1) {
      d.color1 = randomColor();
    }
    if (opts.colors && d.color2) {
      d.color2 = randomColor();
    }

    // Randomize positions
    if (opts.positions && d.position) {
      var offset = opts.posOffset;
      d.position.x += randFloat(-offset, offset);
      d.position.y += randFloat(-offset / 2, offset / 2);
      d.position.z += randFloat(-offset, offset);
    }

    // Randomize materials
    if (opts.materials && d.material !== undefined) {
      d.material = MATERIALS[randInt(0, MATERIALS.length - 1)];
    }

    // Randomize scale
    if (opts.scale && d.scale) {
      var factor = opts.scaleFactor;
      var low = 1 / factor;
      var high = factor;
      d.scale.x *= randFloat(low, high);
      d.scale.y *= randFloat(low, high);
      d.scale.z *= randFloat(low, high);
    }

    // Recurse into groups
    if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
      var children = node.levelNodeGroup.childNodes;
      for (var c = 0; c < children.length; c++) {
        randomizeNode(children[c], opts);
      }
    }
  }

  // --- Randomize button ---
  randomizeBtn.addEventListener('click', async function () {
    if (!levelObj) return;

    var opts = {
      colors: optColors.checked,
      positions: optPositions.checked,
      posOffset: parseFloat(posRange.value) || 10,
      materials: optMaterials.checked,
      scale: optScale.checked,
      scaleFactor: (parseFloat(scaleRange.value) || 100) / 100
    };

    showStatus('<span class="loading"></span> Randomizing...', '');
    randomizeBtn.disabled = true;

    try {
      // Deep clone
      var clone = JSON.parse(JSON.stringify(levelObj));
      var nodes = clone.levelNodes || [];

      for (var i = 0; i < nodes.length; i++) {
        // Skip start/finish nodes from position randomization
        var isStart = !!nodes[i].levelNodeStart;
        var isFinish = !!nodes[i].levelNodeFinish;
        var nodeOpts = Object.assign({}, opts);
        if (isStart || isFinish) {
          nodeOpts.positions = false;
        }
        randomizeNode(nodes[i], nodeOpts);
      }

      // Encode
      var Level = await ProtoHelper.loadProto();
      var message = Level.fromObject(clone);
      randomizedData = Level.encode(message).finish();

      downloadBtn.style.display = '';
      downloadBtn.disabled = false;

      showStatus('Randomization complete! ' + nodes.length + ' nodes modified.', 'success');
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      randomizeBtn.disabled = false;
    }
  });

  // --- Download ---
  downloadBtn.addEventListener('click', function () {
    if (!randomizedData) return;
    var safeName = currentFilename.replace('.level', '') + '_randomized.level';
    var blob = new Blob([randomizedData], { type: 'application/octet-stream' });
    GrabAPI.triggerDownload(blob, safeName);
  });
})();
