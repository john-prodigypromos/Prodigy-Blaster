# OH-YUM BLASTER — Claude Code Context

## Project Overview
A **3D space-combat arena dogfighter** playable in the browser. Pick a pilot, face off against a sequence of villain bosses in open-space arenas, survive three levels, save humanity.

**Stack:** Three.js 0.183 · TypeScript 5 · Vite 5 (no framework, no Phaser — Phaser 2D was removed in the 3D rebuild; `_phaser_backup/` is gone)

**Title:** OH-YUM BLASTER · **Brand footer:** Prodigy Promos

---

## Game Flow

Scene state machine in `src/state/SceneManager.ts`:

```
title → charSelect → levelIntro → [cinematic | marsLaunch] → arena → (next level | highScore | gameOver) → title
```

- `title` — idle rotating camera, difficulty picker, high-score table (localStorage)
- `charSelect` — pick a pilot from `CHARACTERS` (owen, william, parks, brayden, brody, ethan, austin, dylan)
- `levelIntro` — level card + villain portrait cards; 4.5s auto-advance
- `cinematic` / `marsLaunch` — optional intro sequences (launch is currently wired; Mars landing is skipped)
- `arena` — the actual dogfight loop
- `highScore` / `gameOver` — post-match name entry or villain-taunt defeat screen

Villains progress across 3 levels: **Bolo Tie → Bow Tie → Bishop** (portraits + taunts in `src/config/VillainTaunts.ts`).

---

## Architecture Rules

### Rendering
- **Three.js is the only renderer.** All game visuals are WebGL meshes — never use DOM/CSS/SVG for in-world objects.
- **UI overlays are DOM** (buttons, menus, HUD taunts). The HUD itself is `src/ui/HUD3D.ts` — a mix of DOM overlay elements positioned against 3D world coords.
- Post-processing goes through `bundle.composer` (see `SetupRenderer.ts`). Do not call `renderer.render()` directly — always render via the composer.
- Skybox, stars, and nebulae are locked to camera position every frame in `main.ts`'s `animate()` loop. Don't break this invariant.

### Scene Entry Points
Each non-trivial scene exports a `create…` / `update…` / `cleanup…` triple so `main.ts` can drive them without knowing internals:

```ts
createArenaState(scene, camera, levelNumber, totalScore, playerColor) → ArenaState
updateArena(state, keys, dt, now, tauntCb) → void
cleanupArena(state, scene) → void
```

Same shape for `TakeoffCinematic`, `MarsLaunch`, `MarsLanding`. Follow this pattern when adding new scenes.

### Entities
`src/entities/` — `Ship3D`, `Bolt3D`, `Explosion3D`. Ships carry hull/shield, velocity, rotation, and a reference to their Three.js `Group`. Geometry is **procedural**, built in `src/ships/ShipGeometry.ts` (per-pilot variants via `ShipMaterials.ts` and `ShipDrawHelpers.ts`). The commented-out `preloadShipModels` import in `main.ts` is the remnant of a pre-procedural `.glb`-based approach — ignore it.

### AI
`src/ai/` — `AIBehavior3D` interface + shared `Steering` helpers. Each villain has its own behavior file in `src/ai/behaviors/`:
- `RustyBehavior3D.ts` (base/warmup enemy)
- `BoloTieBehavior3D.ts` · `BowTieBehavior3D.ts` · `BishopBehavior3D.ts`

Behaviors are pure update functions — given a ship and world state, they write steering inputs. **Never put AI in `update()` with nested if/else chains** — use state transitions or the `StateMachine.ts` utility.

### Systems
`src/systems/` — runs every tick with `dt`:
- `PhysicsSystem3D` — thrust/drag/velocity integration; fixed timestep `PHYSICS.FIXED_TIMESTEP`
- `WeaponSystem3D` — bolt spawning, lifetime, aim spread
- `DamageSystem3D` — hit detection (sphere vs bolt), shield → hull, i-frames
- `ParticleSystem3D` · `AtmosphereSystem` — VFX
- `EnvironmentLoader` — celestial-body collision helper (planet/moon = instadeath at speed)
- `SoundSystem` — singleton; must be initialized from a user gesture (see `startGlobalMusic` in `main.ts`) due to browser autoplay policy

