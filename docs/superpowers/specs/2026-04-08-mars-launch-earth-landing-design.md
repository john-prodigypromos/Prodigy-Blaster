# Mars Canyon Launch & Earth Spaceport Landing

**Date:** 2026-04-08
**Status:** Approved
**Approach:** Blended physics with altitude zones (Approach B)

---

## Overview

Add fully playable atmospheric flight sequences that bookend the existing 3-level space combat. The player launches from the floor of a Martian canyon, ascends through thinning atmosphere into orbit where combat begins, and after defeating the final boss, flies back through Earth's atmosphere to land at a desert spaceport. The launch replaces the current level intro screen. The landing replaces the current victory overlay.

**Mission arc:**
```
Title -> Character Select -> Mars Launch (canyon -> atmosphere -> orbit)
  -> Level 1 (asteroid belt) -> Level 2 (nebula) -> Level 3 (black hole)
    -> Earth Landing (approach -> reentry -> clouds -> touchdown)
      -> Score Summary (landed cockpit view)
```

**Tone:** The Mars launch is quiet discovery and wonder — red canyon walls, thin atmosphere, stars appearing. The Earth landing is a triumphant homecoming — reentry fire, cloud break reveal, guided touchdown. Combat provides the tension between these two peaceful bookends.

---

## 1. Mars Canyon Launch Sequence

### Setting
Player's ship sits at the bottom of a deep Martian canyon (Valles Marineris-inspired). Red-orange rock walls tower on both sides. Dusty haze near the ground, thin pale sky above, stars faintly visible through the atmosphere.

### Sequence Flow

1. **Cold start** — Camera shows the ship from outside on a small pad at the canyon floor. HUD fades in. Ambient wind sound, dust particles drifting. Subtle prompt: "HOLD THRUST TO LAUNCH"
2. **Vertical climb** — Player holds thrust, ship lifts off. Canyon walls slide past on both sides. Player can yaw/pitch to look around but the canyon naturally funnels upward. Gentle collision boundaries on walls (bounce + minor damage, not instant death).
3. **Canyon navigation** — As altitude increases, the canyon widens and forks. Player has real steering control — weave between rock formations, fly through natural arches. No enemies, just the landscape.
4. **Atmosphere thinning** — Sky shifts from dusty salmon -> deep red-brown -> dark purple -> black with stars. Dust particles thin out, replaced by high-altitude ice crystals, then nothing. Engine sound changes from muffled atmospheric roar to clean space hum.
5. **Orbit break** — Canyon walls fall away below. Mars curves beneath. Brief moment of zero-gravity float, then HUD shifts to combat mode and Level 1 enemies appear in the distance.

### Physics
- Light downward gravity (fades with altitude)
- Slight atmospheric drag (fades with altitude)
- Canyon wall collision boxes (simple invisible planes)
- Speed cap gradually increases as atmosphere thins

### Duration
~45-60 seconds of gameplay from pad to orbit.

---

## 2. Earth Landing Sequence

### Trigger
After defeating the Level 3 black hole boss, ship auto-orients toward distant Earth. Brief text: "MISSION COMPLETE -- RETURN HOME"

### Sequence Flow

1. **Approach** — Earth grows from a dot to filling the view. Moon visible off to the side. Player has full flight control, waypoint marker guides toward planet. Peaceful — no enemies, shields regenerating, score tallying in HUD.
2. **Atmospheric entry** — Screen edges glow orange-red (reentry heating). Camera shakes lightly. Space hum transitions to building roar. Clouds start whipping past.
3. **Cloud break** — Ship punches through cloud layer. Dramatic reveal: blue sky, ocean below, coastline visible. Spaceport appears ahead — landing pads and low buildings in a desert near the coast.
4. **Landing approach** — Holographic guide path appears (glowing corridor of cyan rings/rectangles leading to the pad). Player flies through it, decelerating. Thrust reverses to brake. Ship settles lower. Ground detail increases.
5. **Touchdown** — Ship crosses low altitude threshold and auto-levels for the final meter. Landing gear deploys (visual). Dust kicks up. Ship settles. Engines wind down. Score summary fades in over the landed cockpit view.

