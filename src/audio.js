let ctx = null;
const buffers = {};

const SOUNDS = {
  slash:             { src: '/sounds/slash.mp3',             volume: 0.7, pitchRange: 0.15 },
  player_hit:        { src: '/sounds/player_hit.mp3',        volume: 0.8, pitchRange: 0.10 },
  enemy_hit:         { src: '/sounds/enemy_hit.mp3',         volume: 0.7, pitchRange: 0.12 },
  enemy_hit_armored: { src: '/sounds/enemy_hit_armored.mp3', volume: 0.7, pitchRange: 0.12 },
  armor_deflect:     { src: '/sounds/armor_deflect.mp3',     volume: 0.75, pitchRange: 0.08 },
  combo_break:       { src: '/sounds/combo_break.mp3',      volume: 0.6,  pitchRange: 0.05 },
};

async function loadBuffer(name, def) {
  try {
    const res = await fetch(def.src);
    if (!res.ok) return;
    const arrayBuffer = await res.arrayBuffer();
    buffers[name] = await ctx.decodeAudioData(arrayBuffer);
  } catch {
    // Sound file not yet present — silently skip
  }
}

export function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  for (const [name, def] of Object.entries(SOUNDS)) {
    loadBuffer(name, def);
  }
}

function play(name, extraVolume = 1) {
  if (!ctx || !buffers[name]) return;
  const def = SOUNDS[name];

  const source = ctx.createBufferSource();
  source.buffer = buffers[name];
  source.playbackRate.value = 1 + (Math.random() * 2 - 1) * def.pitchRange;

  const gain = ctx.createGain();
  gain.gain.value = def.volume * extraVolume;

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playSlash() {
  play('slash');
}

export function playPlayerHit() {
  play('player_hit');
}

// For armored kills, layer both flesh and metal sounds
export function playEnemyHit(hasArmor) {
  if (hasArmor) {
    play('enemy_hit_armored');
    play('armor_deflect', 0.4); // subtle metal layer underneath
  } else {
    play('enemy_hit');
  }
}

export function playArmorDeflect() {
  play('armor_deflect');
}

export function playComboBreak() {
  play('combo_break');
}
