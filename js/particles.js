(function () {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = [
    { r: 139, g: 92, b: 246 },  // purple
    { r: 0, g: 212, b: 255 },   // cyan
    { r: 255, g: 0, b: 110 }    // pink
  ];

  const PARTICLE_COUNT = 60;
  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    const alpha = 0.3 + Math.random() * 0.3;
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4 + (Math.random() > 0.5 ? 0.1 : -0.1),
      vy: (Math.random() - 0.5) * 0.4 + (Math.random() > 0.5 ? 0.1 : -0.1),
      radius: 1 + Math.random() * 2,
      color: c,
      alpha: alpha
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const lineAlpha = 0.05 + 0.05 * (1 - dist / 150);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(139, 92, 246, ' + lineAlpha + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      // Draw glow circle
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
      grad.addColorStop(0, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')');
      grad.addColorStop(1, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ', 0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw solid core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
