(function() {
  'use strict';

  var COOKIE_NAME = 'DONT_DELETE_THIS';
  var COOKIE_VALUE = 'polarstools_verified';
  var LS_KEY = 'polarstools_protected';
  var CHAOS_DURATION = 10000;

  // --- Cookie helpers ---
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
  }

  // --- Zalgo text generator ---
  var zalgoChars = [
    '\u0300','\u0301','\u0302','\u0303','\u0304','\u0305','\u0306','\u0307',
    '\u0308','\u0309','\u030A','\u030B','\u030C','\u030D','\u030E','\u030F',
    '\u0310','\u0311','\u0312','\u0313','\u0314','\u0315','\u0316','\u0317',
    '\u0318','\u0319','\u031A','\u031B','\u031C','\u031D','\u031E','\u031F',
    '\u0320','\u0321','\u0322','\u0323','\u0324','\u0325','\u0326','\u0327',
    '\u0328','\u0329','\u032A','\u032B','\u032C','\u032D','\u032E','\u032F',
    '\u0330','\u0331','\u0332','\u0333','\u0334','\u0335','\u0336','\u0337',
    '\u0338','\u0339','\u033A','\u033B','\u033C','\u033D','\u033E','\u033F',
    '\u0340','\u0341','\u0342','\u0343','\u0344','\u0345','\u0346','\u0347',
    '\u0348','\u0349','\u034A','\u034B','\u034C','\u034D','\u034E','\u034F',
    '\u0350','\u0351','\u0352','\u0353','\u0354','\u0355','\u0356','\u0357',
    '\u0358','\u0359','\u035A','\u035B','\u035C','\u035D','\u035E','\u035F',
    '\u0360','\u0361','\u0362','\u0363','\u0364','\u0365','\u0366','\u0367',
    '\u0368','\u0369','\u036A','\u036B','\u036C','\u036D','\u036E','\u036F'
  ];

  function toZalgo(text) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += text[i];
      var count = Math.floor(Math.random() * 8) + 2;
      for (var j = 0; j < count; j++) {
        result += zalgoChars[Math.floor(Math.random() * zalgoChars.length)];
      }
    }
    return result;
  }

  // --- Random helpers ---
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randNeonColor() {
    var neons = [
      '#ff0000','#ff00ff','#00ff00','#00ffff','#ffff00','#ff6600',
      '#ff0099','#9900ff','#00ff99','#ff3333','#33ff33','#3333ff',
      '#ff00cc','#cc00ff','#00ccff','#ffcc00','#ff0066','#66ff00'
    ];
    return neons[Math.floor(Math.random() * neons.length)];
  }

  var cursorTypes = [
    'default','pointer','crosshair','move','text','wait','help',
    'not-allowed','grab','grabbing','zoom-in','zoom-out','col-resize',
    'row-resize','n-resize','e-resize','s-resize','w-resize','cell','copy'
  ];

  var scaryTitles = [
    'WHY DID YOU DO THAT?!',
    'THE COOKIE WAS PROTECTING YOU',
    'YOU DELETED IT... WHY?!',
    'DONT DELETE THE COOKIE',
    'I WARNED YOU',
    'CHAOS MODE ACTIVATED',
    'YOU BROKE EVERYTHING',
    'THIS IS YOUR FAULT',
    'RESTORE THE COOKIE',
    'WHAT HAVE YOU DONE',
    'THE COOKIE... ITS GONE',
    'ERROR: COOKIE NOT FOUND',
    'SYSTEM FAILURE',
    'UNAUTHORIZED COOKIE DELETION',
    'PROTECTION BREACH DETECTED'
  ];

  // --- CHAOS MODE ---
  function triggerChaos() {
    var intervals = [];
    var timeouts = [];
    var glitchElements = [];
    var audioCtx = null;
    var oscillator = null;
    var gainNode = null;

    // Add chaos-mode class to body
    document.body.classList.add('chaos-mode');

    // Inject chaos CSS animations
    var chaosStyle = document.createElement('style');
    chaosStyle.id = 'chaos-style';
    chaosStyle.textContent = [
      '@keyframes chaosShake {',
      '  0% { transform: translate(0, 0) rotate(0deg); }',
      '  10% { transform: translate(-5px, 3px) rotate(-2deg); }',
      '  20% { transform: translate(3px, -5px) rotate(3deg); }',
      '  30% { transform: translate(-3px, 2px) rotate(-1deg); }',
      '  40% { transform: translate(5px, -3px) rotate(2deg); }',
      '  50% { transform: translate(-2px, 5px) rotate(-3deg); }',
      '  60% { transform: translate(4px, -2px) rotate(1deg); }',
      '  70% { transform: translate(-5px, 4px) rotate(-2deg); }',
      '  80% { transform: translate(2px, -4px) rotate(3deg); }',
      '  90% { transform: translate(-3px, 3px) rotate(-1deg); }',
      '  100% { transform: translate(0, 0) rotate(0deg); }',
      '}',
      '@keyframes chaosSpin {',
      '  0% { transform: rotate(0deg) scale(1); }',
      '  25% { transform: rotate(90deg) scale(0.9); }',
      '  50% { transform: rotate(180deg) scale(1.1); }',
      '  75% { transform: rotate(270deg) scale(0.95); }',
      '  100% { transform: rotate(360deg) scale(1); }',
      '}',
      '.chaos-mode {',
      '  animation: chaosSpin 3s linear infinite !important;',
      '  overflow: hidden !important;',
      '}',
      '.chaos-mode * {',
      '  animation: chaosShake 0.15s infinite !important;',
      '}'
    ].join('\n');
    document.head.appendChild(chaosStyle);

    // 1. Background color cycling every 50ms
    intervals.push(setInterval(function() {
      document.body.style.backgroundColor = randNeonColor();
    }, 50));

    // 2. Randomize all text elements
    var textTags = ['p','h1','h2','h3','h4','h5','h6','span','a','li','td','th','label','button','div'];
    intervals.push(setInterval(function() {
      var els = document.querySelectorAll(textTags.join(','));
      for (var i = 0; i < els.length; i++) {
        els[i].style.color = randNeonColor();
        els[i].style.fontSize = randInt(8, 48) + 'px';
        els[i].style.transform = 'rotate(' + randInt(-30, 30) + 'deg)';
      }
    }, 200));

    // 3. Scramble text with zalgo
    var originalTexts = [];
    var textNodes = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim().length > 0) {
        originalTexts.push(node.textContent);
        textNodes.push(node);
      }
    }
    intervals.push(setInterval(function() {
      for (var i = 0; i < textNodes.length; i++) {
        try {
          textNodes[i].textContent = toZalgo(originalTexts[i]);
        } catch(e) {}
      }
    }, 500));

    // 4. Alert popups (staggered, not blocking everything at once)
    var alerts = [
      'WHY DID YOU DELETE THE COOKIE?!',
      'YOU WERE WARNED!',
      'DONT DELETE THE COOKIE!',
      'THE COOKIE WAS PROTECTING YOU!'
    ];
    for (var a = 0; a < alerts.length; a++) {
      (function(msg, delay) {
        timeouts.push(setTimeout(function() { alert(msg); }, delay));
      })(alerts[a], a * 1500);
    }

    // 5. Duplicate random elements and scatter them
    intervals.push(setInterval(function() {
      var allEls = document.body.querySelectorAll('*');
      if (allEls.length > 0) {
        var el = allEls[Math.floor(Math.random() * allEls.length)];
        try {
          var clone = el.cloneNode(true);
          clone.style.position = 'fixed';
          clone.style.top = randInt(0, window.innerHeight) + 'px';
          clone.style.left = randInt(0, window.innerWidth) + 'px';
          clone.style.zIndex = '99999';
          clone.style.pointerEvents = 'none';
          clone.style.opacity = '0.7';
          clone.classList.add('chaos-clone');
          document.body.appendChild(clone);
        } catch(e) {}
      }
    }, 300));

    // 6. Glitch effect - random black/white rectangles
    intervals.push(setInterval(function() {
      var glitch = document.createElement('div');
      glitch.style.position = 'fixed';
      glitch.style.top = randInt(0, window.innerHeight) + 'px';
      glitch.style.left = randInt(0, window.innerWidth) + 'px';
      glitch.style.width = randInt(20, 300) + 'px';
      glitch.style.height = randInt(5, 80) + 'px';
      glitch.style.backgroundColor = Math.random() > 0.5 ? '#000' : '#fff';
      glitch.style.zIndex = '999999';
      glitch.style.pointerEvents = 'none';
      glitch.style.opacity = String(Math.random() * 0.8 + 0.2);
      glitch.classList.add('chaos-glitch');
      document.body.appendChild(glitch);
      glitchElements.push(glitch);
      // Remove after short time to prevent too much buildup
      setTimeout(function() {
        try { glitch.remove(); } catch(e) {}
      }, 200);
    }, 80));

    // 7. Web Audio API - annoying buzzing sound (moderate volume)
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.15; // moderate volume, not harmful
      gainNode.connect(audioCtx.destination);

      oscillator = audioCtx.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 440;
      oscillator.connect(gainNode);
      oscillator.start();

      // Wobble the frequency for extra annoyance
      intervals.push(setInterval(function() {
        if (oscillator) {
          oscillator.frequency.value = randInt(100, 2000);
          oscillator.type = ['sawtooth','square','triangle','sine'][randInt(0,3)];
        }
      }, 150));
    } catch(e) {}

    // 8. Random cursor types
    intervals.push(setInterval(function() {
      document.body.style.cursor = cursorTypes[Math.floor(Math.random() * cursorTypes.length)];
    }, 100));

    // 9. Page title cycling
    intervals.push(setInterval(function() {
      document.title = scaryTitles[Math.floor(Math.random() * scaryTitles.length)];
    }, 200));

    // 10. Random scrolling
    intervals.push(setInterval(function() {
      window.scrollTo(randInt(0, document.body.scrollWidth), randInt(0, document.body.scrollHeight));
    }, 100));

    // --- AUTO-RECOVER after CHAOS_DURATION ---
    setTimeout(function() {
      // Stop all intervals
      for (var i = 0; i < intervals.length; i++) clearInterval(intervals[i]);
      for (var t = 0; t < timeouts.length; t++) clearTimeout(timeouts[t]);

      // Stop audio
      try {
        if (oscillator) oscillator.stop();
        if (audioCtx) audioCtx.close();
      } catch(e) {}

      // Final alert
      alert("Refresh the page and DON'T delete the cookie next time!");

      // Restore the cookie
      setCookie(COOKIE_NAME, COOKIE_VALUE, 365);
      localStorage.setItem(LS_KEY, 'true');

      // Reload to clean up
      window.location.reload();
    }, CHAOS_DURATION);
  }

  // --- MAIN LOGIC ---
  var cookieExists = getCookie(COOKIE_NAME) === COOKIE_VALUE;
  var wasProtected = localStorage.getItem(LS_KEY) === 'true';

  if (!cookieExists && !wasProtected) {
    // First visit ever - set cookie and localStorage
    setCookie(COOKIE_NAME, COOKIE_VALUE, 365);
    localStorage.setItem(LS_KEY, 'true');
  } else if (cookieExists) {
    // Cookie exists, all good - refresh it
    setCookie(COOKIE_NAME, COOKIE_VALUE, 365);
  } else if (!cookieExists && wasProtected) {
    // Cookie was DELETED! Trigger chaos after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', triggerChaos);
    } else {
      triggerChaos();
    }
  }
})();
