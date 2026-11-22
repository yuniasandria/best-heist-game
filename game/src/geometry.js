// Geometry helpers shared by guards (line of sight), render (raycast light
// and vision cones) and main (movement collision). Walls are axis-aligned
// rects; everything else is a segment test against their edges.
export function rectSegments(r) {
  const { x, y, w, h } = r;
  return [
    { x1: x, y1: y, x2: x + w, y2: y },
    { x1: x + w, y1: y, x2: x + w, y2: y + h },
    { x1: x + w, y1: y + h, x2: x, y2: y + h },
    { x1: x, y1: y + h, x2: x, y2: y },
  ];
}

export function wallsToSegments(walls) {
  const out = [];
  for (const w of walls) out.push(...rectSegments(w));
  return out;
}

// Ray from (ox,oy) along unit (dx,dy) against one segment; returns distance or Infinity.
export function raySegment(ox, oy, dx, dy, s) {
  const rx = s.x2 - s.x1, ry = s.y2 - s.y1;
  const denom = dx * ry - dy * rx;
  if (Math.abs(denom) < 1e-9) return Infinity;
  const t = ((s.x1 - ox) * ry - (s.y1 - oy) * rx) / denom;
  const u = ((s.x1 - ox) * dy - (s.y1 - oy) * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return Infinity;
  return t;
}

// Nearest wall distance along a ray, capped at maxDist.
export function raycast(ox, oy, angle, maxDist, segments) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = maxDist;
  for (const s of segments) {
    const d = raySegment(ox, oy, dx, dy, s);
    if (d < best) best = d;
  }
  return best;
}

// True when the straight line between two points is not cut by any wall.
export function lineOfSight(ax, ay, bx, by, segments) {
  const dx = bx - ax, dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  for (const s of segments) {
    const d = raySegment(ax, ay, dx / dist, dy / dist, s);
    if (d < dist - 0.5) return false;
  }
  return true;
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Move a circle against rects, sliding along walls. Returns the new position.
export function moveCircle(x, y, r, dx, dy, solids) {
  let nx = x + dx;
  for (const s of solids) {
    if (circleHitsRect(nx, y, r, s)) {
      nx = dx > 0 ? s.x - r : dx < 0 ? s.x + s.w + r : nx;
      if (circleHitsRect(nx, y, r, s)) nx = x;
    }
  }
  let ny = y + dy;
  for (const s of solids) {
    if (circleHitsRect(nx, ny, r, s)) {
      ny = dy > 0 ? s.y - r : dy < 0 ? s.y + s.h + r : ny;
      if (circleHitsRect(nx, ny, r, s)) ny = y;
    }
  }
  return { x: nx, y: ny };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
