(function () {
  'use strict';

  // --- DOM refs ---
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const levelInput = document.getElementById('level-input');
  const fetchBtn = document.getElementById('fetch-btn');
  const statusArea = document.getElementById('status-area');
  const viewportContainer = document.getElementById('viewport-container');
  const viewportOverlay = document.getElementById('viewport-overlay');
  const statNodes = document.getElementById('stat-nodes');
  const statShapes = document.getElementById('stat-shapes');

  // --- Stats counters ---
  let totalNodes = 0;
  let totalShapes = 0;

  // --- Status helpers ---
  function showStatus(msg, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = msg;
  }
  function hideStatus() {
    statusArea.style.display = 'none';
    statusArea.innerHTML = '';
  }

  // --- Three.js setup ---
  let scene, camera, renderer, controls, levelGroup;

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 50, 30);
    dirLight.castShadow = false;
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-20, 30, -20);
    scene.add(dirLight2);

    // Grid
    const grid = new THREE.GridHelper(200, 100, 0x444466, 0x222244);
    scene.add(grid);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      viewportContainer.clientWidth / viewportContainer.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 20, 40);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(viewportContainer.clientWidth, viewportContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    viewportContainer.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.update();

    // Level group (cleared on each load)
    levelGroup = new THREE.Group();
    scene.add(levelGroup);

    // Resize handler
    window.addEventListener('resize', onResize);
    // Also observe container size changes
    if (window.ResizeObserver) {
      new ResizeObserver(onResize).observe(viewportContainer);
    }

    animate();
  }

  function onResize() {
    const w = viewportContainer.clientWidth;
    const h = viewportContainer.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // --- Shape enum mapping (from proto) ---
  const SHAPE = {
    START: 0, FINISH: 1, SIGN: 2, GRAVITY: 3,
    CUBE: 1000, SPHERE: 1001, CYLINDER: 1002,
    PYRAMID: 1003, PRISM: 1004, CONE: 1005, PYRAMIDSQUARE: 1006
  };

  // --- Material enum mapping ---
  const MATERIAL = {
    DEFAULT: 0, GRABBABLE: 1, ICE: 2, LAVA: 3,
    WOOD: 4, GRAPPLABLE: 5, GRAPPLABLE_LAVA: 6,
    GRABBABLE_CRUMBLING: 7, DEFAULT_COLORED: 8,
    BOUNCING: 9, SNOW: 10, TRIGGER: 11
  };

  // --- Material default colors ---
  const MATERIAL_COLORS = {
    0:  0x888888, // DEFAULT
    1:  0x4CAF50, // GRABBABLE
    2:  0xB3E5FC, // ICE
    3:  0xFF5722, // LAVA
    4:  0x8D6E63, // WOOD
    5:  0xFFC107, // GRAPPLABLE
    6:  0xFF8A00, // GRAPPLABLE_LAVA
    7:  0x66BB6A, // GRABBABLE_CRUMBLING
    8:  0x888888, // DEFAULT_COLORED (use color1)
    9:  0xE91E63, // BOUNCING
    10: 0xFAFAFA, // SNOW
    11: 0x00BCD4  // TRIGGER
  };

  // --- Geometry builders ---
  function createShapeGeometry(shape, sx, sy, sz) {
    sx = sx || 1; sy = sy || 1; sz = sz || 1;

    switch (shape) {
      case SHAPE.CUBE:
        return new THREE.BoxGeometry(sx, sy, sz);
      case SHAPE.SPHERE:
        return new THREE.SphereGeometry(sx / 2, 24, 16);
      case SHAPE.CYLINDER:
        return new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 24);
      case SHAPE.PYRAMID:
        return new THREE.ConeGeometry(sx / 2, sy, 4);
      case SHAPE.PYRAMIDSQUARE:
        return new THREE.ConeGeometry(sx / 2, sy, 4);
      case SHAPE.CONE:
        return new THREE.ConeGeometry(sx / 2, sy, 24);
      case SHAPE.PRISM:
        return createPrismGeometry(sx, sy, sz);
      default:
        return new THREE.BoxGeometry(sx, sy, sz);
    }
  }

  function createPrismGeometry(sx, sy, sz) {
    // Triangular prism: triangle cross-section extruded along Z
    var shape = new THREE.Shape();
    shape.moveTo(-sx / 2, -sy / 2);
    shape.lineTo(sx / 2, -sy / 2);
    shape.lineTo(0, sy / 2);
    shape.closePath();

    var extrudeSettings = {
      steps: 1,
      depth: sz,
      bevelEnabled: false
    };

    var geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center the geometry
    geom.translate(0, 0, -sz / 2);
    return geom;
  }

  // --- Color helpers ---
  function protoColorToHex(color) {
    if (!color) return null;
    var r = typeof color.r === 'number' ? color.r : 0;
    var g = typeof color.g === 'number' ? color.g : 0;
    var b = typeof color.b === 'number' ? color.b : 0;
    return new THREE.Color(r, g, b);
  }

  function getMaterialColor(materialId, color1) {
    // If colored material and color1 present, use it
    if (color1 && (color1.r !== 0 || color1.g !== 0 || color1.b !== 0)) {
      var c = protoColorToHex(color1);
      if (c) return c;
    }
    // Use material-based default
    var hex = MATERIAL_COLORS[materialId] || 0x888888;
    return new THREE.Color(hex);
  }

  // --- Apply quaternion rotation ---
  function applyRotation(mesh, quat) {
    if (!quat) return;
    var x = quat.x || 0;
    var y = quat.y || 0;
    var z = quat.z || 0;
    var w = typeof quat.w === 'number' ? quat.w : 1;
    mesh.quaternion.set(x, y, z, w);
  }

  // --- Build a static/crumbling node mesh ---
  function buildStaticMesh(nodeData) {
    var shape = nodeData.shape || SHAPE.CUBE;
    var pos = nodeData.position || {};
    var scl = nodeData.scale || {};
    var rot = nodeData.rotation;
    var mat = nodeData.material || 0;

    var sx = scl.x || 1;
    var sy = scl.y || 1;
    var sz = scl.z || 1;

    var geom = createShapeGeometry(shape, sx, sy, sz);
    var color = getMaterialColor(mat, nodeData.color1);

    var matOptions = {
      color: color,
      flatShading: true
    };

    // Neon: emissive
    if (nodeData.isNeon) {
      matOptions.emissive = color;
      matOptions.emissiveIntensity = 0.6;
    }

    // Transparent
    if (nodeData.isTransparent) {
      matOptions.transparent = true;
      matOptions.opacity = 0.5;
    }

    // Trigger material: transparent cyan
    if (mat === MATERIAL.TRIGGER) {
      matOptions.transparent = true;
      matOptions.opacity = 0.3;
      matOptions.color = new THREE.Color(0x00BCD4);
    }

    var meshMat = new THREE.MeshStandardMaterial(matOptions);
    var mesh = new THREE.Mesh(geom, meshMat);

    mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    applyRotation(mesh, rot);

    totalShapes++;
    return mesh;
  }

  // --- Build a start marker ---
  function buildStartMarker(nodeData) {
    var pos = nodeData.position || {};
    var radius = nodeData.radius || 1;
    var geom = new THREE.SphereGeometry(radius, 16, 12);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x4CAF50,
      emissive: 0x4CAF50,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7
    });
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    applyRotation(mesh, nodeData.rotation);
    totalShapes++;
    return mesh;
  }

  // --- Build a finish marker ---
  function buildFinishMarker(nodeData) {
    var pos = nodeData.position || {};
    var radius = nodeData.radius || 1;
    var geom = new THREE.SphereGeometry(radius, 16, 12);
    var mat = new THREE.MeshStandardMaterial({
      color: 0xFF1744,
      emissive: 0xFF1744,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.7
    });
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    totalShapes++;
    return mesh;
  }

  // --- Build a sign marker ---
  function buildSignMarker(nodeData) {
    var pos = nodeData.position || {};
    var scl = nodeData.scale || 1;
    var size = (typeof scl === 'number' ? scl : 1) * 0.5;
    if (size < 0.2) size = 0.5;

    var geom = new THREE.BoxGeometry(size * 2, size * 1.5, size * 0.1);
    var color = protoColorToHex(nodeData.color) || new THREE.Color(0xFFFFFF);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x3E2723,
      emissive: color,
      emissiveIntensity: 0.3
    });
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    applyRotation(mesh, nodeData.rotation);
    totalShapes++;
    return mesh;
  }

  // --- Build a trigger volume ---
  function buildTriggerMesh(nodeData) {
    var shape = nodeData.shape || SHAPE.CUBE;
    var pos = nodeData.position || {};
    var scl = nodeData.scale || {};
    var rot = nodeData.rotation;

    var sx = scl.x || 1;
    var sy = scl.y || 1;
    var sz = scl.z || 1;

    var geom = createShapeGeometry(shape, sx, sy, sz);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x00BCD4,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    applyRotation(mesh, rot);
    totalShapes++;
    return mesh;
  }

  // --- Build gravity volume ---
  function buildGravityMarker(nodeData) {
    var pos = nodeData.position || {};
    var scl = nodeData.scale || {};
    var rot = nodeData.rotation;

    var sx = scl.x || 1;
    var sy = scl.y || 1;
    var sz = scl.z || 1;

    var geom = new THREE.BoxGeometry(sx, sy, sz);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x9C27B0,
      transparent: true,
      opacity: 0.15,
      wireframe: true
    });
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    applyRotation(mesh, rot);
    totalShapes++;
    return mesh;
  }

  // --- Process a single LevelNode ---
  function processNode(node, parentGroup) {
    totalNodes++;

    if (node.levelNodeStatic) {
      parentGroup.add(buildStaticMesh(node.levelNodeStatic));
    } else if (node.levelNodeCrumbling) {
      // Treat crumbling nodes same as static
      parentGroup.add(buildStaticMesh(node.levelNodeCrumbling));
    } else if (node.levelNodeStart) {
      parentGroup.add(buildStartMarker(node.levelNodeStart));
    } else if (node.levelNodeFinish) {
      parentGroup.add(buildFinishMarker(node.levelNodeFinish));
    } else if (node.levelNodeSign) {
      parentGroup.add(buildSignMarker(node.levelNodeSign));
    } else if (node.levelNodeTrigger) {
      parentGroup.add(buildTriggerMesh(node.levelNodeTrigger));
    } else if (node.levelNodeGravity) {
      parentGroup.add(buildGravityMarker(node.levelNodeGravity));
    } else if (node.levelNodeGroup) {
      var groupData = node.levelNodeGroup;
      var group = new THREE.Group();

      var pos = groupData.position || {};
      var scl = groupData.scale || {};
      var rot = groupData.rotation;

      group.position.set(pos.x || 0, pos.y || 0, pos.z || 0);

      // Apply scale — default to 1
      group.scale.set(
        scl.x || 1,
        scl.y || 1,
        scl.z || 1
      );

      applyRotation(group, rot);

      if (groupData.childNodes && groupData.childNodes.length) {
        for (var i = 0; i < groupData.childNodes.length; i++) {
          processNode(groupData.childNodes[i], group);
        }
      }

      parentGroup.add(group);
    }
    // Other node types (sound, particle emitter, lobby terminal) are skipped (no visual)
  }

  // --- Clear previous level ---
  function clearLevel() {
    if (!levelGroup) return;
    while (levelGroup.children.length > 0) {
      var child = levelGroup.children[0];
      levelGroup.remove(child);
      disposeObject(child);
    }
    totalNodes = 0;
    totalShapes = 0;
    statNodes.textContent = '0';
    statShapes.textContent = '0';
  }

  function disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(function (m) { m.dispose(); });
      } else {
        obj.material.dispose();
      }
    }
    if (obj.children) {
      for (var i = obj.children.length - 1; i >= 0; i--) {
        disposeObject(obj.children[i]);
      }
    }
  }

  // --- Render a decoded level ---
  function renderLevel(level) {
    clearLevel();

    if (!level.levelNodes || level.levelNodes.length === 0) {
      showStatus('Level has no nodes to render.', 'error');
      return;
    }

    for (var i = 0; i < level.levelNodes.length; i++) {
      processNode(level.levelNodes[i], levelGroup);
    }

    // Update stats
    statNodes.textContent = totalNodes;
    statShapes.textContent = totalShapes;

    // Auto-center camera on the level content
    autoCenterCamera();

    viewportOverlay.classList.add('hidden');
    showStatus('Level loaded: ' + totalNodes + ' nodes, ' + totalShapes + ' shapes rendered.', 'success');
  }

  // --- Auto-center camera to fit all objects ---
  function autoCenterCamera() {
    var box = new THREE.Box3().setFromObject(levelGroup);
    if (box.isEmpty()) return;

    var center = new THREE.Vector3();
    box.getCenter(center);

    var size = new THREE.Vector3();
    box.getSize(size);

    var maxDim = Math.max(size.x, size.y, size.z);
    var fov = camera.fov * (Math.PI / 180);
    var dist = maxDim / (2 * Math.tan(fov / 2));
    dist = Math.max(dist * 1.5, 10);

    controls.target.copy(center);
    camera.position.set(center.x + dist * 0.5, center.y + dist * 0.4, center.z + dist * 0.7);
    camera.lookAt(center);
    controls.update();
  }

  // --- Load from ArrayBuffer ---
  async function loadFromBuffer(buffer) {
    try {
      showStatus('<span class="loading"></span> Decoding level...', '');
      var level = await ProtoHelper.decodeLevel(buffer);
      renderLevel(level);
    } catch (err) {
      showStatus('Failed to decode level: ' + err.message, 'error');
    }
  }

  // --- File upload handling ---
  uploadZone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length === 0) return;
    var file = fileInput.files[0];
    hideStatus();
    showStatus('<span class="loading"></span> Reading file...', '');
    var reader = new FileReader();
    reader.onload = function (e) {
      loadFromBuffer(e.target.result);
    };
    reader.onerror = function () {
      showStatus('Failed to read file.', 'error');
    };
    reader.readAsArrayBuffer(file);
  });

  // Drag & drop
  uploadZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  });
  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    var files = e.dataTransfer.files;
    if (files.length === 0) return;
    hideStatus();
    showStatus('<span class="loading"></span> Reading file...', '');
    var reader = new FileReader();
    reader.onload = function (ev) {
      loadFromBuffer(ev.target.result);
    };
    reader.onerror = function () {
      showStatus('Failed to read file.', 'error');
    };
    reader.readAsArrayBuffer(files[0]);
  });

  // --- Fetch from link/identifier ---
  function parseInput(value) {
    var trimmed = value.trim();
    if (!trimmed) throw new Error('Please enter a level link or identifier.');

    try {
      return GrabAPI.parseLevelUrl(trimmed);
    } catch (_) {
      // Fall back to raw identifier
    }

    var parsed = GrabAPI.parseIdentifier(trimmed);
    if (!parsed.uid || !parsed.ts) {
      throw new Error('Could not parse input. Expected a GRAB level URL or identifier like uid:timestamp.');
    }
    return parsed;
  }

  async function handleFetch() {
    hideStatus();
    var parsed;
    try {
      parsed = parseInput(levelInput.value);
    } catch (err) {
      showStatus(err.message, 'error');
      return;
    }

    fetchBtn.disabled = true;
    showStatus('<span class="loading"></span> Fetching level details...', '');

    try {
      var details = await GrabAPI.fetchDetails(parsed.uid, parsed.ts);
      var iteration = details.iteration || parsed.iteration || 1;

      showStatus('<span class="loading"></span> Downloading level data...', '');
      var buffer = await GrabAPI.downloadLevel(parsed.uid, parsed.ts, iteration);
      await loadFromBuffer(buffer);
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      fetchBtn.disabled = false;
    }
  }

  fetchBtn.addEventListener('click', handleFetch);
  levelInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleFetch();
  });

  // --- Init ---
  initThree();

})();
