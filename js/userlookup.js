(function () {
  'use strict';

  const searchInput = document.getElementById('user-search-input');
  const searchBtn = document.getElementById('user-search-btn');
  const statusArea = document.getElementById('user-status');
  const resultsList = document.getElementById('user-results-list');
  const profileSection = document.getElementById('user-profile');
  const profileUsername = document.getElementById('profile-username');
  const profileUserId = document.getElementById('profile-userid');
  const profileGrabLink = document.getElementById('profile-grablink');
  const profileLevelCount = document.getElementById('profile-level-count');
  const levelsGrid = document.getElementById('user-levels-grid');

  /* ---- Status helpers ---- */
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
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  /* ---- Search ---- */
  async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      showStatus('Please enter a player name to search.', 'error');
      return;
    }

    hideStatus();
    resultsList.style.display = 'none';
    resultsList.innerHTML = '';
    profileSection.style.display = 'none';
    levelsGrid.style.display = 'none';
    levelsGrid.innerHTML = '';

    showStatus('<span class="loading"></span> Searching for players...', '');
    searchBtn.disabled = true;

    try {
      const users = await GrabAPI.searchUsers(query);

      if (!users || users.length === 0) {
        showStatus('No players found matching "' + escapeHtml(query) + '".', '');
        return;
      }

      hideStatus();
      resultsList.style.display = 'block';

      users.forEach(function (user) {
        const li = document.createElement('li');
        li.textContent = user.user_name || user.user_id;
        li.addEventListener('click', function () {
          selectUser(user);
        });
        resultsList.appendChild(li);
      });
    } catch (err) {
      showStatus('Search failed: ' + err.message, 'error');
    } finally {
      searchBtn.disabled = false;
    }
  }

  /* ---- Select user ---- */
  async function selectUser(user) {
    const userId = user.user_id;
    const userName = user.user_name || userId;

    resultsList.style.display = 'none';
    levelsGrid.style.display = 'none';
    levelsGrid.innerHTML = '';

    // Show profile immediately
    profileUsername.textContent = userName;
    profileUserId.textContent = userId;
    profileGrabLink.href = 'https://grabvr.quest/levels?tab=tab_other_user&user_id=' + encodeURIComponent(userId);
    profileLevelCount.textContent = '';
    profileSection.style.display = 'block';

    showStatus('<span class="loading"></span> Loading levels...', '');

    try {
      const levels = await GrabAPI.fetchUserLevels(userId);

      hideStatus();

      if (!levels || levels.length === 0) {
        profileLevelCount.textContent = '0 levels';
        showStatus('This player has no published levels.', '');
        return;
      }

      profileLevelCount.textContent = levels.length + ' level' + (levels.length !== 1 ? 's' : '');
      levelsGrid.style.display = 'grid';

      levels.forEach(function (level) {
        levelsGrid.appendChild(createLevelCard(level));
      });
    } catch (err) {
      showStatus('Failed to load levels: ' + err.message, 'error');
    }
  }

  /* ---- Level card ---- */
  function createLevelCard(level) {
    const card = document.createElement('div');
    card.className = 'user-level-card';

    const thumbKey = level.images && level.images.thumb && level.images.thumb.key;
    let thumbHTML;
    if (thumbKey) {
      const src = GrabAPI.getImageUrl(thumbKey);
      thumbHTML = '<img src="' + src + '" alt="" loading="lazy">';
    } else {
      thumbHTML = '<img src="" alt="No thumbnail" style="background:var(--bg);">';
    }

    const title = escapeHtml(level.title || 'Untitled');
    const identifier = level.identifier || '';

    card.innerHTML =
      thumbHTML +
      '<div class="card-body">' +
        '<h3 title="' + title + '">' + title + '</h3>' +
        '<button class="btn btn-secondary" data-id="' + escapeHtml(identifier) + '">Download</button>' +
      '</div>';

    card.querySelector('.btn').addEventListener('click', function () {
      handleDownload(level, this);
    });

    return card;
  }

  /* ---- Download ---- */
  async function handleDownload(level, btn) {
    if (!level.identifier) {
      showStatus('No identifier available for this level.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Downloading...';

    try {
      var parsed = GrabAPI.parseIdentifier(level.identifier);
      var details = await GrabAPI.fetchDetails(parsed.uid, parsed.ts);
      var iteration = details.iteration || details.latest_iteration || 0;
      var buf = await GrabAPI.downloadLevel(parsed.uid, parsed.ts, iteration);
      var blob = new Blob([buf], { type: 'application/octet-stream' });
      var safeName = (level.title || 'level').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'level';
      GrabAPI.triggerDownload(blob, safeName + '_' + parsed.ts + '.level');
    } catch (err) {
      showStatus('Download failed: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Download';
    }
  }

  /* ---- Event listeners ---- */
  searchBtn.addEventListener('click', handleSearch);

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSearch();
  });
})();
