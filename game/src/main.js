// THE VELVET VAULT — game loop and rules.
// Owns the state machine (title → intro → play → caught / win), the thief's
// movement and noise, loot and lockpicking, the three gadgets, the alarm
// meter and the per-room rating. Rendering lives in render.js, the HUD and
// screens in hud.js, the watchers in guards.js, sound in audio.js.
import {
  VIEW_W, VIEW_H, HUD_H, PLAYER_R, PLAYER_WALK, PLAYER_RUN, PLAYER_SNEAK,
  ALARM_MAX, ALARM_DECAY, ALARM_CAUGHT_AT, NOISE, GADGET_START,
  SMOKE_DURATION, SMOKE_RADIUS, EMP_DURATION, LOCKPICK_SECONDS,
  LOOT_VALUES, RATING,
} from './config.js';
import { LEVELS } from './levels.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { drawWorld, lightAt } from './render.js';
import { drawHud, drawTitle, drawLevelIntro, drawCaught, drawWin, drawPaused } from './hud.js';
import { makeGuard, makeCamera, updateGuard, updateCamera, laserTripped } from './guards.js';
import { wallsToSegments, moveCircle, pointInRect, clamp } from './geometry.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const sounds = new SoundBank();

const params = new URLSearchParams(location.search);
const shot = params.get('shot'); // start | play | gadget | win — staged screenshots

const game = {
  state: 'title', // title | intro | play | paused | caught | win
  levelIndex: 0,
  level: null, guards: [], cameras: [], segments: [], solids: [],
  thief: { x: 90, y: 640, face: 0 },
  alarm: 0, worstAlarm: 0, detected: false,
  lootValue: 0, lootTaken: 0, exitOpen: false,
  gadgets: { ...GADGET_START },
  coins: [], smoke: [], noise: null, noiseRadius: 0,
  message: '', messageTtl: 0,
  caughtReason: '', totalLoot: 0, rating: 'GHOST',
  perLevel: [], pickProgress: 0, pickTarget: null,
  time: 0, stepT: 0, frozen: false, laserCooldown: 0,
};

function freshLevel(i) {
  const def = LEVELS[i];
  // Deep-copy the mutable bits so a retry starts clean.
  const level = JSON.parse(JSON.stringify(def));
  game.level = level;
  game.levelIndex = i;
  game.guards = level.guards.map(makeGuard);
  game.cameras = level.cameras.map(makeCamera);
  game.segments = wallsToSegments(level.walls);
  game.solids = [...level.walls, ...level.cases];
  game.thief = { x: level.start.x, y: level.start.y, face: -Math.PI / 2 };
  game.alarm = 0; game.worstAlarm = 0; game.detected = false;
  game.lootTaken = 0; game.exitOpen = false;
  game.coins = []; game.smoke = []; game.noise = null; game.noiseRadius = 0;
  game.pickProgress = 0; game.pickTarget = null;
  game.message = ''; game.messageTtl = 0;
}

function say(text, seconds = 2.5) { game.message = text; game.messageTtl = seconds; }

function onCarpet(x, y) {
  return game.level.carpets.some((c) => pointInRect(x, y, c));
}

function gait() {
  if (input.down('ControlLeft', 'ControlRight', 'KeyC')) return 'sneak';
  if (input.down('ShiftLeft', 'ShiftRight')) return 'run';
  return 'walk';
}

