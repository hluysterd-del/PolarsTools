/**
 * Image2Grab — Convert images into GRAB levels made of colored cubes
 */
(function () {
  'use strict';

  // --- DOM refs ---
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewCanvas = document.getElementById('preview-canvas');
  const previewCtx = previewCanvas.getContext('2d');
  const previewPlaceholder = document.getElementById('preview-placeholder');

  const maxWidthSlider = document.getElementById('max-width');
  const maxHeightSlider = document.getElementById('max-height');
  const maxWidthValue = document.getElementById('max-width-value');
  const maxHeightValue = document.getElementById('max-height-value');
  const cubeSizeInput = document.getElementById('cube-size');
  const titleInput = document.getElementById('level-title');

  const convertBtn = document.getElementById('convert-btn');
  const downloadBtn = document.getElementById('download-btn');
  const resultInfo = document.getElementById('result-info');
  const statusArea = document.getElementById('status-area');

  // --- State ---
  let loadedImage = null;
  let encodedLevel = null;

  // --- Slider live labels ---
  maxWidthSlider.addEventListener('input', () => {
    maxWidthValue.textContent = maxWidthSlider.value;
  });
  maxHeightSlider.addEventListener('input', () => {
    maxHeightValue.textContent = maxHeightSlider.value;
  });

  // --- Drop zone interactions ---
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFile(file);
  });

  // --- Handle uploaded file ---
  function handleFile(file) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|gif|webp)$/)) {
      showStatus('Please upload a PNG or JPG image.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        drawPreview(img);
        dropZone.classList.add('has-file');
        document.getElementById('drop-label').textContent = file.name;
        convertBtn.disabled = false;
        downloadBtn.style.display = 'none';
        resultInfo.textContent = '';
        showStatus('Image loaded. Adjust settings and click Convert.', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- Draw preview on canvas ---
  function drawPreview(img) {
    const maxW = 400;
    const maxH = 400;
    let w = img.width;
    let h = img.height;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    previewCanvas.width = w;
    previewCanvas.height = h;
    previewCanvas.style.display = 'block';
    previewPlaceholder.style.display = 'none';
    previewCtx.drawImage(img, 0, 0, w, h);
  }

  // --- Convert button ---
  convertBtn.addEventListener('click', async () => {
    if (!loadedImage) return;

    convertBtn.disabled = true;
    showStatus('Converting...', '');

    try {
      encodedLevel = await convertImage();
      downloadBtn.style.display = 'inline-flex';
      showStatus('Conversion complete! Click Download to save.', 'success');
    } catch (err) {
      showStatus('Error: ' + err.message, 'error');
    } finally {
      convertBtn.disabled = false;
    }
  });

  // --- Download button ---
  downloadBtn.addEventListener('click', () => {
    if (!encodedLevel) return;
    const title = titleInput.value.trim() || 'Image Level';
    const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([encodedLevel], { type: 'application/octet-stream' });
    GrabAPI.triggerDownload(blob, safeName + '.level');
  });

  // --- Core conversion ---
  async function convertImage() {
    const maxW = parseInt(maxWidthSlider.value, 10);
    const maxH = parseInt(maxHeightSlider.value, 10);
    const cubeSize = parseFloat(cubeSizeInput.value) || 1;

    // Resize image to fit within max dimensions
    const img = loadedImage;
    let w = img.width;
    let h = img.height;
    const scale = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    // Clamp to at least 1
    w = Math.max(1, w);
    h = Math.max(1, h);

    // Draw to hidden canvas to read pixel data
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    // Build cube nodes for non-transparent pixels
    const cubeNodes = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];

        if (a < 128) continue;

        cubeNodes.push({
          levelNodeStatic: {
            shape: 1000,
            material: 8,
            position: { x: x * cubeSize, y: (h - 1 - y) * cubeSize, z: 0 },
            scale: { x: cubeSize, y: cubeSize, z: cubeSize },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            color1: { r: r / 255, g: g / 255, b: b / 255, a: 1 }
          }
        });
      }
    }

    if (cubeNodes.length === 0) {
      throw new Error('No visible pixels found in the image (all transparent).');
    }

    // Start node at bottom-left
    const startNode = {
      levelNodeStart: {
        position: { x: -2, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        radius: 2
      }
    };

    // Finish node at top-right
    const finishNode = {
      levelNodeFinish: {
        position: { x: (w - 1) * cubeSize + 2, y: (h - 1) * cubeSize, z: 0 },
        radius: 2
      }
    };

    const nodeCount = cubeNodes.length + 2;
    const title = titleInput.value.trim() || 'Image Level';

    const levelObj = {
      formatVersion: 20,
      title: title,
      creators: 'PolarsTools',
      description: 'Created with PolarsTools Image to GRAB',
      complexity: nodeCount * 2,
      levelNodes: [...cubeNodes, startNode, finishNode]
    };

    // Update result info
    resultInfo.innerHTML =
      '<strong>Nodes:</strong> ' + nodeCount.toLocaleString() +
      ' &nbsp;&middot;&nbsp; <strong>Image size:</strong> ' + w + ' x ' + h +
      ' &nbsp;&middot;&nbsp; <strong>Complexity:</strong> ' + (nodeCount * 2).toLocaleString();

    // Encode
    const encoded = await ProtoHelper.encodeLevel(levelObj);
    return encoded;
  }

  // --- Status helper ---
  function showStatus(msg, type) {
    statusArea.textContent = msg;
    statusArea.className = 'status-area';
    if (type) statusArea.classList.add(type);
  }
})();
