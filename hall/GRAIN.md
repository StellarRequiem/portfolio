# GRAIN — the sand lab

A falling-sand cabinet. Nothing can kill you and there is nothing to win; it is a box of
materials that obey rules, and the fun is finding out what the rules do together.

## Why it is table-driven

The first version hardcoded every interaction as an if/else chain inside `touch()`. That
reads fine at twelve materials and does not survive forty: each new material means
editing a branch for every material it might meet — quadratic work, quadratic chances to
get it wrong. Behaviour now lives in data:

- **`ELEM`** — one row per material: kind, density, colour, thermal points, flags
- **`REACT`** — one row per ordered pair that does something on contact

Adding a material is adding a row. Adding an interaction is adding a row. The physics
loop never changes.

## The four systems

**HEAT** is a real scalar field that diffuses between neighbours, not a per-element flag.
Materials melt, boil, ignite and freeze because of their own temperature, so ice near
lava melts *because the heat got there* and a stone wall genuinely insulates. Press `H`
for the thermal camera.

**CHARGE** propagates through conductors as a short-lived `ARC`. `FILA`, `FERR`, `QUIK`
and `BRIN` conduct; `PILE` emits on a pulse. Charge is modelled as a material rather than
a flag on the wire, so it is visible, it travels at a speed you can watch, and it decays
through the same machinery as everything else.

**DETONATION** is its own element property, deliberately separate from combustion. A
charge that merely *burns* when heated is a firework; checking detonation before
combustion is what lets one blast set off the next.

**DENSITY** decides who sinks. One comparison replaces the pile of special cases that
used to hardcode sand-through-water and oil-on-water separately — quicksilver drops
through both because 34 > 10 > 8, not because anyone wrote those three rules down.

## Building tools

A sandbox you cannot pause, in which the only stroke is a smeared circle, is a toy
rather than something you can build in. These are worth having together because each is
half-useless without the others:

| tool | key | what it is for |
|---|---|---|
| PAUSE / RESUME | `P` | place things precisely without the world running away underneath you |
| STEP | `.` | advance exactly one frame — the only honest way to watch what a rule does |
| SHAPE | `S` | FREEHAND · LINE · BOX · FLOOD FILL, so a wall is one drag instead of a smear |
| HEAT + / COOL − | `G` / `B` | paint temperature directly, instead of dropping lava and hoping |
| SCENE | — | six starting scenes: DUNES, VOLCANO, AQUARIUM, CIRCUIT, FOREST, ICE CAVE |
| SAVE / LOAD | — | one slot, run-length encoded into localStorage |

LINE and BOX anchor on press and commit on release, with a dashed preview of what you
are about to get — a shape you cannot see before committing is a guess. FLOOD FILL is
capped at 24,000 cells, generous enough for any cavity you would actually build and
small enough that a misclick on open air is survivable.

The heat brush is the one that changes how the cabinet is used: it turns "drop lava next
to it and hope" into actually asking what a material does at 400°.

Save is RLE because a sand grid is almost all runs — a scene stores in about 1 kB against
63 kB for the raw grid. Temperature is deliberately not stored; it re-derives from the
materials within a second of loading, and keeping it would roughly triple the payload to
preserve something the simulation regenerates anyway.

## Shelves

Forty-one materials will not fit in a cycle-through-with-one-key list, so they sit on six
labelled shelves. `1`–`6` picks the shelf, `QWERTYUI` picks off it, and the palette is
clickable. The swatch is the material's real render colour, so the palette doubles as a
legend.

| shelf | materials |
|---|---|
| EARTH | DUNE SALT GRIT SOOT CARB SLAB BASE |
| WATER | BRIN OIL MUCK SAP ETCH QUIK CRYO |
| FIRE  | CIND MAGM EMBR NITR CORD CHRG TALL |
| AIR   | HAZE FUME DAMP MIAS LOFT |
| LIFE  | VINE GERM PITH MITE BLGT RIME FLOC |
| WORKS | FILA PILE ARC FERR VITR SPAR FONT SINK |

Names stay in the cabinet's own register — mining and alchemy, never the real-world word.
It is an original cabinet and the nomenclature is part of that.

`MITE` is the one thing in the box with intent: it walks, tunnels through loose ground,
breeds a little in slime, and drowns.

## What testing caught

1. **Explosives could not chain.** A row of eleven charges detonated exactly one of
   itself. Two causes, both invisible without measuring: `CHRG` had a *combustion* point,
   so heat made it burn rather than detonate; and `blast()` cleared its own radius,
   destroying the neighbouring charges before they could go off. Detonation is now a
   distinct property and a blast leaves other detonators standing. One ignition now takes
   the row.
2. **The mite was deleting, not tunnelling** — it ate half the opening dune in about five
   seconds. Dig rate 0.30 → 0.10, so the galleries are something you watch form.
3. **The room could never return to room temperature.** Ambient relaxation used
   `(AMBIENT - next) >> 5`, and an arithmetic shift of anything under 32 truncates to
   zero — so once the box was within 31° of ambient it stopped relaxing and stayed there.
   Measured: after a cryogen spill it settled at −11° and held it indefinitely. With a
   sign-aware minimum step it converges to exactly 20°.
4. **Cab scripts had no version in their URL**, so a browser holding `cabs/grain.js` kept
   running an older cabinet — the same staleness that once made a newly published cab
   invisible, but harder to spot because the cabinet still ran, just an older version of
   itself. `HALL_BUILD` now versions the URL.

## Measured

- 41 materials, all six shelves selectable, 0 selection failures
- 120 fps sustained; a 6,185-cell block of explosive produced **4,884 chained blasts with
  no drop below 120 fps**
- heat verified propagating: lava beside ice raised the ice site from −8° to 69° and
  produced 2,920 transitions
- charge verified: a battery under a wire run produced 282 arcs
- ambient recovery converges to 20° from −48° in about 1.5 s

## The score

`GRAIN` is scored in lydian at 84bpm — a sharp fourth, because nothing here wants to kill
you. Tension reads reaction *rate*, how full the box is, and now how much of it is on
fire, so a lab where something is burning is a different piece of music from one where
somebody is quietly pouring sand. See [SCORES.md](SCORES.md).
