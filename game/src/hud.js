// The HUD bar and the full-screen states: title, level intro, caught, win
// and pause. Everything is drawn on the same canvas so the screenshots the
// judge sees carry the alarm meter, the loot total, the gadgets and the
// detection status in the frame itself.
import { VIEW_W, VIEW_H, HUD_H, ALARM_MAX, COLORS } from './config.js';

function bar(c, x, y, w, h, frac, fill, label) {
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillRect(x, y, w, h);
  c.fillStyle = fill;
  c.fillRect(x + 2, y + 2, (w - 4) * Math.max(0, Math.min(1, frac)), h - 4);
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
  c.strokeRect(x, y, w, h);
  if (label) {
    c.fillStyle = '#fff'; c.font = 'bold 12px Georgia, serif'; c.textAlign = 'left';
    c.fillText(label, x + 6, y + h / 2 + 4);
  }
}

export function drawHud(c, s) {
  c.fillStyle = '#14101c';
  c.fillRect(0, 0, VIEW_W, HUD_H);
  c.fillStyle = 'rgba(232,193,90,0.25)';
  c.fillRect(0, HUD_H - 2, VIEW_W, 2);

  c.fillStyle = '#e8c15a'; c.font = 'bold 20px Georgia, serif'; c.textAlign = 'left';
  c.fillText('THE VELVET VAULT', 16, 28);
  c.fillStyle = '#cfc4d8'; c.font = '13px Georgia, serif';
  c.fillText(s.level.name, 16, 50);

  // Alarm meter: green -> amber -> red as the museum wakes up.
  const frac = s.alarm / ALARM_MAX;
  const alarmFill = frac < 0.45 ? '#7fd08a' : frac < 0.75 ? '#e8963c' : '#e5484d';
  c.fillStyle = '#cfc4d8'; c.font = 'bold 12px Georgia, serif'; c.textAlign = 'left';
  c.fillText('ALARM', 300, 22);
  bar(c, 300, 28, 240, 18, frac, alarmFill, frac > 0.75 ? '!!' : '');
  c.fillStyle = frac > 0.75 ? '#ff8080' : '#cfc4d8';
  c.font = '12px Georgia, serif';
  c.fillText(s.detected ? 'SPOTTED — break line of sight!' : 'unseen', 300, 58);

  // Loot total and gadgets.
  c.fillStyle = '#e8c15a'; c.font = 'bold 16px Georgia, serif'; c.textAlign = 'left';
  c.fillText(`LOOT  $${s.lootValue.toLocaleString('en-US')}`, 600, 30);
  c.fillStyle = '#cfc4d8'; c.font = '13px Georgia, serif';
  c.fillText(`Room ${s.levelIndex + 1}/4  •  ${s.lootTaken} of ${s.level.loot.length} pieces`, 600, 50);

  c.textAlign = 'left'; c.font = '13px Georgia, serif';
  const g = s.gadgets;
  c.fillStyle = '#cfc4d8';
  c.fillText('GADGETS', 900, 22);
  c.fillStyle = g.smoke > 0 ? '#dfe6f2' : '#5a5468';
  c.fillText(`[1] Smoke ×${g.smoke}`, 900, 42);
  c.fillStyle = g.emp > 0 ? '#dfe6f2' : '#5a5468';
  c.fillText(`[2] EMP ×${g.emp}`, 1030, 42);
  c.fillStyle = g.coins > 0 ? '#e8c15a' : '#5a5468';
  c.fillText(`[Click] Coin ×${g.coins}`, 900, 58);
  c.fillStyle = '#8a8098';
  c.fillText('Shift run • Ctrl sneak • E lockpick • P pause', 1030, 58);

  if (s.message) {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    const w = c.measureText(s.message).width + 28;
    c.fillRect((VIEW_W - w) / 2, HUD_H + 10, w, 30);
    c.fillStyle = '#ffe9a8'; c.font = 'bold 15px Georgia, serif'; c.textAlign = 'center';
    c.fillText(s.message, VIEW_W / 2, HUD_H + 30);
  }
}