### Physics
- Gravity increases as you descend (inverse of Mars launch)
- Atmospheric drag increases (natural braking assist)
- Speed cap decreases near ground level
- Gentle auto-correction if player drifts too far off guide path (nudges, doesn't wrestle control)
- Landing zone is forgiving — large circular pad

### Failure Mode
You cannot crash. If you come in too steep or fast, the ship auto-flares at the last second and bounces slightly. Looks dramatic but you always land. This is the victory lap, not a skill check.

### Duration
~60-90 seconds from orbit to touchdown.

---

## 3. Visual & Audio Design

### Mars Canyon Visuals
- Procedural canyon geometry — red-orange rock walls with noise displacement (reuse asteroid noise functions), iron oxide coloring
- Ground floor: dusty flat terrain with small rocks, landing pad with subtle glow markings
- Atmospheric haze: dense salmon fog near ground, thins with altitude
- Particles: dust motes near ground, wispy high-altitude ice crystals, then nothing in vacuum
- Lighting: warm directional sun (low angle, long shadows in canyon), ambient fill
- Skybox transition: procedural gradient shifting dusty salmon -> purple -> black, stars fade in

### Earth Landing Visuals
- Earth as full sphere in distance (reuse ocean world planet profile)
- Reentry VFX: screen-edge orange glow overlay, camera shake, plasma particle trails
- Cloud layer: large white translucent planes at set altitude
- Below clouds: blue sky gradient, desert/coastline terrain below
- Spaceport: flat buildings, circular landing pad with pulsing lights, control tower
- Guide path: holographic translucent rings forming a corridor (cyan glow)

### Audio (all synthesized Web Audio)
- **Canyon:** Low wind drone, occasional wall echo, engine muffled
- **Atmosphere thinning:** Wind fades, engine shifts from bassy roar to clean mid-frequency hum
- **Space:** Existing combat audio
- **Reentry:** Building white noise roar, rattling bass
- **Below clouds:** Wind returns, engine whine, triumphant synth building
- **Touchdown:** Engine wind-down, mechanical settling, silence, then score fanfare

---

## 4. Terrain & Landscape Realism

### Mars Canyon Terrain
- **Canyon walls:** Multi-layered noise displacement on tall geometries — domain-warped FBM + ridged noise. Horizontal sediment striping via vertex colors (darker iron bands alternating with lighter dusty orange). Overhangs and jutting ledges.
- **Canyon floor:** Subdivided plane with noise displacement for uneven rocky ground. Scattered boulder meshes (reuse createAsteroidMesh at small scale with Mars coloring). Dry riverbed channels from ridged noise.
- **Rock arches:** Procedural arch shapes spanning canyon at mid-altitudes — deformed torus/cylinder geometry with rock noise applied. Player flies through or around them.
- **Distant mesa skyline:** Low-poly horizon ring of mesa silhouettes visible above canyon rim. Simple extruded shapes with flat tops and noise-displaced cliff faces.
- **Ground detail near pad:** Worn concrete pad with painted markings (canvas texture). Small equipment structures — antenna dish, fuel tank cylinders, cargo containers. Simple geometry with metallic materials.

### Earth Spaceport Terrain
- **Desert ground plane:** Large subdivided plane with rolling dune noise. Vertex colors: tan/sandy base with darker dry earth patches and pale salt flat regions. Normal map for sand grain.
- **Coastline:** Desert meets ocean. Water plane with animated wave displacement and blue-green gradient. Foam line at boundary.
- **Spaceport structures:** Landing pad (large circle, pulsing cyan edge markers), control tower (tall narrow box with antenna and lit windows), 2-3 hangars (long low boxes, curved roofs), fuel tanks (cylinders), connecting roads. All procedural geometry with PBR materials.
- **Vegetation hints:** Clusters of low desert scrub — small billboard quads with alpha-cutout green-brown textures.
- **Atmospheric depth:** Blue-white distance fog, thicker near horizon.

### Shared Techniques
- All terrain uses the same noise stack from the asteroid system (valueNoise3D, fbm3D, ridgedNoise3D, domain warping)
- Vertex colors on all surfaces — noise-driven color variation (dust, mineral streaks, weathering)
- Normal maps on terrain for micro-detail
- Distance-based LOD: terrain subdivisions decrease with distance from player

---

## 5. Architecture & Integration

### New Files
- `src/scenes/MarsLaunch.ts` — Canyon geometry generation, atmosphere system, launch sequence logic, altitude-based physics modifiers
- `src/scenes/EarthLanding.ts` — Approach corridor, reentry effects, cloud layer, spaceport geometry, guide path, touchdown logic
- `src/systems/AtmosphereSystem.ts` — Shared altitude-based physics (gravity, drag, speed cap curves), sky color transitions, particle density. Used by both scenes.

### Modified Files
- `src/main.ts` — New scene flow: Title -> Character Select -> Mars Launch -> Level 1 -> Level 2 -> Level 3 -> Earth Landing -> Score Summary
- `src/state/SceneManager.ts` — Add marsLaunch and earthLanding scene keys
- `src/state/LevelState.ts` — Track mission phase (launch/combat/landing) for HUD changes
- `src/systems/PhysicsSystem3D.ts` — Accept optional atmosphere modifiers (gravity, drag multipliers) without changing core flight model
- `src/ui/HUD3D.ts` — Altitude indicator during launch/landing, guide path distance during landing, suppress combat HUD during non-combat phases
- `src/systems/SoundSystem.ts` — New synth patches: wind drone, reentry roar, touchdown sequence, triumphant landing tone
- `src/renderer/Environment.ts` — Export ocean world planet profile for reuse as Earth

### Unchanged
- Ship geometry, materials, all 3 combat levels
- Touch/keyboard controls (same inputs for launch and landing)
- Weapon system (disabled during launch/landing)
- Damage system, AI behaviors, difficulty presets
- Character selection, high scores

### Key Principle
The atmosphere system is a modifier layer on top of existing physics, not a replacement. `applyShipPhysics()` gets optional `atmosphereModifiers: { gravity: number, drag: number, speedCap: number }` — when absent, behavior is identical to current space flight.