function updateThief(dt) {
  const t = game.thief;
  const mv = input.moveVector();
  const g = gait();
  const speed = g === 'run' ? PLAYER_RUN : g === 'sneak' ? PLAYER_SNEAK : PLAYER_WALK;
  if (mv.x !== 0 || mv.y !== 0) {
    t.face = Math.atan2(mv.y, mv.x);
    const p = moveCircle(t.x, t.y, PLAYER_R, mv.x * speed * dt, mv.y * speed * dt, game.solids);
    t.x = clamp(p.x, 14, VIEW_W - 14);
    t.y = clamp(p.y, HUD_H + 14, VIEW_H - 14);
    // Footsteps: marble carries, carpet whispers; running is loud anywhere.
    const floor = onCarpet(t.x, t.y) ? 'carpet' : 'marble';
    const radius = NOISE[floor][g];
    game.noiseRadius = radius;
    game.stepT -= dt;
    if (game.stepT <= 0) {
      game.stepT = g === 'run' ? 0.28 : g === 'sneak' ? 0.55 : 0.4;
      sounds.footstep(g === 'run' || floor === 'marble');
      game.noise = { x: t.x, y: t.y, radius, ttl: 0.5 };
    }
  } else {
    game.noiseRadius = 0;
  }
  if (game.noise) {
    game.noise.ttl -= dt;
    if (game.noise.ttl <= 0) game.noise = null;
  }
}

function updateLoot(dt) {
  const t = game.thief;
  game.pickTarget = null;
  for (const l of game.level.loot) {
    if (l.taken) continue;
    const d = Math.hypot(t.x - l.x, t.y - l.y);
    if (d > 34) continue;
    if (l.locked) {
      game.pickTarget = l;
      if (input.down('KeyE')) {
        game.pickProgress += dt;
        say(`Picking the lock… ${Math.ceil((1 - game.pickProgress / LOCKPICK_SECONDS) * 10) / 10}s`, 0.2);
        if (Math.random() < dt * 6) sounds.lockpick();
        if (game.pickProgress >= LOCKPICK_SECONDS) {
          l.taken = true; game.pickProgress = 0;
          collectLoot(l, true);
        }
      } else {
        game.pickProgress = 0;
        say('Locked case — hold E to pick it', 0.4);
      }
    } else {
      l.taken = true;
      collectLoot(l, false);
    }
  }
}

function collectLoot(l, wasLocked) {
  const value = LOOT_VALUES[l.kind] || 500;
  game.lootValue += value;
  game.lootTaken += 1;
  sounds.pickup();
  say(`${l.kind.toUpperCase()} secured — $${value.toLocaleString('en-US')}${wasLocked ? ' (lock picked)' : ''}`);
  if (game.level.loot[game.level.mainLoot] === l) {
    game.exitOpen = true;
    say('Main treasure taken — the EXIT door is open. Get out!', 4);
  }
}

function useGadgets(dt) {
  const t = game.thief;
  if (input.pressed('Digit1') && game.gadgets.smoke > 0) {
    game.gadgets.smoke -= 1;
    game.smoke.push({ x: t.x, y: t.y, r: SMOKE_RADIUS, ttl: SMOKE_DURATION });
    sounds.smoke();
    say('Smoke out — the cones can’t see through it');
  }
  if (input.pressed('Digit2') && game.gadgets.emp > 0) {
    game.gadgets.emp -= 1;
    for (const cam of game.cameras) cam.disabled = EMP_DURATION;
    sounds.emp();
    say(`EMP pulse — cameras dark for ${EMP_DURATION}s`);
  }
  const click = input.consumeClick();
  if (click && game.gadgets.coins > 0) {
    game.gadgets.coins -= 1;
    game.coins.push({
      x: t.x, y: t.y, fromX: t.x, fromY: t.y,
      tx: click.x, ty: click.y, t: 0, flying: true,
    });
    sounds.coinToss();
  }
  for (const coin of game.coins) {
    if (!coin.flying) continue;
    coin.t += dt / 0.45;
    if (coin.t >= 1) {
      coin.t = 1; coin.flying = false;
      coin.x = coin.tx; coin.y = coin.ty;
      game.noise = { x: coin.x, y: coin.y, radius: 130, ttl: 1.0 };
      sounds.coinLand();
      say('The coin clinks — a guard turns to look');
    } else {
      coin.x = coin.fromX + (coin.tx - coin.fromX) * coin.t;
      coin.y = coin.fromY + (coin.ty - coin.fromY) * coin.t - Math.sin(coin.t * Math.PI) * 46;
    }
  }
  for (const sm of game.smoke) sm.ttl -= dt;
  game.smoke = game.smoke.filter((s) => s.ttl > 0);
}

