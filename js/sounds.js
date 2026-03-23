(function () {
  'use strict';

  // --- Param references ---
  const params = {
    volume:      { el: document.getElementById('p-volume'),      vEl: document.getElementById('v-volume') },
    wave:        { el: document.getElementById('p-wave') },
    attack:      { el: document.getElementById('p-attack'),      vEl: document.getElementById('v-attack') },
    sustain:     { el: document.getElementById('p-sustain'),     vEl: document.getElementById('v-sustain') },
    release:     { el: document.getElementById('p-release'),     vEl: document.getElementById('v-release') },
    punch:       { el: document.getElementById('p-punch'),       vEl: document.getElementById('v-punch') },
    freqBase:    { el: document.getElementById('p-freqBase'),    vEl: document.getElementById('v-freqBase') },
    freqLimit:   { el: document.getElementById('p-freqLimit'),   vEl: document.getElementById('v-freqLimit') },
    freqRamp:    { el: document.getElementById('p-freqRamp'),    vEl: document.getElementById('v-freqRamp') },
    vibStrength: { el: document.getElementById('p-vibStrength'), vEl: document.getElementById('v-vibStrength') },
    vibSpeed:    { el: document.getElementById('p-vibSpeed'),    vEl: document.getElementById('v-vibSpeed') },
    duty:        { el: document.getElementById('p-duty'),        vEl: document.getElementById('v-duty') }
  };

  const previewBtn = document.getElementById('preview-btn');
  const exportBtn = document.getElementById('export-btn');
  const exportArea = document.getElementById('export-area');
  const exportOutput = document.getElementById('export-output');
  const copyExportBtn = document.getElementById('copy-export-btn');
  const statusArea = document.getElementById('status-area');

  // Wire up value displays
  Object.keys(params).forEach(key => {
    const p = params[key];
    if (p.vEl && p.el.type === 'range') {
      p.el.addEventListener('input', () => { p.vEl.textContent = p.el.value; });
    }
  });

  function getValues() {
    return {
      volume:      parseInt(params.volume.el.value) / 100,
      wave:        params.wave.el.value,
      attack:      parseInt(params.attack.el.value) / 100,
      sustain:     parseInt(params.sustain.el.value) / 100,
      release:     parseInt(params.release.el.value) / 100,
      punch:       parseInt(params.punch.el.value) / 100,
      freqBase:    parseInt(params.freqBase.el.value),
      freqLimit:   parseInt(params.freqLimit.el.value),
      freqRamp:    parseInt(params.freqRamp.el.value) / 100,
      vibStrength: parseInt(params.vibStrength.el.value) / 100,
      vibSpeed:    parseInt(params.vibSpeed.el.value) / 100,
      duty:        parseInt(params.duty.el.value) / 100
    };
  }

  function setValues(v) {
    params.volume.el.value = Math.round(v.volume * 100);
    params.volume.vEl.textContent = params.volume.el.value;
    params.wave.el.value = v.wave;
    params.attack.el.value = Math.round(v.attack * 100);
    params.attack.vEl.textContent = params.attack.el.value;
    params.sustain.el.value = Math.round(v.sustain * 100);
    params.sustain.vEl.textContent = params.sustain.el.value;
    params.release.el.value = Math.round(v.release * 100);
    params.release.vEl.textContent = params.release.el.value;
    params.punch.el.value = Math.round(v.punch * 100);
    params.punch.vEl.textContent = params.punch.el.value;
    params.freqBase.el.value = v.freqBase;
    params.freqBase.vEl.textContent = v.freqBase;
    params.freqLimit.el.value = v.freqLimit;
    params.freqLimit.vEl.textContent = v.freqLimit;
    params.freqRamp.el.value = Math.round(v.freqRamp * 100);
    params.freqRamp.vEl.textContent = params.freqRamp.el.value;
    params.vibStrength.el.value = Math.round(v.vibStrength * 100);
    params.vibStrength.vEl.textContent = params.vibStrength.el.value;
    params.vibSpeed.el.value = Math.round(v.vibSpeed * 100);
    params.vibSpeed.vEl.textContent = params.vibSpeed.el.value;
    params.duty.el.value = Math.round(v.duty * 100);
    params.duty.vEl.textContent = params.duty.el.value;
  }

  // --- Presets ---
  const PRESETS = {
    explosion: { volume: 0.9, wave: 'noise', attack: 0.01, sustain: 0.3, release: 0.5, punch: 0.8, freqBase: 200, freqLimit: 20, freqRamp: -0.5, vibStrength: 0, vibSpeed: 0, duty: 0.5 },
    laser:     { volume: 0.7, wave: 'sawtooth', attack: 0.01, sustain: 0.1, release: 0.2, punch: 0, freqBase: 1200, freqLimit: 200, freqRamp: -0.7, vibStrength: 0, vibSpeed: 0, duty: 0.5 },
    jump:      { volume: 0.6, wave: 'square', attack: 0.01, sustain: 0.1, release: 0.3, punch: 0, freqBase: 300, freqLimit: 600, freqRamp: 0.5, vibStrength: 0, vibSpeed: 0, duty: 0.5 },
    coin:      { volume: 0.5, wave: 'sine', attack: 0.01, sustain: 0.05, release: 0.4, punch: 0, freqBase: 800, freqLimit: 1200, freqRamp: 0.3, vibStrength: 0, vibSpeed: 0, duty: 0.5 },
    powerup:   { volume: 0.7, wave: 'square', attack: 0.05, sustain: 0.3, release: 0.5, punch: 0.2, freqBase: 400, freqLimit: 1000, freqRamp: 0.4, vibStrength: 0.3, vibSpeed: 0.5, duty: 0.4 }
  };

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.preset];
      if (p) setValues(p);
    });
  });

  // --- Preview using Web Audio API ---
  let audioCtx = null;

  function playSound() {
    const v = getValues();
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const duration = v.attack + v.sustain + v.release;
    const now = audioCtx.currentTime;

    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(v.volume * (1 + v.punch), now + Math.max(v.attack, 0.005));
    gainNode.gain.linearRampToValueAtTime(v.volume, now + v.attack + 0.01);
    gainNode.gain.setValueAtTime(v.volume, now + v.attack + v.sustain);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    if (v.wave === 'noise') {
      // White noise via buffer
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.connect(gainNode);
      noise.start(now);
      noise.stop(now + duration + 0.05);
    } else {
      const osc = audioCtx.createOscillator();
      osc.type = v.wave;
      osc.frequency.setValueAtTime(v.freqBase, now);

      // Frequency ramp
      const targetFreq = v.freqLimit > 0 ? v.freqLimit : (v.freqBase + v.freqRamp * v.freqBase);
      osc.frequency.linearRampToValueAtTime(Math.max(20, targetFreq), now + duration);

      // Vibrato
      if (v.vibStrength > 0 && v.vibSpeed > 0) {
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = v.vibSpeed * 50;
        lfoGain.gain.value = v.vibStrength * v.freqBase * 0.3;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + duration + 0.05);
      }

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }
  }

  previewBtn.addEventListener('click', () => {
    try {
      playSound();
    } catch (err) {
      showStatus('Audio error: ' + err.message, 'error');
    }
  });

  // --- Export ---
  exportBtn.addEventListener('click', () => {
    const v = getValues();
    const output = {
      soundGenerator: {
        waveType: v.wave === 'square' ? 0 : v.wave === 'sawtooth' ? 1 : v.wave === 'sine' ? 2 : 3,
        volume: v.volume,
        envelope: {
          attack: v.attack,
          sustain: v.sustain,
          release: v.release,
          punch: v.punch
        },
        frequency: {
          base: v.freqBase,
          limit: v.freqLimit,
          ramp: v.freqRamp
        },
        vibrato: {
          strength: v.vibStrength,
          speed: v.vibSpeed
        },
        dutyCycle: v.duty
      }
    };

    exportOutput.textContent = JSON.stringify(output, null, 2);
    exportArea.style.display = 'block';
  });

  copyExportBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(exportOutput.textContent).then(() => {
      showStatus('Copied to clipboard!', 'success');
    }).catch(() => {
      showStatus('Failed to copy. Please select and copy manually.', 'error');
    });
  });

  function showStatus(msg, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = msg;
    setTimeout(() => { statusArea.style.display = 'none'; }, 3000);
  }

})();
