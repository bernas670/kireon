import { SLASH_WIDTH, SLASH_HIT_LIFETIME, SLASH_VISUAL_LIFETIME, HIT_STOP_DURATION, SCREEN_SHAKE_INTENSITY, SCREEN_SHAKE_DURATION, KNOCKBACK_FORCE, ARMOR_GAP_ANGLE } from './config.js';
import { playEnemyHit, playArmorDeflect } from './audio.js';
import { pointToSegmentDist, normalizeAngle, segmentCircleEntry } from './math.js';
import { enemies, removeEnemy } from './enemy.js';
import { damagePlayer } from './player.js';
import { triggerShake, triggerHitStop } from './feedback.js';
import { spawnHitParticles, spawnDeflectParticles } from './particles.js';
import { resolveSlashCombo } from './combo.js';

export let slashes = [];
export let score = 0;

export function clearCombat() {
  slashes = [];
  score = 0;
}

export function createSlash(sx, sy, ex, ey) {
  slashes.push({
    sx, sy, ex, ey,
    width: SLASH_WIDTH,
    hitLifetime: SLASH_HIT_LIFETIME,
    visualLifetime: SLASH_VISUAL_LIFETIME,
    hitElapsed: 0,
    visualElapsed: 0,
    hitEnemies: new Set(),
    // Combo tracking per slash
    killCount: 0,
    hitArmor: false,
    totalBaseScore: 0,
    comboEvaluated: false,
  });
}

export function updateCombat(dt) {
  for (let i = slashes.length - 1; i >= 0; i--) {
    const s = slashes[i];
    s.hitElapsed += dt;
    s.visualElapsed += dt;

    if (s.hitElapsed <= s.hitLifetime) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (s.hitEnemies.has(j)) continue;

        const e = enemies[j];
        const dist = pointToSegmentDist(e.x, e.y, s.sx, s.sy, s.ex, s.ey);
        if (dist < s.width / 2 + e.radius) {
          s.hitEnemies.add(j);
          resolveSlashHit(j, s);
        }
      }
    }

    // Evaluate combo when hit phase ends
    if (s.hitElapsed > s.hitLifetime && !s.comboEvaluated) {
      s.comboEvaluated = true;
      const gained = resolveSlashCombo(s.killCount, s.hitArmor, s.totalBaseScore);
      score += gained;
    }

    if (s.visualElapsed > s.visualLifetime) {
      slashes.splice(i, 1);
    }
  }
}

// Determine if the slash enters the enemy through the armor gap or hits the armored shell.
// We find where the slash segment first intersects the enemy's circle, then check
// if that entry point on the perimeter falls within the gap arc.
function doesSlashEnterThroughGap(enemy, slash) {
  const entry = segmentCircleEntry(slash.sx, slash.sy, slash.ex, slash.ey, enemy.x, enemy.y, enemy.radius);

  if (!entry) {
    // Slash start is already inside the enemy circle (player was very close).
    // Use the angle from enemy center to slash start as the entry angle.
    const entryAngle = Math.atan2(slash.sy - enemy.y, slash.sx - enemy.x);
    const diff = normalizeAngle(entryAngle - enemy.armor.gapAngle);
    return Math.abs(diff) < ARMOR_GAP_ANGLE / 2;
  }

  // Angle from enemy center to the point where the slash first touches the perimeter
  const entryAngle = Math.atan2(entry.y - enemy.y, entry.x - enemy.x);
  const diff = normalizeAngle(entryAngle - enemy.armor.gapAngle);
  return Math.abs(diff) < ARMOR_GAP_ANGLE / 2;
}

function resolveSlashHit(enemyIndex, slash) {
  const e = enemies[enemyIndex];

  if (!e.armor) {
    killEnemy(enemyIndex, slash);
    return;
  }

  if (doesSlashEnterThroughGap(e, slash)) {
    // Clean hit through the gap — no damage to player, even on spiked armor
    killEnemy(enemyIndex, slash);
  } else {
    // Hit the armor shell — marks this slash as having an invalid hit
    slash.hitArmor = true;

    e.deflectFlash = 0.15;
    playArmorDeflect();
    spawnDeflectParticles(e.x, e.y);
    triggerShake(3, 0.06);

    // Spiked armor punishes you for hitting it
    if (e.armor.spiked) {
      damagePlayer(1, e.x, e.y);
    }
  }
}

function killEnemy(index, slash) {
  const e = enemies[index];

  // Track kill for combo evaluation
  slash.killCount++;
  slash.totalBaseScore += (e.baseScore || 100);

  playEnemyHit(!!e.armor);

  // Scale hit stop and shake with multi-kills
  const killScale = Math.min(slash.killCount, 4);
  triggerHitStop(HIT_STOP_DURATION * (1 + (killScale - 1) * 0.4));
  triggerShake(
    SCREEN_SHAKE_INTENSITY * (1 + (killScale - 1) * 0.3),
    SCREEN_SHAKE_DURATION * (1 + (killScale - 1) * 0.2)
  );

  const angle = Math.atan2(slash.ey - slash.sy, slash.ex - slash.sx);
  e.knockback.vx = Math.cos(angle) * KNOCKBACK_FORCE;
  e.knockback.vy = Math.sin(angle) * KNOCKBACK_FORCE;

  const color = e.armor?.spiked ? '#ff66ff' : (e.armor ? '#ffd700' : '#ff4444');
  spawnHitParticles(e.x, e.y, color);

  removeEnemy(index);

  // Fix stale indices in all active slashes
  for (const s of slashes) {
    const newSet = new Set();
    for (const idx of s.hitEnemies) {
      if (idx < index) newSet.add(idx);
      else if (idx > index) newSet.add(idx - 1);
    }
    s.hitEnemies = newSet;
  }
}

export function drawSlashes(ctx) {
  for (const s of slashes) {
    const alpha = 1 - (s.visualElapsed / s.visualLifetime);
    if (alpha <= 0) continue;
    const hw = s.width / 2 * alpha;

    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = hw * 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(s.sx, s.sy); ctx.lineTo(s.ex, s.ey); ctx.stroke();

    ctx.strokeStyle = '#ccefff';
    ctx.lineWidth = hw * 0.6;
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(s.sx, s.sy); ctx.lineTo(s.ex, s.ey); ctx.stroke();
    ctx.restore();
  }
}
