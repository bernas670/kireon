export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return distance(px, py, ax, ay);
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return distance(px, py, ax + t * abx, ay + t * aby);
}

// Find the closest point on segment (ax,ay)-(bx,by) to point (px,py),
// returned as the parametric t along the segment [0,1].
export function closestTOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return 0;
  return Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
}

// Find where line segment (ax,ay)-(bx,by) intersects circle at (cx,cy,r).
// Returns the entry point { x, y } closest to (ax,ay), or null if no intersection.
export function segmentCircleEntry(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - cx;
  const fy = ay - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  discriminant = Math.sqrt(discriminant);

  // t1 is the earlier intersection (entry point)
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  // We want the first intersection that's on the segment [0,1]
  let t = null;
  if (t1 >= 0 && t1 <= 1) t = t1;
  else if (t2 >= 0 && t2 <= 1) t = t2;
  else return null;

  return {
    x: ax + t * dx,
    y: ay + t * dy,
  };
}