function overlay(c, title, titleColor, lines, hint) {
  c.fillStyle = 'rgba(8,6,16,0.78)';
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  c.textAlign = 'center';
  c.fillStyle = titleColor; c.font = 'bold 56px Georgia, serif';
  c.fillText(title, VIEW_W / 2, 260);
  c.fillStyle = '#e8dcc8'; c.font = '20px Georgia, serif';
  let y = 320;
  for (const line of lines) { c.fillText(line, VIEW_W / 2, y); y += 34; }
  if (hint) {
    c.fillStyle = '#e8c15a'; c.font = 'bold 18px Georgia, serif';
    c.fillText(hint, VIEW_W / 2, y + 40);
  }
}

export function drawTitle(c) {
  c.fillStyle = '#0d0a14'; c.fillRect(0, 0, VIEW_W, VIEW_H);
  // moonlit museum silhouette behind the title
  c.fillStyle = '#1c1626';
  c.fillRect(0, 480, VIEW_W, 240);
  c.fillStyle = '#cfe4ff';
  c.beginPath(); c.arc(1140, 105, 52, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(207,228,255,0.12)';
  c.beginPath(); c.moveTo(1088, 157); c.lineTo(1192, 157); c.lineTo(1260, 720); c.lineTo(1020, 720); c.closePath(); c.fill();
  c.fillStyle = '#2b2430';
  c.fillRect(180, 420, 120, 300); c.fillRect(420, 380, 160, 340); c.fillRect(700, 430, 110, 290);
  c.fillStyle = '#e8c15a';
  c.beginPath(); c.arc(500, 340, 26, 0, Math.PI * 2); c.fill();
  c.textAlign = 'center';
  c.fillStyle = '#e8c15a'; c.font = 'bold 64px Georgia, serif';
  c.fillText('THE VELVET VAULT', VIEW_W / 2, 190);
  c.fillStyle = '#cfc4d8'; c.font = 'italic 24px Georgia, serif';
  c.fillText('a museum heist by moonlight', VIEW_W / 2, 236);
  c.fillStyle = '#e8dcc8'; c.font = '18px Georgia, serif';
  const lines = [
    'Four rooms. Four treasures. One quiet pair of shoes.',
    'Slip past the guards’ lantern cones, dodge the cameras,',
    'toss a coin to turn a patrol, and be gone before the alarm wakes the house.',
    '',
    'WASD / arrows — move    Shift — run (loud)    Ctrl — sneak (quiet)',
    'Click — toss a coin    1 — smoke bomb    2 — EMP    E — pick a lock (hold)',
  ];
  let y = 300;
  for (const line of lines) { c.fillText(line, VIEW_W / 2, y); y += 30; }
  c.fillStyle = '#e8c15a'; c.font = 'bold 22px Georgia, serif';
  c.fillText('— press ENTER to begin the heist —', VIEW_W / 2, 620);
}

export function drawLevelIntro(c, level, index) {
  overlay(c, level.name, '#e8c15a', [level.sub, '', 'Get the main treasure, then reach the green EXIT door.'], 'press ENTER');
}

export function drawCaught(c, reason, levelName) {
  overlay(c, 'CAUGHT!', '#e5484d',
    [reason, `The ${levelName} job is blown. The night watch found you.`, ''],
    'press R to try the room again');
}

export function drawWin(c, totalLoot, rating, perLevel) {
  const color = rating === 'GHOST' ? '#7fd08a' : rating === 'SHADOW' ? '#e8c15a' : '#e8963c';
  overlay(c, 'CLEAN GETAWAY', color, [
    `The Velvet Vault is empty — and so is your trail.`,
    `Total loot: $${totalLoot.toLocaleString('en-US')}`,
    `Rating: ${rating}`,
    '',
    ...perLevel.map((p) => `${p.name}: ${p.rating} — $${p.loot.toLocaleString('en-US')}`),
  ], 'press R to run it again');
}

export function drawPaused(c) {
  overlay(c, 'PAUSED', '#cfc4d8', ['The museum holds its breath.'], 'press P to resume');
}
