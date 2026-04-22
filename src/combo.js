// Combo system — tracks consecutive valid kills and multi-kill amplification

import { player } from './player.js';
import { playComboBreak } from './audio.js';

// --- Combo state ---
export const combo = {
  count: 0,
  multiplier: 1.0,
  active: false,
  lastGain: 0,
  lastKillCount: 0,
};

// --- Combo constants ---
const COMBO_GAIN_CAP = 10.0;
const MULTIPLIER_CAP = 4.0;
const MULTIPLIER_RATE = 0.1;

// --- Floating text popups ---
let popups = [];

// Multi-kill callout names
const MULTI_KILL_NAMES = {
  2: 'DOUBLE CUT',
  3: 'TRIPLE CUT',
  4: 'QUADRA CUT',
};

function getMultiKillName(kills) {
  if (kills >= 5) return 'MASTER CUT';
  return MULTI_KILL_NAMES[kills] || null;
}

// --- Core logic ---

export function resetCombo() {
  combo.count = 0;
  combo.multiplier = 1.0;
  combo.active = false;
  combo.lastGain = 0;
  combo.lastKillCount = 0;
  popups = [];
}

export function breakCombo() {
  if (!combo.active) return;

  combo.count = 0;
  combo.multiplier = 1.0;
  combo.active = false;
  playComboBreak();

  // Spawn break popup
  popups.push({
    text: 'COMBO BREAK',
    x: player.x,
    y: player.y - 40,
    life: 0.8,
    maxLife: 0.8,
    type: 'break',
    vy: -30,
  });
}

/**
 * Called when a slash finishes its hit phase.
 * @param {number} killCount - enemies killed by this slash
 * @param {boolean} hitArmor - whether the slash hit any armor
 * @param {number} totalBaseScore - sum of baseScore of killed enemies
 * @returns {number} score gained from this action
 */
export function resolveSlashCombo(killCount, hitArmor, totalBaseScore) {
  // No valid kills = break (miss or only armor hits)
  if (killCount === 0) {
    breakCombo();
    return 0;
  }

  // Valid kills — activate combo if not active
  if (!combo.active) {
    combo.active = true;
    combo.count = 0;
  }

  // Calculate combo gain with multi-kill amplification
  let comboGain = killCount * (1 + (killCount - 1) * 0.5);
  comboGain = Math.min(comboGain, COMBO_GAIN_CAP);

  combo.count += comboGain;
  combo.lastGain = comboGain;
  combo.lastKillCount = killCount;

  // Update multiplier
  combo.multiplier = 1 + combo.count * MULTIPLIER_RATE;
  combo.multiplier = Math.min(combo.multiplier, MULTIPLIER_CAP);

  // Calculate score
  const scoreGained = Math.round(totalBaseScore * combo.multiplier);

  // Spawn combo popup
  popups.push({
    text: `${Math.round(combo.count)} HIT — x${combo.multiplier.toFixed(1)}`,
    x: player.x,
    y: player.y - 40,
    life: 1.0,
    maxLife: 1.0,
    type: 'combo',
    vy: -25,
  });

  // Multi-kill callout
  if (killCount > 1) {
    const name = getMultiKillName(killCount);
    if (name) {
      popups.push({
        text: name,
        x: player.x,
        y: player.y - 70,
        life: 1.2,
        maxLife: 1.2,
        type: 'multikill',
        vy: -20,
        scale: Math.min(killCount / 3, 1.5),
      });
    }
  }

  return scoreGained;
}

// --- Update & Draw ---

export function updateComboPopups(dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.life -= dt;
    p.y += p.vy * dt;
    if (p.life <= 0) popups.splice(i, 1);
  }
}

export function drawComboPopups(ctx) {
  for (const p of popups) {
    const alpha = Math.min(p.life / p.maxLife, 1);
    // Fade in quickly, fade out over last 30%
    const fadeIn = Math.min((p.maxLife - p.life) / 0.1, 1);
    const fadeOut = p.life < p.maxLife * 0.3 ? p.life / (p.maxLife * 0.3) : 1;
    const finalAlpha = fadeIn * fadeOut;

    ctx.save();
    ctx.globalAlpha = finalAlpha;
    ctx.textAlign = 'center';

    if (p.type === 'break') {
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#cc2244';
      ctx.shadowColor = '#cc2244';
      ctx.shadowBlur = 15;
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.type === 'multikill') {
      const size = Math.round(22 * (p.scale || 1));
      ctx.font = `bold ${size}px monospace`;
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 20;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      // combo
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#88ccff';
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 10;
      ctx.fillText(p.text, p.x, p.y);
    }

    ctx.restore();
  }
}

export function drawComboHUD(ctx, canvasW) {
  if (!combo.active) return;

  const text = `${Math.round(combo.count)} HIT — x${combo.multiplier.toFixed(1)}`;

  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = 'bold 18px monospace';

  // Glow intensity scales with multiplier
  const glowIntensity = Math.min((combo.multiplier - 1) * 5, 20);

  ctx.fillStyle = '#88ccff';
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = glowIntensity;
  ctx.fillText(text, canvasW - 20, 30);

  // Multiplier emphasis when high
  if (combo.multiplier >= 2.0) {
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffcc44';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.fillText(`COMBO ACTIVE`, canvasW - 20, 48);
  }

  ctx.restore();
}
