// THE VELVET VAULT — shared constants and tuning.
// A top-down museum heist: one thief, four rooms, moonlight, guards, cameras,
// lasers, loot and an alarm meter. Everything here is plain data the other
// modules read; nothing in this file touches the canvas or the network.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 64; // top bar reserved for the alarm meter, loot and gadgets
export const TILE = 40;

export const PLAYER_R = 13;
export const PLAYER_WALK = 165; // px per second on carpet
export const PLAYER_RUN = 250; // px per second while Shift is held
export const PLAYER_SNEAK = 105; // px per second while Ctrl / C is held

export const GUARD_R = 14;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_VISION_RANGE = 230;
export const GUARD_VISION_HALF = 0.62; // radians either side of facing
export const GUARD_HEAR_RANGE = 260;

export const CAMERA_RANGE = 250;
export const CAMERA_HALF = 0.5;

export const ALARM_MAX = 100;
export const ALARM_RISE_SPOTTED = 26; // per second while fully seen
export const ALARM_RISE_NOISE = 9; // per second while a loud noise is fresh
export const ALARM_DECAY = 4; // per second while unseen and quiet
export const ALARM_CAUGHT_AT = 100;

export const SUSPICION_RISE = 70; // per second while the thief is in a cone
export const SUSPICION_FALL = 26;

// Noise rings: how far a footstep carries, by floor and by gait.
export const NOISE = {
  carpet: { walk: 26, run: 70, sneak: 8 },
  marble: { walk: 64, run: 150, sneak: 18 },
};

export const GADGET_START = { smoke: 2, emp: 1, coins: 3 };
export const SMOKE_DURATION = 6; // seconds a smoke cloud hangs
export const SMOKE_RADIUS = 95;
export const EMP_DURATION = 7; // seconds cameras stay dark
export const LOCKPICK_SECONDS = 1.6; // hold E beside locked loot

export const LOOT_VALUES = { painting: 1200, jewels: 2600, gold: 4200, vase: 800, mask: 3400 };

// Rating thresholds on the worst alarm the level ever reached.
export const RATING = { ghost: 1, shadow: 45 };

export const COLORS = {
  marbleA: '#b8a88f',
  marbleB: '#a8977d',
  carpet: '#5d2f3d',
  carpetEdge: '#7a3f50',
  wall: '#2b2430',
  wallTop: '#453a4d',
  gold: '#e8c15a',
  danger: '#e5484d',
  safe: '#7fd08a',
  moon: '#cfe4ff',
  smoke: 'rgba(200,200,210,0.55)',
};

export const LEVELS_META = [
  { name: 'I — THE GALLERY', sub: 'Lift the Moonlit Madonna. Mind the marble.' },
  { name: 'II — THE VAULT', sub: 'Crack the jewel case. Lasers hum in the dark.' },
  { name: 'III — THE ROOFTOP', sub: 'Cross the glass roof. Cameras sweep the skylights.' },
  { name: 'IV — THE GETAWAY', sub: 'Grab the gold and reach the service door.' },
];
