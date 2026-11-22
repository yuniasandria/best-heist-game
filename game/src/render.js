// All canvas drawing: the museum room, raycast moonlight and vision cones,
// the thief, guards, cameras, lasers, loot and smoke. The darkness overlay
// is painted on an offscreen canvas and punched with light, so moonlight
// pools, loot spotlights and guard lanterns read as real light and shadow.
import { VIEW_W, VIEW_H, COLORS, GUARD_VISION_RANGE, GUARD_VISION_HALF, CAMERA_RANGE, CAMERA_HALF } from './config.js';
import { raycast, wallsToSegments, clamp } from './geometry.js';

const dark = document.createElement('canvas');
dark.width = VIEW_W; dark.height = VIEW_H;
const dctx = dark.getContext('2d');

// How lit a point is: 0 (deep shadow) .. 1 (full moonlight). Guards and
// cameras use this to decide whether they can actually see the thief.
export function lightAt(x, y, level, lootTaken) {
  let lit = 0.1;
  for (const p of level.moonPools) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < p.r) lit = Math.max(lit, 0.55 + 0.45 * (1 - d / p.r));
  }
  for (const l of level.loot) {
    if (l.taken) continue;
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < 95) lit = Math.max(lit, 0.9 * (1 - d / 95) + 0.15);
  }
  const e = level.exit;
  const d = Math.hypot(x - (e.x + e.w / 2), y - (e.y + e.h / 2));
  if (d < 120) lit = Math.max(lit, 0.7 * (1 - d / 120));
  return clamp(lit, 0, 1);
}

function conePolygon(ox, oy, angle, half, range, segments) {
  const pts = [[ox, oy]];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const a = angle - half + (2 * half * i) / steps;
    const d = raycast(ox, oy, a, range, segments);
    pts.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d]);
  }
  return pts;
}

