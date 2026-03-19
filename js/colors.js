/* ============================================================
   PolarsTools — Modded Colors Tool
   ============================================================ */

(function () {
  'use strict';

  // --- State ---
  // Store color as floats (r, g, b, a) — the source of truth
  let colorF = { r: 0.502, g: 0.251, b: 1.0, a: 1.0 };
  let moddedMode = false;

  // --- DOM refs ---
  const $ = (id) => document.getElementById(id);

  const rgbSliders = { r: $('rgb-r'), g: $('rgb-g'), b: $('rgb-b'), a: $('rgb-a') };
  const rgbNums   = { r: $('rgb-r-num'), g: $('rgb-g-num'), b: $('rgb-b-num'), a: $('rgb-a-num') };
  const floatIns  = { r: $('float-r'), g: $('float-g'), b: $('float-b'), a: $('float-a') };

  const hexInput  = $('hex-input');
  const hexSwatch = $('hex-swatch');

  const hsvSliders = { h: $('hsv-h'), s: $('hsv-s'), v: $('hsv-v') };
  const hsvNums   = { h: $('hsv-h-num'), s: $('hsv-s-num'), v: $('hsv-v-num') };
  const hslSliders = { h: $('hsl-h'), s: $('hsl-s'), l: $('hsl-l') };
  const hslNums   = { h: $('hsl-h-num'), s: $('hsl-s-num'), l: $('hsl-l-num') };

  const moddedToggle  = $('modded-toggle');
  const moddedWarning = $('modded-warning');

  const previewDefault     = $('preview-default');
  const previewNeon        = $('preview-neon');
  const previewTransparent = $('preview-transparent');

  const outputValue = $('output-value');
  const copyBtn     = $('copy-btn');

  // --- Color Conversion Helpers ---

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function floatToRgb(f) {
    return {
      r: Math.round(clamp(f.r, 0, 1) * 255),
      g: Math.round(clamp(f.g, 0, 1) * 255),
      b: Math.round(clamp(f.b, 0, 1) * 255),
      a: Math.round(clamp(f.a, 0, 1) * 255),
    };
  }

  function rgbToFloat(rgb) {
    return {
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255,
      a: rgb.a / 255,
    };
  }

  function rgbToHex(rgb) {
    const h = (v) => v.toString(16).padStart(2, '0').toUpperCase();
    return '#' + h(rgb.r) + h(rgb.g) + h(rgb.b);
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length !== 6) return null;
    const n = parseInt(hex, 16);
    if (isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max, v = max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  function hsvToRgb(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  // --- CSS color from float (clamped for display) ---
  function cssColor(f, alpha) {
    const r = Math.round(clamp(f.r, 0, 1) * 255);
    const g = Math.round(clamp(f.g, 0, 1) * 255);
    const b = Math.round(clamp(f.b, 0, 1) * 255);
    const a = alpha !== undefined ? alpha : clamp(f.a, 0, 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // --- Update all UI from colorF ---
  function updateAll(source) {
    const rgb = floatToRgb(colorF);

    // RGB sliders & nums
    if (source !== 'rgb') {
      for (const c of ['r','g','b','a']) {
        rgbSliders[c].value = rgb[c];
        rgbNums[c].value = rgb[c];
      }
    }

    // Float inputs
    if (source !== 'float') {
      for (const c of ['r','g','b','a']) {
        floatIns[c].value = parseFloat(colorF[c]).toFixed(3);
      }
    }

    // Hex
    if (source !== 'hex') {
      hexInput.value = rgbToHex(rgb);
    }
    hexSwatch.style.backgroundColor = cssColor(colorF, 1);

    // HSV
    if (source !== 'hsv') {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      hsvSliders.h.value = hsv.h; hsvNums.h.value = hsv.h;
      hsvSliders.s.value = hsv.s; hsvNums.s.value = hsv.s;
      hsvSliders.v.value = hsv.v; hsvNums.v.value = hsv.v;
    }

    // HSL
    if (source !== 'hsl') {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      hslSliders.h.value = hsl.h; hslNums.h.value = hsl.h;
      hslSliders.s.value = hsl.s; hslNums.s.value = hsl.s;
      hslSliders.l.value = hsl.l; hslNums.l.value = hsl.l;
    }

    // Previews
    const solid = cssColor(colorF, 1);
    const withAlpha = cssColor(colorF);

    previewDefault.querySelector('.color-fill').style.backgroundColor = solid;
    previewDefault.querySelector('.color-fill').style.opacity = clamp(colorF.a, 0, 1);

    const neonFill = previewNeon.querySelector('.color-fill');
    neonFill.style.backgroundColor = solid;
    neonFill.style.opacity = 1;
    neonFill.style.boxShadow = `inset 0 0 30px ${solid}, 0 0 40px ${solid}, 0 0 80px ${solid}`;

    const transFill = previewTransparent.querySelector('.color-fill');
    transFill.style.backgroundColor = solid;
    transFill.style.opacity = clamp(colorF.a, 0, 1);

    // Output
    outputValue.textContent = `{ r: ${parseFloat(colorF.r).toFixed(3)}, g: ${parseFloat(colorF.g).toFixed(3)}, b: ${parseFloat(colorF.b).toFixed(3)}, a: ${parseFloat(colorF.a).toFixed(3)} }`;
  }

  // --- Event Wiring ---

  // RGB sliders
  for (const c of ['r','g','b','a']) {
    const onRgb = () => {
      rgbNums[c].value = rgbSliders[c].value;
      const rgb = {
        r: parseInt(rgbSliders.r.value),
        g: parseInt(rgbSliders.g.value),
        b: parseInt(rgbSliders.b.value),
        a: parseInt(rgbSliders.a.value),
      };
      colorF = rgbToFloat(rgb);
      updateAll('rgb');
    };
    rgbSliders[c].addEventListener('input', onRgb);

    rgbNums[c].addEventListener('input', () => {
      let v = parseInt(rgbNums[c].value);
      if (isNaN(v)) return;
      v = clamp(v, 0, 255);
      rgbSliders[c].value = v;
      onRgb();
    });
  }

  // Float inputs
  for (const c of ['r','g','b','a']) {
    floatIns[c].addEventListener('input', () => {
      let v = parseFloat(floatIns[c].value);
      if (isNaN(v)) return;
      if (!moddedMode) v = clamp(v, 0, 1);
      else v = clamp(v, -5, 5);
      colorF[c] = v;
      updateAll('float');
    });
  }

  // Hex
  hexInput.addEventListener('input', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    const rgb = hexToRgb(val);
    if (!rgb) return;
    const f = rgbToFloat({ ...rgb, a: 255 });
    colorF.r = f.r; colorF.g = f.g; colorF.b = f.b;
    // keep current alpha
    updateAll('hex');
  });

  // HSV
  function onHsv() {
    const h = parseInt(hsvSliders.h.value);
    const s = parseInt(hsvSliders.s.value);
    const v = parseInt(hsvSliders.v.value);
    const rgb = hsvToRgb(h, s, v);
    const f = rgbToFloat({ ...rgb, a: Math.round(clamp(colorF.a, 0, 1) * 255) });
    colorF.r = f.r; colorF.g = f.g; colorF.b = f.b;
    updateAll('hsv');
  }

  for (const c of ['h','s','v']) {
    hsvSliders[c].addEventListener('input', () => {
      hsvNums[c].value = hsvSliders[c].value;
      onHsv();
    });
    hsvNums[c].addEventListener('input', () => {
      let v = parseInt(hsvNums[c].value);
      if (isNaN(v)) return;
      const maxV = c === 'h' ? 360 : 100;
      v = clamp(v, 0, maxV);
      hsvSliders[c].value = v;
      onHsv();
    });
  }

  // HSL
  function onHsl() {
    const h = parseInt(hslSliders.h.value);
    const s = parseInt(hslSliders.s.value);
    const l = parseInt(hslSliders.l.value);
    const rgb = hslToRgb(h, s, l);
    const f = rgbToFloat({ ...rgb, a: Math.round(clamp(colorF.a, 0, 1) * 255) });
    colorF.r = f.r; colorF.g = f.g; colorF.b = f.b;
    updateAll('hsl');
  }

  for (const c of ['h','s','l']) {
    hslSliders[c].addEventListener('input', () => {
      hslNums[c].value = hslSliders[c].value;
      onHsl();
    });
    hslNums[c].addEventListener('input', () => {
      let v = parseInt(hslNums[c].value);
      if (isNaN(v)) return;
      const maxV = c === 'h' ? 360 : 100;
      v = clamp(v, 0, maxV);
      hslSliders[c].value = v;
      onHsl();
    });
  }

  // --- Modded Mode ---
  moddedToggle.addEventListener('change', () => {
    moddedMode = moddedToggle.checked;
    moddedWarning.classList.toggle('visible', moddedMode);

    for (const c of ['r','g','b','a']) {
      if (moddedMode) {
        floatIns[c].min = -5;
        floatIns[c].max = 5;
      } else {
        floatIns[c].min = 0;
        floatIns[c].max = 1;
        // clamp current values back
        colorF[c] = clamp(colorF[c], 0, 1);
      }
    }
    updateAll(null);
  });

  // --- Copy to Clipboard ---
  copyBtn.addEventListener('click', () => {
    const text = outputValue.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    });
  });

  // --- Presets ---
  const presets = [
    { name: 'Pure White',   r: 1,    g: 1,   b: 1,    a: 1, modded: false },
    { name: 'Void Black',   r: 0,    g: 0,   b: 0,    a: 1, modded: false },
    { name: 'Neon Pink',    r: 5,    g: 0,   b: 2,    a: 1, modded: true  },
    { name: 'Toxic Green',  r: -0.5, g: 3,   b: -0.5, a: 1, modded: true  },
    { name: 'Rainbow Glow', r: 3,    g: 0,   b: 5,    a: 1, modded: true  },
    { name: 'Invisible',    r: 0,    g: 0,   b: 0,    a: 0, modded: true  },
  ];

  const presetList = $('preset-list');
  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.title = p.name;

    const fill = document.createElement('span');
    fill.className = 'preset-fill';
    const displayR = Math.round(clamp(p.r, 0, 1) * 255);
    const displayG = Math.round(clamp(p.g, 0, 1) * 255);
    const displayB = Math.round(clamp(p.b, 0, 1) * 255);
    const displayA = clamp(p.a, 0, 1);
    fill.style.backgroundColor = `rgba(${displayR}, ${displayG}, ${displayB}, ${displayA})`;
    btn.appendChild(fill);

    // Glow for modded presets
    if (p.modded) {
      btn.style.boxShadow = `0 0 10px rgba(${displayR}, ${displayG}, ${displayB}, 0.6)`;
    }

    const label = document.createElement('span');
    label.className = 'preset-label';
    label.textContent = p.name + (p.modded ? ' (modded)' : '');
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      // Enable modded mode if needed
      if (p.modded && !moddedMode) {
        moddedToggle.checked = true;
        moddedToggle.dispatchEvent(new Event('change'));
      }
      colorF = { r: p.r, g: p.g, b: p.b, a: p.a };
      updateAll(null);
    });

    presetList.appendChild(btn);
  });

  // --- Initial render ---
  updateAll(null);

})();