function updateWatchers(dt) {
  const ctxG = {
    thief: game.thief, segments: game.segments, solids: game.solids,
    noise: game.noise, smoke: game.smoke, time: game.time,
    alarm: game.alarm,
    lightAt: (x, y) => lightAt(x, y, game.level, game.lootTaken),
  };
  let spotted = false;
  for (const g of game.guards) {
    updateGuard(g, dt, ctxG);
    if (g.state === 'chase') spotted = true;
    if (Math.hypot(g.x - game.thief.x, g.y - game.thief.y) < 24) {
      return caught('A guard grabbed you in the dark.');
    }
  }
  for (const cam of game.cameras) {
    if (updateCamera(cam, dt, ctxG)) spotted = true;
  }
  game.alarm = ctxG.alarm;
  game.detected = spotted;
  game.laserCooldown -= dt;
  for (const lz of game.level.lasers) {
    if (laserTripped(lz, game.thief, game.time) && game.laserCooldown <= 0) {
      game.alarm += 25;
      game.laserCooldown = 1.5;
      say('Laser tripped! The alarm jumps.', 2);
      sounds.spotted();
    }
  }
  if (!spotted) game.alarm = Math.max(0, game.alarm - ALARM_DECAY * dt);
  game.worstAlarm = Math.max(game.worstAlarm, game.alarm);
  if (game.alarm >= ALARM_CAUGHT_AT) return caught('The alarm hit 100 — the whole house woke up.');
  return false;
}

function updateExit() {
  const t = game.thief;
  const e = game.level.exit;
  if (!game.exitOpen) return;
  if (t.x > e.x - 6 && t.x < e.x + e.w + 6 && t.y > e.y && t.y < e.y + e.h) {
    const rating = game.worstAlarm <= RATING.ghost ? 'GHOST'
      : game.worstAlarm < RATING.shadow ? 'SHADOW' : 'SPOTTED';
    game.perLevel.push({ name: game.level.name, rating, loot: levelLoot() });
    sounds.win();
    if (game.levelIndex >= LEVELS.length - 1) {
      game.totalLoot = game.lootValue;
      const worst = Math.max(...game.perLevel.map((p) => p.rating === 'GHOST' ? 0 : p.rating === 'SHADOW' ? 1 : 2));
      game.rating = ['GHOST', 'SHADOW', 'SPOTTED'][worst];
      game.state = 'win';
    } else {
      freshLevel(game.levelIndex + 1);
      game.state = 'intro';
    }
  }
}

function levelLoot() {
  return game.level.loot.filter((l) => l.taken).reduce((s, l) => s + (LOOT_VALUES[l.kind] || 500), 0);
}

function caught(reason) {
  game.caughtReason = reason;
  game.state = 'caught';
  sounds.caught();
  sounds.setAlarmLevel(0);
  return true;
}

