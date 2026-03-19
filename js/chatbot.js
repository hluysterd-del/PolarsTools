(function () {
  "use strict";

  // ─── Inject Styles ───────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #pb-chat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #00d4ff, #0090b0);
      color: #fff;
      font-size: 28px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 212, 255, .35);
      z-index: 10000;
      transition: transform .2s, box-shadow .2s;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    #pb-chat-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(0, 212, 255, .55);
    }

    #pb-chat-panel {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 350px;
      height: 500px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,.6);
      z-index: 10001;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(.96);
      pointer-events: none;
      transition: opacity .3s ease, transform .3s ease;
    }
    #pb-chat-panel.pb-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    #pb-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
      flex-shrink: 0;
    }
    #pb-chat-header .pb-title {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #00d4ff;
    }
    #pb-chat-header .pb-close {
      background: none;
      border: none;
      color: #8b949e;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
      transition: color .15s;
    }
    #pb-chat-header .pb-close:hover {
      color: #fff;
    }

    #pb-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: #30363d transparent;
    }
    #pb-chat-messages::-webkit-scrollbar { width: 6px; }
    #pb-chat-messages::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }

    .pb-msg {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 12px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13.5px;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .pb-msg.pb-bot {
      align-self: flex-start;
      background: #1a1f2b;
      color: #d1d5db;
      border-bottom-left-radius: 4px;
    }
    .pb-msg.pb-user {
      align-self: flex-end;
      background: #161b22;
      color: #e6edf3;
      border-bottom-right-radius: 4px;
      border: 1px solid #30363d;
    }

    .pb-typing {
      align-self: flex-start;
      display: flex;
      gap: 5px;
      padding: 12px 18px;
      background: #1a1f2b;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
    }
    .pb-typing span {
      width: 8px;
      height: 8px;
      background: #00d4ff;
      border-radius: 50%;
      animation: pb-bounce .6s infinite alternate;
    }
    .pb-typing span:nth-child(2) { animation-delay: .15s; }
    .pb-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes pb-bounce {
      to { opacity: .3; transform: translateY(-6px); }
    }

    #pb-chat-input-area {
      display: flex;
      gap: 8px;
      padding: 10px 14px;
      background: #161b22;
      border-top: 1px solid #30363d;
      flex-shrink: 0;
    }
    #pb-chat-input {
      flex: 1;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 8px 12px;
      color: #e6edf3;
      font-size: 13.5px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      outline: none;
      transition: border-color .15s;
    }
    #pb-chat-input:focus {
      border-color: #00d4ff;
    }
    #pb-chat-input::placeholder {
      color: #484f58;
    }
    #pb-chat-send {
      background: #00d4ff;
      border: none;
      border-radius: 8px;
      padding: 0 14px;
      color: #0d1117;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: background .15s;
    }
    #pb-chat-send:hover {
      background: #33dfff;
    }

    @media (max-width: 600px) {
      #pb-chat-panel {
        width: calc(100vw - 16px);
        right: 8px;
        bottom: 88px;
        height: 70vh;
      }
      #pb-chat-toggle {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // ─── Build DOM ────────────────────────────────────────────────────
  const toggle = document.createElement("button");
  toggle.id = "pb-chat-toggle";
  toggle.innerHTML = "\uD83D\uDCAC";
  toggle.title = "Chat with PolarBot";

  const panel = document.createElement("div");
  panel.id = "pb-chat-panel";
  panel.innerHTML = `
    <div id="pb-chat-header">
      <span class="pb-title">PolarBot - GRAB Expert</span>
      <button class="pb-close">&times;</button>
    </div>
    <div id="pb-chat-messages"></div>
    <div id="pb-chat-input-area">
      <input id="pb-chat-input" type="text" placeholder="Ask about GRAB VR..." autocomplete="off" />
      <button id="pb-chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const messagesEl = document.getElementById("pb-chat-messages");
  const inputEl = document.getElementById("pb-chat-input");
  const sendBtn = document.getElementById("pb-chat-send");
  const closeBtn = panel.querySelector(".pb-close");

  // ─── Toggle Logic ────────────────────────────────────────────────
  let isOpen = false;
  function openChat() {
    isOpen = true;
    panel.classList.add("pb-open");
  }
  function closeChat() {
    isOpen = false;
    panel.classList.remove("pb-open");
  }
  toggle.addEventListener("click", function () {
    if (isOpen) closeChat();
    else openChat();
  });
  closeBtn.addEventListener("click", closeChat);

  // ─── Chat Helpers ────────────────────────────────────────────────
  function addMessage(text, sender) {
    const el = document.createElement("div");
    el.classList.add("pb-msg", sender === "user" ? "pb-user" : "pb-bot");
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement("div");
    el.classList.add("pb-typing");
    el.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  // ─── Knowledge Base ──────────────────────────────────────────────
  const KB = [
    {
      keys: ["hello", "hi", "hey", "sup", "yo", "howdy", "greetings", "hiya", "what's up", "whats up"],
      response: "Hey there! I'm PolarBot, your GRAB VR expert assistant. I can help you with level building, the proto format, materials, shapes, triggers, animations, colors, ambience, and all PolarsTools features.\n\nType \"help\" to see everything I know about!"
    },
    {
      keys: ["help", "commands", "what can you do", "topics", "menu"],
      response: "Here's everything I can help you with:\n\n\u2022 Level Building - tips, best practices, optimization\n\u2022 Proto Format - file structure, fields, JSON layout\n\u2022 Materials - DEFAULT, GRABBABLE, ICE, LAVA, WOOD, etc.\n\u2022 Shapes - CUBE, SPHERE, CYLINDER, PYRAMID, etc.\n\u2022 Triggers - HAND, HEAD, FEET, GRAPPLE sources & targets\n\u2022 Colors - color1/color2, neon, transparency\n\u2022 Animations - frames, speed, direction, interpolation\n\u2022 Ambience - sky, sun, fog, lighting\n\u2022 Groups & Physics - group nodes, rigidbody objects\n\u2022 PolarsTools - all tools on this site\n\u2022 Modding - general GRAB modding questions\n\u2022 Complexity - level limits & optimization\n\nJust ask me anything about these topics!"
    },
    {
      keys: ["proto", "format", "file format", "json", "protobuf", ".proto", "level file", "level format", "file structure"],
      response: "GRAB levels use a proto (protobuf-like) JSON format. Here's the basic structure:\n\n\u2022 formatVersion - currently 8 for modern levels\n\u2022 title / creators / description - level metadata\n\u2022 complexity - number representing level cost\n\u2022 maxCheckpointCount - how many checkpoints allowed\n\u2022 ampienceSettings - sky, sun, fog configuration\n\u2022 levelNodes - array of all objects in the level\n\nEach levelNode has:\n\u2022 levelNodeGroup / levelNodeStatic / levelNodeCrumbling / levelNodeStart / levelNodeFinish / levelNodeSign\n\u2022 isNeon - makes the object glow\n\u2022 material - surface type (DEFAULT, ICE, LAVA, etc.)\n\u2022 shape - geometry type (CUBE, SPHERE, etc.)\n\u2022 position (x, y, z) - world position\n\u2022 rotation (x, y, z, w) - quaternion rotation\n\u2022 scale (x, y, z) - object size\n\u2022 color1 / color2 - primary and secondary colors"
    },
    {
      keys: ["material", "materials", "surface", "grabbable", "ice", "lava", "wood", "grapplable", "default material", "bouncy", "material type"],
      response: "GRAB has several material types that affect gameplay:\n\n\u2022 DEFAULT - Standard surface, can be grabbed normally\n\u2022 GRABBABLE - Same as default, players can grab it\n\u2022 ICE - Slippery surface, low friction\n\u2022 LAVA - Kills the player on contact\n\u2022 WOOD - Standard surface with wood appearance\n\u2022 GRAPPLABLE - Can be targeted with the grapple\n\u2022 GRAPPLABLE_LAVA - Grapplable but also kills on touch\n\u2022 GRAB_THROUGH - Player hands pass through it\n\u2022 SAND - Sandy surface texture\n\u2022 SNOW - Snowy surface texture\n\u2022 BOUNCY - Bounces the player off the surface\n\nMaterials are set as integers in the proto (0 = DEFAULT, 1 = GRABBABLE, etc.). Combine materials with neon for cool visual effects!"
    },
    {
      keys: ["shape", "shapes", "cube", "sphere", "cylinder", "pyramid", "prism", "geometry", "mesh", "shape type"],
      response: "Available shapes in GRAB:\n\n\u2022 CUBE (0) - Box / rectangular prism, most common\n\u2022 SPHERE (1) - Ball shape\n\u2022 CYLINDER (2) - Tube / pillar shape\n\u2022 PYRAMID (3) - Four-sided pyramid\n\u2022 PRISM (4) - Triangular prism / wedge\n\u2022 HALF_SPHERE (1000) - Dome shape\n\u2022 QUARTER_PIPE (1001) - Curved ramp\n\u2022 HALF_CYLINDER (1002) - Half tube\n\u2022 HEMISPHERE (1003) - Another dome variant\n\n\nScaling a cube to be very thin makes great walls and floors. Non-uniform scaling on spheres creates ellipsoids. Mix shapes creatively for detailed builds!"
    },
    {
      keys: ["trigger", "triggers", "hand trigger", "head trigger", "feet trigger", "grapple trigger", "trigger source", "trigger target"],
      response: "The trigger system lets you create interactive levels!\n\nTrigger Sources (what activates it):\n\u2022 HAND - Triggered when player's hand enters the zone\n\u2022 HEAD - Triggered when player's head enters\n\u2022 FEET - Triggered when player's feet enter\n\u2022 GRAPPLE - Triggered when grapple hits it\n\nTrigger Targets (what happens):\n\u2022 Animation - Starts/stops an animation on a target object\n\u2022 Sound - Plays a sound effect\n\u2022 Ambience - Changes the ambience/sky settings\n\u2022 Enable/Disable - Shows or hides target objects\n\nTriggers connect a source node to a target node via their indices in the levelNodes array. You can chain triggers for complex contraptions!"
    },
    {
      keys: ["color", "colors", "colour", "color1", "color2", "neon", "transparent", "transparency", "rgb", "tint"],
      response: "Colors in GRAB work with two channels:\n\n\u2022 color1 - Primary color of the object, affects the main surface\n\u2022 color2 - Secondary/accent color, visible on some materials\n\nColor format: {r, g, b, a} where each value is 0.0 to 1.0\n\u2022 r = red, g = green, b = blue, a = alpha (transparency)\n\u2022 a < 1.0 makes the object semi-transparent\n\u2022 a = 0 makes it fully invisible (still has collision!)\n\nNeon (isNeon: true):\n\u2022 Makes the object emit a glow based on its color\n\u2022 Great for decoration, signs, and lighting effects\n\u2022 Neon objects illuminate nearby surfaces\n\nTip: Use the Color Picker tool on PolarsTools to find exact values!"
    },
    {
      keys: ["animation", "animations", "animate", "frames", "keyframe", "keyframes", "interpolation", "animation speed", "direction", "anim"],
      response: "GRAB's animation system uses keyframes:\n\n\u2022 frames - Array of keyframe positions/rotations\n\u2022 speed - How fast the animation plays (higher = faster)\n\u2022 direction - FORWARD, BACKWARD, PING_PONG, or RANDOM\n\u2022 interpolation - LINEAR (straight lines) or SMOOTH (eased curves)\n\nAnimation fields per frame:\n\u2022 position (x, y, z) - where the object moves to\n\u2022 rotation (x, y, z, w) - how the object rotates\n\u2022 time - timestamp for this keyframe\n\nTips:\n\u2022 PING_PONG makes objects go back and forth smoothly\n\u2022 Use triggers to start/stop animations on demand\n\u2022 Animate group nodes to move multiple objects at once\n\u2022 Keep frame count reasonable for performance"
    },
    {
      keys: ["ambience", "ambient", "sky", "sun", "fog", "lighting", "atmosphere", "skybox", "sky color", "sunlight"],
      response: "Ambience controls the level's atmosphere:\n\nSky Settings:\n\u2022 skyZenithColor - Color at the top of the sky\n\u2022 skyHorizonColor - Color at the horizon line\n\u2022 sunAltitude - How high the sun is (angle in degrees)\n\u2022 sunAzimuth - Horizontal angle of the sun\n\u2022 sunSize - How large the sun appears\n\nFog Settings:\n\u2022 fogEnabled - Turn fog on/off\n\u2022 fogColor - Color of the fog\n\u2022 fogDDensity - How thick the fog is\n\u2022 fogStartDistance / fogEndDistance - Fog range\n\nTips:\n\u2022 Dark sky + neon objects = awesome night levels\n\u2022 Fog can hide distant objects for mystery/horror vibes\n\u2022 Sun position affects shadows and overall lighting mood\n\u2022 Triggers can change ambience mid-level for dramatic effect!"
    },
    {
      keys: ["group", "groups", "group node", "grouping", "parent", "hierarchy", "children", "group nodes"],
      response: "Group Nodes let you organize and move objects together:\n\n\u2022 A levelNodeGroup contains an array of child nodes\n\u2022 Moving/rotating the group moves all children with it\n\u2022 Groups can be nested (groups within groups)\n\u2022 Animating a group animates everything inside it\n\nPhysics Groups:\n\u2022 Groups can have physics (rigidbody) applied\n\u2022 Physics objects are affected by gravity\n\u2022 They can be pushed, knocked over, etc.\n\u2022 Great for puzzles with falling/moving objects\n\nTips:\n\u2022 Use groups to build complex objects (like a car or door)\n\u2022 Animate a group to make moving platforms\n\u2022 Keep groups organized - name them clearly in the editor\n\u2022 Deeply nested groups can impact performance"
    },
    {
      keys: ["physics", "rigidbody", "gravity", "rigid body", "falling", "dynamic", "physical"],
      response: "Physics objects in GRAB use rigidbody properties:\n\n\u2022 Physics nodes are affected by gravity and collisions\n\u2022 They can be pushed, grabbed, and thrown by players\n\u2022 Set on group nodes to make all children move as one body\n\nProperties:\n\u2022 mass - How heavy the object is\n\u2022 bounciness - How much it bounces on impact\n\u2022 friction - Surface grip level\n\u2022 isKinematic - If true, not affected by forces but can still collide\n\nTips:\n\u2022 Physics objects add to level complexity quickly\n\u2022 Use sparingly for best performance\n\u2022 Great for puzzles, bowling pins, stacking challenges\n\u2022 Combine with triggers for Rube Goldberg machines!"
    },
    {
      keys: ["polarstools", "polars tools", "this site", "website", "tools", "what is this", "site features", "features"],
      response: "PolarsTools is a suite of tools for GRAB VR creators:\n\n\u2022 Level Editor - Visual editor for building and editing GRAB levels directly in the browser\n\u2022 Level Browser - Browse and search published GRAB levels\n\u2022 Level Downloader - Download level proto files to edit offline\n\u2022 Level Merger - Combine multiple levels into one\n\u2022 Image to GRAB - Convert images into GRAB pixel art levels\n\u2022 Color Picker - Find and convert color values for the proto format\n\u2022 Stats Viewer - View statistics for GRAB levels and players\n\u2022 User Lookup - Search for GRAB players and view their profiles\n\nAll tools work in your browser with no downloads needed!"
    },
    {
      keys: ["editor", "level editor", "visual editor", "build", "builder"],
      response: "The PolarsTools Level Editor lets you build GRAB levels visually:\n\n\u2022 Add, move, rotate, and scale objects with a 3D viewport\n\u2022 Set materials, colors, and neon properties per object\n\u2022 Configure triggers and animations visually\n\u2022 Group objects together\n\u2022 Import/export proto JSON files\n\u2022 Undo/redo support\n\nTips:\n\u2022 Use snapping for precise alignment\n\u2022 Test your level frequently in-game\n\u2022 Save backups of your proto file regularly\n\u2022 The editor shows complexity count so you stay under limits"
    },
    {
      keys: ["browser", "level browser", "browse levels", "search levels", "find levels"],
      response: "The Level Browser lets you explore published GRAB levels:\n\n\u2022 Search by level name, creator, or tags\n\u2022 Filter by difficulty, rating, or date\n\u2022 Preview level details and statistics\n\u2022 See play counts, likes, and completion rates\n\u2022 Direct links to download level files\n\nGreat for finding inspiration or levels to remix!"
    },
    {
      keys: ["downloader", "download", "download level", "export", "get level"],
      response: "The Level Downloader lets you grab proto files for any published GRAB level:\n\n\u2022 Paste a level URL or ID to download its proto file\n\u2022 Save as JSON for editing in PolarsTools or a text editor\n\u2022 Great for studying how other creators build levels\n\u2022 Remix downloaded levels with your own ideas\n\nRemember to credit original creators when remixing!"
    },
    {
      keys: ["merger", "merge", "combine", "merge levels", "combine levels"],
      response: "The Level Merger combines multiple GRAB levels into one:\n\n\u2022 Upload two or more proto files\n\u2022 Position each level with offset controls\n\u2022 Merge all nodes into a single level file\n\u2022 Great for collaborative building\n\u2022 Combine themed sections into mega-levels\n\nTips:\n\u2022 Watch your complexity count when merging\n\u2022 Adjust offsets so levels don't overlap\n\u2022 Remove duplicate start/finish nodes after merging"
    },
    {
      keys: ["image2grab", "image to grab", "pixel art", "image converter", "picture", "convert image"],
      response: "Image to GRAB converts pictures into pixel art GRAB levels:\n\n\u2022 Upload any image (PNG, JPG, etc.)\n\u2022 Set the resolution / pixel grid size\n\u2022 Each pixel becomes a colored cube in GRAB\n\u2022 Choose flat or 3D depth based on brightness\n\u2022 Export as a proto file ready for GRAB\n\nTips:\n\u2022 Simple images with bold colors work best\n\u2022 Lower resolution = fewer objects = better performance\n\u2022 Neon mode makes the pixel art glow!\n\u2022 Logos and pixel art sprites look amazing"
    },
    {
      keys: ["color picker", "color tool", "pick color", "hex", "rgb to grab"],
      response: "The Color Picker helps you find exact color values for GRAB:\n\n\u2022 Visual color wheel and sliders\n\u2022 Convert between HEX, RGB, and GRAB's 0-1 float format\n\u2022 Copy color values ready to paste into proto files\n\u2022 Preview how colors look with/without neon\n\u2022 Save favorite colors for reuse\n\nGRAB uses 0.0 to 1.0 for each channel, so:\n\u2022 White = {r:1, g:1, b:1, a:1}\n\u2022 Red = {r:1, g:0, b:0, a:1}\n\u2022 50% transparent blue = {r:0, g:0, b:1, a:0.5}"
    },
    {
      keys: ["stats", "statistics", "player stats", "level stats", "leaderboard"],
      response: "The Stats Viewer shows detailed GRAB statistics:\n\n\u2022 Level stats: plays, completions, likes, difficulty rating\n\u2022 Player stats: levels created, levels played, total plays received\n\u2022 Trending levels and top creators\n\u2022 Completion rate analysis\n\nGreat for tracking your level's popularity or finding top content!"
    },
    {
      keys: ["user lookup", "userlookup", "find player", "player search", "find user", "player profile"],
      response: "User Lookup lets you search for GRAB players:\n\n\u2022 Search by username\n\u2022 View player profiles and their published levels\n\u2022 See play counts and creation history\n\u2022 Find and follow your favorite creators\n\nTip: Use it to find collaborators for your next level!"
    },
    {
      keys: ["modding", "mod", "mods", "custom", "hack", "modded", "custom level"],
      response: "GRAB modding is all about editing proto/JSON level files:\n\n\u2022 Levels are stored as JSON proto files you can edit\n\u2022 Use PolarsTools editor or a text editor to modify them\n\u2022 You can create things beyond the in-game editor's limits\n\u2022 Add more objects, custom shapes, precise values\n\u2022 Proto modding is the main way to push creative boundaries\n\nCommon mods:\n\u2022 Precise color values not available in-game\n\u2022 Extreme scales (very tiny or huge objects)\n\u2022 Complex trigger chains for interactive levels\n\u2022 Invisible objects (alpha = 0) for hidden paths\n\u2022 Merged levels from multiple creators"
    },
    {
      keys: ["complexity", "limit", "limits", "performance", "lag", "optimize", "optimization", "too many", "node count", "object count"],
      response: "Level complexity determines performance and publishability:\n\n\u2022 Each object adds to the complexity score\n\u2022 There's a max complexity for published levels\n\u2022 Physics objects cost more complexity than static ones\n\u2022 Triggers and animations add a small amount\n\n Optimization tips:\n\u2022 Use fewer, larger objects instead of many small ones\n\u2022 Minimize physics objects - they're expensive\n\u2022 Avoid deeply nested groups\n\u2022 Remove hidden/overlapping objects\n\u2022 Use neon sparingly - each neon object adds rendering cost\n\u2022 Test on Quest hardware if possible (it's the weakest platform)\n\u2022 Keep animation frame counts reasonable\n\u2022 The editor shows your current complexity count"
    },
    {
      keys: ["level building", "tips", "advice", "how to build", "building tips", "best practices", "getting started", "beginner"],
      response: "Level building tips for GRAB VR:\n\nGetting started:\n\u2022 Start with a simple concept and expand from there\n\u2022 Place start and finish nodes first to set the flow\n\u2022 Use checkpoints generously for longer levels\n\n Design tips:\n\u2022 Playtest constantly - what feels fun to climb/traverse?\n\u2022 Use visual cues (colors, neon) to guide the player\n\u2022 Vary your materials - ice for slides, bouncy for launches\n\u2022 Tell a story with your environment and layout\n\n Technical tips:\n\u2022 Keep complexity in mind from the start\n\u2022 Use groups to organize related objects\n\u2022 Save backups frequently!\n\u2022 Study popular levels for inspiration (use the Level Browser)"
    },
    {
      keys: ["sign", "signs", "text", "level sign", "levelnodesign", "writing"],
      response: "Signs let you add text to your GRAB levels:\n\n\u2022 levelNodeSign - a flat panel that displays text\n\u2022 text - the string content displayed on the sign\n\u2022 Signs can be colored, scaled, and positioned like other objects\n\u2022 They can be neon for glowing text\n\nTips:\n\u2022 Use signs for level names, instructions, and hints\n\u2022 Place tutorial signs at the start for complex mechanics\n\u2022 Neon signs in dark levels look incredible\n\u2022 Keep text short - long text gets small and hard to read"
    },
    {
      keys: ["start", "finish", "checkpoint", "spawn", "goal", "checkpoints"],
      response: "Start, Finish, and Checkpoint nodes:\n\n\u2022 levelNodeStart - Where the player spawns. Every level needs exactly one.\n\u2022 levelNodeFinish - The goal. Touching it completes the level.\n\u2022 Checkpoints - Save points. Players respawn at the last checkpoint reached.\n\u2022 maxCheckpointCount - Set in level metadata, limits total checkpoints.\n\nTips:\n\u2022 Place the start in a safe, visible area\n\u2022 Put checkpoints before difficult sections\n\u2022 Multiple finish nodes can create branching paths\n\u2022 Space checkpoints fairly - too few = frustrating, too many = too easy"
    },
    {
      keys: ["crumbling", "crumble", "break", "breaking", "destructible", "crumbling block"],
      response: "Crumbling nodes break apart when touched:\n\n\u2022 levelNodeCrumbling - a block that crumbles when the player grabs or stands on it\n\u2022 They respawn after a short delay\n\u2022 Great for timed challenges and parkour sections\n\nTips:\n\u2022 Chain crumbling blocks for intense speedrun sections\n\u2022 Mix with stable platforms so players can rest\n\u2022 Crumbling ice blocks are extra tricky (slippery + breaking!)\n\u2022 Use visual cues (color/material) so players know which blocks crumble"
    },
    {
      keys: ["quaternion", "rotation", "rotate", "quat", "xyzw", "orientation"],
      response: "Rotations in GRAB use quaternions (x, y, z, w):\n\n\u2022 Quaternions avoid gimbal lock issues of euler angles\n\u2022 Default (no rotation): {x:0, y:0, z:0, w:1}\n\u2022 90\u00b0 around Y axis: {x:0, y:0.707, z:0, w:0.707}\n\u2022 180\u00b0 around Y axis: {x:0, y:1, z:0, w:0}\n\nTips:\n\u2022 The PolarsTools editor handles rotation visually for you\n\u2022 If editing proto manually, use an online quaternion calculator\n\u2022 Small changes to quaternion values = big rotation changes\n\u2022 Always keep quaternions normalized (length = 1)"
    },
    {
      keys: ["position", "coordinates", "xyz", "placement", "move", "where", "location"],
      response: "Position in GRAB uses 3D coordinates (x, y, z):\n\n\u2022 x - Left/right axis\n\u2022 y - Up/down axis (vertical)\n\u2022 z - Forward/backward axis\n\u2022 Values are in meters (approximately)\n\nTips:\n\u2022 Y=0 is roughly ground level\n\u2022 The start node position determines player spawn location\n\u2022 Use the editor's grid snapping for precise alignment\n\u2022 Negative coordinates are totally fine to use"
    },
    {
      keys: ["scale", "size", "resize", "scaling", "big", "small", "dimensions"],
      response: "Scale controls object size with (x, y, z) values:\n\n\u2022 Default scale: {x:1, y:1, z:1} (one unit in each direction)\n\u2022 Scale of 2 = twice as big in that axis\n\u2022 Non-uniform scaling creates stretched shapes\n\u2022 Very small scales (0.01) can make tiny detail objects\n\nTips:\n\u2022 Thin cubes (scale y:0.05) make great walls and floors\n\u2022 Stretched spheres make good elliptical decorations\n\u2022 Extremely large objects can be used as terrain/ground\n\u2022 Scale affects the collision box, not just visuals"
    },
    {
      keys: ["thank", "thanks", "thx", "ty", "appreciate"],
      response: "You're welcome! Happy to help. If you have more questions about GRAB VR or PolarsTools, just ask!"
    },
    {
      keys: ["bye", "goodbye", "see you", "cya", "later", "gtg"],
      response: "See you later! Have fun building in GRAB VR. Come back anytime you need help!"
    },
    {
      keys: ["who are you", "what are you", "your name", "polarbot", "about you", "who made you"],
      response: "I'm PolarBot, the AI assistant built into PolarsTools! I'm here to help you with everything related to GRAB VR level creation.\n\nI know about:\n\u2022 The proto level format and all its fields\n\u2022 Materials, shapes, colors, and visual properties\n\u2022 Triggers, animations, and interactive mechanics\n\u2022 Every tool on the PolarsTools website\n\u2022 Tips and best practices for level building\n\nI'm a pattern-matching bot, so I work best with clear keywords. Type \"help\" to see all my topics!"
    }
  ];

  const fallbackResponse = "I'm not sure about that, but here are things I can help with:\n\n\u2022 Level building tips & best practices\n\u2022 Proto format & file structure\n\u2022 Materials (ICE, LAVA, WOOD, etc.)\n\u2022 Shapes (CUBE, SPHERE, CYLINDER, etc.)\n\u2022 Triggers & interactive mechanics\n\u2022 Colors, neon & transparency\n\u2022 Animations & keyframes\n\u2022 Ambience (sky, sun, fog)\n\u2022 Groups & physics objects\n\u2022 PolarsTools features\n\u2022 Signs, checkpoints, crumbling blocks\n\u2022 Rotation, position & scale\n\nTry asking about one of these topics!";

  function findResponse(input) {
    const lower = input.toLowerCase().replace(/[^\w\s]/g, "");
    let bestMatch = null;
    let bestScore = 0;

    for (var i = 0; i < KB.length; i++) {
      var entry = KB[i];
      var score = 0;
      for (var k = 0; k < entry.keys.length; k++) {
        if (lower.includes(entry.keys[k])) {
          // Longer keyword matches = higher score
          score += entry.keys[k].length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestMatch ? bestMatch.response : fallbackResponse;
  }

  // ─── Send Message Logic ──────────────────────────────────────────
  var busy = false;
  function send() {
    var text = inputEl.value.trim();
    if (!text || busy) return;
    busy = true;
    inputEl.value = "";
    addMessage(text, "user");

    var response = findResponse(text);
    var typing = showTyping();
    var delay = 500 + Math.random() * 1000;

    setTimeout(function () {
      typing.remove();
      addMessage(response, "bot");
      busy = false;
    }, delay);
  }

  sendBtn.addEventListener("click", send);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });

  // ─── Welcome Message ─────────────────────────────────────────────
  addMessage("Hey! I'm PolarBot, your GRAB VR assistant. Ask me anything about level building, materials, triggers, or PolarsTools!\n\nType \"help\" to see all topics.", "bot");
})();
