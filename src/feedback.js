// Screen shake and hit stop — global juice effects

export let screenShake = { intensity: 0, duration: 0, elapsed: 0 };
export let hitStop = { active: false, duration: 0, elapsed: 0 };

export function triggerShake(intensity, duration) {
  screenShake.intensity = intensity;
  screenShake.duration = duration;
  screenShake.elapsed = 0;
}

export function triggerHitStop(duration) {
  hitStop.active = true;
  hitStop.duration = duration;
  hitStop.elapsed = 0;
}

export function updateFeedback(dt) {
  if (hitStop.active) {
    hitStop.elapsed += dt;
    if (hitStop.elapsed >= hitStop.duration) hitStop.active = false;
    return true; // signals "freeze this frame"
  }

  if (screenShake.duration > 0) {
    screenShake.elapsed += dt;
    if (screenShake.elapsed >= screenShake.duration) screenShake.duration = 0;
  }

  return false;
}

export function applyShake(ctx) {
  if (screenShake.duration > 0) {
    const t = 1 - screenShake.elapsed / screenShake.duration;
    const intensity = screenShake.intensity * t;
    ctx.translate(
      (Math.random() - 0.5) * 2 * intensity,
      (Math.random() - 0.5) * 2 * intensity
    );
  }
}
