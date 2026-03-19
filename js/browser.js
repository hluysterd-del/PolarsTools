(function () {
  'use strict';

  const DATA_URL = 'https://grab-tools.live/stats_data/all_verified.json';
  const PAGE_SIZE = 50;

  let allLevels = [];
  let filtered = [];
  let currentPage = 0;

  // DOM refs (set after DOMContentLoaded)
  let searchInput, minComplexity, maxComplexity, difficultySelect, sortSelect;
  let resultsCount, grid, loadMoreBtn, loadMoreWrap, spinner;

  /* ---- Initialise ---- */
  document.addEventListener('DOMContentLoaded', async () => {
    searchInput = document.getElementById('browser-search');
    minComplexity = document.getElementById('browser-min-complexity');
    maxComplexity = document.getElementById('browser-max-complexity');
    difficultySelect = document.getElementById('browser-difficulty');
    sortSelect = document.getElementById('browser-sort');
    resultsCount = document.getElementById('browser-results-count');
    grid = document.getElementById('browser-grid');
    loadMoreBtn = document.getElementById('browser-load-more');
    loadMoreWrap = document.getElementById('browser-load-more-wrap');
    spinner = document.getElementById('browser-spinner');

    // Event listeners
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    minComplexity.addEventListener('input', debounce(applyFilters, 300));
    maxComplexity.addEventListener('input', debounce(applyFilters, 300));
    difficultySelect.addEventListener('change', applyFilters);
    sortSelect.addEventListener('change', applyFilters);
    loadMoreBtn.addEventListener('click', loadMore);

    await fetchData();
  });

  /* ---- Fetch ---- */
  async function fetchData() {
    spinner.style.display = 'flex';
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allLevels = await res.json();
      applyFilters();
    } catch (err) {
      grid.innerHTML = `<p class="browser-error">Failed to load level data: ${err.message}</p>`;
    } finally {
      spinner.style.display = 'none';
    }
  }

  /* ---- Filter / Sort / Render ---- */
  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const minC = minComplexity.value ? Number(minComplexity.value) : -Infinity;
    const maxC = maxComplexity.value ? Number(maxComplexity.value) : Infinity;
    const diff = difficultySelect.value;

    filtered = allLevels.filter(level => {
      // Text search
      if (query) {
        const titleMatch = (level.title || '').toLowerCase().includes(query);
        const creatorMatch = (level.creators || []).some(c => c.toLowerCase().includes(query));
        if (!titleMatch && !creatorMatch) return false;
      }
      // Complexity range
      const comp = level.complexity || 0;
      if (comp < minC || comp > maxC) return false;
      // Difficulty
      if (diff !== 'any') {
        const ds = level.statistics?.difficulty_string || '';
        if (ds !== diff) return false;
      }
      return true;
    });

    sortLevels();
    currentPage = 0;
    grid.innerHTML = '';
    renderPage();
    updateResultsCount();
  }

  function sortLevels() {
    const sort = sortSelect.value;
    filtered.sort((a, b) => {
      switch (sort) {
        case 'most_played':
          return (b.statistics?.total_played || 0) - (a.statistics?.total_played || 0);
        case 'most_liked':
          return (b.statistics?.liked || 0) - (a.statistics?.liked || 0);
        case 'newest':
          return Number(b.identifier?.split(':')[1] || 0) - Number(a.identifier?.split(':')[1] || 0);
        case 'hardest':
          return (b.statistics?.difficulty || 0) - (a.statistics?.difficulty || 0);
        case 'easiest':
          return (a.statistics?.difficulty || 0) - (b.statistics?.difficulty || 0);
        default:
          return 0;
      }
    });
  }

  function renderPage() {
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = filtered.slice(start, end);

    slice.forEach(level => grid.appendChild(createCard(level)));

    // Show / hide load-more
    if (end < filtered.length) {
      loadMoreWrap.style.display = 'flex';
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }

  function loadMore() {
    currentPage++;
    renderPage();
    updateResultsCount();
  }

  function updateResultsCount() {
    const shown = Math.min((currentPage + 1) * PAGE_SIZE, filtered.length);
    resultsCount.textContent = `Showing ${shown} of ${filtered.length} levels`;
  }

  /* ---- Card ---- */
  function createCard(level) {
    const card = document.createElement('div');
    card.className = 'browser-card';

    // Thumbnail
    const thumbKey = level.images?.thumb?.key;
    let thumbHTML;
    if (thumbKey) {
      const src = GrabAPI.getImageUrl(thumbKey);
      thumbHTML = `<img class="browser-card-thumb" src="${src}" alt="" loading="lazy">`;
    } else {
      thumbHTML = `<div class="browser-card-thumb browser-card-thumb--placeholder"></div>`;
    }

    // Difficulty badge
    const diffStr = level.statistics?.difficulty_string || 'unknown';
    const badgeClass = diffStr === 'easy' ? 'badge-easy'
      : diffStr === 'medium' ? 'badge-medium'
      : diffStr === 'hard' ? 'badge-hard'
      : 'badge-unknown';

    // Like ratio
    const likeRatio = level.statistics?.liked != null
      ? Math.round(level.statistics.liked * 100) + '%'
      : '--';

    // Play count
    const plays = level.statistics?.total_played ?? 0;

    // Creators
    const creators = (level.creators || []).join(', ') || 'Unknown';

    card.innerHTML = `
      ${thumbHTML}
      <div class="browser-card-body">
        <h3 class="browser-card-title">${escapeHtml(level.title || 'Untitled')}</h3>
        <p class="browser-card-creators">${escapeHtml(creators)}</p>
        <div class="browser-card-stats">
          <span class="browser-card-plays" title="Times played">&#9654; ${plays.toLocaleString()}</span>
          <span class="browser-card-like" title="Like ratio">&#9829; ${likeRatio}</span>
          <span class="browser-badge ${badgeClass}">${diffStr}</span>
        </div>
        <button class="btn btn-secondary browser-card-dl" data-id="${escapeHtml(level.identifier || '')}">Download</button>
      </div>
    `;

    card.querySelector('.browser-card-dl').addEventListener('click', () => handleDownload(level));

    return card;
  }

  /* ---- Download ---- */
  async function handleDownload(level) {
    const btn = grid.querySelector(`[data-id="${CSS.escape(level.identifier)}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Downloading...';
    }

    try {
      const { uid, ts } = GrabAPI.parseIdentifier(level.identifier);
      const details = await GrabAPI.fetchDetails(uid, ts);
      const iteration = details.iteration ?? details.latest_iteration ?? 0;
      const buf = await GrabAPI.downloadLevel(uid, ts, iteration);
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      const safeName = (level.title || 'level').replace(/[^a-zA-Z0-9_\- ]/g, '');
      GrabAPI.triggerDownload(blob, `${safeName}_${ts}.level`);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Download';
      }
    }
  }

  /* ---- Helpers ---- */
  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
})();
