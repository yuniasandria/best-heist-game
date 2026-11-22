// The four rooms of the Velvet Vault. Each level is one room the thief
// crosses: walls and display cases to hide behind, carpet (quiet) and marble
// (loud) floor, guards on patrol routes, sweeping cameras, laser tripwires
// on the later rooms, a main loot target, optional bonus loot, and an exit
// door that opens once the main loot is taken. Coordinates are canvas pixels;
// the HUD occupies y < 64, so rooms start at y = 76.
import { LEVELS_META } from './config.js';

function wall(x, y, w, h) { return { x, y, w, h }; }
function guard(x, y, waypoints, pause = 1.6) { return { x, y, waypoints, pause }; }
function camera(x, y, base, sweep, speed = 0.45) { return { x, y, base, sweep, speed }; }
function loot(x, y, kind, locked = false) { return { x, y, kind, locked, taken: false }; }

// The museum's outer shell, shared by every room.
function shell() {
  return [
    wall(0, 64, 1280, 12), wall(0, 708, 1280, 12),
    wall(0, 64, 12, 656), wall(1268, 64, 12, 656),
  ];
}

export const LEVELS = [
  {
    ...LEVELS_META[0],
    start: { x: 90, y: 640 },
    exit: { x: 1216, y: 130, w: 52, h: 76 },
    moonPools: [{ x: 640, y: 360, r: 210 }, { x: 240, y: 180, r: 120 }, { x: 1060, y: 560, r: 130 }],
    carpets: [{ x: 120, y: 420, w: 420, h: 240 }, { x: 760, y: 120, w: 380, h: 200 }],
    walls: [
      ...shell(),
      wall(300, 76, 16, 220), wall(300, 420, 16, 160),
      wall(620, 300, 16, 280), wall(900, 76, 16, 200), wall(900, 400, 16, 180),
    ],
    cases: [
      { x: 420, y: 140, w: 150, h: 60 }, { x: 700, y: 520, w: 150, h: 60 },
      { x: 1000, y: 300, w: 120, h: 60 },
    ],
    paintings: [
      { x: 420, y: 78, w: 130, h: 8, hue: '#c96f4a' }, { x: 700, y: 78, w: 110, h: 8, hue: '#4a7fc9' },
      { x: 980, y: 700, w: 140, h: 8, hue: '#7fc94a' },
    ],
    guards: [
      guard(400, 380, [[400, 180], [400, 560]]),
      guard(1080, 250, [[1080, 250], [1080, 180], [1150, 180], [1150, 480], [1150, 250]]),
    ],
    cameras: [camera(640, 78, Math.PI / 2, 1.1)],
    lasers: [],
    loot: [
      loot(640, 130, 'painting', false),
      loot(480, 250, 'vase', false),
      loot(1060, 620, 'vase', false),
    ],
    mainLoot: 0,
  },
  {
    ...LEVELS_META[1],
    start: { x: 90, y: 150 },
    exit: { x: 1216, y: 620, w: 52, h: 76 },
    moonPools: [{ x: 400, y: 620, r: 150 }, { x: 980, y: 200, r: 170 }],
    carpets: [{ x: 90, y: 300, w: 1100, h: 130 }],
    walls: [
      ...shell(),
      wall(340, 76, 16, 180), wall(340, 380, 16, 200),
      wall(700, 200, 16, 260), wall(700, 560, 16, 148),
      wall(1020, 76, 16, 220), wall(1020, 420, 16, 180),
    ],
    cases: [
      { x: 480, y: 480, w: 130, h: 60 }, { x: 830, y: 140, w: 130, h: 60 },
      { x: 560, y: 300, w: 60, h: 130 },
    ],
    paintings: [{ x: 480, y: 78, w: 120, h: 8, hue: '#c9a44a' }],
    guards: [
      guard(450, 220, [[450, 140], [450, 620]]),
      guard(800, 480, [[800, 140], [800, 620]]),
      guard(1150, 360, [[1150, 140], [1150, 620]]),
    ],
    cameras: [camera(356, 300, 0, 1.2), camera(1036, 500, Math.PI, 1.2)],
    lasers: [{ x1: 716, y1: 460, x2: 716, y2: 560 }],
    loot: [
      loot(640, 380, 'jewels', true),
      loot(450, 510, 'vase', false),
      loot(1140, 130, 'mask', false),
    ],
    mainLoot: 0,
  },
  {
    ...LEVELS_META[2],
    start: { x: 90, y: 640 },
    exit: { x: 1216, y: 130, w: 52, h: 76 },
    moonPools: [{ x: 640, y: 300, r: 230 }, { x: 300, y: 560, r: 120 }, { x: 1050, y: 480, r: 140 }],
    carpets: [{ x: 700, y: 470, w: 480, h: 200 }],
    walls: [
      ...shell(),
      wall(280, 300, 16, 280), wall(280, 76, 16, 120),
      wall(620, 76, 16, 240), wall(620, 440, 16, 180),
      wall(940, 220, 16, 280),
    ],
    cases: [
      { x: 420, y: 160, w: 140, h: 56 }, { x: 780, y: 560, w: 140, h: 56 },
      { x: 1040, y: 140, w: 120, h: 56 },
    ],
    paintings: [
      { x: 420, y: 78, w: 120, h: 8, hue: '#8a4ac9' },
      { x: 780, y: 78, w: 120, h: 8, hue: '#c94a6f' },
    ],
    guards: [
      guard(400, 420, [[400, 180], [400, 620]]),
      guard(790, 300, [[790, 130], [790, 520]]),
      guard(1200, 420, [[1200, 180], [1200, 620]]),
    ],
    cameras: [
      camera(296, 240, 0, 1.3, 0.55), camera(636, 380, Math.PI, 1.3, 0.5),
      camera(956, 300, 0, 1.2, 0.6),
    ],
    lasers: [
      { x1: 636, y1: 316, x2: 636, y2: 440 },
      { x1: 956, y1: 220, x2: 956, y2: 500 },
    ],
    loot: [
      loot(640, 130, 'mask', true),
      loot(480, 640, 'vase', false),
      loot(1060, 620, 'jewels', false),
    ],
    mainLoot: 0,
  },
  {
    ...LEVELS_META[3],
    start: { x: 90, y: 130 },
    exit: { x: 1216, y: 620, w: 52, h: 76 },
    moonPools: [{ x: 640, y: 400, r: 240 }, { x: 240, y: 620, r: 130 }, { x: 1080, y: 180, r: 130 }],
    carpets: [{ x: 120, y: 480, w: 420, h: 200 }, { x: 760, y: 120, w: 380, h: 180 }],
    walls: [
      ...shell(),
      wall(320, 76, 16, 260), wall(320, 460, 16, 160),
      wall(640, 300, 16, 280), wall(960, 76, 16, 220), wall(960, 420, 16, 180),
    ],
    cases: [
      { x: 460, y: 140, w: 150, h: 60 }, { x: 780, y: 520, w: 150, h: 60 },
      { x: 1080, y: 300, w: 120, h: 60 },
    ],
    paintings: [{ x: 460, y: 78, w: 130, h: 8, hue: '#c9c94a' }],
    guards: [
      guard(400, 380, [[400, 140], [400, 620]]),
      guard(740, 250, [[740, 140], [740, 620]]),
      guard(1010, 480, [[1010, 140], [1010, 620]]),
      guard(640, 660, [[300, 660], [1150, 660]]),
    ],
    cameras: [camera(336, 400, 0, 1.2, 0.6), camera(656, 200, Math.PI, 1.2, 0.55), camera(976, 500, Math.PI, 1.1, 0.65)],
    lasers: [
      { x1: 656, y1: 300, x2: 656, y2: 580 },
      { x1: 976, y1: 76, x2: 976, y2: 296 },
    ],
    loot: [
      loot(640, 130, 'gold', true),
      loot(480, 250, 'jewels', false),
      loot(1060, 130, 'mask', false),
    ],
    mainLoot: 0,
  },
];
