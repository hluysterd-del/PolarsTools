(function() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const statusArea = document.getElementById('status-area');
    const results = document.getElementById('results');
    const hexContainer = document.getElementById('hex-container');
    const annotationsList = document.getElementById('annotations-list');

    if (!zone) return;

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

    function handleFile(file) {
        if (!file.name.endsWith('.level')) {
            showStatus('Please upload a .level file', true);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => inspectBuffer(file.name, reader.result);
        reader.readAsArrayBuffer(file);
    }

    function showStatus(msg, isError) {
        statusArea.style.display = 'block';
        statusArea.innerHTML = `<div style="color:${isError ? '#ff6b6b' : 'var(--cyan)'}">${msg}</div>`;
    }

    function inspectBuffer(filename, buffer) {
        const bytes = new Uint8Array(buffer);
        document.getElementById('meta-filename').textContent = filename;
        document.getElementById('meta-size').textContent = formatSize(bytes.length);
        document.getElementById('meta-bytes').textContent = bytes.length.toLocaleString();
        statusArea.style.display = 'none';
        results.style.display = 'block';

        renderHex(bytes);
        decodeFields(bytes);
    }

    function formatSize(b) {
        if (b < 1024) return b + ' B';
        if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
        return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function renderHex(bytes) {
        const BYTES_PER_ROW = 16;
        let html = '<table class="hex-table">';
        const regions = classifyRegions(bytes);

        for (let offset = 0; offset < bytes.length; offset += BYTES_PER_ROW) {
            const row = bytes.slice(offset, offset + BYTES_PER_ROW);
            let hexCells = '';
            let asciiCells = '';

            for (let i = 0; i < BYTES_PER_ROW; i++) {
                if (i < row.length) {
                    const b = row[i];
                    const cls = getByteClass(offset + i, regions);
                    hexCells += `<span class="${cls}">${b.toString(16).padStart(2, '0')}</span> `;
                    const ch = (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
                    asciiCells += `<span class="${cls}">${escapeHtml(ch)}</span>`;
                } else {
                    hexCells += '   ';
                    asciiCells += ' ';
                }
                if (i === 7) hexCells += ' ';
            }

            html += `<tr>
                <td class="hex-offset">${offset.toString(16).padStart(8, '0')}</td>
                <td class="hex-bytes">${hexCells}</td>
                <td class="hex-ascii">${asciiCells}</td>
            </tr>`;
        }
        html += '</table>';
        hexContainer.innerHTML = html;
    }

    function classifyRegions(bytes) {
        const regions = [];
        // First few bytes are usually header (formatVersion, title, etc.)
        // Simple heuristic: first 50 bytes = header, strings are printable sequences
        let i = 0;
        while (i < bytes.length) {
            // Check for printable ASCII strings (4+ chars)
            if (bytes[i] >= 32 && bytes[i] <= 126) {
                let start = i;
                while (i < bytes.length && bytes[i] >= 32 && bytes[i] <= 126) i++;
                if (i - start >= 4) {
                    regions.push({ start, end: i, type: 'strings' });
                }
            } else {
                i++;
            }
        }
        // Mark first 20 bytes as header
        regions.push({ start: 0, end: Math.min(20, bytes.length), type: 'header' });
        return regions;
    }

    function getByteClass(offset, regions) {
        for (const r of regions) {
            if (offset >= r.start && offset < r.end) return 'hex-' + r.type;
        }
        return 'hex-default';
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async function decodeFields(bytes) {
        annotationsList.innerHTML = '';
        try {
            const Level = await ProtoHelper.loadProto();
            const decoded = Level.decode(bytes);
            const obj = Level.toObject(decoded, { defaults: true, longs: Number });

            const fields = [
                ['formatVersion', obj.formatVersion],
                ['title', obj.title || '(empty)'],
                ['creators', obj.creators || '(empty)'],
                ['description', (obj.description || '(empty)').substring(0, 100)],
                ['complexity', obj.complexity],
                ['maxCheckpointCount', obj.maxCheckpointCount],
                ['tags', (obj.tags || []).join(', ') || '(none)'],
                ['levelNodes count', (obj.levelNodes || []).length],
                ['unlisted', obj.unlisted],
                ['showReplays', obj.showReplays],
            ];

            if (obj.ambienceSettings) {
                const a = obj.ambienceSettings;
                fields.push(['ambience.sunAltitude', a.sunAltitude]);
                fields.push(['ambience.sunAzimuth', a.sunAzimuth]);
                fields.push(['ambience.fogDensity', a.fogDensity]);
            }

            // Count node types
            const counts = {};
            (obj.levelNodes || []).forEach(n => {
                const type = Object.keys(n).find(k => k.startsWith('levelNode') && n[k]);
                if (type) counts[type] = (counts[type] || 0) + 1;
            });
            Object.entries(counts).forEach(([k, v]) => {
                fields.push([k.replace('levelNode', 'node: '), v]);
            });

            let html = '';
            fields.forEach(([name, value], i) => {
                html += `<div class="annotation-row">
                    <span class="annotation-offset">#${i}</span>
                    <span class="annotation-field">${escapeHtml(String(name))}</span>
                    <span class="annotation-value">${escapeHtml(String(value))}</span>
                </div>`;
            });
            annotationsList.innerHTML = html;
        } catch (e) {
            annotationsList.innerHTML = `<div style="color:#ff6b6b;">Failed to decode: ${escapeHtml(e.message)}</div>`;
        }
    }
})();