let lastState = game.state;
function update(dt) {
  game.time += dt;
  if (game.state !== lastState) { input.clearPressed(); lastState = game.state; }
  if (game.messageTtl > 0) {
    game.messageTtl -= dt;
    if (game.messageTtl <= 0) game.message = '';
  }
  if (game.state === 'title') {
    if (input.pressed('Enter') || input.pressed('NumpadEnter')) {
      sounds.init();
      freshLevel(0);
      game.state = 'intro';
    }
    return;
  }
  if (game.state === 'intro') {
    if (input.pressed('Enter') || input.pressed('NumpadEnter')) game.state = 'play';
    return;
  }
  if (game.state === 'paused') {
    if (input.pressed('KeyP') || input.pressed('Escape')) game.state = 'play';
    return;
  }
  if (game.state === 'caught' || game.state === 'win') {
    if (input.pressed('KeyR')) {
      game.perLevel = game.state === 'win' ? [] : game.perLevel;
      game.lootValue = game.state === 'win' ? 0 : game.lootValue;
      freshLevel(game.levelIndex);
      game.state = 'intro';
    }
    return;
  }
  // play
  if (input.pressed('KeyP') || input.pressed('Escape')) { game.state = 'paused'; return; }
  if (game.frozen) return; // staged screenshot pose: hold the frame still
  updateThief(dt);
  useGadgets(dt);
  updateLoot(dt);
  if (updateWatchers(dt)) return;
  updateExit();
  sounds.setAlarmLevel(game.alarm / ALARM_MAX);
}

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === 'title') { drawTitle(ctx); return; }
  drawWorld(ctx, {
    level: game.level, guards: game.guards, cameras: game.cameras,
    thief: game.thief, coins: game.coins, smoke: game.smoke,
    exitOpen: game.exitOpen, noiseRadius: game.noiseRadius, time: game.time,
  });
  drawHud(ctx, {
    level: game.level, levelIndex: game.levelIndex, alarm: game.alarm,
    detected: game.detected, lootValue: game.lootValue, lootTaken: game.lootTaken,
    gadgets: game.gadgets, message: game.message,
  });
  if (game.state === 'intro') drawLevelIntro(ctx, game.level, game.levelIndex);
  if (game.state === 'caught') drawCaught(ctx, game.caughtReason, game.level.name);
  if (game.state === 'win') drawWin(ctx, game.totalLoot, game.rating, game.perLevel);
  if (game.state === 'paused') drawPaused(ctx);
}

// Staged poses for the four screenshots: deterministic frames of the real
// game, taken by the maker through ?shot=. Nothing here is composited.
function stageShot(mode) {
  if (mode === 'start') { game.state = 'title'; return; }
  if (mode === 'win') {
    freshLevel(0);
    game.state = 'win';
    game.totalLoot = 12400;
    game.lootValue = 12400;
    game.lootTaken = 3; // HUD counts this room's pieces; the overlay carries the total
    game.rating = 'GHOST';
    game.perLevel = [
      { name: 'I — THE GALLERY', rating: 'GHOST', loot: 2800 },
      { name: 'II — THE VAULT', rating: 'GHOST', loot: 3400 },
      { name: 'III — THE ROOFTOP', rating: 'SHADOW', loot: 3400 },
      { name: 'IV — THE GETAWAY', rating: 'GHOST', loot: 2800 },
    ];
    return;
  }
  freshLevel(0);
  game.state = 'play';
  game.frozen = true;
  // Thief in shadow at the carpet edge, a guard's cone sweeping past.
  game.thief = { x: 560, y: 470, face: Math.PI / 2 };
  game.guards[0].x = 480; game.guards[0].y = 380;
  game.guards[0].angle = 0.84; game.guards[0].wait = 99;
  game.guards[0].suspicion = 62; game.guards[0].state = 'investigate';
  game.guards[1].x = 1080; game.guards[1].y = 250;
  game.guards[1].angle = -Math.PI / 2; game.guards[1].wait = 99;
  game.cameras[0].angle = Math.PI / 2 + 0.5;
  game.alarm = 35; game.worstAlarm = 35;
  game.lootValue = 800; game.lootTaken = 1;
  game.level.loot[1].taken = true; // the vase is already pocketed
  if (mode === 'gadget') {
    game.smoke.push({ x: 520, y: 420, r: SMOKE_RADIUS, ttl: 5 });
    game.coins.push({ x: 700, y: 300, fromX: 560, fromY: 470, tx: 760, ty: 260, t: 0.55, flying: true });
    game.gadgets.smoke = 1;
    say('Smoke out — the coin flies for the far corner');
  }
}

if (shot) stageShot(shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

// Handle for headless play-testing: the CDP driver reads state and drives
// keys through real input events; nothing here changes how the game plays.
window.__heist = {
  game,
  state: () => game.state,
  alarm: () => game.alarm,
  loot: () => game.lootValue,
  thief: () => ({ x: game.thief.x, y: game.thief.y }),
  guards: () => game.guards.map((g) => ({ x: g.x, y: g.y, state: g.state, suspicion: g.suspicion })),
};
requestAnimationFrame(frame);
