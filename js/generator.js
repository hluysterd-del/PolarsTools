(function () {
  'use strict';

  // --- DOM refs ---
  var descInput = document.getElementById('gen-description');
  var presetButtons = document.querySelectorAll('.btn-preset');
  var difficultySlider = document.getElementById('difficulty-slider');
  var difficultyLabel = document.getElementById('difficulty-label');
  var sizeSlider = document.getElementById('size-slider');
  var sizeLabel = document.getElementById('size-label');
  var generateBtn = document.getElementById('generate-btn');
  var statusArea = document.getElementById('status-area');
  var previewCard = document.getElementById('preview-card');
  var previewTitle = document.getElementById('preview-title');
  var previewNodes = document.getElementById('preview-nodes');
  var previewDifficulty = document.getElementById('preview-difficulty');
  var previewSize = document.getElementById('preview-size');
  var previewSummary = document.getElementById('preview-summary');
  var downloadBtn = document.getElementById('download-btn');

  var currentLevelObj = null;
  var currentFilename = 'generated.level';

  var DIFFICULTY_LABELS = ['Easy', 'Medium', 'Hard'];
  var SIZE_LABELS = ['Small', 'Medium', 'Large', 'Huge'];

  // --- Enums matching proto ---
  var Shape = {
    START: 0, FINISH: 1, SIGN: 2,
    CUBE: 1000, SPHERE: 1001, CYLINDER: 1002,
    PYRAMID: 1003, PRISM: 1004, CONE: 1005, PYRAMIDSQUARE: 1006
  };

  var Material = {
    DEFAULT: 0, GRABBABLE: 1, ICE: 2, LAVA: 3, WOOD: 4,
    GRAPPLABLE: 5, GRAPPLABLE_LAVA: 6, GRABBABLE_CRUMBLING: 7,
    DEFAULT_COLORED: 8, BOUNCING: 9, SNOW: 10
  };

  // --- Helpers ---
  function showStatus(msg, type) {
    statusArea.style.display = 'block';
    statusArea.className = 'status-area' + (type ? ' ' + type : '');
    statusArea.innerHTML = msg;
  }

  function hideStatus() {
    statusArea.style.display = 'none';
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function vec(x, y, z) {
    return { x: x, y: y, z: z };
  }

  function quat(x, y, z, w) {
    return { x: x, y: y, z: z, w: w };
  }

  function identityQuat() {
    return quat(0, 0, 0, 1);
  }

  function yRotationQuat(angleDeg) {
    var rad = (angleDeg * Math.PI) / 180;
    return quat(0, Math.sin(rad / 2), 0, Math.cos(rad / 2));
  }

  function color(r, g, b, a) {
    return { r: r, g: g, b: b, a: a !== undefined ? a : 1 };
  }

  function randomColor() {
    return color(rand(0.1, 1), rand(0.1, 1), rand(0.1, 1), 1);
  }

  function randomPastel() {
    return color(rand(0.5, 1), rand(0.5, 1), rand(0.5, 1), 1);
  }

  var PLATFORM_SHAPES = [Shape.CUBE, Shape.CYLINDER, Shape.PRISM];

  // --- Node builders ---
  function makeStart(x, y, z) {
    return {
      levelNodeStart: {
        position: vec(x, y, z),
        rotation: identityQuat(),
        radius: 1
      }
    };
  }

  function makeFinish(x, y, z) {
    return {
      levelNodeFinish: {
        position: vec(x, y + 1, z),
        radius: 2
      }
    };
  }

  function makeStatic(shape, material, pos, scale, opts) {
    opts = opts || {};
    var node = {
      levelNodeStatic: {
        shape: shape,
        material: material,
        position: pos,
        scale: scale,
        rotation: opts.rotation || identityQuat(),
        color1: opts.color1 || randomPastel(),
        color2: opts.color2 || randomPastel(),
        isNeon: opts.isNeon || false,
        isTransparent: opts.isTransparent || false,
        isGrabbable: opts.isGrabbable || false
      }
    };
    return node;
  }

  function makeSign(x, y, z, text, opts) {
    opts = opts || {};
    return {
      levelNodeSign: {
        position: vec(x, y, z),
        rotation: opts.rotation || identityQuat(),
        scale: opts.scale || 1,
        text: text,
        color: opts.color || color(1, 1, 1, 1)
      }
    };
  }

  function makeAnimatedNode(shape, material, pos, scale, frames, opts) {
    opts = opts || {};
    var node = makeStatic(shape, material, pos, scale, opts);
    node.animations = [{
      name: 'move',
      frames: frames,
      direction: 1, // PINGPONG
      speed: opts.animSpeed || 1,
      interpolation: 0 // LINEAR
    }];
    node.activeAnimation = 0;
    return node;
  }

  // --- Keyword detection ---
  function detectKeywords(text) {
    var lower = text.toLowerCase();
    var keywords = {
      parkour: /parkour|jump|platform/i.test(lower),
      ice: /ice|frost|frozen|slipp|snow|cold/i.test(lower),
      lava: /lava|fire|burn|hot|magma|volcano/i.test(lower),
      tower: /tower|climb|tall|vertical|spiral|height/i.test(lower),
      slide: /slide|ramp|downhill|slope/i.test(lower),
      admin: /admin|abuse|troll|button|secret|hidden/i.test(lower),
      obstacle: /obstacle|course|challenge|difficult|hard/i.test(lower),
      wood: /wood|forest|cabin|tree|plank/i.test(lower),
      bounce: /bounce|trampoline|spring|bouncy/i.test(lower),
      grab: /grab|hang|swing|monkey/i.test(lower),
      showcase: /showcase|display|room|gallery|museum|exhibit/i.test(lower),
      neon: /neon|glow|bright|light/i.test(lower),
      floating: /float|sky|cloud|air|flying/i.test(lower),
      water: /water|ocean|sea|pool|swim/i.test(lower)
    };
    return keywords;
  }

  // --- Size multiplier ---
  function getSizeMultiplier(sizeIndex) {
    return [0.6, 1.0, 1.6, 2.4][sizeIndex] || 1.0;
  }

  function getNodeCount(sizeIndex) {
    return [8, 15, 25, 40][sizeIndex] || 15;
  }

  // --- Difficulty modifiers ---
  function getDifficultyMods(diffIndex) {
    return [
      { gapMin: 2, gapMax: 3, scaleMin: 2, scaleMax: 4, heightVar: 0.5 },    // easy
      { gapMin: 3, gapMax: 5, scaleMin: 1.5, scaleMax: 3, heightVar: 1.5 },  // medium
      { gapMin: 4, gapMax: 7, scaleMin: 1, scaleMax: 2, heightVar: 3 }       // hard
    ][diffIndex] || { gapMin: 3, gapMax: 5, scaleMin: 1.5, scaleMax: 3, heightVar: 1.5 };
  }

  // --- Preset descriptions ---
  var PRESET_DESCRIPTIONS = {
    parkour: 'A parkour course with jumping platforms at varying heights, some grabbable walls, leading to the finish',
    admin: 'A grass field with a secret underground button room and hidden passages',
    obstacle: 'An obstacle course with mixed materials, moving platforms, and lava floor sections',
    tower: 'A tall tower climb with platforms spiraling upward to the top',
    ice: 'A downhill ice slide with turns and ramps on a snowy mountain',
    showcase: 'An enclosed showcase room with display platforms and signs'
  };

  // --- Level generators ---

  function generateParkour(difficulty, sizeIdx) {
    var nodes = [];
    var mods = getDifficultyMods(difficulty);
    var count = getNodeCount(sizeIdx);
    var summary = [];

    // Ground at start
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, 0), vec(6, 1, 6), { color1: color(0.3, 0.6, 0.3, 1) }));
    nodes.push(makeStart(0, 1, 0));
    summary.push('Starting platform');

    var x = 0, y = 1, z = 6;
    for (var i = 0; i < count; i++) {
      var gap = rand(mods.gapMin, mods.gapMax);
      var platScale = rand(mods.scaleMin, mods.scaleMax);
      var heightChange = rand(-mods.heightVar, mods.heightVar * 1.5);
      z += gap;
      y = Math.max(0.5, y + heightChange);
      x += rand(-2, 2);

      var shape = pick(PLATFORM_SHAPES);
      var mat = Material.DEFAULT_COLORED;
      var opts = { color1: randomPastel() };

      // Every few platforms, add variety
      if (i % 4 === 2) {
        mat = Material.GRABBABLE;
        opts.isGrabbable = true;
        summary.push('Grabbable platform at node ' + (i + 1));
      }
      if (i % 5 === 3 && difficulty >= 1) {
        mat = Material.BOUNCING;
      }

      nodes.push(makeStatic(shape, mat, vec(x, y - 0.5, z), vec(platScale, 0.5, platScale), opts));
    }

    // Finish
    z += 4;
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(x, y - 0.5, z), vec(5, 1, 5), { color1: color(0.9, 0.85, 0.2, 1) }));
    nodes.push(makeFinish(x, y, z));
    summary.push('Finish platform with ' + count + ' parkour jumps');

    return { nodes: nodes, summary: summary.join('. ') + '.' };
  }

  function generateAdmin(difficulty, sizeIdx) {
    var nodes = [];
    var mult = getSizeMultiplier(sizeIdx);
    var summary = [];

    // Grass field
    var fieldSize = 20 * mult;
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, 0), vec(fieldSize, 1, fieldSize), { color1: color(0.2, 0.55, 0.15, 1) }));
    nodes.push(makeStart(0, 1, -fieldSize / 2 + 3));
    summary.push('Grass field (' + Math.round(fieldSize) + 'x' + Math.round(fieldSize) + ')');

    // Secret hatch entrance (small trigger-like area)
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(fieldSize / 2 - 3, -0.45, fieldSize / 2 - 3), vec(2, 0.15, 2), { color1: color(0.25, 0.5, 0.2, 1) }));
    nodes.push(makeSign(fieldSize / 2 - 3, 1.5, fieldSize / 2 - 3, '???', { scale: 0.5 }));
    summary.push('Hidden hatch in corner');

    // Underground room
    var roomY = -6;
    var roomSize = 8 * mult;
    // Floor
    nodes.push(makeStatic(Shape.CUBE, Material.WOOD, vec(0, roomY - 0.5, 0), vec(roomSize, 1, roomSize), { color1: color(0.5, 0.35, 0.2, 1) }));
    // Walls
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(-roomSize / 2, roomY + 2, 0), vec(0.5, 5, roomSize), { color1: color(0.4, 0.4, 0.45, 1) }));
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(roomSize / 2, roomY + 2, 0), vec(0.5, 5, roomSize), { color1: color(0.4, 0.4, 0.45, 1) }));
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, roomY + 2, -roomSize / 2), vec(roomSize, 5, 0.5), { color1: color(0.4, 0.4, 0.45, 1) }));
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, roomY + 2, roomSize / 2), vec(roomSize, 5, 0.5), { color1: color(0.4, 0.4, 0.45, 1) }));
    // Ceiling
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, roomY + 4.5, 0), vec(roomSize, 0.5, roomSize), { color1: color(0.35, 0.35, 0.4, 1) }));
    summary.push('Underground button room with walls and ceiling');

    // Button pedestal
    nodes.push(makeStatic(Shape.CYLINDER, Material.DEFAULT_COLORED, vec(0, roomY + 0.75, 0), vec(1, 1.5, 1), { color1: color(0.6, 0.6, 0.65, 1) }));
    nodes.push(makeStatic(Shape.SPHERE, Material.DEFAULT_COLORED, vec(0, roomY + 1.8, 0), vec(0.6, 0.3, 0.6), { color1: color(0.9, 0.15, 0.15, 1), isNeon: true }));
    nodes.push(makeSign(0, roomY + 2.5, 0, 'DO NOT PRESS', { color: color(1, 0.2, 0.2, 1) }));
    summary.push('Red button on pedestal with warning sign');

    // Drop shaft from surface to room
    nodes.push(makeStatic(Shape.CUBE, Material.GRABBABLE, vec(fieldSize / 2 - 3, roomY + 2, fieldSize / 2 - 3), vec(0.3, 10, 0.3), { color1: color(0.5, 0.5, 0.5, 1), isGrabbable: true }));

    // Finish on surface
    nodes.push(makeFinish(0, 1, fieldSize / 2 - 3));

    return { nodes: nodes, summary: summary.join('. ') + '.' };
  }

  function generateObstacle(difficulty, sizeIdx) {
    var nodes = [];
    var mods = getDifficultyMods(difficulty);
    var count = getNodeCount(sizeIdx);
    var summary = [];

    // Start platform
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, 0), vec(5, 1, 5), { color1: color(0.3, 0.7, 0.3, 1) }));
    nodes.push(makeStart(0, 1, 0));
    summary.push('Start platform');

    var z = 6;

    for (var i = 0; i < count; i++) {
      var section = i % 5;
      z += rand(3, 5);

      if (section === 0) {
        // Normal platform
        nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, z), vec(rand(2, 4), 1, 3), { color1: randomPastel() }));
      } else if (section === 1) {
        // Lava floor section - platforms above lava
        nodes.push(makeStatic(Shape.CUBE, Material.LAVA, vec(0, -1, z), vec(6, 0.5, 4)));
        nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(-2, 0, z), vec(1.2, 0.3, 1.2), { color1: color(0.8, 0.8, 0.8, 1) }));
        nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(2, 0, z), vec(1.2, 0.3, 1.2), { color1: color(0.8, 0.8, 0.8, 1) }));
        if (i < 3) summary.push('Lava floor section');
      } else if (section === 2) {
        // Moving platform
        var startZ = z;
        var endZ = z + 4;
        var frames = [
          { time: 0, position: vec(0, 0, startZ), rotation: identityQuat() },
          { time: 2, position: vec(0, 0, endZ), rotation: identityQuat() }
        ];
        nodes.push(makeAnimatedNode(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, startZ), vec(2.5, 0.5, 2.5), frames, { color1: color(0.3, 0.5, 0.9, 1), animSpeed: 0.8 }));
        if (i < 6) summary.push('Moving platform');
        z = endZ;
      } else if (section === 3) {
        // Ice section
        nodes.push(makeStatic(Shape.CUBE, Material.ICE, vec(0, -0.5, z), vec(3, 1, 5)));
        if (i < 8) summary.push('Ice section');
      } else {
        // Bouncy section
        nodes.push(makeStatic(Shape.CUBE, Material.BOUNCING, vec(0, -2, z), vec(3, 0.5, 3)));
        nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, 2, z + 5), vec(3, 0.5, 3), { color1: randomPastel() }));
        if (i < 12) summary.push('Bouncy launcher');
        z += 5;
      }
    }

    // Finish
    z += 5;
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, z), vec(5, 1, 5), { color1: color(0.9, 0.85, 0.2, 1) }));
    nodes.push(makeFinish(0, 1, z));
    summary.push('Finish platform');

    return { nodes: nodes, summary: summary.join('. ') + '.' };
  }

  function generateTower(difficulty, sizeIdx) {
    var nodes = [];
    var mods = getDifficultyMods(difficulty);
    var count = getNodeCount(sizeIdx);
    var summary = [];

    // Base platform
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, 0), vec(8, 1, 8), { color1: color(0.4, 0.4, 0.45, 1) }));
    nodes.push(makeStart(0, 1, 0));
    summary.push('Base platform');

    // Central column (decorative)
    var totalHeight = count * 2.5;
    nodes.push(makeStatic(Shape.CYLINDER, Material.DEFAULT_COLORED, vec(0, totalHeight / 2, 0), vec(1.5, totalHeight, 1.5), { color1: color(0.35, 0.35, 0.4, 1) }));
    summary.push('Central tower column');

    // Spiral platforms
    var radius = 5;
    var angleStep = 360 / Math.max(8, count);
    var y = 1;

    for (var i = 0; i < count; i++) {
      var angle = (i * angleStep) * Math.PI / 180;
      var px = Math.cos(angle) * radius;
      var pz = Math.sin(angle) * radius;
      y += rand(1.5, 3);

      var platSize = rand(mods.scaleMin, mods.scaleMax);
      var shape = pick(PLATFORM_SHAPES);
      var mat = Material.DEFAULT_COLORED;
      var opts = { color1: randomPastel() };

      // Variety
      if (i % 6 === 3) {
        mat = Material.GRABBABLE;
        opts.isGrabbable = true;
      }
      if (i % 7 === 5 && difficulty >= 1) {
        mat = Material.ICE;
      }
      if (i % 8 === 7 && difficulty >= 2) {
        mat = Material.GRABBABLE_CRUMBLING;
      }

      nodes.push(makeStatic(shape, mat, vec(px, y, pz), vec(platSize, 0.4, platSize), opts));
    }

    summary.push(count + ' spiral platforms reaching height ' + Math.round(y));

    // Top platform with finish
    nodes.push(makeStatic(Shape.CYLINDER, Material.DEFAULT_COLORED, vec(0, y + 2, 0), vec(5, 0.5, 5), { color1: color(0.9, 0.75, 0.1, 1) }));
    nodes.push(makeFinish(0, y + 3, 0));
    summary.push('Gold finish platform at the top');

    return { nodes: nodes, summary: summary.join('. ') + '.' };
  }

  function generateIceSlide(difficulty, sizeIdx) {
    var nodes = [];
    var mult = getSizeMultiplier(sizeIdx);
    var summary = [];

    var startY = 30 * mult;

    // Start at top
    nodes.push(makeStatic(Shape.CUBE, Material.SNOW, vec(0, startY, 0), vec(6, 1, 6)));
    nodes.push(makeStart(0, startY + 1, 0));
    summary.push('Mountain top start at height ' + Math.round(startY));

    // Generate downhill ice ramp segments
    var segments = Math.floor(10 * mult);
    var x = 0, y = startY, z = 4;
    var dir = 1; // 1 or -1 for left/right turns

    for (var i = 0; i < segments; i++) {
      var segLength = rand(6, 12);
      var drop = rand(2, 4);
      var prevX = x;
      var prevZ = z;

      z += segLength * 0.7;
      y -= drop;
      x += dir * rand(2, 5);

      // Ice ramp segment
      var dx = x - prevX;
      var dz = z - prevZ;
      var segLen = Math.sqrt(dx * dx + dz * dz);
      var midX = (prevX + x) / 2;
      var midZ = (prevZ + z) / 2;
      var midY = y + drop / 2;

      nodes.push(makeStatic(Shape.CUBE, Material.ICE, vec(midX, midY - 0.25, midZ), vec(4, 0.3, segLen)));

      // Side walls
      nodes.push(makeStatic(Shape.CUBE, Material.SNOW, vec(midX - 2.5, midY + 0.5, midZ), vec(0.5, 1.5, segLen)));
      nodes.push(makeStatic(Shape.CUBE, Material.SNOW, vec(midX + 2.5, midY + 0.5, midZ), vec(0.5, 1.5, segLen)));

      // Change direction sometimes
      if (i % 3 === 2) {
        dir *= -1;
      }
    }

    summary.push(segments + ' ice ramp segments with banked turns');

    // Landing / finish area
    y = Math.max(0, y - 2);
    nodes.push(makeStatic(Shape.CUBE, Material.SNOW, vec(x, y - 0.5, z + 5), vec(8, 1, 8)));
    nodes.push(makeFinish(x, y + 1, z + 5));
    summary.push('Snow landing area at the bottom');

    return { nodes: nodes, summary: summary.join('. ') + '.' };
  }

  function generateShowcase(difficulty, sizeIdx) {
    var nodes = [];
    var mult = getSizeMultiplier(sizeIdx);
    var summary = [];

    var roomW = 16 * mult;
    var roomH = 8;
    var roomD = 20 * mult;

    // Floor
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, -0.5, 0), vec(roomW, 1, roomD), { color1: color(0.15, 0.15, 0.2, 1) }));
    // Ceiling
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, roomH, 0), vec(roomW, 0.5, roomD), { color1: color(0.12, 0.12, 0.18, 1) }));
    // Walls
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(-roomW / 2, roomH / 2, 0), vec(0.5, roomH, roomD), { color1: color(0.2, 0.2, 0.28, 1) }));
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(roomW / 2, roomH / 2, 0), vec(0.5, roomH, roomD), { color1: color(0.2, 0.2, 0.28, 1) }));
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, roomH / 2, -roomD / 2), vec(roomW, roomH, 0.5), { color1: color(0.2, 0.2, 0.28, 1) }));
    nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(0, roomH / 2, roomD / 2), vec(roomW, roomH, 0.5), { color1: color(0.2, 0.2, 0.28, 1) }));
    summary.push('Enclosed room (' + Math.round(roomW) + 'x' + roomH + 'x' + Math.round(roomD) + ')');

    nodes.push(makeStart(0, 1, -roomD / 2 + 3));

    // Display pedestals along the sides
    var displayCount = Math.floor(4 * mult);
    var spacing = (roomD - 6) / (displayCount + 1);
    var displayShapes = [Shape.SPHERE, Shape.PYRAMID, Shape.CONE, Shape.PYRAMIDSQUARE, Shape.PRISM, Shape.CYLINDER];

    for (var i = 0; i < displayCount; i++) {
      var dz = -roomD / 2 + 3 + spacing * (i + 1);

      // Left side pedestal
      nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(-roomW / 2 + 3, 0.5, dz), vec(1.5, 1, 1.5), { color1: color(0.3, 0.3, 0.35, 1) }));
      // Display object
      var dispShape = displayShapes[i % displayShapes.length];
      nodes.push(makeStatic(dispShape, Material.DEFAULT_COLORED, vec(-roomW / 2 + 3, 1.6, dz), vec(0.8, 0.8, 0.8), { color1: randomColor(), isNeon: i % 2 === 0 }));
      // Sign
      nodes.push(makeSign(-roomW / 2 + 3, 2.8, dz, 'Display #' + (i + 1), { scale: 0.4 }));

      // Right side pedestal
      nodes.push(makeStatic(Shape.CUBE, Material.DEFAULT_COLORED, vec(roomW / 2 - 3, 0.5, dz), vec(1.5, 1, 1.5), { color1: color(0.3, 0.3, 0.35, 1) }));
      nodes.push(makeStatic(dispShape, Material.DEFAULT_COLORED, vec(roomW / 2 - 3, 1.6, dz), vec(0.8, 0.8, 0.8), { color1: randomColor(), isNeon: i % 2 === 1 }));
      nodes.push(makeSign(roomW / 2 - 3, 2.8, dz, 'Display #' + (displayCount + i + 1), { scale: 0.4 }));
    }

    summary.push(displayCount * 2 + ' display pedestals with neon objects and signs');

    // Title sign at entrance
    nodes.push(makeSign(0, 4, -roomD / 2 + 1.5, 'Welcome to the Showcase', { scale: 1.2, color: color(0.4, 0.8, 1, 1) }));

    // Finish at end of room
    nodes.push(makeFinish(0, 1, roomD / 2 - 3));

    return { nodes: nodes, summary: summary.join('. ') + '.' };
  }

  // --- Main generation from description ---
  function generateFromDescription(text, difficulty, sizeIdx) {
    var keywords = detectKeywords(text);

    // Determine primary type from keywords
    if (keywords.showcase) return generateShowcase(difficulty, sizeIdx);
    if (keywords.admin) return generateAdmin(difficulty, sizeIdx);
    if (keywords.tower) return generateTower(difficulty, sizeIdx);
    if (keywords.slide && keywords.ice) return generateIceSlide(difficulty, sizeIdx);
    if (keywords.ice && !keywords.parkour) return generateIceSlide(difficulty, sizeIdx);
    if (keywords.obstacle) return generateObstacle(difficulty, sizeIdx);
    if (keywords.slide) return generateIceSlide(difficulty, sizeIdx);
    if (keywords.tower) return generateTower(difficulty, sizeIdx);

    // Default / parkour / mixed
    var result = generateParkour(difficulty, sizeIdx);

    // Post-process: apply keyword modifiers to existing nodes
    if (keywords.ice || keywords.lava || keywords.wood || keywords.bounce || keywords.neon) {
      result.nodes.forEach(function (node) {
        if (node.levelNodeStatic) {
          var s = node.levelNodeStatic;
          if (s.material === Material.DEFAULT_COLORED || s.material === Material.DEFAULT) {
            if (keywords.ice && Math.random() < 0.4) s.material = Material.ICE;
            else if (keywords.lava && Math.random() < 0.3) s.material = Material.LAVA;
            else if (keywords.wood && Math.random() < 0.4) s.material = Material.WOOD;
            else if (keywords.bounce && Math.random() < 0.3) s.material = Material.BOUNCING;
          }
          if (keywords.neon && Math.random() < 0.5) s.isNeon = true;
        }
      });
      var mods = [];
      if (keywords.ice) mods.push('ice surfaces');
      if (keywords.lava) mods.push('lava hazards');
      if (keywords.wood) mods.push('wooden platforms');
      if (keywords.bounce) mods.push('bouncy sections');
      if (keywords.neon) mods.push('neon effects');
      result.summary += ' Modified with: ' + mods.join(', ') + '.';
    }

    return result;
  }

  // --- Build full level object ---
  function buildLevel(title, generatedResult) {
    var levelNodes = generatedResult.nodes.map(function (n) {
      // Wrap each node properly for the LevelNode oneof
      var levelNode = {};
      if (n.levelNodeStart) levelNode.levelNodeStart = n.levelNodeStart;
      else if (n.levelNodeFinish) levelNode.levelNodeFinish = n.levelNodeFinish;
      else if (n.levelNodeStatic) levelNode.levelNodeStatic = n.levelNodeStatic;
      else if (n.levelNodeSign) levelNode.levelNodeSign = n.levelNodeSign;
      else if (n.levelNodeCrumbling) levelNode.levelNodeCrumbling = n.levelNodeCrumbling;

      // Copy animations if present
      if (n.animations) {
        levelNode.animations = n.animations;
        levelNode.activeAnimation = n.activeAnimation || 0;
      }

      return levelNode;
    });

    return {
      formatVersion: 20,
      title: title,
      creators: 'PolarsTools Generator',
      description: 'Generated by PolarsTools Level Generator',
      complexity: levelNodes.length,
      maxCheckpointCount: 0,
      levelNodes: levelNodes,
      ambienceSettings: {
        skyZenithColor: color(0.05, 0.05, 0.2, 1),
        skyHorizonColor: color(0.15, 0.15, 0.35, 1),
        sunAltitude: 45,
        sunAzimuth: 180,
        sunSize: 1,
        fogDensity: 0
      }
    };
  }

  // --- Generate title from description ---
  function generateTitle(text, preset) {
    if (preset) {
      var presetTitles = {
        parkour: 'Parkour Course',
        admin: 'Admin Abuse',
        obstacle: 'Obstacle Course',
        tower: 'Tower Climb',
        ice: 'Ice Slide',
        showcase: 'Showcase Room'
      };
      return presetTitles[preset] || 'Generated Level';
    }

    // Derive from text
    var words = text.trim().split(/\s+/).slice(0, 5);
    if (words.length > 0 && words[0]) {
      return words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
    }
    return 'Generated Level';
  }

  // --- Slider updates ---
  difficultySlider.addEventListener('input', function () {
    difficultyLabel.textContent = DIFFICULTY_LABELS[this.value] || 'Medium';
  });

  sizeSlider.addEventListener('input', function () {
    sizeLabel.textContent = SIZE_LABELS[this.value] || 'Medium';
  });

  // --- Preset buttons ---
  var activePreset = null;

  presetButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var preset = this.getAttribute('data-preset');

      // Toggle off if same preset clicked again
      if (activePreset === preset) {
        activePreset = null;
        this.classList.remove('active');
        descInput.value = '';
        return;
      }

      // Deactivate all, activate this one
      presetButtons.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      activePreset = preset;
      descInput.value = PRESET_DESCRIPTIONS[preset] || '';
    });
  });

  // Clear active preset when user types
  descInput.addEventListener('input', function () {
    if (activePreset) {
      activePreset = null;
      presetButtons.forEach(function (b) { b.classList.remove('active'); });
    }
  });

  // --- Generate ---
  generateBtn.addEventListener('click', async function () {
    var text = descInput.value.trim();
    if (!text) {
      showStatus('Please enter a description or select a preset.', 'error');
      return;
    }

    hideStatus();
    generateBtn.disabled = true;
    showStatus('<span class="loading"></span> Generating level...', '');

    try {
      var difficulty = parseInt(difficultySlider.value, 10);
      var sizeIdx = parseInt(sizeSlider.value, 10);

      // If a preset is active, use its dedicated generator
      var result;
      if (activePreset === 'parkour') result = generateParkour(difficulty, sizeIdx);
      else if (activePreset === 'admin') result = generateAdmin(difficulty, sizeIdx);
      else if (activePreset === 'obstacle') result = generateObstacle(difficulty, sizeIdx);
      else if (activePreset === 'tower') result = generateTower(difficulty, sizeIdx);
      else if (activePreset === 'ice') result = generateIceSlide(difficulty, sizeIdx);
      else if (activePreset === 'showcase') result = generateShowcase(difficulty, sizeIdx);
      else result = generateFromDescription(text, difficulty, sizeIdx);

      var title = generateTitle(text, activePreset);
      var levelObj = buildLevel(title, result);

      // Validate by encoding
      var encoded = await ProtoHelper.encodeLevel(levelObj);
      if (!encoded || encoded.length === 0) {
        throw new Error('Encoding produced empty output');
      }

      currentLevelObj = levelObj;
      currentFilename = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') + '.level';

      // Show preview
      previewTitle.textContent = title;
      previewNodes.textContent = levelObj.levelNodes.length;
      previewDifficulty.textContent = DIFFICULTY_LABELS[difficulty];
      previewSize.textContent = SIZE_LABELS[sizeIdx];
      previewSummary.textContent = result.summary;
      previewCard.style.display = 'block';

      showStatus('Level generated successfully! ' + levelObj.levelNodes.length + ' nodes.', 'success');
    } catch (err) {
      showStatus('Generation error: ' + err.message, 'error');
      previewCard.style.display = 'none';
    } finally {
      generateBtn.disabled = false;
    }
  });

  // --- Download ---
  downloadBtn.addEventListener('click', async function () {
    if (!currentLevelObj) {
      showStatus('No level generated yet.', 'error');
      return;
    }

    downloadBtn.disabled = true;
    try {
      var encoded = await ProtoHelper.encodeLevel(currentLevelObj);
      GrabAPI.triggerDownload(new Blob([encoded]), currentFilename);
      showStatus('Download started!', 'success');
    } catch (err) {
      showStatus('Download error: ' + err.message, 'error');
    } finally {
      downloadBtn.disabled = false;
    }
  });

})();
