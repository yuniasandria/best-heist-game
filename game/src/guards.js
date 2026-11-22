// Guards, cameras and lasers: the things that can catch the thief.
// A guard patrols its waypoints, pauses at each, and watches a raycast
// vision cone. Seeing the thief raises suspicion; a full suspicion meter
// flips the guard to ALERTED, it chases, and the alarm climbs. Loud noise
// (or a tossed coin) sends a guard to investigate a point instead. Cameras
// sweep a cone and raise the alarm directly. Lasers trip the alarm when the
// thief crosses their beam while it is on.
import {
  GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_VISION_RANGE, GUARD_VISION_HALF,
  GUARD_HEAR_RANGE, CAMERA_RANGE, CAMERA_HALF, SUSPICION_RISE, SUSPICION_FALL,
  ALARM_RISE_SPOTTED, ALARM_RISE_NOISE,
} from './config.js';
import { lineOfSight, angleDiff, clamp, moveCircle } from './geometry.js';

export function makeGuard(def) {
  return {
    x: def.x, y: def.y,
    waypoints: def.waypoints, wp: 0, pause: def.pause,
    wait: 0, angle: 0, suspicion: 0,
    state: 'patrol', // patrol | investigate | chase
    target: null, lastSeen: null, speed: GUARD_PATROL_SPEED,
  };
}

export function makeCamera(def) {
  return { ...def, angle: def.base, t: Math.random() * 6, disabled: 0 };
}

function guardSeesThief(g, thief, segments, lit) {
  const dx = thief.x - g.x, dy = thief.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VISION_RANGE) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, g.angle)) > GUARD_VISION_HALF) return 0;
  if (!lineOfSight(g.x, g.y, thief.x, thief.y, segments)) return 0;
  // Darkness hides: a thief standing in shadow is much harder to spot, and
  // smoke blocks sight entirely. lit is 0 (deep shadow) .. 1 (moonlight).
  const visibility = 0.25 + 0.75 * lit;
  return visibility * (1 - dist / (GUARD_VISION_RANGE * 1.4));
}

export function updateGuard(g, dt, ctx) {
  const { thief, segments, solids, noise, smoke, time } = ctx;
  const seen = smokeBlocks(g, thief, smoke) ? 0 : guardSeesThief(g, thief, segments, ctx.lightAt(thief.x, thief.y));

  if (seen > 0) {
    g.suspicion = clamp(g.suspicion + SUSPICION_RISE * seen * dt, 0, 100);
    g.lastSeen = { x: thief.x, y: thief.y, t: time };
    if (g.suspicion >= 100) { g.state = 'chase'; }
    else if (g.suspicion >= 45) { g.state = 'investigate'; g.target = { x: thief.x, y: thief.y }; }
  } else {
    g.suspicion = clamp(g.suspicion - SUSPICION_FALL * dt, 0, 100);
  }

  if (g.state === 'chase') {
    // Chase the last seen spot; give up and resume patrol if the trail is cold.
    const tgt = g.lastSeen;
    if (!tgt || time - tgt.t > 4) { g.state = 'patrol'; g.suspicion = 40; }
    else {
      g.speed = GUARD_CHASE_SPEED;
      stepToward(g, tgt.x, tgt.y, dt, solids);
      ctx.alarm += ALARM_RISE_SPOTTED * dt * 0.6;
      if (seen > 0) ctx.alarm += ALARM_RISE_SPOTTED * dt * 0.4;
    }
  } else if (g.state === 'investigate' && g.target) {
    g.speed = GUARD_PATROL_SPEED * 1.5;
    const arrived = stepToward(g, g.target.x, g.target.y, dt, solids);
    if (arrived) { g.wait = 1.2; g.state = 'patrol'; g.target = null; }
  } else {
    // Patrol: walk the waypoint loop, pausing and looking around at each stop.
    g.speed = GUARD_PATROL_SPEED;
    if (g.wait > 0) {
      g.wait -= dt;
      g.angle += Math.sin(time * 1.4 + g.x) * 0.9 * dt;
    } else {
      const wp = g.waypoints[g.wp];
      const arrived = stepToward(g, wp[0], wp[1], dt, solids);
      if (arrived) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        g.wait = g.pause;
      }
    }
  }

  // Noise pulls a patrolling guard to investigate (unless it is chasing).
  if (noise && g.state !== 'chase') {
    const d = Math.hypot(noise.x - g.x, noise.y - g.y);
    if (d < GUARD_HEAR_RANGE && noise.radius > 40) {
      g.state = 'investigate';
      g.target = { x: noise.x, y: noise.y };
      ctx.alarm += ALARM_RISE_NOISE * dt * 0.25;
    }
  }
  return g;
}

function stepToward(g, tx, ty, dt, solids) {
  const dx = tx - g.x, dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return true;
  const step = Math.min(dist, g.speed * dt);
  const p = moveCircle(g.x, g.y, 14, (dx / dist) * step, (dy / dist) * step, solids);
  g.angle = Math.atan2(dy, dx);
  g.x = p.x; g.y = p.y;
  return false;
}

function smokeBlocks(g, thief, smoke) {
  for (const s of smoke) {
    const d1 = Math.hypot(s.x - g.x, s.y - g.y);
    const d2 = Math.hypot(s.x - thief.x, s.y - thief.y);
    const dg = Math.hypot(thief.x - g.x, thief.y - g.y);
    if (d1 < s.r && d2 < s.r) return true;
    if (d1 + d2 < dg + s.r * 0.6) return true;
  }
  return false;
}

export function updateCamera(cam, dt, ctx) {
  if (cam.disabled > 0) { cam.disabled -= dt; return false; }
  cam.t += dt;
  cam.angle = cam.base + Math.sin(cam.t * cam.speed) * cam.sweep;
  const { thief, segments } = ctx;
  const dx = thief.x - cam.x, dy = thief.y - cam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_RANGE) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), cam.angle)) > CAMERA_HALF) return false;
  if (!lineOfSight(cam.x, cam.y, thief.x, thief.y, segments)) return false;
  if (ctx.lightAt(thief.x, thief.y) < 0.15) return false; // cameras need light too
  ctx.alarm += ALARM_RISE_SPOTTED * dt;
  return true;
}

// A laser beam trips when the thief crosses it while the beam is lit.
// Beams blink on a slow cycle so a careful thief can time the crossing.
export function laserTripped(laser, thief, time) {
  const cycle = (time % 3) / 3;
  if (cycle > 0.72) return false; // beam dark for the last part of the cycle
  const dx = laser.x2 - laser.x1, dy = laser.y2 - laser.y1;
  const len2 = dx * dx + dy * dy;
  let t = ((thief.x - laser.x1) * dx + (thief.y - laser.y1) * dy) / len2;
  t = clamp(t, 0, 1);
  const px = laser.x1 + dx * t, py = laser.y1 + dy * t;
  return Math.hypot(thief.x - px, thief.y - py) < 16;
}
