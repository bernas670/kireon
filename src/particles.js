let particles = [];

export function getParticles() {
  return particles;
}

export function clearParticles() {
  particles = [];
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function burst(x, y, count, speedMin, speedMax, lifeMin, lifeMax, radiusMin, radiusMax, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: lifeMin + Math.random() * (lifeMax - lifeMin),
      maxLife: lifeMax,
      radius: radiusMin + Math.random() * (radiusMax - radiusMin),
      color,
    });
  }
}

export function spawnHitParticles(x, y, color) {
  burst(x, y, 12, 150, 450, 0.25, 0.35, 2, 5, color);
}

export function spawnDeflectParticles(x, y) {
  burst(x, y, 6, 100, 250, 0.15, 0.25, 2, 4, '#888');
}

export function spawnDamageParticles(x, y) {
  burst(x, y, 8, 100, 300, 0.3, 0.45, 2, 4, '#ff6666');
}

export function spawnDeathParticles(x, y, color) {
  burst(x, y, 20, 200, 600, 0.5, 0.9, 3, 7, color);
}

export function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
