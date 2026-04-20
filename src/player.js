import { PLAYER_RADIUS, PLAYER_MAX_HP, DAMAGE_INVULN, DASH_SPEED, DASH_COOLDOWN, DASH_MIN_DIST } from './config.js';
import { playPlayerHit } from './audio.js';
import { triggerShake, triggerHitStop } from './feedback.js';
import { spawnDamageParticles, spawnDeathParticles } from './particles.js';

export const player = {
  x: 0, y: 0,
  isDashing: false,
  dashStart: null,
  dashTarget: null,
  dashDuration: 0,
  dashElapsed: 0,
  cooldownTimer: 0,
  hp: PLAYER_MAX_HP,
  invulnTimer: 0,
  damageFlash: 0,
  dead: false,
  lastPos: null,
  afterimageSnapTimer: 0,
};

export function resetPlayer(cx, cy) {
  player.x = cx;
  player.y = cy;
  player.isDashing = false;
  player.dashStart = null;
  player.dashTarget = null;
  player.cooldownTimer = 0;
  player.hp = PLAYER_MAX_HP;
  player.invulnTimer = 0;
  player.damageFlash = 0;
  player.dead = false;
  player.lastPos = null;
  player.afterimageSnapTimer = 0;
}

export function trySlashBack() {
  if (!player.lastPos) return;
  tryDash(player.lastPos.x, player.lastPos.y);
}

export function tryDash(tx, ty) {
  if (player.dead || player.isDashing || player.cooldownTimer > 0) return;

  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < DASH_MIN_DIST) return;

  player.dashStart = { x: player.x, y: player.y };
  player.dashTarget = { x: tx, y: ty };
  player.dashDuration = Math.max(dist / DASH_SPEED, 0.04);
  player.dashElapsed = 0;
  player.isDashing = true;
}

export function updatePlayer(dt) {
  if (player.cooldownTimer > 0) player.cooldownTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (player.damageFlash > 0) player.damageFlash -= dt;
  if (player.afterimageSnapTimer > 0) player.afterimageSnapTimer -= dt;

  if (!player.isDashing) return null;

  player.dashElapsed += dt;
  let t = Math.min(player.dashElapsed / player.dashDuration, 1);
  const eased = 1 - Math.pow(1 - t, 2);

  player.x = player.dashStart.x + (player.dashTarget.x - player.dashStart.x) * eased;
  player.y = player.dashStart.y + (player.dashTarget.y - player.dashStart.y) * eased;

  if (t >= 1) {
    player.lastPos = { x: player.dashStart.x, y: player.dashStart.y };
    player.afterimageSnapTimer = 0.3;
    player.isDashing = false;
    player.cooldownTimer = DASH_COOLDOWN;
    // Return slash data for the combat system to create
    return {
      sx: player.dashStart.x, sy: player.dashStart.y,
      ex: player.dashTarget.x, ey: player.dashTarget.y,
    };
  }

  return null;
}

export function damagePlayer(amount, fromX, fromY) {
  if (player.invulnTimer > 0 || player.dead) return;

  player.hp -= amount;
  player.invulnTimer = DAMAGE_INVULN;
  player.damageFlash = 0.3;
  playPlayerHit();

  // Knockback away from source
  const dx = player.x - fromX;
  const dy = player.y - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  player.x += (dx / dist) * 40;
  player.y += (dy / dist) * 40;

  triggerShake(12, 0.2);
  triggerHitStop(0.08);
  spawnDamageParticles(player.x, player.y);

  if (player.hp <= 0) {
    player.hp = 0;
    player.dead = true;
    spawnDeathParticles(player.x, player.y, '#4488ff');
  }
}

export function drawPlayer(ctx) {
  if (player.dead) return;

  ctx.save();

  // Afterimage at last position
  if (player.lastPos) {
    const flicker = Math.sin(Date.now() * 0.008) * 0.08 + 0.22;
    const snapBoost = player.afterimageSnapTimer > 0 ? (player.afterimageSnapTimer / 0.3) * 0.45 : 0;
    const alpha = flicker + snapBoost;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#4488ff';
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = snapBoost > 0.1 ? 30 : 12;
    ctx.beginPath();
    ctx.arc(player.lastPos.x, player.lastPos.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#88bbff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(player.lastPos.x, player.lastPos.y, PLAYER_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Dash trail
  if (player.isDashing && player.dashStart) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(player.dashStart.x, player.dashStart.y);
    ctx.lineTo(player.x, player.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Invulnerability blink
  const visible = player.invulnTimer <= 0 || Math.floor(player.invulnTimer * 15) % 2 === 0;
  if (visible) {
    const hurt = player.damageFlash > 0;
    ctx.fillStyle = hurt ? '#ff6666' : (player.isDashing ? '#aaddff' : '#4488ff');
    ctx.shadowColor = hurt ? '#ff4444' : '#4488ff';
    ctx.shadowBlur = player.isDashing ? 25 : 15;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hurt ? '#ffaaaa' : '#88bbff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cooldown ring
  if (player.cooldownTimer > 0) {
    const t = player.cooldownTimer / DASH_COOLDOWN;
    ctx.strokeStyle = `rgba(255,255,255,${t * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - t));
    ctx.stroke();
  }

  ctx.restore();
}