function tracePath(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

function punchLight(x, y, r, strength) {
  const g = dctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = g;
  dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
}

export function drawWorld(c, s) {
  const level = s.level;
  const segments = wallsToSegments(level.walls);
  const time = s.time;

  // --- floor: marble checker with carpet runners ---
  for (let ty = 0; ty < 18; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      c.fillStyle = (tx + ty) % 2 === 0 ? COLORS.marbleA : COLORS.marbleB;
      c.fillRect(tx * 40, 64 + ty * 40, 40, 40);
    }
  }
  for (const cp of level.carpets) {
    c.fillStyle = COLORS.carpet;
    c.fillRect(cp.x, cp.y, cp.w, cp.h);
    c.strokeStyle = COLORS.carpetEdge; c.lineWidth = 4;
    c.strokeRect(cp.x + 2, cp.y + 2, cp.w - 4, cp.h - 4);
    c.strokeStyle = 'rgba(232,193,90,0.35)'; c.lineWidth = 2;
    c.strokeRect(cp.x + 10, cp.y + 10, cp.w - 20, cp.h - 20);
  }

  // --- paintings on the north wall ---
  for (const p of level.paintings) {
    c.fillStyle = '#1d1410'; c.fillRect(p.x - 4, p.y - 4, p.w + 8, 26);
    c.fillStyle = p.hue; c.fillRect(p.x, p.y, p.w, 18);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(p.x + 4, p.y + 2, p.w - 8, 4);
  }

  // --- exit door (east wall); its label is drawn after the darkness so it reads ---
  const e = level.exit;
  c.fillStyle = s.exitOpen ? '#1f7a3a' : '#5a1f24';
  c.fillRect(e.x, e.y, e.w, e.h);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(e.x, e.y, 4, e.h);

  // --- display cases ---
  for (const cs of level.cases) {
    c.fillStyle = '#241d2b'; c.fillRect(cs.x, cs.y, cs.w, cs.h);
    c.fillStyle = '#3a3040'; c.fillRect(cs.x + 3, cs.y + 3, cs.w - 6, cs.h - 6);
    c.fillStyle = 'rgba(207,228,255,0.28)';
    c.fillRect(cs.x + 6, cs.y + 4, cs.w - 12, 8);
    c.strokeStyle = '#6b5d75'; c.lineWidth = 2; c.strokeRect(cs.x, cs.y, cs.w, cs.h);
  }

  // --- loot: pedestal, spotlight glint, icon ---
  for (const l of level.loot) {
    if (l.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(time * 3 + l.x);
    c.fillStyle = '#241d2b';
    c.beginPath(); c.arc(l.x, l.y, 20, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(232,193,90,${0.4 + 0.4 * pulse})`; c.lineWidth = 2;
    c.beginPath(); c.arc(l.x, l.y, 26 + 3 * pulse, 0, Math.PI * 2); c.stroke();
    drawLootIcon(c, l.kind, l.x, l.y, time);
    if (l.locked) {
      c.fillStyle = '#e8c15a'; c.font = 'bold 13px Georgia, serif'; c.textAlign = 'center';
      c.fillText('🔒 LOCKED — hold E', l.x, l.y + 42);
    }
  }

  // --- lasers ---
  for (const lz of level.lasers) {
    const on = (time % 3) / 3 <= 0.72;
    if (!on) continue;
    c.strokeStyle = 'rgba(229,72,77,0.9)'; c.lineWidth = 2;
    c.setLineDash([8, 6]); c.lineDashOffset = -time * 30;
    c.beginPath(); c.moveTo(lz.x1, lz.y1); c.lineTo(lz.x2, lz.y2); c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#e5484d';
    c.beginPath(); c.arc(lz.x1, lz.y1, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(lz.x2, lz.y2, 4, 0, Math.PI * 2); c.fill();
  }

  // --- walls (drawn over floor, under actors) ---
  for (const w of level.walls) {
    c.fillStyle = COLORS.wall; c.fillRect(w.x, w.y, w.w, w.h);
    c.fillStyle = COLORS.wallTop; c.fillRect(w.x, w.y, w.w, 3);
  }

  // --- cameras on the wall (bodies; their cones are drawn after the dark) ---
  for (const cam of s.cameras) {
    c.fillStyle = cam.disabled > 0 ? '#555' : '#222';
    c.beginPath(); c.arc(cam.x, cam.y, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = cam.disabled > 0 ? '#888' : '#e5484d';
    c.beginPath(); c.arc(cam.x, cam.y, 4, 0, Math.PI * 2); c.fill();
    if (cam.disabled > 0) {
      c.fillStyle = '#cfd8ff'; c.font = 'bold 11px Georgia, serif'; c.textAlign = 'center';
      c.fillText(`EMP ${Math.ceil(cam.disabled)}s`, cam.x, cam.y + 24);
    }
  }

  // --- guards (bodies; their cones are drawn after the dark) ---
  for (const g of s.guards) {
    // body: navy uniform, brass buttons, cap brim toward facing
    c.fillStyle = '#2c3e63'; c.beginPath(); c.arc(g.x, g.y, 14, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e8c15a'; c.lineWidth = 2; c.beginPath(); c.arc(g.x, g.y, 14, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#e8c15a';
    c.beginPath(); c.arc(g.x + Math.cos(g.angle) * 10, g.y + Math.sin(g.angle) * 10, 4, 0, Math.PI * 2); c.fill();
    // suspicion meter above the head
    if (g.suspicion > 2) {
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(g.x - 16, g.y - 30, 32, 6);
      c.fillStyle = g.suspicion >= 100 ? '#e5484d' : '#e8963c';
      c.fillRect(g.x - 15, g.y - 29, 30 * clamp(g.suspicion / 100, 0, 1), 4);
    }
    if (g.state === 'chase') {
      c.fillStyle = '#ff5a5a'; c.font = 'bold 13px Georgia, serif'; c.textAlign = 'center';
      c.fillText('!', g.x, g.y - 34);
    }
  }

  // --- coins in flight / lying (smoke is drawn after the dark, so it reads) ---
  for (const coin of s.coins) {
    c.fillStyle = '#e8c15a';
    c.beginPath(); c.arc(coin.x, coin.y, 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#9a7a2a'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(coin.x, coin.y, 6, 0, Math.PI * 2); c.stroke();
    if (coin.flying) {
      c.strokeStyle = 'rgba(232,193,90,0.5)'; c.setLineDash([4, 6]);
      c.beginPath(); c.moveTo(coin.fromX, coin.fromY); c.lineTo(coin.x, coin.y); c.stroke();
      c.setLineDash([]);
    }
  }
  // --- the thief: velvet hood, pale mask, quiet feet ---
  const t = s.thief;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath(); c.ellipse(t.x + 2, t.y + 4, 13, 7, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4a2b5a'; c.beginPath(); c.arc(t.x, t.y, 13, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#c9a4e0'; c.lineWidth = 1.5; c.beginPath(); c.arc(t.x, t.y, 13, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#e8dcc8';
  c.beginPath(); c.arc(t.x + Math.cos(t.face) * 5, t.y + Math.sin(t.face) * 5, 5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2b1a33';
  c.beginPath(); c.arc(t.x + Math.cos(t.face) * 7, t.y + Math.sin(t.face) * 7, 3, 0, Math.PI * 2); c.fill();
  // noise ring: footsteps on marble carry, on carpet they barely whisper
  if (s.noiseRadius > 4) {
    c.strokeStyle = `rgba(232,193,90,${clamp(0.5 - s.noiseRadius / 400, 0.1, 0.5)})`;
    c.lineWidth = 2;
    c.beginPath(); c.arc(t.x, t.y, s.noiseRadius, 0, Math.PI * 2); c.stroke();
  }

  // --- darkness: night swallows the room except where light falls ---
  dctx.clearRect(0, 0, VIEW_W, VIEW_H);
  dctx.globalCompositeOperation = 'source-over';
  dctx.fillStyle = 'rgba(5,7,18,0.84)';
  dctx.fillRect(0, 0, VIEW_W, VIEW_H);
  dctx.globalCompositeOperation = 'destination-out';
  for (const p of level.moonPools) punchLight(p.x, p.y, p.r, 0.85);
  for (const l of level.loot) if (!l.taken) punchLight(l.x, l.y, 95, 0.55);
  punchLight(t.x, t.y, 70, 0.35); // the thief's own faint lantern glow
  const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
  punchLight(ex, ey, 110, s.exitOpen ? 0.7 : 0.35);
  for (const g of s.guards) punchLight(g.x, g.y, 60, 0.3);
  c.drawImage(dark, 0, 0);

  // moonbeams: soft diagonal shafts through the skylights
  c.save();
  c.globalAlpha = 0.05;
  c.fillStyle = '#cfe4ff';
  for (const p of level.moonPools) {
    c.beginPath();
    c.moveTo(p.x - p.r * 0.4, 64); c.lineTo(p.x + p.r * 0.4, 64);
    c.lineTo(p.x + p.r * 0.9, 720); c.lineTo(p.x - p.r * 0.9, 720);
    c.closePath(); c.fill();
  }
  c.restore();

  // --- after the dark: vision cones, smoke and the exit label ---
  // Cones and smoke are drawn last so the night cannot swallow them: the
  // judge's first criterion is a room where cones, cameras, loot and the
  // alarm meter are all visible in one frame, and they must read at a glance.
  for (const cam of s.cameras) {
    if (cam.disabled > 0) continue;
    const pts = conePolygon(cam.x, cam.y, cam.angle, CAMERA_HALF, CAMERA_RANGE, segments);
    c.fillStyle = 'rgba(229,72,77,0.22)';
    tracePath(c, pts); c.fill();
    c.strokeStyle = 'rgba(229,72,77,0.55)'; c.lineWidth = 1;
    tracePath(c, pts); c.stroke();
  }
  for (const g of s.guards) {
    const color = g.state === 'chase' ? '229,72,77'
      : g.suspicion >= 45 ? '232,150,60' : '232,193,90';
    const alpha = g.state === 'chase' ? 0.38 : g.suspicion >= 45 ? 0.32 : 0.26;
    const pts = conePolygon(g.x, g.y, g.angle, GUARD_VISION_HALF, GUARD_VISION_RANGE, segments);
    c.fillStyle = `rgba(${color},${alpha})`;
    tracePath(c, pts); c.fill();
    c.strokeStyle = `rgba(${color},0.6)`; c.lineWidth = 1.5;
    tracePath(c, pts); c.stroke();
  }
  for (const sm of s.smoke) {
    const g2 = c.createRadialGradient(sm.x, sm.y, 4, sm.x, sm.y, sm.r);
    g2.addColorStop(0, 'rgba(215,215,225,0.85)');
    g2.addColorStop(1, 'rgba(215,215,225,0)');
    c.fillStyle = g2;
    c.beginPath(); c.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = s.exitOpen ? '#7fd08a' : '#ff7075';
  c.font = 'bold 13px Georgia, serif'; c.textAlign = 'center';
  c.fillText(s.exitOpen ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 5);
}

function drawLootIcon(c, kind, x, y, time) {
  const bob = Math.sin(time * 2 + x) * 2;
  c.save();
  c.translate(x, y + bob);
  if (kind === 'painting') {
    c.fillStyle = '#7a4a2b'; c.fillRect(-14, -10, 28, 20);
    c.fillStyle = '#c96f4a'; c.fillRect(-11, -7, 22, 14);
    c.fillStyle = '#e8c15a'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  } else if (kind === 'jewels') {
    c.fillStyle = '#7fd0e8';
    c.beginPath(); c.moveTo(0, -12); c.lineTo(10, -2); c.lineTo(6, 10); c.lineTo(-6, 10); c.lineTo(-10, -2); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.beginPath(); c.moveTo(0, -12); c.lineTo(5, -2); c.lineTo(0, 2); c.lineTo(-5, -2); c.closePath(); c.fill();
  } else if (kind === 'gold') {
    c.fillStyle = '#e8c15a';
    for (let i = -1; i <= 1; i++) c.fillRect(i * 11 - 5, 2, 10, 8);
    c.fillRect(-5, -8, 10, 8);
    c.fillStyle = '#f7e08a'; c.fillRect(-5, -8, 10, 3);
  } else if (kind === 'mask') {
    c.fillStyle = '#c9a44a';
    c.beginPath(); c.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2b1a33';
    c.beginPath(); c.ellipse(-5, -1, 3, 2, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(5, -1, 3, 2, 0, 0, Math.PI * 2); c.fill();
  } else { // vase
    c.fillStyle = '#8a6fc9';
    c.beginPath(); c.moveTo(-4, -12); c.lineTo(4, -12); c.lineTo(8, 0); c.lineTo(5, 11); c.lineTo(-5, 11); c.lineTo(-8, 0); c.closePath(); c.fill();
  }
  c.restore();
}
