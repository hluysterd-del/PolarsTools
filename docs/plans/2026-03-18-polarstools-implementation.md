# PolarsTools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static website with 8 GRAB VR modding tools, deployed to GitHub Pages.

**Architecture:** Pure client-side static site. All GRAB API calls (`api.slin.dev`) happen directly from the browser. Protobuf encoding/decoding uses `protobuf.js` loaded from CDN. Each tool is a separate HTML page with its own JS module, sharing common styles and API/proto helpers.

**Tech Stack:** HTML5, CSS3, vanilla JS (ES modules), protobuf.js (CDN), Canvas API, GitHub Pages

---

### Task 1: Project Scaffold & Git Setup

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `proto/level.proto`
- Create: `js/proto.js`
- Create: `js/api.js`

**Step 1: Initialize git repo and create GitHub repo**

```bash
cd C:/Users/hunte/Downloads/PolarsTools
git init
gh repo create PolarsTools --public --source=. --push
```

**Step 2: Create the shared proto file**

Copy `proto/level.proto` from `C:/Users/hunte/Downloads/maps/proto.proto` — this is the GRAB level protobuf schema.

**Step 3: Create `js/proto.js` — protobuf helper module**

```javascript
// Loads protobuf.js from CDN and provides encode/decode helpers
// Uses: https://cdn.jsdelivr.net/npm/protobufjs@7/dist/protobuf.min.js
// Exports: loadProto(), decodeLevel(arrayBuffer), encodeLevel(levelObj)
```

Key functions:
- `loadProto()` — loads `proto/level.proto`, returns the `Level` message type
- `decodeLevel(buffer)` — takes ArrayBuffer, returns decoded Level object
- `encodeLevel(obj)` — takes Level object, returns Uint8Array

**Step 4: Create `js/api.js` — GRAB API wrapper**

```javascript
const API_BASE = 'https://api.slin.dev/grab/v1';
const IMAGE_BASE = 'https://grab-images.slin.dev';

// parseIdentifier("2e74ovn3qv6w29bmiyukv:1773425225") -> {uid, ts}
// parseLevelUrl("https://grabvr.quest/levels/viewer?level=...") -> {uid, ts}
// fetchDetails(uid, ts) -> JSON {title, creators, iteration, images, ...}
// downloadLevel(uid, ts, iteration) -> ArrayBuffer (.level binary)
// searchUsers(query) -> JSON array of users
// fetchUserLevels(userId) -> JSON array of levels
// fetchStats(uid, ts) -> JSON statistics
// getImageUrl(imageKey) -> full URL string
```

**Step 5: Create `css/style.css` — shared dark theme**

Dark theme (suits GRAB VR aesthetic):
- Background: `#0a0a0f` (near black)
- Cards: `#14141f` with subtle border
- Accent: `#6c5ce7` (purple) for buttons/links
- Secondary accent: `#00cec9` (cyan) for highlights
- Text: `#e0e0e0`
- Font: system-ui stack
- Responsive grid layout
- Shared nav bar, tool card styles, input styles, button styles

**Step 6: Create `index.html` — homepage**

- Nav bar with "PolarsTools" logo/text
- Hero section: "Tools for GRAB VR"
- 8 tool cards in a responsive grid, each linking to its page
- Cards have icon, title, short description
- Footer with credits

**Step 7: Verify and commit**

```bash
# Open index.html in browser, verify it loads
git add -A
git commit -m "feat: project scaffold with shared styles, proto, and API helpers"
```

---

### Task 2: Level Downloader Page

**Files:**
- Create: `pages/downloader.html`
- Create: `js/downloader.js`

**Step 1: Create `pages/downloader.html`**

- Nav bar (same as index)
- Input field: "Paste GRAB level link or ID"
- "Download" button
- Status area showing: level title, creator, thumbnail, complexity
- Download progress indicator

**Step 2: Create `js/downloader.js`**

Flow:
1. User pastes link like `https://grabvr.quest/levels/viewer?level=2e74ovn3qv6w29bmiyukv:1773425225`
2. `parseLevelUrl()` extracts identifier
3. `fetchDetails(uid, ts)` gets metadata + iteration
4. Show preview card (thumbnail from `grab-images.slin.dev`, title, creator)
5. `downloadLevel(uid, ts, iteration)` fetches the binary
6. Trigger browser download as `{title}_{timestamp}.level`

Key code pattern (from grab-tools.live reference):
```javascript
// Parse identifier: "uid:timestamp" or "uid:timestamp:iteration"
const parts = identifier.split(':');
const uid = parts[0], ts = parts[1];
const detailsUrl = `${API_BASE}/details/${uid}/${ts}`;
// Get iteration from details response
const downloadUrl = `${API_BASE}/download/${uid}/${ts}/${iteration}`;
```

