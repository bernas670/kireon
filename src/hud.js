import { PLAYER_MAX_HP } from './config.js';
import { player } from './player.js';
import { score } from './combat.js';

export function drawHUD(ctx, canvasW, canvasH) {
  // Health bar
  const hbX = 20, hbY = 14, hbW = 120, hbH = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(hbX, hbY, hbW, hbH);

  const hpRatio = player.hp / PLAYER_MAX_HP;
  ctx.fillStyle = hpRatio > 0.5 ? '#44cc66' : (hpRatio > 0.25 ? '#ccaa22' : '#cc2244');
  ctx.fillRect(hbX, hbY, hbW * hpRatio, hbH);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(hbX, hbY, hbW, hbH);

  for (let i = 1; i < PLAYER_MAX_HP; i++) {
    const px = hbX + (hbW / PLAYER_MAX_HP) * i;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(px, hbY); ctx.lineTo(px, hbY + hbH); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '14px monospace';
  ctx.fillText(`KILLS: ${score}`, 20, 44);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px monospace';
  ctx.fillText('Click to dash & slash  |  Gap in armor = weak spot  |  Spiked armor hurts on deflect', 20, canvasH - 20);

  // Death screen
  if (player.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = '#cc2244';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEAD', canvasW / 2, canvasH / 2 - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '18px monospace';
    ctx.fillText(`Score: ${score}`, canvasW / 2, canvasH / 2 + 20);
    ctx.fillText('Click to restart', canvasW / 2, canvasH / 2 + 50);
    ctx.textAlign = 'left';
  }
}
