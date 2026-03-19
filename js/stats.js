(function () {
  'use strict';

  const input = document.getElementById('stats-input');
  const lookupBtn = document.getElementById('lookup-btn');
  const statusArea = document.getElementById('status-area');
  const resultCard = document.getElementById('result-card');

  lookupBtn.addEventListener('click', doLookup);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLookup();
  });

  async function doLookup() {
    const raw = input.value.trim();
    if (!raw) {
      showStatus('Please enter a level link or identifier.', 'error');
      return;
    }

    // Parse input
    let parsed;
    try {
      parsed = GrabAPI.parseLevelUrl(raw);
    } catch (_) {
      try {
        parsed = GrabAPI.parseIdentifier(raw);
      } catch (__) {
        showStatus('Could not parse input. Paste a GRAB level link or identifier (uid:timestamp).', 'error');
        return;
      }
    }

    if (!parsed.uid || !parsed.ts) {
      showStatus('Invalid identifier. Expected format: uid:timestamp', 'error');
      return;
    }

    // Show loading
    resultCard.style.display = 'none';
    showStatus('<span class="loading"></span> Fetching level data\u2026', '');

    try {
      const [details, stats] = await Promise.all([
        GrabAPI.fetchDetails(parsed.uid, parsed.ts),
        GrabAPI.fetchStats(parsed.uid, parsed.ts)
      ]);

      renderResult(details, stats, parsed.uid, parsed.ts);
      statusArea.style.display = 'none';
    } catch (err) {
      showStatus('Failed to fetch level data: ' + err.message, 'error');
    }
  }

  function showStatus(html, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = html;
  }

  function formatTime(seconds) {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const totalSec = Math.round(seconds);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function getDifficultyColor(diffString) {
    if (!diffString) return '#8888a0';
    const d = diffString.toLowerCase();
    if (d === 'easy') return '#2ecc71';
    if (d === 'medium') return '#f1c40f';
    if (d === 'hard') return '#e74c3c';
    return '#8888a0';
  }

  function renderResult(details, stats, uid, ts) {
    const thumbUrl = details.images && details.images.thumb
      ? GrabAPI.getImageUrl(details.images.thumb.key)
      : '';

    const creators = Array.isArray(details.creators)
      ? details.creators.join(', ')
      : (details.creators || 'Unknown');

    const likePercent = stats.liked != null
      ? Math.round(stats.liked * 100)
      : '--';

    const diffColor = getDifficultyColor(stats.difficulty_string);
    const diffLabel = stats.difficulty_string
      ? stats.difficulty_string.charAt(0).toUpperCase() + stats.difficulty_string.slice(1)
      : 'Unknown';
    const diffNumeric = stats.difficulty != null
      ? ' (' + stats.difficulty.toFixed(1) + ')'
      : '';

    const viewerUrl = 'https://grabvr.quest/levels/viewer?level=' + encodeURIComponent(uid + ':' + ts);

    // Thumbnail
    document.getElementById('result-thumb').src = thumbUrl;
    document.getElementById('result-thumb').alt = details.title || 'Level thumbnail';

    // Info
    document.getElementById('result-title').textContent = details.title || 'Untitled';
    document.getElementById('result-creators').textContent = creators;
    document.getElementById('result-desc').textContent = details.description || '';

    // Stats
    document.getElementById('stat-plays').textContent = (stats.total_played != null)
      ? stats.total_played.toLocaleString()
      : '--';

    const diffBadge = document.getElementById('stat-difficulty');
    diffBadge.textContent = diffLabel + diffNumeric;
    diffBadge.style.background = diffColor + '22';
    diffBadge.style.color = diffColor;
    diffBadge.style.border = '1px solid ' + diffColor + '44';

    document.getElementById('stat-likes').textContent = likePercent + '%';
    document.getElementById('stat-time').textContent = formatTime(stats.time);
    document.getElementById('stat-complexity').textContent =
      details.complexity != null ? details.complexity.toLocaleString() : '--';

    // Viewer link
    const viewerLink = document.getElementById('result-viewer-link');
    viewerLink.href = viewerUrl;

    resultCard.style.display = 'block';
  }
})();
