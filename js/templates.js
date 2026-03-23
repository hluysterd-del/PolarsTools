(function() {
    const grid = document.getElementById('template-grid');
    if (!grid) return;

    const TEMPLATES = [
        {
            name: 'Blank Canvas',
            desc: 'Empty flat floor with start/finish. Perfect starting point.',
            nodes: 3, difficulty: 'Any',
            color: '#6c5ce7',
            build: () => buildLevel('Blank Canvas', [
                startNode(0, 1, 0),
                finishNode(50, 1, 50),
                staticCube(0, -0.5, 0, 100, 1, 100, 8, color(0.3, 0.3, 0.35))
            ])
        },
        {
            name: 'Parkour Starter',
            desc: '10 platforms with increasing gaps. Classic parkour layout.',
            nodes: 12, difficulty: 'Medium',
            color: '#00b894',
            build: () => {
                const nodes = [startNode(0, 2, 0), staticCube(0, 0, 0, 4, 1, 4, 0)];
                for (let i = 1; i <= 10; i++) {
                    const gap = 2.5 + i * 0.3;
                    nodes.push(staticCube(0, i * 1.5, i * gap, 3, 0.5, 3, 0));
                }
                nodes.push(finishNode(0, 17, 38));
                return buildLevel('Parkour Starter', nodes);
            }
        },
        {
            name: 'Ice Ramp',
            desc: 'Downhill ice slide with banked turns and snow walls.',
            nodes: 15, difficulty: 'Easy',
            color: '#74b9ff',
            build: () => {
                const nodes = [startNode(0, 22, 0)];
                // Straight ramp down
                for (let i = 0; i < 8; i++) {
                    nodes.push(staticCube(0, 20 - i * 2.5, i * 8, 6, 0.3, 10, 2, color(0.7, 0.85, 1)));
                    // Snow walls
                    nodes.push(staticCube(-3.5, 21 - i * 2.5, i * 8, 1, 2, 10, 10, color(0.95, 0.97, 1)));
                    nodes.push(staticCube(3.5, 21 - i * 2.5, i * 8, 1, 2, 10, 10, color(0.95, 0.97, 1)));
                }
                nodes.push(finishNode(0, 1, 64));
                return buildLevel('Ice Ramp', nodes);
            }
        },
        {
            name: 'Tower Climb',
            desc: 'Spiral tower with grabbable ledges going up 20 floors.',
            nodes: 42, difficulty: 'Hard',
            color: '#fdcb6e',
            build: () => {
                const nodes = [startNode(0, 1, 5)];
                // Central column
                nodes.push(staticCube(0, 30, 0, 3, 60, 3, 4));
                const radius = 6;
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 4;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = i * 3 + 1;
                    nodes.push(staticCube(x, y, z, 3, 0.5, 3, i % 2 === 0 ? 1 : 0));
                }
                nodes.push(finishNode(0, 62, 0));
                return buildLevel('Tower Climb', nodes);
            }
        },
        {
            name: 'Lava Pit Arena',
            desc: 'Large arena surrounded by lava. Great for hangout maps.',
            nodes: 10, difficulty: 'Easy',
            color: '#ff7675',
            build: () => buildLevel('Lava Pit Arena', [
                startNode(0, 2, 0),
                staticCube(0, -0.5, 0, 30, 1, 30, 0),
                // Lava surrounding
                staticCube(0, -0.5, 20, 40, 1, 10, 3),
                staticCube(0, -0.5, -20, 40, 1, 10, 3),
                staticCube(20, -0.5, 0, 10, 1, 40, 3),
                staticCube(-20, -0.5, 0, 10, 1, 40, 3),
                // Walls
                staticCube(0, 3, 25, 50, 6, 1, 8, color(0.2, 0.2, 0.25)),
                staticCube(0, 3, -25, 50, 6, 1, 8, color(0.2, 0.2, 0.25)),
                finishNode(0, -50, 0)
            ])
        },
        {
            name: 'Showcase Room',
            desc: 'Enclosed display room with pedestals and sign placements.',
            nodes: 20, difficulty: 'Any',
            color: '#a29bfe',
            build: () => {
                const nodes = [startNode(0, 1, 8)];
                // Floor, ceiling, walls
                nodes.push(staticCube(0, -0.5, 0, 20, 1, 20, 8, color(0.15, 0.15, 0.2)));
                nodes.push(staticCube(0, 8, 0, 20, 1, 20, 8, color(0.12, 0.12, 0.18)));
                nodes.push(staticCube(10, 4, 0, 1, 8, 20, 8, color(0.18, 0.18, 0.22)));
                nodes.push(staticCube(-10, 4, 0, 1, 8, 20, 8, color(0.18, 0.18, 0.22)));
                nodes.push(staticCube(0, 4, -10, 20, 8, 1, 8, color(0.18, 0.18, 0.22)));
                nodes.push(staticCube(0, 4, 10, 20, 8, 1, 8, color(0.18, 0.18, 0.22)));
                // Pedestals
                for (let i = -2; i <= 2; i++) {
                    nodes.push(staticCube(i * 4, 0.75, -6, 2, 1.5, 2, 8, color(0.25, 0.25, 0.3)));
                }
                nodes.push(finishNode(0, -50, 0));
                return buildLevel('Showcase Room', nodes);
            }
        },
        {
            name: 'Obstacle Course',
            desc: 'Mix of ice, lava, bouncy, and wood sections.',
            nodes: 25, difficulty: 'Hard',
            color: '#e17055',
            build: () => {
                const nodes = [startNode(0, 2, 0), staticCube(0, 0, 0, 5, 1, 5, 0)];
                // Wood section
                for (let i = 1; i <= 4; i++) nodes.push(staticCube(0, 0, i * 5, 3, 0.5, 4, 4));
                // Ice section
                for (let i = 5; i <= 8; i++) nodes.push(staticCube(0, 0, i * 5, 4, 0.3, 4, 2));
                // Bouncy section
                for (let i = 9; i <= 11; i++) nodes.push(staticCube(0, 0, i * 5, 3, 0.5, 3, 9));
                // Lava gaps
                for (let i = 12; i <= 14; i++) {
                    nodes.push(staticCube(0, -1, i * 5, 6, 0.3, 4, 3));
                    nodes.push(staticCube(0, 1, i * 5, 2, 0.3, 2, 0));
                }
                nodes.push(finishNode(0, 2, 75));
                return buildLevel('Obstacle Course', nodes);
            }
        },
        {
            name: 'Admin Abuse Base',
            desc: 'Flat grass field with underground admin room and trigger buttons.',
            nodes: 30, difficulty: 'Any',
            color: '#ff006e',
            build: () => buildLevel('Admin Abuse Base', [
                startNode(0, 1, 0),
                // Grass field
                staticCube(0, -0.5, 0, 60, 1, 60, 8, color(0.18, 0.55, 0.15)),
                // Underground room
                staticCube(0, -6, -35, 16, 1, 10, 8, color(0.15, 0.15, 0.2)),
                staticCube(0, -3, -40, 16, 6, 1, 8, color(0.2, 0.2, 0.25)),
                staticCube(-8, -3, -35, 1, 6, 10, 8, color(0.2, 0.2, 0.25)),
                staticCube(8, -3, -35, 1, 6, 10, 8, color(0.2, 0.2, 0.25)),
                staticCube(0, 0, -35, 16, 1, 10, 8, color(0.12, 0.12, 0.18)),
                // Button pads
                staticCube(-4, -5, -38, 2.5, 0.3, 2.5, 8, color(0.1, 0.4, 1), true),
                staticCube(-1.3, -5, -38, 2.5, 0.3, 2.5, 8, color(1, 0.3, 0.1), true),
                staticCube(1.3, -5, -38, 2.5, 0.3, 2.5, 8, color(0.9, 0.1, 0.9), true),
                staticCube(4, -5, -38, 2.5, 0.3, 2.5, 8, color(1, 1, 0.1), true),
                finishNode(0, -50, 0)
            ])
        }
    ];

    // Proto helpers
    function color(r, g, b, a) { return { r: r, g: g, b: b, a: a || 1 }; }
    function startNode(x, y, z) { return { levelNodeStart: { position: { x, y, z }, rotation: { x: 0, y: 0, z: 0, w: 1 }, radius: 2 } }; }
    function finishNode(x, y, z) { return { levelNodeFinish: { position: { x, y, z }, radius: 1 } }; }
    function staticCube(x, y, z, sx, sy, sz, mat, col, neon) {
        const node = {
            levelNodeStatic: {
                shape: 1000,
                material: mat,
                position: { x, y, z },
                scale: { x: sx, y: sy, z: sz },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
            }
        };
        if (col) { node.levelNodeStatic.color1 = col; }
        if (neon) { node.levelNodeStatic.isNeon = true; }
        return node;
    }

    async function buildLevel(title, nodes) {
        const Level = await ProtoHelper.loadProto();
        const levelObj = {
            formatVersion: 20,
            title: title,
            creators: 'PolarsTools',
            description: 'Template from PolarsTools',
            complexity: nodes.length * 2,
            maxCheckpointCount: 10,
            levelNodes: nodes,
            ambienceSettings: {
                skyZenithColor: { r: 0.2, g: 0.3, b: 0.6, a: 1 },
                skyHorizonColor: { r: 0.5, g: 0.7, b: 0.9, a: 1 },
                sunAltitude: 45, sunAzimuth: 200, sunSize: 1, fogDensity: 0.002
            }
        };
        const msg = Level.fromObject(levelObj);
        const buf = Level.encode(msg).finish();
        const ts = Date.now().toString().slice(0, -3);
        GrabAPI.triggerDownload(buf, `${title.replace(/\s+/g, '_')}_${ts}.level`);
    }

    // Render template cards
    TEMPLATES.forEach(t => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-preview" style="background:linear-gradient(135deg, ${t.color}22, ${t.color}44);">
                <span style="font-size:2.5rem;opacity:0.6;">${getIcon(t.name)}</span>
            </div>
            <div class="template-body">
                <h3>${esc(t.name)}</h3>
                <p>${esc(t.desc)}</p>
                <div class="template-meta">~${t.nodes} nodes &bull; ${t.difficulty}</div>
                <button class="btn">Download Template</button>
            </div>
        `;
        card.querySelector('.btn').addEventListener('click', async () => {
            const btn = card.querySelector('.btn');
            btn.textContent = 'Generating...';
            btn.disabled = true;
            try {
                await t.build();
                btn.textContent = 'Downloaded!';
                setTimeout(() => { btn.textContent = 'Download Template'; btn.disabled = false; }, 2000);
            } catch (e) {
                btn.textContent = 'Error';
                console.error(e);
                setTimeout(() => { btn.textContent = 'Download Template'; btn.disabled = false; }, 2000);
            }
        });
        grid.appendChild(card);
    });

    function getIcon(name) {
        const icons = {
            'Blank Canvas': '\u2B1C', 'Parkour Starter': '\u{1F3C3}', 'Ice Ramp': '\u2744',
            'Tower Climb': '\u{1F3D7}', 'Lava Pit Arena': '\u{1F525}', 'Showcase Room': '\u{1F3A8}',
            'Obstacle Course': '\u26A0', 'Admin Abuse Base': '\u{1F6E1}'
        };
        return icons[name] || '\u{1F4E6}';
    }

    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
})();
