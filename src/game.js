import { SPAWN_INTERVAL } from './config.js';
import { updateFeedback, applyShake } from './feedback.js';
import { player, resetPlayer, tryDash, updatePlayer, drawPlayer } from './player.js';
import { enemies, clearEnemies, spawnEnemy, updateEnemies, drawEnemies } from './enemy.js';
import { clearCombat, createSlash, updateCombat, drawSlashes } from './combat.js';
import { clearParticles, updateParticles, drawParticles } from './particles.js';
import { drawHUD } from './hud.js';

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

function init() {
  resetPlayer(canvas.width / 2, canvas.height / 2);
  clearEnemies();
  clearCombat();
  clearParticles();
  spawnTimer = 0;
  lastTime = 0;

  for (let i = 0; i < 5; i++) spawnEnemy(canvas.width, canvas.height);
}

// Input
canvas.addEventListener('click', (e) => {
  if (player.dead) { init(); return; }
  tryDash(e.clientX, e.clientY);
});

// Update
function update(dt) {
  if (player.dead) return;

  const frozen = updateFeedback(dt);
  if (frozen) return;

  const slashResult = updatePlayer(dt);
  if (slashResult) {
    createSlash(slashResult.sx, slashResult.sy, slashResult.ex, slashResult.ey);
  }

  updateCombat(dt);
  updateEnemies(dt);
  updateParticles(dt);

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
  ctx.save();
  applyShake(ctx);

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

init();
requestAnimationFrame(gameLoop);
