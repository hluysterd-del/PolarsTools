(function () {
  'use strict';

  // --- DOM refs ---
  const tabs = document.querySelectorAll('.editor-tab');
  const panelUpload = document.getElementById('panel-upload');
  const panelLink = document.getElementById('panel-link');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const levelUrl = document.getElementById('level-url');
  const fetchBtn = document.getElementById('fetch-btn');
  const statusArea = document.getElementById('status-area');
  const editorSection = document.getElementById('editor-section');
  const jsonEditor = document.getElementById('json-editor');
  const lineNumbers = document.getElementById('line-numbers');
  const nodeCount = document.getElementById('node-count');
  const jsonStatus = document.getElementById('json-status');
  const formatBtn = document.getElementById('format-btn');
  const minifyBtn = document.getElementById('minify-btn');
  const downloadBtn = document.getElementById('download-btn');

  let Level = null; // cached proto type
  let currentFilename = 'level.level';

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

  function showEditor() {
    editorSection.style.display = 'block';
  }

  // --- Tab switching ---
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      panelUpload.classList.toggle('active', target === 'upload');
      panelLink.classList.toggle('active', target === 'link');
    });
  });

  // --- Line numbers ---
  function updateLineNumbers() {
    var text = jsonEditor.value;
    var count = text.split('\n').length;
    var html = '';
    for (var i = 1; i <= count; i++) {
      html += i + '\n';
    }
    lineNumbers.textContent = html;
  }

  // Sync scroll between textarea and line numbers
  jsonEditor.addEventListener('scroll', function () {
    lineNumbers.scrollTop = jsonEditor.scrollTop;
  });

  // --- Validation (debounced) ---
  var validateTimer = null;

  function validate() {
    var text = jsonEditor.value.trim();
    if (!text) {
      jsonStatus.textContent = '';
      jsonStatus.className = '';
      nodeCount.textContent = 'Nodes: 0';
      return;
    }
    try {
      var obj = JSON.parse(text);
      jsonStatus.textContent = 'Valid JSON';
      jsonStatus.className = 'json-valid';
      var nodes = Array.isArray(obj.levelNodes) ? obj.levelNodes.length : 0;
      nodeCount.textContent = 'Nodes: ' + nodes;
    } catch (e) {
      jsonStatus.textContent = 'Invalid JSON';
      jsonStatus.className = 'json-invalid';
    }
  }

  jsonEditor.addEventListener('input', function () {
    updateLineNumbers();
    clearTimeout(validateTimer);
    validateTimer = setTimeout(validate, 300);
  });

  // --- Decode arraybuffer to JSON in textarea ---
  async function loadFromArrayBuffer(arrayBuffer, filename) {
    try {
      if (!Level) Level = await ProtoHelper.loadProto();

      showStatus('<span class="loading"></span> Decoding level...', '');
      var decoded = await ProtoHelper.decodeLevel(arrayBuffer);
      var obj = Level.toObject(decoded, { defaults: true, longs: Number });
      var json = JSON.stringify(obj, null, 2);

      jsonEditor.value = json;
      currentFilename = filename || 'level.level';
      updateLineNumbers();
      validate();
      showEditor();
      hideStatus();
    } catch (err) {
      showStatus('Decode error: ' + err.message, 'error');
    }
  }

  // --- File upload ---
  dropZone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  function handleFile(file) {
    hideStatus();
    var reader = new FileReader();
    reader.onload = function () {
      loadFromArrayBuffer(reader.result, file.name);
    };
    reader.onerror = function () {
      showStatus('Failed to read file.', 'error');
    };
    reader.readAsArrayBuffer(file);
  }

  // --- Paste link / fetch ---
  function parseInput(value) {
    var trimmed = value.trim();
    if (!trimmed) throw new Error('Please enter a level link or identifier.');
    try {
      return GrabAPI.parseLevelUrl(trimmed);
    } catch (_) {}
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
      parsed = parseInput(levelUrl.value);
    } catch (err) {
      showStatus(err.message, 'error');
      return;
    }

    fetchBtn.disabled = true;
    showStatus('<span class="loading"></span> Fetching level details...', '');

    try {
      var details = await GrabAPI.fetchDetails(parsed.uid, parsed.ts);
      var iteration = details.iteration || parsed.iteration || 1;
      var title = details.title || 'level';

      showStatus('<span class="loading"></span> Downloading level data...', '');
      var data = await GrabAPI.downloadLevel(parsed.uid, parsed.ts, iteration);

      var safeName = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'level';
      currentFilename = safeName + '_' + parsed.ts + '.level';

      await loadFromArrayBuffer(data, currentFilename);
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      fetchBtn.disabled = false;
    }
  }

  fetchBtn.addEventListener('click', handleFetch);
  levelUrl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleFetch();
  });

  // --- Format JSON ---
  formatBtn.addEventListener('click', function () {
    try {
      var obj = JSON.parse(jsonEditor.value);
      jsonEditor.value = JSON.stringify(obj, null, 2);
      updateLineNumbers();
      validate();
    } catch (e) {
      showStatus('Cannot format: invalid JSON.', 'error');
    }
  });

  // --- Minify ---
  minifyBtn.addEventListener('click', function () {
    try {
      var obj = JSON.parse(jsonEditor.value);
      jsonEditor.value = JSON.stringify(obj);
      updateLineNumbers();
      validate();
    } catch (e) {
      showStatus('Cannot minify: invalid JSON.', 'error');
    }
  });

  // --- Download as .level ---
  downloadBtn.addEventListener('click', async function () {
    hideStatus();
    var text = jsonEditor.value.trim();
    if (!text) {
      showStatus('Editor is empty.', 'error');
      return;
    }

    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      showStatus('Cannot download: invalid JSON.', 'error');
      return;
    }

    downloadBtn.disabled = true;
    showStatus('<span class="loading"></span> Encoding level...', '');

    try {
      if (!Level) Level = await ProtoHelper.loadProto();

      var message = Level.fromObject(parsed);
      var encoded = Level.encode(message).finish();

      GrabAPI.triggerDownload(new Blob([encoded]), currentFilename);
      showStatus('Download started!', 'success');
    } catch (err) {
      showStatus('Encode error: ' + err.message, 'error');
    } finally {
      downloadBtn.disabled = false;
    }
  });

  // --- Tab key support in textarea ---
  jsonEditor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
      updateLineNumbers();
    }
  });

})();