### State (module-level singletons, not classes)
`src/state/` — each file owns one slice:
- `Difficulty` · `Character` · `LevelState` · `HighScores` · `GameState` · `Settings`
- Values are `export let` module vars mutated through setters. This is intentional — keep it simple, don't introduce Redux/Zustand/etc.

### Config
All tuning values live in `src/config.ts` (`ARENA`, `PHYSICS`, `WEAPONS`, `SHIP`, `AI`, `COLORS`) or per-character/level in the state files. **Never hardcode numbers in game logic** — add a constant.

---

## File Structure

```
src/
├── main.ts                    # Scene manager callbacks + animation loop
├── config.ts                  # All tuning constants
├── ship-viewer-entry.ts       # Standalone ship preview page
├── config/VillainTaunts.ts
├── state/                     # Difficulty, Character, LevelState, HighScores, SceneManager, GameState, Settings
├── scenes/                    # ArenaLoop, MarsLaunch, MarsLanding, TakeoffCinematic
├── entities/                  # Ship3D, Bolt3D, Explosion3D
├── ships/                     # ShipGeometry, ShipMaterials, ShipDrawHelpers (procedural meshes)
├── ai/                        # AIBehavior3D, Steering, behaviors/{Rusty,BoloTie,BowTie,Bishop}Behavior3D
├── systems/                   # Physics, Weapons, Damage, Particles, Atmosphere, Sound, EnvironmentLoader
├── renderer/                  # SetupRenderer (composer + passes), Environment (space skybox), ProceduralTextures
├── camera/CockpitCamera.ts
├── terrain/CanyonGeometry.ts
├── ui/                        # HUD3D, GuidePath, NavBeacon, MouseControls, TouchControls3D
└── utils/                     # StateMachine, math
```

Other entry pages at repo root: `index.html` (main game), `ship-viewer.html`, `model-viewer.html`, `mars-360.html`, `enemy-ship-360.html`.

---

## Controls

- **Keyboard:** WASD/arrows for orient, `E` = thrust, mouse for aim, `Esc` = pause
- **Touch:** on-screen stick + fire button via `TouchControls3D`
- **Landscape required** on mobile — a rotate prompt is shown in portrait (`index.html`)

---

## Art & Assets

- **Ships:** procedural Three.js geometry (no `.glb` loading in the current build — the deleted `public/models/*.glb` were part of an earlier attempt)
- **Pilot portraits:** `public/portraits/{character}.jpg` (owen, william, parks, brayden, brody, ethan, austin, dylan)
- **Villain portraits:** `public/portraits/{bolo-tie,bow-tie,bishop}.jpg` — cache-busted with `?v=2`
- **Branding:** `public/portraits/prodigy-logo.png`, `public/textures/vox-logo.png`
- **Fonts:** Orbitron (display) + Chakra Petch (body) via Google Fonts

---

## Build & Deploy

```bash
npm install
npm run dev      # Vite dev server, hot reload
npm run build    # tsc && vite build
npm run preview
```

Render deploys from `render.yaml`. The repo's default branch is `main`; 3D rebuild work has been merging straight into `main` (feature branch `feature/threejs-3d-rebuild` exists but is not ahead).

---

## Claude Code Workflow Tips

- **Commit after every working layer.** Use git as your rollback net.
- **`npm run dev` hot-reloads** — test in browser after every change. Visual bugs hide fast in 3D.
- **New villain?** Copy an existing `*Behavior3D.ts`, rename, tweak steering/fire logic. Don't build from scratch.
- **New ship variant?** Add a character to `CHARACTERS`, provide a portrait, tweak `ShipMaterials`/`ShipGeometry` for visual variant.
- **Tuning combat feel?** `config.ts` first. If you find yourself editing constants inside scene code, stop and move them to `config.ts`.

---

## Do NOT
- Use DOM/CSS/SVG for in-world objects (the HUD + overlays are the only allowed DOM — everything else is Three.js)
- Call `renderer.render()` directly — always go through `bundle.composer`
- Load Phaser or reintroduce 2D tile-based code paths
- Hardcode tuning values in scenes/systems — put them in `config.ts`
- Skip `cleanup…` on scene exit — resources leak fast in Three.js (geometries, materials, textures)
- Start audio without a user gesture — browsers will silently block it
- Build multiple features simultaneously — finish one, commit, then start the next
