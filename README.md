# The Velvet Vault — a museum heist by moonlight

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/yuniasandria/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/yuniasandria/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

**Referral code:** `6cmdpsm5`

A complete original 2D top-down heist game, 100% offline, static files, no
build step. Play it with keyboard and mouse in any desktop browser.

## The job

Four rooms, four treasures, one quiet pair of shoes. You are the thief in
the Velvet Vault museum after closing time. Cross each room under moonlight,
lift the main treasure, and reach the green EXIT door before the alarm wakes
the house.

1. **I — The Gallery** — lift the Moonlit Madonna painting.
2. **II — The Vault** — crack the jewel case behind the lasers.
3. **III — The Rooftop** — cross the glass roof under sweeping cameras.
4. **IV — The Getaway** — grab the gold and reach the service door.

## How it plays

- **Light and shadow are the game.** Raycast moonlight pools, guard lantern
  cones and loot spotlights are the only light; standing in darkness makes
  you almost invisible, standing in a spotlight gets you spotted fast.
- **Acoustics.** Footsteps are loud on marble, quiet on carpet, louder
  still when you run. A noise ring shows how far each step carries, and
  guards turn toward sounds they hear.
- **Guards** patrol routes with calm / suspicious / alerted states and
  raycast vision cones. **CCTV cameras** sweep their cones. **Laser
  tripwires** blink on later rooms — time the crossing.
- **Gadgets:** smoke bomb (`1`, blocks vision), EMP (`2`, kills cameras for
  7s), coin toss (click to throw — the clink pulls a guard away), lockpick
  (hold `E` beside a locked case).
- **Alarm meter 0–100** rises while you are seen or heard, decays while you
  are hidden. At 100 the house wakes and the job is blown. Each room ends
  with a **GHOST / SHADOW / SPOTTED** rating on your worst alarm.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run (fast, loud) |
| Ctrl / C | Sneak (slow, quiet) |
| Click | Toss a coin to distract a guard |
| 1 | Smoke bomb |
| 2 | EMP pulse |
| E (hold) | Pick a locked case |
| P / Esc | Pause |
| Enter | Start / next room |
| R | Retry after being caught |

## Run it

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Or open `game/index.html` from any static server. All art is drawn on
canvas and all sound is synthesised with Web Audio — no external assets, no
network requests.

## Layout

- `game/index.html` — canvas shell
- `game/src/config.js` — tuning, levels metadata, colours
- `game/src/geometry.js` — raycast, line of sight, collision
- `game/src/levels.js` — the four rooms
- `game/src/guards.js` — guard AI, cameras, lasers
- `game/src/audio.js` — procedural Web Audio sounds
- `game/src/render.js` — canvas drawing, moonlight and vision cones
- `game/src/hud.js` — HUD bar, title / caught / win screens
- `game/src/input.js` — keyboard + mouse
- `game/src/main.js` — game loop, rules, alarm, gadgets, ratings
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — four real renders of the game

## License

MIT — see `LICENSE`.