**Step 3: Verify and commit**

```bash
git add pages/downloader.html js/downloader.js
git commit -m "feat: level downloader - paste link, preview, download .level"
```

---

### Task 3: Level Browser Page

**Files:**
- Create: `pages/browser.html`
- Create: `js/browser.js`

**Step 1: Create `pages/browser.html`**

- Search bar with filters (title, creator, min/max complexity)
- Sort dropdown (plays, likes, difficulty, newest)
- Responsive grid of level cards
- Each card: thumbnail, title, creator, play count, difficulty badge, download button
- Pagination (100 per page)
- Loading skeleton while fetching

**Step 2: Create `js/browser.js`**

Flow:
1. On page load, fetch `https://grab-tools.live/stats_data/all_verified.json`
2. Store full dataset in memory
3. Client-side search/filter/sort
4. Render paginated results as cards
5. Each card's download button calls the downloader logic (api.js)

Card data structure (from all_verified.json):
```javascript
{
  identifier: "uid:timestamp",
  title: "Level Name",
  creators: ["username"],
  complexity: 1500,
  statistics: { total_played: 100, difficulty: 0.5, liked: 0.8 },
  images: { thumb: { key: "image_key" } }
}
```

**Step 3: Verify and commit**

```bash
git add pages/browser.html js/browser.js
git commit -m "feat: level browser with search, thumbnails, and download"
```

---

### Task 4: Image to GRAB Tool

**Files:**
- Create: `pages/image2grab.html`
- Create: `js/image2grab.js`

**Step 1: Create `pages/image2grab.html`**

- File upload for image (PNG/JPG)
- Preview canvas showing the uploaded image
- Settings: max width (default 32), max height (default 32), cube size
- "Convert" button
- Preview of generated level info (node count, complexity estimate)
- "Download .level" button

**Step 2: Create `js/image2grab.js`**

Flow:
1. User uploads image
2. Draw to canvas, resize to max dimensions
3. Read pixel data with `getImageData()`
4. For each pixel, create a `LevelNodeStatic` (CUBE shape, DEFAULT_COLORED material)
   - Position: `(x * cubeSize, (height - y) * cubeSize, 0)`
   - Scale: `(cubeSize, cubeSize, cubeSize)`
   - Color: pixel RGB mapped to 0-1 float range
5. Skip transparent pixels (alpha < 128)
6. Add Start node at bottom-left
7. Add Finish node at top-right
8. Encode to protobuf and trigger download

**Step 3: Verify and commit**

```bash
git add pages/image2grab.html js/image2grab.js
git commit -m "feat: image to GRAB converter using canvas pixel reading"
```

---

### Task 5: Modded Colors Tool

**Files:**
- Create: `pages/colors.html`
- Create: `js/colors.js`

**Step 1: Create `pages/colors.html`**

- Large color picker (hue wheel + saturation/lightness)
- RGB sliders (0-255) and float value inputs (0.0-1.0)
- HSV sliders
- Hex input
- Live preview cube showing: default, neon, transparent variants
- "Modded" color range toggle (allows values > 1.0 and < 0.0 for GRAB modded colors)
- Output box showing protobuf Color values: `{ r: 0.5, g: 0.2, b: 1.0, a: 1.0 }`
- Copy-to-clipboard button

**Step 2: Create `js/colors.js`**

- Standard color picker with bidirectional RGB/HSV/Hex conversion
- "Modded mode" unlocks sliders beyond 0-1 range (GRAB supports this for glowing/weird effects)
- Preview renders CSS approximation of the color with optional glow effect for neon

**Step 3: Verify and commit**

```bash
git add pages/colors.html js/colors.js
git commit -m "feat: modded colors tool with picker and protobuf output"
```

---

### Task 6: Level Stats Viewer

**Files:**
- Create: `pages/stats.html`
- Create: `js/stats.js`

**Step 1: Create `pages/stats.html`**

- Input: paste level link or ID
- "Look Up" button
- Results card showing:
  - Thumbnail
  - Title, creators
  - Play count, difficulty (with color badge), like ratio
  - Average completion time
  - Complexity score
  - Direct link to grabvr.quest viewer

**Step 2: Create `js/stats.js`**

Flow:
1. Parse level identifier from input
2. Fetch details: `api.slin.dev/grab/v1/details/{uid}/{ts}`
3. Fetch stats: `api.slin.dev/grab/v1/statistics/{uid}/{ts}`
4. Render combined info

**Step 3: Verify and commit**

```bash
git add pages/stats.html js/stats.js
git commit -m "feat: level stats viewer with play count, difficulty, likes"
```

