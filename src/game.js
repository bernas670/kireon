import { SPAWN_INTERVAL } from './config.js';
import { updateFeedback, applyShake } from './feedback.js';
import { player, resetPlayer, tryDash, trySlashBack, updatePlayer, drawPlayer } from './player.js';
import { enemies, clearEnemies, spawnEnemy, updateEnemies, drawEnemies } from './enemy.js';
import { clearCombat, createSlash, updateCombat, drawSlashes } from './combat.js';
import { clearParticles, updateParticles, drawParticles } from './particles.js';
import { drawHUD } from './hud.js';
import { initAudio, playSlash } from './audio.js';
import { mechanics, mechanicsList } from './mechanics.js';
import { resetCombo, updateComboPopups } from './combo.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

let spawnTimer = 0;
let lastTime = 0;

// --- Game state ---
let gameState = 'menu'; // 'menu' | 'playing'

// Menu hover state
let hoveredMechanic = -1;
let hoveredStart = false;

function getMechanicBounds(index, cx, cy) {
  const startY = cy - 20;
  const boxW = 360, boxH = 44, gap = 8;
  const y = startY + index * (boxH + gap);
  const x = cx - boxW / 2;
  return { x, y, w: boxW, h: boxH };
}

function getStartBounds(cx, cy) {
  const startY = cy - 20;
  const boxH = 44, gap = 8;
  const btnY = startY + mechanicsList.length * (boxH + gap) + 30;
  const btnW = 200, btnH = 48;
  return { x: cx - btnW / 2, y: btnY, w: btnW, h: btnH };
}

function drawMenu() {
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, w, h);

  // Grid (same as gameplay)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let gx = 0; gx < w; gx += gridSize) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4488ff';
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px monospace';
  ctx.fillText('KIREON', cx, cy - 120);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px monospace';
  ctx.fillText('Select mechanics to playtest', cx, cy - 80);

  // Mechanic toggles
  mechanicsList.forEach((m, i) => {
    const b = getMechanicBounds(i, cx, cy);
    const on = mechanics[m.key];
    const hovered = hoveredMechanic === i;

    // Box
    ctx.fillStyle = hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = on ? '#4488ff' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = on ? 2 : 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // Checkbox
    const cbx = b.x + 16, cby = b.y + b.h / 2 - 8, cbs = 16;
    ctx.strokeStyle = on ? '#4488ff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cbx, cby, cbs, cbs);
    if (on) {
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(cbx + 3, cby + 3, cbs - 6, cbs - 6);
    }

    // Label
    ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(m.label, cbx + cbs + 12, b.y + 19);

    // Description
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '12px monospace';
    ctx.fillText(m.desc, cbx + cbs + 12, b.y + 35);

    ctx.textAlign = 'center';
  });

  // Start button
  const sb = getStartBounds(cx, cy);
  ctx.fillStyle = hoveredStart ? '#4488ff' : 'rgba(68,136,255,0.8)';
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = hoveredStart ? 20 : 10;
  ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('START', cx, sb.y + 30);

  ctx.textAlign = 'left';
}

function handleMenuClick(e) {
  const cx = canvas.width / 2, cy = canvas.height / 2;

  // Check mechanic toggles
  mechanicsList.forEach((m, i) => {
    const b = getMechanicBounds(i, cx, cy);
    if (e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h) {
      mechanics[m.key] = !mechanics[m.key];
    }
  });

  // Check start button
  const sb = getStartBounds(cx, cy);
  if (e.clientX >= sb.x && e.clientX <= sb.x + sb.w && e.clientY >= sb.y && e.clientY <= sb.y + sb.h) {
    gameState = 'playing';
    init();
  }
}

function handleMenuMouseMove(e) {
  const cx = canvas.width / 2, cy = canvas.height / 2;
  hoveredMechanic = -1;
  hoveredStart = false;

  mechanicsList.forEach((_m, i) => {
    const b = getMechanicBounds(i, cx, cy);
    if (e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h) {
      hoveredMechanic = i;
    }
  });

  const sb = getStartBounds(cx, cy);
  if (e.clientX >= sb.x && e.clientX <= sb.x + sb.w && e.clientY >= sb.y && e.clientY <= sb.y + sb.h) {
    hoveredStart = true;
  }

  canvas.style.cursor = (hoveredMechanic >= 0 || hoveredStart) ? 'pointer' : 'crosshair';
}

function init() {
  resetPlayer(canvas.width / 2, canvas.height / 2);
  clearEnemies();
  clearCombat();
  clearParticles();
  resetCombo();
  spawnTimer = 0;
  lastTime = 0;

  for (let i = 0; i < 5; i++) spawnEnemy(canvas.width, canvas.height);
}

// Input
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && gameState === 'playing') {
    gameState = 'menu';
    canvas.style.cursor = 'crosshair';
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (gameState === 'menu') handleMenuMouseMove(e);
});

canvas.addEventListener('click', (e) => {
  initAudio();
  if (gameState === 'menu') { handleMenuClick(e); return; }
  if (player.dead) { init(); return; }
  tryDash(e.clientX, e.clientY);
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  initAudio();
  if (gameState === 'menu') return;
  if (player.dead) return;
  if (!mechanics.afterimage) return;
  trySlashBack();
});

// Update
function update(dt) {
  if (player.dead) return;

  const frozen = updateFeedback(dt);
  if (frozen) return;

  const slashResult = updatePlayer(dt);
  if (slashResult) {
    playSlash();
    createSlash(slashResult.sx, slashResult.sy, slashResult.ex, slashResult.ey);
  }

  updateCombat(dt);
  updateEnemies(dt);
  updateParticles(dt);
  updateComboPopups(dt);

  // Spawning
  spawnTimer += dt;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer = 0;
    spawnEnemy(canvas.width, canvas.height);
    if (enemies.length < 3) spawnEnemy(canvas.width, canvas.height);
  }
}

// Draw
function draw() {
  if (gameState === 'menu') {
    drawMenu();
    return;
  }

  ctx.save();
  if (!player.dead) applyShake(ctx);

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let gx = 0; gx < canvas.width; gx += gridSize) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
  }
  for (let gy = 0; gy < canvas.height; gy += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
  }

  drawSlashes(ctx);
  drawEnemies(ctx);
  drawPlayer(ctx);
  drawParticles(ctx);
  drawHUD(ctx, canvas.width, canvas.height);

  ctx.restore();
}

// Loop
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0.1) dt = 0.1;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
