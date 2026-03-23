(function () {
  // Only run on index.html or root path
  var path = window.location.pathname;
  if (
    path !== '/' &&
    path !== '/index.html' &&
    !path.endsWith('/index.html') &&
    !path.endsWith('/')
  ) {
    return;
  }

  // Skip if already seen this session
  if (sessionStorage.getItem('polarstools_intro_seen')) {
    return;
  }

  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '.intro-overlay {',
    '  position: fixed;',
    '  top: 0; left: 0;',
    '  width: 100%; height: 100%;',
    '  z-index: 9999;',
    '  background: #050510;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  transition: opacity 0.5s ease;',
    '}',
    '.intro-overlay.fade-out {',
    '  opacity: 0;',
    '  pointer-events: none;',
    '}',
    '.intro-letter {',
    '  position: absolute;',
    '  font-size: clamp(3rem, 6vw, 5rem);',
    '  font-weight: 900;',
    '  background: linear-gradient(135deg, #8b5cf6, #00d4ff);',
    '  -webkit-background-clip: text;',
    '  -webkit-text-fill-color: transparent;',
    '  background-clip: text;',
    '  opacity: 0;',
    '  animation: shatterIn 1.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;',
    '}',
    '.intro-particle {',
    '  position: absolute;',
    '  border-radius: 50%;',
    '  opacity: 0;',
    '  animation: shatterIn 2s cubic-bezier(0.23, 1, 0.32, 1) forwards;',
    '}',
    '@keyframes shatterIn {',
    '  from {',
    '    transform: translate(var(--sx), var(--sy)) rotate(var(--sr)) scale(0);',
    '    opacity: 0;',
    '  }',
    '  50% { opacity: 1; }',
    '  to {',
    '    transform: translate(0, 0) rotate(0deg) scale(1);',
    '    opacity: 1;',
    '  }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'intro-overlay';
  document.body.appendChild(overlay);

  var text = 'PolarsTools';
  var letters = text.split('');

  // Measure letter widths using a hidden span
  var measureContainer = document.createElement('span');
  measureContainer.style.cssText =
    'position:absolute;visibility:hidden;font-size:clamp(3rem,6vw,5rem);font-weight:900;white-space:nowrap;';
  document.body.appendChild(measureContainer);

  var letterWidths = [];
  var totalWidth = 0;
  letters.forEach(function (ch) {
    var span = document.createElement('span');
    span.textContent = ch;
    measureContainer.appendChild(span);
    var w = span.getBoundingClientRect().width;
    letterWidths.push(w);
    totalWidth += w;
    measureContainer.removeChild(span);
  });
  document.body.removeChild(measureContainer);

  // Calculate each letter's final X offset from center
  var cx = window.innerWidth / 2;
  var cy = window.innerHeight / 2;
  var startX = -totalWidth / 2;

  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  var particleColors = ['#8b5cf6', '#00d4ff', '#ff006e'];

  // Create letter spans
  var runningX = startX;
  letters.forEach(function (ch, i) {
    var span = document.createElement('span');
    span.className = 'intro-letter';
    span.textContent = ch;

    // Final position: center of this letter
    var finalX = cx + runningX + letterWidths[i] / 2;
    var finalY = cy;
    runningX += letterWidths[i];

    // Position the letter at its final assembled location
    // The shatterIn animation moves FROM (--sx, --sy) TO (0,0),
    // so we place the element at its final position and set custom props for the random start offset
    span.style.left = finalX + 'px';
    span.style.top = finalY + 'px';
    span.style.transform = 'translate(-50%, -50%)';

    // Random start offsets
    var sx = randRange(-600, 600) + 'px';
    var sy = randRange(-400, 400) + 'px';
    var sr = randRange(-180, 180) + 'deg';
    span.style.setProperty('--sx', sx);
    span.style.setProperty('--sy', sy);
    span.style.setProperty('--sr', sr);

    // Stagger delay
    span.style.animationDelay = (200 + i * 80) + 'ms';

    overlay.appendChild(span);
  });

  // Create particle trails
  for (var p = 0; p < 30; p++) {
    var dot = document.createElement('div');
    dot.className = 'intro-particle';

    var size = randRange(2, 4);
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';

    var color = particleColors[Math.floor(Math.random() * particleColors.length)];
    dot.style.backgroundColor = color;

    // Particles fly toward center area
    var targetX = cx + randRange(-totalWidth / 2, totalWidth / 2);
    var targetY = cy + randRange(-20, 20);
    dot.style.left = targetX + 'px';
    dot.style.top = targetY + 'px';
    dot.style.transform = 'translate(-50%, -50%)';

    dot.style.setProperty('--sx', randRange(-600, 600) + 'px');
    dot.style.setProperty('--sy', randRange(-400, 400) + 'px');
    dot.style.setProperty('--sr', randRange(-180, 180) + 'deg');

    dot.style.animationDelay = randRange(100, 600) + 'ms';

    overlay.appendChild(dot);
  }

  // After letters assemble (~200ms base + 10 letters * 80ms + 1500ms animation = ~2500ms), hold 500ms, then fade
  var assembleTime = 200 + letters.length * 80 + 1500;
  var holdTime = 500;
  var fadeTime = 500;

  setTimeout(function () {
    overlay.classList.add('fade-out');
    setTimeout(function () {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      sessionStorage.setItem('polarstools_intro_seen', 'true');
    }, fadeTime);
  }, assembleTime + holdTime);
})();
