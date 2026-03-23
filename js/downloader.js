(function () {
  'use strict';

  // TOS gate
  const tosGate = document.getElementById('tos-gate');
  const tosCheckbox = document.getElementById('tos-checkbox');
  const tosAccept = document.getElementById('tos-accept');
  const downloaderMain = document.getElementById('downloader-main');

  if (tosGate && tosCheckbox && tosAccept) {
    if (localStorage.getItem('polarstools_tos_accepted') === 'true') {
      tosGate.style.display = 'none';
      if (downloaderMain) downloaderMain.style.display = 'block';
    }
    tosCheckbox.addEventListener('change', function () {
      tosAccept.style.opacity = this.checked ? '1' : '0.5';
      tosAccept.style.pointerEvents = this.checked ? 'auto' : 'none';
    });
    tosAccept.addEventListener('click', function () {
      if (!tosCheckbox.checked) return;
      localStorage.setItem('polarstools_tos_accepted', 'true');
      tosGate.style.display = 'none';
      if (downloaderMain) downloaderMain.style.display = 'block';
    });
  }

  const input = document.getElementById('level-input');
  const fetchBtn = document.getElementById('fetch-btn');
  const statusArea = document.getElementById('status-area');
  const previewCard = document.getElementById('preview-card');
  const previewImg = document.getElementById('preview-img');
  const previewTitle = document.getElementById('preview-title');
  const previewCreators = document.getElementById('preview-creators');
  const previewComplexity = document.getElementById('preview-complexity');
  const previewDesc = document.getElementById('preview-desc');
  const downloadBtn = document.getElementById('download-btn');

  let currentLevel = null; // { uid, ts, iteration, title }

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

  function hidePreview() {
    previewCard.style.display = 'none';
    currentLevel = null;
  }

  function parseInput(value) {
    const trimmed = value.trim();
    if (!trimmed) throw new Error('Please enter a level link or identifier.');

    // Try URL parse first
    try {
      return GrabAPI.parseLevelUrl(trimmed);
    } catch (_) {
      // Fall back to raw identifier
    }

    // Try as raw identifier (uid:ts or uid:ts:iteration)
    const parsed = GrabAPI.parseIdentifier(trimmed);
    if (!parsed.uid || !parsed.ts) {
      throw new Error('Could not parse input. Expected a GRAB level URL or identifier like uid:timestamp.');
    }
    return parsed;
  }

  async function handleFetch() {
    hideStatus();
    hidePreview();

    let parsed;
    try {
      parsed = parseInput(input.value);
    } catch (err) {
      showStatus(err.message, 'error');
      return;
    }

    showStatus('<span class="loading"></span> Fetching level details...', '');
    fetchBtn.disabled = true;

    try {
      const details = await GrabAPI.fetchDetails(parsed.uid, parsed.ts);

      // Populate preview
      const thumbKey = details.images && details.images.thumb && details.images.thumb.key;
      if (thumbKey) {
        previewImg.src = GrabAPI.getImageUrl(thumbKey);
        previewImg.alt = details.title || 'Level thumbnail';
      } else {
        previewImg.src = '';
        previewImg.alt = 'No thumbnail available';
      }

      previewTitle.textContent = details.title || 'Untitled';
      previewCreators.textContent = details.creators ? 'By ' + details.creators.join(', ') : '';
      previewComplexity.textContent = details.complexity != null ? 'Complexity: ' + details.complexity : '';
      previewDesc.textContent = details.description || '';

      const iteration = details.iteration || parsed.iteration || 1;

      currentLevel = {
        uid: parsed.uid,
        ts: parsed.ts,
        iteration: iteration,
        title: details.title || 'level'
      };

      previewCard.style.display = 'flex';
      hideStatus();
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      fetchBtn.disabled = false;
    }
  }

  async function handleDownload() {
    if (!currentLevel) return;

    showStatus('<span class="loading"></span> Downloading level...', '');
    downloadBtn.disabled = true;

    try {
      const data = await GrabAPI.downloadLevel(currentLevel.uid, currentLevel.ts, currentLevel.iteration);
      const safeName = currentLevel.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'level';
      const filename = safeName + '_' + currentLevel.ts + '.level';
      GrabAPI.triggerDownload(new Blob([data]), filename);
      showStatus('Download started!', 'success');
    } catch (err) {
      showStatus('Download failed: ' + err.message, 'error');
    } finally {
      downloadBtn.disabled = false;
    }
  }

  fetchBtn.addEventListener('click', handleFetch);
  downloadBtn.addEventListener('click', handleDownload);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleFetch();
  });
})();
