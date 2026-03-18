/**
 * GrabAPI — wrapper around the GRAB public API
 */
(function () {
  'use strict';

  const API_BASE = 'https://api.slin.dev/grab/v1';
  const IMAGE_BASE = 'https://grab-images.slin.dev';

  /**
   * Parses a level identifier string.
   * Formats: "uid:timestamp" or "uid:timestamp:iteration"
   * @param {string} str
   * @returns {{uid: string, ts: string, iteration?: string}}
   */
  function parseIdentifier(str) {
    const parts = str.split(':');
    const result = { uid: parts[0], ts: parts[1] };
    if (parts.length >= 3) {
      result.iteration = parts[2];
    }
    return result;
  }

  /**
   * Parses a GRAB level viewer URL.
   * Format: https://grabvr.quest/levels/viewer?level=uid:ts
   * @param {string} url
   * @returns {{uid: string, ts: string}}
   */
  function parseLevelUrl(url) {
    const u = new URL(url);
    const level = u.searchParams.get('level');
    if (!level) throw new Error('No level parameter found in URL');
    const parts = level.split(':');
    return { uid: parts[0], ts: parts[1] };
  }

  /**
   * Fetches level details.
   */
  async function fetchDetails(uid, ts) {
    const res = await fetch(`${API_BASE}/details/${uid}/${ts}`);
    if (!res.ok) throw new Error(`Failed to fetch details: ${res.status}`);
    return res.json();
  }

  /**
   * Downloads the level protobuf data as an ArrayBuffer.
   */
  async function downloadLevel(uid, ts, iteration) {
    const res = await fetch(`${API_BASE}/download/${uid}/${ts}/${iteration}`);
    if (!res.ok) throw new Error(`Failed to download level: ${res.status}`);
    return res.arrayBuffer();
  }

  /**
   * Searches for users by name.
   */
  async function searchUsers(query) {
    const res = await fetch(`${API_BASE}/list?type=user_name&search_term=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Failed to search users: ${res.status}`);
    return res.json();
  }

  /**
   * Fetches levels created by a user.
   */
  async function fetchUserLevels(userId) {
    const res = await fetch(`${API_BASE}/list?max_format_version=100&user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`Failed to fetch user levels: ${res.status}`);
    return res.json();
  }

  /**
   * Fetches statistics for a level.
   */
  async function fetchStats(uid, ts) {
    const res = await fetch(`${API_BASE}/statistics/${uid}/${ts}`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
    return res.json();
  }

  /**
   * Returns the full image URL for a given image key.
   */
  function getImageUrl(imageKey) {
    return `${IMAGE_BASE}/${imageKey}`;
  }

  /**
   * Triggers a browser file download.
   * @param {Blob} blob
   * @param {string} filename
   */
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.GrabAPI = {
    API_BASE,
    IMAGE_BASE,
    parseIdentifier,
    parseLevelUrl,
    fetchDetails,
    downloadLevel,
    searchUsers,
    fetchUserLevels,
    fetchStats,
    getImageUrl,
    triggerDownload
  };
})();
