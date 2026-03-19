(function () {
  'use strict';

  // --- DOM refs ---
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const levelLink = document.getElementById('level-link');
  const fetchBtn = document.getElementById('fetch-btn');
  const convertBtn = document.getElementById('convert-btn');
  const downloadBtn = document.getElementById('download-btn');
  const statusArea = document.getElementById('status-area');
  const previewInfo = document.getElementById('preview-info');
  const fileLoadedBadge = document.getElementById('file-loaded-badge');
  const loadedFileName = document.getElementById('loaded-file-name');
  const clearFileBtn = document.getElementById('clear-file-btn');

  const infoInputFormat = document.getElementById('info-input-format');
  const infoOutputFormat = document.getElementById('info-output-format');
  const infoNodeCount = document.getElementById('info-node-count');
  const infoFileSize = document.getElementById('info-file-size');

  const formatOptions = document.querySelectorAll('.format-option');
  const formatRadios = document.querySelectorAll('input[name="output-format"]');

  // --- State ---
  let inputData = null;       // ArrayBuffer or string (JSON)
  let inputFormat = null;     // 'level' or 'json'
  let inputFilename = '';
  let convertedBlob = null;
  let convertedFilename = '';

  // --- Enum maps for display ---
  const SHAPE_NAMES = {
    0: 'START', 1: 'FINISH', 2: 'SIGN', 3: 'GRAVITY', 4: 'LOBBYTERMINAL',
    5: 'PARTICLE_EMITTER', 6: 'SOUND', 7: '__END_OF_SPECIAL_PARTS__',
    1000: 'CUBE', 1001: 'SPHERE', 1002: 'CYLINDER', 1003: 'PYRAMID',
    1004: 'PRISM', 1005: 'CONE', 1006: 'PYRAMIDSQUARE'
  };

  const MATERIAL_NAMES = {
    0: 'DEFAULT', 1: 'GRABBABLE', 2: 'ICE', 3: 'LAVA', 4: 'WOOD',
    5: 'GRAPPLABLE', 6: 'GRAPPLABLE_LAVA', 7: 'GRABBABLE_CRUMBLING',
    8: 'DEFAULT_COLORED', 9: 'BOUNCING', 10: 'SNOW', 11: 'TRIGGER'
  };

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

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getSelectedFormat() {
    const checked = document.querySelector('input[name="output-format"]:checked');
    return checked ? checked.value : 'level';
  }

  function countNodes(levelObj) {
    let count = 0;
    if (!levelObj.levelNodes) return 0;
    for (const node of levelObj.levelNodes) {
      count++;
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        count += countNodesRecursive(node.levelNodeGroup.childNodes);
      }
    }
    return count;
  }

  function countNodesRecursive(nodes) {
    let count = 0;
    for (const node of nodes) {
      count++;
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        count += countNodesRecursive(node.levelNodeGroup.childNodes);
      }
    }
    return count;
  }

  function setFileLoaded(name) {
    loadedFileName.textContent = name;
    fileLoadedBadge.style.display = 'flex';
    convertBtn.disabled = false;
  }

  function clearFile() {
    inputData = null;
    inputFormat = null;
    inputFilename = '';
    convertedBlob = null;
    convertedFilename = '';
    fileLoadedBadge.style.display = 'none';
    convertBtn.disabled = true;
    downloadBtn.disabled = true;
    downloadBtn.style.display = 'none';
    previewInfo.style.display = 'none';
    hideStatus();
    fileInput.value = '';
  }

  // --- Format option selection highlighting ---
  formatOptions.forEach(function (opt) {
    opt.addEventListener('click', function () {
      formatOptions.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
    });
  });

  // --- Upload zone ---
  uploadZone.addEventListener('click', function () {
    fileInput.click();
  });

  uploadZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', function () {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file) {
    hideStatus();
    convertedBlob = null;
    downloadBtn.disabled = true;
    downloadBtn.style.display = 'none';
    previewInfo.style.display = 'none';

    const name = file.name.toLowerCase();
    if (name.endsWith('.level')) {
      inputFormat = 'level';
      inputFilename = file.name;
      file.arrayBuffer().then(function (buf) {
        inputData = buf;
        setFileLoaded(file.name);
        showStatus('Loaded .level file (' + formatBytes(buf.byteLength) + ')', 'success');
      }).catch(function (err) {
        showStatus('Error reading file: ' + err.message, 'error');
      });
    } else if (name.endsWith('.json')) {
      inputFormat = 'json';
      inputFilename = file.name;
      file.text().then(function (text) {
        inputData = text;
        setFileLoaded(file.name);
        showStatus('Loaded .json file (' + formatBytes(text.length) + ')', 'success');
      }).catch(function (err) {
        showStatus('Error reading file: ' + err.message, 'error');
      });
    } else {
      showStatus('Unsupported file type. Please upload a .level or .json file.', 'error');
    }
  }

  // --- Fetch from link ---
  fetchBtn.addEventListener('click', function () {
    const raw = levelLink.value.trim();
    if (!raw) {
      showStatus('Please enter a level link or ID.', 'error');
      return;
    }

    hideStatus();
    clearFile();
    showStatus('<span class="loading"></span> Fetching level...', '');

    fetchLevelFromLink(raw).then(function (buf) {
      inputData = buf;
      inputFormat = 'level';
      inputFilename = 'fetched_level.level';
      setFileLoaded('Fetched level (' + formatBytes(buf.byteLength) + ')');
      showStatus('Level fetched successfully (' + formatBytes(buf.byteLength) + ')', 'success');
    }).catch(function (err) {
      showStatus('Error fetching level: ' + err.message, 'error');
    });
  });

  async function fetchLevelFromLink(raw) {
    let uid, ts, iteration;

    if (raw.includes('grabvr.quest') || raw.includes('http')) {
      const parsed = GrabAPI.parseLevelUrl(raw);
      uid = parsed.uid;
      ts = parsed.ts;
    } else {
      const parsed = GrabAPI.parseIdentifier(raw);
      uid = parsed.uid;
      ts = parsed.ts;
      iteration = parsed.iteration;
    }

    // Get details to find iteration if not provided
    if (!iteration) {
      const details = await GrabAPI.fetchDetails(uid, ts);
      iteration = details.iteration || 0;
    }

    return GrabAPI.downloadLevel(uid, ts, iteration);
  }

  // --- Clear file ---
  clearFileBtn.addEventListener('click', clearFile);

  // --- Convert ---
  convertBtn.addEventListener('click', async function () {
    if (!inputData) {
      showStatus('No file loaded. Upload a file or fetch from a link.', 'error');
      return;
    }

    const outputFormat = getSelectedFormat();
    hideStatus();
    showStatus('<span class="loading"></span> Converting...', '');

    try {
      if (inputFormat === 'level') {
        await convertFromLevel(outputFormat);
      } else if (inputFormat === 'json') {
        await convertFromJson(outputFormat);
      } else {
        showStatus('Unknown input format.', 'error');
      }
    } catch (err) {
      showStatus('Conversion error: ' + err.message, 'error');
      console.error(err);
    }
  });

  // --- Convert from .level ---
  async function convertFromLevel(outputFormat) {
    const Level = await ProtoHelper.loadProto();
    const decoded = await ProtoHelper.decodeLevel(inputData);
    const obj = Level.toObject(decoded, { defaults: true, longs: Number });
    const nodeCount = countNodes(obj);
    const baseName = inputFilename.replace(/\.[^.]+$/, '') || 'level';

    let blob, filename;

    switch (outputFormat) {
      case 'level':
        // Re-encode (useful if fetched from link)
        blob = new Blob([new Uint8Array(inputData)], { type: 'application/octet-stream' });
        filename = baseName + '.level';
        break;

      case 'json':
        var jsonStr = JSON.stringify(obj, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
        filename = baseName + '.json';
        break;

      case 'obj':
        var objStr = generateOBJ(obj, baseName);
        blob = new Blob([objStr], { type: 'text/plain' });
        filename = baseName + '.obj';
        break;

      case 'csv':
        var csvStr = generateCSV(obj);
        blob = new Blob([csvStr], { type: 'text/csv' });
        filename = baseName + '.csv';
        break;

      default:
        throw new Error('Unknown output format: ' + outputFormat);
    }

    convertedBlob = blob;
    convertedFilename = filename;
    downloadBtn.disabled = false;
    downloadBtn.style.display = 'inline-flex';

    // Show preview info
    infoInputFormat.textContent = '.level (Protobuf)';
    infoOutputFormat.textContent = getFormatLabel(outputFormat);
    infoNodeCount.textContent = nodeCount;
    infoFileSize.textContent = formatBytes(blob.size);
    previewInfo.style.display = 'block';

    showStatus('Conversion complete! Click Download to save.', 'success');
  }

  // --- Convert from .json ---
  async function convertFromJson(outputFormat) {
    var obj;
    try {
      obj = JSON.parse(inputData);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }

    const Level = await ProtoHelper.loadProto();
    const nodeCount = countNodes(obj);
    const baseName = inputFilename.replace(/\.[^.]+$/, '') || 'level';

    let blob, filename;

    switch (outputFormat) {
      case 'level':
        var message = Level.fromObject(obj);
        var encoded = Level.encode(message).finish();
        blob = new Blob([encoded], { type: 'application/octet-stream' });
        filename = baseName + '.level';
        break;

      case 'json':
        var jsonStr = JSON.stringify(obj, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
        filename = baseName + '.json';
        break;

      case 'obj':
        var objStr = generateOBJ(obj, baseName);
        blob = new Blob([objStr], { type: 'text/plain' });
        filename = baseName + '.obj';
        break;

      case 'csv':
        var csvStr = generateCSV(obj);
        blob = new Blob([csvStr], { type: 'text/csv' });
        filename = baseName + '.csv';
        break;

      default:
        throw new Error('Unknown output format: ' + outputFormat);
    }

    convertedBlob = blob;
    convertedFilename = filename;
    downloadBtn.disabled = false;
    downloadBtn.style.display = 'inline-flex';

    infoInputFormat.textContent = '.json (JSON)';
    infoOutputFormat.textContent = getFormatLabel(outputFormat);
    infoNodeCount.textContent = nodeCount;
    infoFileSize.textContent = formatBytes(blob.size);
    previewInfo.style.display = 'block';

    showStatus('Conversion complete! Click Download to save.', 'success');
  }

  function getFormatLabel(fmt) {
    switch (fmt) {
      case 'level': return '.level (Protobuf)';
      case 'json': return '.json (JSON)';
      case 'obj': return '.obj (Wavefront OBJ)';
      case 'csv': return '.csv (Spreadsheet)';
      default: return fmt;
    }
  }

  // --- Download ---
  downloadBtn.addEventListener('click', function () {
    if (convertedBlob && convertedFilename) {
      GrabAPI.triggerDownload(convertedBlob, convertedFilename);
    }
  });

  // =====================================================================
  // OBJ Generation
  // =====================================================================

  function generateOBJ(levelObj, title) {
    var lines = [];
    lines.push('# Wavefront OBJ exported by PolarsTools Converter');
    lines.push('# Level: ' + (levelObj.title || title || 'Untitled'));
    lines.push('# Creators: ' + (levelObj.creators || 'Unknown'));
    lines.push('');

    var vertexOffset = 0;
    var normalOffset = 0;
    var nodeIndex = 0;

    if (!levelObj.levelNodes) {
      lines.push('# No nodes found in level');
      return lines.join('\n');
    }

    for (var i = 0; i < levelObj.levelNodes.length; i++) {
      var node = levelObj.levelNodes[i];
      var result = processNodeForOBJ(node, nodeIndex, vertexOffset, normalOffset);
      if (result) {
        lines.push(result.text);
        vertexOffset += result.vertexCount;
        normalOffset += result.normalCount;
      }
      nodeIndex++;

      // Process group children
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        var children = flattenGroup(node.levelNodeGroup.childNodes, node.levelNodeGroup);
        for (var c = 0; c < children.length; c++) {
          var childResult = processNodeForOBJ(children[c], nodeIndex, vertexOffset, normalOffset);
          if (childResult) {
            lines.push(childResult.text);
            vertexOffset += childResult.vertexCount;
            normalOffset += childResult.normalCount;
          }
          nodeIndex++;
        }
      }
    }

    return lines.join('\n');
  }

  function flattenGroup(childNodes, parentGroup) {
    var result = [];
    for (var i = 0; i < childNodes.length; i++) {
      var child = childNodes[i];
      result.push(child);
      if (child.levelNodeGroup && child.levelNodeGroup.childNodes) {
        var nested = flattenGroup(child.levelNodeGroup.childNodes, child.levelNodeGroup);
        result = result.concat(nested);
      }
    }
    return result;
  }

  function processNodeForOBJ(node, index, vertexOffset, normalOffset) {
    var staticNode = node.levelNodeStatic;
    var crumbling = node.levelNodeCrumbling;
    var source = staticNode || crumbling;

    if (!source) return null;

    var shape = source.shape || 0;
    var pos = source.position || { x: 0, y: 0, z: 0 };
    var scale = source.scale || { x: 1, y: 1, z: 1 };
    var rot = source.rotation || { x: 0, y: 0, z: 0, w: 1 };

    var shapeName = SHAPE_NAMES[shape] || 'CUBE';
    var materialName = MATERIAL_NAMES[source.material || 0] || 'DEFAULT';

    var geometry;
    switch (shape) {
      case 1001: // SPHERE
        geometry = generateSphereGeometry();
        break;
      case 1002: // CYLINDER
        geometry = generateCylinderGeometry();
        break;
      default: // CUBE and all others
        geometry = generateCubeGeometry();
        break;
    }

    // Apply transforms to vertices
    var transformedVerts = [];
    for (var v = 0; v < geometry.vertices.length; v++) {
      var vert = geometry.vertices[v];
      // Scale
      var sx = vert[0] * scale.x;
      var sy = vert[1] * scale.y;
      var sz = vert[2] * scale.z;
      // Rotate by quaternion
      var rotated = rotateByQuaternion(sx, sy, sz, rot);
      // Translate
      transformedVerts.push([
        rotated[0] + pos.x,
        rotated[1] + pos.y,
        rotated[2] + pos.z
      ]);
    }

    // Transform normals (rotate only)
    var transformedNormals = [];
    for (var n = 0; n < geometry.normals.length; n++) {
      var norm = geometry.normals[n];
      var rotNorm = rotateByQuaternion(norm[0], norm[1], norm[2], rot);
      var len = Math.sqrt(rotNorm[0] * rotNorm[0] + rotNorm[1] * rotNorm[1] + rotNorm[2] * rotNorm[2]);
      if (len > 0) {
        transformedNormals.push([rotNorm[0] / len, rotNorm[1] / len, rotNorm[2] / len]);
      } else {
        transformedNormals.push([0, 1, 0]);
      }
    }

    var text = [];
    text.push('g node_' + index);
    text.push('# Shape: ' + shapeName + ', Material: ' + materialName);

    // Vertices
    for (var vi = 0; vi < transformedVerts.length; vi++) {
      var tv = transformedVerts[vi];
      text.push('v ' + tv[0].toFixed(6) + ' ' + tv[1].toFixed(6) + ' ' + tv[2].toFixed(6));
    }

    // Normals
    for (var ni = 0; ni < transformedNormals.length; ni++) {
      var tn = transformedNormals[ni];
      text.push('vn ' + tn[0].toFixed(6) + ' ' + tn[1].toFixed(6) + ' ' + tn[2].toFixed(6));
    }

    // Faces (with offset)
    for (var fi = 0; fi < geometry.faces.length; fi++) {
      var face = geometry.faces[fi];
      var faceStr = 'f';
      for (var fv = 0; fv < face.length; fv++) {
        var vi2 = face[fv][0] + vertexOffset + 1; // OBJ is 1-indexed
        var ni2 = face[fv][1] + normalOffset + 1;
        faceStr += ' ' + vi2 + '//' + ni2;
      }
      text.push(faceStr);
    }

    text.push('');

    return {
      text: text.join('\n'),
      vertexCount: transformedVerts.length,
      normalCount: transformedNormals.length
    };
  }

  function rotateByQuaternion(x, y, z, q) {
    var qx = q.x || 0, qy = q.y || 0, qz = q.z || 0, qw = q.w || 1;
    // v' = q * v * q^-1
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;

    return [
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    ];
  }

  function generateCubeGeometry() {
    var verts = [
      [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
      [-0.5, -0.5,  0.5], [0.5, -0.5,  0.5], [0.5, 0.5,  0.5], [-0.5, 0.5,  0.5]
    ];

    var normals = [
      [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]
    ];

    // Faces: each face is an array of [vertexIndex, normalIndex]
    var faces = [
      // Front (-Z)
      [[0, 0], [1, 0], [2, 0], [3, 0]],
      // Back (+Z)
      [[5, 1], [4, 1], [7, 1], [6, 1]],
      // Top (+Y)
      [[3, 2], [2, 2], [6, 2], [7, 2]],
      // Bottom (-Y)
      [[4, 3], [5, 3], [1, 3], [0, 3]],
      // Right (+X)
      [[1, 4], [5, 4], [6, 4], [2, 4]],
      // Left (-X)
      [[4, 5], [0, 5], [3, 5], [7, 5]]
    ];

    return { vertices: verts, normals: normals, faces: faces };
  }

  function generateSphereGeometry() {
    var segments = 16;
    var rings = 12;
    var verts = [];
    var normals = [];
    var faces = [];

    // Generate vertices
    for (var r = 0; r <= rings; r++) {
      var phi = Math.PI * r / rings;
      for (var s = 0; s <= segments; s++) {
        var theta = 2 * Math.PI * s / segments;
        var x = Math.sin(phi) * Math.cos(theta) * 0.5;
        var y = Math.cos(phi) * 0.5;
        var z = Math.sin(phi) * Math.sin(theta) * 0.5;
        verts.push([x, y, z]);
        // Normal is same direction as position for unit sphere
        var nx = Math.sin(phi) * Math.cos(theta);
        var ny = Math.cos(phi);
        var nz = Math.sin(phi) * Math.sin(theta);
        normals.push([nx, ny, nz]);
      }
    }

    // Generate faces
    for (var r2 = 0; r2 < rings; r2++) {
      for (var s2 = 0; s2 < segments; s2++) {
        var a = r2 * (segments + 1) + s2;
        var b = a + 1;
        var c = a + (segments + 1);
        var d = c + 1;

        if (r2 !== 0) {
          faces.push([[a, a], [c, c], [b, b]]);
        }
        if (r2 !== rings - 1) {
          faces.push([[b, b], [c, c], [d, d]]);
        }
      }
    }

    return { vertices: verts, normals: normals, faces: faces };
  }

  function generateCylinderGeometry() {
    var segments = 16;
    var verts = [];
    var normals = [];
    var faces = [];

    // Top center (index 0)
    verts.push([0, 0.5, 0]);
    normals.push([0, 1, 0]);

    // Bottom center (index 1)
    verts.push([0, -0.5, 0]);
    normals.push([0, -1, 0]);

    // Top ring vertices (index 2 to segments+1)
    for (var i = 0; i < segments; i++) {
      var theta = 2 * Math.PI * i / segments;
      var x = Math.cos(theta) * 0.5;
      var z = Math.sin(theta) * 0.5;
      verts.push([x, 0.5, z]);
      normals.push([0, 1, 0]);
    }

    // Bottom ring vertices (index segments+2 to 2*segments+1)
    for (var j = 0; j < segments; j++) {
      var theta2 = 2 * Math.PI * j / segments;
      var x2 = Math.cos(theta2) * 0.5;
      var z2 = Math.sin(theta2) * 0.5;
      verts.push([x2, -0.5, z2]);
      normals.push([0, -1, 0]);
    }

    // Side vertices with side normals (index 2*segments+2 to 4*segments+1)
    // Top side ring
    for (var k = 0; k < segments; k++) {
      var theta3 = 2 * Math.PI * k / segments;
      var nx = Math.cos(theta3);
      var nz = Math.sin(theta3);
      verts.push([nx * 0.5, 0.5, nz * 0.5]);
      normals.push([nx, 0, nz]);
    }
    // Bottom side ring
    for (var m = 0; m < segments; m++) {
      var theta4 = 2 * Math.PI * m / segments;
      var nx2 = Math.cos(theta4);
      var nz2 = Math.sin(theta4);
      verts.push([nx2 * 0.5, -0.5, nz2 * 0.5]);
      normals.push([nx2, 0, nz2]);
    }

    var topStart = 2;
    var bottomStart = segments + 2;
    var sideTopStart = 2 * segments + 2;
    var sideBottomStart = 3 * segments + 2;

    // Top fan
    for (var t = 0; t < segments; t++) {
      var next = (t + 1) % segments;
      faces.push([[0, 0], [topStart + next, topStart + next], [topStart + t, topStart + t]]);
    }

    // Bottom fan
    for (var b = 0; b < segments; b++) {
      var nextB = (b + 1) % segments;
      faces.push([[1, 1], [bottomStart + b, bottomStart + b], [bottomStart + nextB, bottomStart + nextB]]);
    }

    // Side quads (as two triangles)
    for (var s = 0; s < segments; s++) {
      var nextS = (s + 1) % segments;
      var st = sideTopStart + s;
      var stNext = sideTopStart + nextS;
      var sb = sideBottomStart + s;
      var sbNext = sideBottomStart + nextS;

      faces.push([[st, st], [stNext, stNext], [sbNext, sbNext]]);
      faces.push([[st, st], [sbNext, sbNext], [sb, sb]]);
    }

    return { vertices: verts, normals: normals, faces: faces };
  }

  // =====================================================================
  // CSV Generation
  // =====================================================================

  function generateCSV(levelObj) {
    var headers = [
      'Index', 'Type', 'Shape', 'Material',
      'PosX', 'PosY', 'PosZ',
      'ScaleX', 'ScaleY', 'ScaleZ',
      'RotX', 'RotY', 'RotZ', 'RotW',
      'Color1R', 'Color1G', 'Color1B',
      'IsNeon', 'IsTransparent'
    ];

    var rows = [headers.join(',')];
    var index = 0;

    if (!levelObj.levelNodes) return rows.join('\n');

    for (var i = 0; i < levelObj.levelNodes.length; i++) {
      var node = levelObj.levelNodes[i];
      index = addNodeToCSV(rows, node, index);

      // Flatten groups
      if (node.levelNodeGroup && node.levelNodeGroup.childNodes) {
        index = addChildrenToCSV(rows, node.levelNodeGroup.childNodes, index);
      }
    }

    return rows.join('\n');
  }

  function addChildrenToCSV(rows, children, index) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      index = addNodeToCSV(rows, child, index);
      if (child.levelNodeGroup && child.levelNodeGroup.childNodes) {
        index = addChildrenToCSV(rows, child.levelNodeGroup.childNodes, index);
      }
    }
    return index;
  }

  function addNodeToCSV(rows, node, index) {
    var type = getNodeType(node);
    var info = getNodeInfo(node);

    var row = [
      index,
      csvEscape(type),
      csvEscape(info.shape),
      csvEscape(info.material),
      info.pos.x, info.pos.y, info.pos.z,
      info.scale.x, info.scale.y, info.scale.z,
      info.rot.x, info.rot.y, info.rot.z, info.rot.w,
      info.color.r, info.color.g, info.color.b,
      info.isNeon ? 'true' : 'false',
      info.isTransparent ? 'true' : 'false'
    ];

    rows.push(row.join(','));
    return index + 1;
  }

  function getNodeType(node) {
    if (node.levelNodeStatic) return 'Static';
    if (node.levelNodeStart) return 'Start';
    if (node.levelNodeFinish) return 'Finish';
    if (node.levelNodeSign) return 'Sign';
    if (node.levelNodeCrumbling) return 'Crumbling';
    if (node.levelNodeGroup) return 'Group';
    if (node.levelNodeGravity) return 'Gravity';
    if (node.levelNodeLobbyTerminal) return 'LobbyTerminal';
    if (node.levelNodeTrigger) return 'Trigger';
    if (node.levelNodeParticleEmitter) return 'ParticleEmitter';
    if (node.levelNodeSound) return 'Sound';
    return 'Unknown';
  }

  function getNodeInfo(node) {
    var defaults = {
      shape: '',
      material: '',
      pos: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rot: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0, g: 0, b: 0 },
      isNeon: false,
      isTransparent: false
    };

    var source = node.levelNodeStatic || node.levelNodeCrumbling;
    if (source) {
      defaults.shape = SHAPE_NAMES[source.shape || 0] || String(source.shape || 0);
      defaults.material = MATERIAL_NAMES[source.material || 0] || String(source.material || 0);
      if (source.position) {
        defaults.pos = { x: r(source.position.x), y: r(source.position.y), z: r(source.position.z) };
      }
      if (source.scale) {
        defaults.scale = { x: r(source.scale.x), y: r(source.scale.y), z: r(source.scale.z) };
      }
      if (source.rotation) {
        defaults.rot = { x: r(source.rotation.x), y: r(source.rotation.y), z: r(source.rotation.z), w: r(source.rotation.w) };
      }
      if (source.color1) {
        defaults.color = { r: r(source.color1.r), g: r(source.color1.g), b: r(source.color1.b) };
      }
      defaults.isNeon = !!source.isNeon;
      defaults.isTransparent = !!source.isTransparent;
      return defaults;
    }

    // Handle other node types for position/rotation
    var positioned = node.levelNodeStart || node.levelNodeFinish || node.levelNodeSign ||
                     node.levelNodeGravity || node.levelNodeLobbyTerminal ||
                     node.levelNodeTrigger || node.levelNodeParticleEmitter ||
                     node.levelNodeSound || node.levelNodeGroup;
    if (positioned) {
      if (positioned.position) {
        defaults.pos = { x: r(positioned.position.x), y: r(positioned.position.y), z: r(positioned.position.z) };
      }
      if (positioned.scale) {
        defaults.scale = { x: r(positioned.scale.x), y: r(positioned.scale.y), z: r(positioned.scale.z) };
      }
      if (positioned.rotation) {
        defaults.rot = { x: r(positioned.rotation.x), y: r(positioned.rotation.y), z: r(positioned.rotation.z), w: r(positioned.rotation.w || 1) };
      }
      if (positioned.shape !== undefined) {
        defaults.shape = SHAPE_NAMES[positioned.shape] || String(positioned.shape);
      }
    }

    return defaults;
  }

  function r(val) {
    return val !== undefined && val !== null ? parseFloat(Number(val).toFixed(6)) : 0;
  }

  function csvEscape(str) {
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

})();
