import { ARMOR_GAP_ANGLE, ENEMY_SPEED, PLAYER_RADIUS } from './config.js';
import { player, damagePlayer } from './player.js';

export let enemies = [];

export function clearEnemies() {
  enemies = [];
}

export function createEnemy(x, y, overrides) {
  return {
    x, y,
    radius: 18,
    speed: ENEMY_SPEED,
    hp: 1,
    contactDamage: 1,
    color: '#cc2244',
    glowColor: '#ff2244',
    armor: null,
    baseScore: 100,
    knockback: { vx: 0, vy: 0 },
    flashTimer: 0,
    deflectFlash: 0,
    ...overrides,
  };
}

function randomEdgePosition(canvasW, canvasH) {
  const side = Math.floor(Math.random() * 4);
  const margin = 40;
  switch (side) {
    case 0: return { x: -margin, y: Math.random() * canvasH };
    case 1: return { x: canvasW + margin, y: Math.random() * canvasH };
    case 2: return { x: Math.random() * canvasW, y: -margin };
    default: return { x: Math.random() * canvasW, y: canvasH + margin };
  }
}

export function spawnEnemy(canvasW, canvasH) {
  const { x, y } = randomEdgePosition(canvasW, canvasH);
  const roll = Math.random();

  if (roll < 0.15) {
    enemies.push(createEnemy(x, y, {
      radius: 24,
      contactDamage: 2,
      color: '#993366',
      glowColor: '#cc44aa',
      armor: { gapAngle: Math.random() * Math.PI * 2, spiked: true },
      baseScore: 300,
    }));
  } else if (roll < 0.40) {
    enemies.push(createEnemy(x, y, {
      radius: 24,
      color: '#cc4444',
      glowColor: '#ff4444',
      armor: { gapAngle: Math.random() * Math.PI * 2, spiked: false },
      baseScore: 200,
    }));
  } else {
    enemies.push(createEnemy(x, y, { baseScore: 100 }));
  }
}

export function removeEnemy(index) {
  enemies.splice(index, 1);
}

export function updateEnemies(dt) {
  for (const e of enemies) {
    // Knockback decay
    e.x += e.knockback.vx * dt;
    e.y += e.knockback.vy * dt;
    e.knockback.vx *= 0.9;
    e.knockback.vy *= 0.9;

    // Move toward player
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      e.x += (dx / dist) * e.speed * dt;
      e.y += (dy / dist) * e.speed * dt;
    }

    // Contact damage — only when NOT dashing
    if (!player.isDashing && dist < PLAYER_RADIUS + e.radius) {
      damagePlayer(e.contactDamage, e.x, e.y);
    }

    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.deflectFlash > 0) e.deflectFlash -= dt;
  }

  // Separate overlapping enemies
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      const minDist = a.radius + b.radius;
      if (distSq < minDist * minDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }
    }
  }
}

export function drawEnemies(ctx) {
  for (const e of enemies) {
    ctx.save();
    drawEnemy(ctx, e);
    ctx.restore();
  }
}

function drawEnemy(ctx, e) {
  const isDeflecting = e.deflectFlash > 0;

  // Body
  ctx.fillStyle = isDeflecting ? '#666' : e.color;
  ctx.shadowColor = e.glowColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!e.armor) return;

  const gapHalf = ARMOR_GAP_ANGLE / 2;
  const armorStart = e.armor.gapAngle + gapHalf;
  const armorSpan = (Math.PI * 2) - ARMOR_GAP_ANGLE;

  if (e.armor.spiked) {
    drawSpikedArmor(ctx, e, armorStart, armorSpan, isDeflecting);
  } else {
    drawSmoothArmor(ctx, e, armorStart, armorSpan, isDeflecting);
  }

  drawGapMarkers(ctx, e, gapHalf);
}

function drawSmoothArmor(ctx, e, armorStart, armorSpan, isDeflecting) {
  ctx.strokeStyle = isDeflecting ? '#cccccc' : '#aa8833';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius + 2, armorStart, armorStart + armorSpan);
  ctx.stroke();

  ctx.strokeStyle = isDeflecting ? '#eeeeee' : '#ccaa44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius + 5, armorStart, armorStart + armorSpan);
  ctx.stroke();
}

function drawSpikedArmor(ctx, e, armorStart, armorSpan, isDeflecting) {
  const spikeCount = 10;
  const innerR = e.radius + 1;
  const outerR = e.radius + 12;
  const midR = e.radius + 4;

  ctx.fillStyle = isDeflecting ? '#aaa' : '#774488';
  ctx.beginPath();
  for (let i = 0; i < spikeCount; i++) {
    const a = armorStart + (i / spikeCount) * armorSpan;
    const aMid = armorStart + ((i + 0.5) / spikeCount) * armorSpan;
    const tipA = armorStart + ((i + 0.25) / spikeCount) * armorSpan;

    if (i === 0) ctx.moveTo(e.x + Math.cos(a) * innerR, e.y + Math.sin(a) * innerR);
    ctx.lineTo(e.x + Math.cos(tipA) * outerR, e.y + Math.sin(tipA) * outerR);
    ctx.lineTo(e.x + Math.cos(aMid) * midR, e.y + Math.sin(aMid) * midR);
  }
  for (let i = spikeCount; i >= 0; i--) {
    const a = armorStart + (i / spikeCount) * armorSpan;
    ctx.lineTo(e.x + Math.cos(a) * innerR, e.y + Math.sin(a) * innerR);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isDeflecting ? '#ccc' : '#995599';
  ctx.lineWidth = 1;
  for (let i = 0; i < spikeCount; i++) {
    const tipA = armorStart + ((i + 0.25) / spikeCount) * armorSpan;
    const baseA = armorStart + (i / spikeCount) * armorSpan;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(baseA) * midR, e.y + Math.sin(baseA) * midR);
    ctx.lineTo(e.x + Math.cos(tipA) * outerR, e.y + Math.sin(tipA) * outerR);
    ctx.stroke();
  }

  ctx.strokeStyle = isDeflecting ? '#999' : '#663377';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius + 1, armorStart, armorStart + armorSpan);
  ctx.stroke();
}

function drawGapMarkers(ctx, e, gapHalf) {
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 10;
  const markLen = 8;
  for (const sign of [-1, 1]) {
    const a = e.armor.gapAngle + sign * gapHalf;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(a) * (e.radius - 2), e.y + Math.sin(a) * (e.radius - 2));
    ctx.lineTo(e.x + Math.cos(a) * (e.radius + markLen), e.y + Math.sin(a) * (e.radius + markLen));
    ctx.stroke();
  }

  const arrowDist = e.radius + 14;
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(
    e.x + Math.cos(e.armor.gapAngle) * arrowDist,
    e.y + Math.sin(e.armor.gapAngle) * arrowDist,
    3, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;
}