---

### Task 7: User Lookup

**Files:**
- Create: `pages/userlookup.html`
- Create: `js/userlookup.js`

**Step 1: Create `pages/userlookup.html`**

- Search input for username
- "Search" button
- User results list (if multiple matches)
- Selected user's profile: username, user ID, link to grabvr.quest profile
- Grid of their levels with thumbnails, titles, play counts
- Download button on each level

**Step 2: Create `js/userlookup.js`**

Flow:
1. Search: `api.slin.dev/grab/v1/list?type=user_name&search_term={query}`
2. Show matching users
3. On user select: `api.slin.dev/grab/v1/list?max_format_version=100&user_id={id}`
4. Render level grid with thumbnails and download buttons

**Step 3: Verify and commit**

```bash
git add pages/userlookup.html js/userlookup.js
git commit -m "feat: user lookup - search players, browse their levels"
```

---

### Task 8: Level Editor (JSON)

**Files:**
- Create: `pages/editor.html`
- Create: `js/editor.js`

**Step 1: Create `pages/editor.html`**

- File upload for `.level` file
- OR paste level link to fetch from API
- JSON text editor (large textarea with monospace font)
- "Format JSON" button
- "Download as .level" button
- Node count and validation status display

**Step 2: Create `js/editor.js`**

Flow:
1. User uploads .level or pastes link
2. Decode protobuf to Level object using proto.js
3. Convert to JSON via `Level.toObject(message)`
4. Display in textarea (formatted with `JSON.stringify(obj, null, 2)`)
5. User edits JSON
6. On "Download": parse JSON, create Level message via `Level.fromObject(json)`, encode to protobuf, trigger download

**Step 3: Verify and commit**

```bash
git add pages/editor.html js/editor.js
git commit -m "feat: JSON level editor - decode, edit, re-encode .level files"
```

---

### Task 9: Level Merger

**Files:**
- Create: `pages/merger.html`
- Create: `js/merger.js`

**Step 1: Create `pages/merger.html`**

- Multi-file upload for .level files
- List of uploaded levels with title, node count
- Offset controls: X/Z spacing between merged levels
- "Merge" button
- Result info: total nodes, estimated complexity
- "Download Merged .level" button

**Step 2: Create `js/merger.js`**

Flow:
1. User uploads 2+ .level files
2. Decode each to Level object
3. Merge: take first level as base, append all nodes from other levels
4. Apply position offsets to appended nodes (shift each level's objects by X/Z)
5. Keep first level's ambience settings, start/finish from first level
6. Sum complexities
7. Encode merged Level to protobuf, trigger download

**Step 3: Verify and commit**

```bash
git add pages/merger.html js/merger.js
git commit -m "feat: level merger - combine multiple .level files"
```

---

### Task 10: Deploy to GitHub Pages

**Step 1: Push all code to GitHub**

```bash
git push origin main
```

**Step 2: Enable GitHub Pages**

```bash
gh api repos/hluysterd-del/PolarsTools/pages -X POST -f source.branch=main -f source.path=/
```

**Step 3: Verify deployment**

Visit `https://hluysterd-del.github.io/PolarsTools/` and test:
- Homepage loads with all 8 tool cards
- Level Downloader: paste a known level link, verify download works
- Level Browser: verify levels load with thumbnails
- All other tools load without JS errors

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: deployment adjustments"
git push
```

---

## API Reference (for implementer)

```
GET https://api.slin.dev/grab/v1/details/{uid}/{ts}
  -> { title, creators, description, complexity, iteration, images: {thumb: {key}} }

GET https://api.slin.dev/grab/v1/download/{uid}/{ts}/{iteration}
  -> binary (application/octet-stream) .level protobuf

GET https://api.slin.dev/grab/v1/list?type=user_name&search_term={name}
  -> [{ user_id, user_name, ... }]

GET https://api.slin.dev/grab/v1/list?max_format_version=100&user_id={id}
  -> [{ identifier, title, creators, complexity, images, ... }]

GET https://api.slin.dev/grab/v1/statistics/{uid}/{ts}
  -> { total_played, difficulty, liked, time, difficulty_string }

Image: https://grab-images.slin.dev/{image_key}

Level viewer: https://grabvr.quest/levels/viewer?level={uid}:{ts}

Verified levels dataset: https://grab-tools.live/stats_data/all_verified.json
  -> [{ identifier, title, creators, complexity, statistics, images, ... }]
```

## Proto file

Located at `proto/level.proto`. Use protobuf.js to load:
```javascript
protobuf.load('proto/level.proto', (err, root) => {
  const Level = root.lookupType('COD.Level.Level');
});
```
