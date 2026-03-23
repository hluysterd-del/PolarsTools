(function () {
  'use strict';

  // --- DOM refs ---
  var uploadZone = document.getElementById('upload-zone');
  var fileInput = document.getElementById('file-input');
  var levelLink = document.getElementById('level-link');
  var fetchBtn = document.getElementById('fetch-btn');
  var statusArea = document.getElementById('status-area');
  var resultsDiv = document.getElementById('results');
  var scoreDisplay = document.getElementById('score-display');
  var nodeBars = document.getElementById('node-bars');
  var materialBars = document.getElementById('material-bars');
  var shapeBars = document.getElementById('shape-bars');
  var tipsCard = document.getElementById('tips-card');
  var tipsList = document.getElementById('tips-list');

  // --- Constants ---
  var NODE_TYPE_NAMES = {
    levelNodeStatic: 'Static',
    levelNodeStart: 'Start',
    levelNodeFinish: 'Finish',
    levelNodeSign: 'Sign',
    levelNodeGroup: 'Group',
    levelNodeGravity: 'Gravity',
    levelNodeTrigger: 'Trigger',
    levelNodeParticleEmitter: 'Particle',
    levelNodeSound: 'Sound'
  };

  var NODE_TYPE_COLORS = {
    levelNodeStatic: '#6c5ce7',
    levelNodeStart: '#2ecc71',
    levelNodeFinish: '#e74c3c',
    levelNodeSign: '#f39c12',
    levelNodeGroup: '#00cec9',
    levelNodeGravity: '#fd79a8',
    levelNodeTrigger: '#e17055',
    levelNodeParticleEmitter: '#a29bfe',
    levelNodeSound: '#74b9ff'
  };

  var MATERIAL_NAMES = {
    0: 'DEFAULT', 1: 'GRABBABLE', 2: 'ICE', 3: 'LAVA',
    4: 'WOOD', 5: 'GRAPPLABLE', 6: 'GRAPPLABLE_LAVA',
    7: 'BOUNCY', 8: 'SPEED', 9: 'GLASS', 10: 'BREAKABLE'
  };

  var MATERIAL_COLORS = {
    0: '#888', 1: '#2ecc71', 2: '#74b9ff', 3: '#e74c3c',
    4: '#c0a36e', 5: '#00cec9', 6: '#ff6b6b',
    7: '#fdcb6e', 8: '#e17055', 9: '#dfe6e9', 10: '#b2bec3'
  };

  var SHAPE_NAMES = {
    0: 'Cube', 1: 'Sphere', 2: 'Cylinder', 3: 'Pyramid',
    4: 'Prism', 5: 'Wedge', 6: 'Corner', 7: 'Pole'
  };

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

  function renderBars(container, data, colorMap) {
    container.innerHTML = '';
    var max = 0;
    var keys = Object.keys(data);
    keys.forEach(function (k) { if (data[k] > max) max = data[k]; });
    if (max === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">None found.</p>';
      return;
    }

    keys.sort(function (a, b) { return data[b] - data[a]; });

    keys.forEach(function (key) {
      var count = data[key];
      var pct = (count / max) * 100;
      var color = (colorMap && colorMap[key]) || 'var(--accent)';

      var row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML =
        '<div class="bar-label">' + key + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>' +
        '<div class="bar-count">' + count + '</div>';
      container.appendChild(row);
    });
  }

  // --- Analysis ---
  function analyzeLevel(obj) {
    var nodes = obj.levelNodes || [];
    var totalComplexity = nodes.length;

    // Node type breakdown
    var nodeTypes = {};
    var materialCounts = {};
    var shapeCounts = {};

    function processNode(node) {
      for (var key in NODE_TYPE_NAMES) {
        if (node[key]) {
          var name = NODE_TYPE_NAMES[key];
          nodeTypes[name] = (nodeTypes[name] || 0) + 1;

          var d = node[key];

          // Count materials
          if (d.material !== undefined && d.material !== null) {
            var matName = MATERIAL_NAMES[d.material] || ('UNKNOWN_' + d.material);
            materialCounts[matName] = (materialCounts[matName] || 0) + 1;
          }

          // Count shapes
          if (d.shape !== undefined && d.shape !== null) {
            var shapeName = SHAPE_NAMES[d.shape] || ('Shape_' + d.shape);
            shapeCounts[shapeName] = (shapeCounts[shapeName] || 0) + 1;
          }

          break;
        }
      }

      // Recurse into groups
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        var children = node.levelNodeGroup.childNodes;
        for (var c = 0; c < children.length; c++) {
          processNode(children[c]);
          totalComplexity++;
        }
      }
    }

    for (var i = 0; i < nodes.length; i++) {
      processNode(nodes[i]);
    }

    // Build node color map by display name
    var nodeColorMap = {};
    for (var key in NODE_TYPE_NAMES) {
      nodeColorMap[NODE_TYPE_NAMES[key]] = NODE_TYPE_COLORS[key];
    }

    // Build material color map by display name
    var matColorMap = {};
    for (var matId in MATERIAL_NAMES) {
      matColorMap[MATERIAL_NAMES[matId]] = MATERIAL_COLORS[matId];
    }

    return {
      totalComplexity: totalComplexity,
      nodeTypes: nodeTypes,
      materialCounts: materialCounts,
      shapeCounts: shapeCounts,
      nodeColorMap: nodeColorMap,
      matColorMap: matColorMap
    };
  }

  function displayResults(analysis) {
    scoreDisplay.textContent = analysis.totalComplexity;
    renderBars(nodeBars, analysis.nodeTypes, analysis.nodeColorMap);
    renderBars(materialBars, analysis.materialCounts, analysis.matColorMap);
    renderBars(shapeBars, analysis.shapeCounts, {});
    resultsDiv.style.display = '';

    // Tips
    var tips = [];
    if (analysis.totalComplexity > 3000) {
      tips.push('Very high complexity (' + analysis.totalComplexity + '). This level will likely cause significant lag for most players.');
    } else if (analysis.totalComplexity > 1500) {
      tips.push('High complexity (' + analysis.totalComplexity + '). Some players may experience lag. Consider reducing node count.');
    }
    if (analysis.nodeTypes['Trigger'] && analysis.nodeTypes['Trigger'] > 50) {
      tips.push('Large number of triggers (' + analysis.nodeTypes['Trigger'] + '). Excessive triggers can impact performance.');
    }
    if (analysis.nodeTypes['Particle'] && analysis.nodeTypes['Particle'] > 20) {
      tips.push('Many particle emitters (' + analysis.nodeTypes['Particle'] + '). Consider reducing particle effects.');
    }
    if (Object.keys(analysis.materialCounts).length > 8) {
      tips.push('Uses many different materials. Consolidating materials can slightly improve performance.');
    }
    if (analysis.totalComplexity <= 1500 && tips.length === 0) {
      tips.push('Complexity is within acceptable range. Level should run smoothly.');
      tipsCard.className = 'tips-card good';
    } else {
      tipsCard.className = 'tips-card';
    }

    if (tips.length > 0) {
      tipsCard.style.display = '';
      tipsList.innerHTML = '';
      tips.forEach(function (tip) {
        var li = document.createElement('li');
        li.textContent = tip;
        tipsList.appendChild(li);
      });
    }
  }

  // --- Load from ArrayBuffer ---
  async function loadFromBuffer(arrayBuffer) {
    var Level = await ProtoHelper.loadProto();
    var decoded = await ProtoHelper.decodeLevel(arrayBuffer);
    var obj = Level.toObject(decoded, { defaults: true, longs: Number });
    var analysis = analyzeLevel(obj);
    displayResults(analysis);
    hideStatus();
  }

  // --- File upload ---
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
    showStatus('<span class="loading"></span> Analyzing level...', '');
    try {
      var arrayBuffer = await file.arrayBuffer();
      await loadFromBuffer(arrayBuffer);
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    }
  }

  // --- Fetch from link ---
  async function handleFetch() {
    var input = levelLink.value.trim();
    if (!input) {
      showStatus('Please enter a level link or ID.', 'error');
      return;
    }

    var parsed;
    try {
      try {
        parsed = GrabAPI.parseLevelUrl(input);
      } catch (_) {
        parsed = GrabAPI.parseIdentifier(input);
      }
      if (!parsed.uid || !parsed.ts) throw new Error('Invalid format');
    } catch (err) {
      showStatus('Could not parse input. Expected a GRAB level URL or uid:timestamp.', 'error');
      return;
    }

    fetchBtn.disabled = true;
    showStatus('<span class="loading"></span> Fetching level...', '');

    try {
      var details = await GrabAPI.fetchDetails(parsed.uid, parsed.ts);
      var iteration = details.iteration || parsed.iteration || 1;
      var data = await GrabAPI.downloadLevel(parsed.uid, parsed.ts, iteration);
      await loadFromBuffer(data);
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      fetchBtn.disabled = false;
    }
  }

  fetchBtn.addEventListener('click', handleFetch);
  levelLink.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleFetch();
  });
})();
