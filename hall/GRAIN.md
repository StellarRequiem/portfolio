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

## The periodic table

All 118, driven by real physical properties rather than by 118 hand-written behaviours.
This works because the cabinet's four systems already *are* the four properties that
matter:

| system | is really |
|---|---|
| the heat field | melting point and boiling point |
| density | density |
| charge | electrical conductivity |
| detonation | what an alkali metal does in water |

So these are not reskins — it is the engine finally being handed real numbers. Press `T`
or the TABLE button; the picker **is** the periodic table, laid out in periods and
groups, coloured by category, with a phase pip showing what state each element is in at
room temperature.

### The engine change that made it possible

Melting used to swap one element for a different one. That is fine for ice becoming
water and wrong for an element: mercury is not a different substance from solid mercury,
it is mercury above −39°. So phase is now **derived** from temperature:

```
kindOf(m, t) = t >= bp ? GAS : t >= mp ? LIQUID : POWDER
```

Every element gets its correct room-temperature phase for free, from its own data, with
no extra table rows. Verified: exactly the 11 real room-temperature gases come out as
gases, and Hg and Br as liquids. (Copernicium also comes out liquid — which is a real
prediction, not a bug.)

Below its melting point an element is POWDER, not SOLID, and this matters more than it
looks: 104 of the 118 are solid at room temperature, and a SOLID in this engine does not
move. Made solid, most of the periodic table was inert scenery — you could not pour
sodium onto water because the sodium hung in the air where you painted it. Measured:
lithium through rubidium produced *zero* reactions against a water shelf directly
beneath them. Granular is also the honest reading: what you pour out of a jar is filings,
not a machined block.

### What falls out of real data

- **Gallium melts in your hand** at about 30°, so one stroke of the heat brush liquefies it
- **Tungsten outlasts everything** in a fire — mp 3422° against wood's 220° ignition
- **Xenon and radon pool on the floor**; helium leaves through the ceiling. The sign of
  the density is the whole rule
- **Metalloids conduct only when hot** — semiconductors, checked per cell
- **Actinides decay** along real chains: U → Th → Ra → Rn → Po → Pb
- **The alkali gradient is real.** Measured peak hot-cell count from an identical drop
  onto an identical water shelf: **Li 63 · Na 329 · K 455 · Rb 1211 · Cs 1792**

Reactions can now carry their own blast radius, which is what makes the alkali group
work at all — caesium in water is chemistry, not temperature, so it could never have
come from a thermal ignition point.

### ⚠ On the accuracy of this data

**Melting points, boiling points and densities here are approximate values from memory.
They have not been checked against a reference dataset.** They are close enough that the
sandbox behaves correctly — mercury and bromine liquid, gallium melting at body heat,
tungsten surviving anything — but they should not be quoted as physical constants.

Everything from fermium (100) up is worse than approximate: for most superheavy elements
real science has only predictions, and several have never existed in quantities large
enough to melt. Those are plausible fiction and the table marks them `predicted`.

## Runs — set pieces that play themselves

A sandbox rewards whoever already has an idea. A **run** is the other thing: a scene
built to knock itself over, with narration arriving as each stage fires, so you can put
it on and watch a chain propagate for a minute or two the way you'd watch a domino line.

Pick one from **WATCH** in the toolbar. Three parts, and the split is what keeps them
writable:

- `build()` lays the scene out once
- `tick(ms)` optional, every frame — drips, ramps, anything ongoing
- `beats[]` narration, each firing on elapsed time **or** on a state predicate

Predicate beats matter more than timed ones. A chain reaction doesn't keep to a
schedule, so a line saying "the potassium has gone up" should appear *because the
potassium went up*, not because eleven seconds passed and it probably did.

| run | what it shows |
|---|---|
| MELTING POINT RACE | nine metals on one ramping hot plate, going in table order |
| ALKALI LADDER | Li→Cs, one water drip each, nine seconds apart |
| THE LONG FUSE | six walled bays, one fuse, about ninety seconds end to end |
| DECAY CHAIN | shielded uranium walking down U→Th→Ra→Rn→Po→Pb |
| SEMICONDUCTOR GATE | a circuit that only closes once the silicon is hot |

Run predicates count **from the moment the run started**, not from lifetime totals —
without that, a run started after any earlier play fired its beats instantly (measured:
beat 2 of THE LONG FUSE arriving 0.3s in, off 82 burns left over from a previous scene).

### Two bugs in the charge system

**Charge never actually travelled along a wire**, for two independent reasons.

*One:* an arc rides in the empty cell above the conductor carrying it. With a four-cell
neighbourhood, an arc on a horizontal wire finds exactly one conductor — the one directly
beneath it — and the rule then places the new arc "above that conductor", which is the
cell the arc is already in. It re-created itself in place forever. The wire one step
along is *diagonal* to the arc, so seeing diagonals is necessary.

*Two, and this was the real one:* `ARC` was declared a **gas**, so it renders bright and
weightless. But `stepCell` runs movement *before* `touch()`, and returns as soon as a
cell moves — so an arc, being buoyant, rose into the empty space above the wire and
returned every single frame, and `touch()`, which is where `conduct()` lives, never ran
at all. One word in a table broke the entire electrical system.

Measured before: 238 sparks created, charge failing to cross even **ten** cells.
Measured after: wires of 60, 120 and 190 cells all carry current to a charge at the far
end and detonate it, at a steady 120fps. A charge does not drift; it stays where it is
put.

An earlier note in this repo recorded "282 sparks — the battery is emitting and the wire
is carrying". That was the battery pulsing in place, miscounted as transport.

**A predicate beat could stall a run forever.** Beats advance strictly in order, so one
unreachable predicate blocks every beat behind it. THE LONG FUSE waited on `fire > 300`
in a scene whose sampled fire count never exceeded 7, and its last two beats never
arrived even though the charge at the end had gone off. A run that quietly stops
narrating looks identical to a run that finished. Predicate beats now take an optional
`by:` deadline.

### What THE LONG FUSE cost, and what it taught

Five attempts at a self-sustaining fuse front failed, each differently:

1. **flame in an open channel** — CIND is a gas; it floated off the cord after two cells
2. **oil on an open shelf** — it ran the length of the shelf and chased the flame out
3. **embers with no floor** — EMBR is a powder; it fell off the cord. Zero reactions in 23s
4. **flame in a roofed channel** — trapped, but CIND lives 38 frames, giving ~1.5 expected
   offspring per flame. Barely above replacement, so it died out by chance at five cells
5. **embers with a floor** — stalled at seventeen cells

All the same mistake: asking a **stochastic branching process to behave like a scripted
demo**. A branching process that is barely supercritical is a coin-flip about whether
your set piece happens at all.

The fix was to stop trying. A run is a thing that *drives* a scene, so the front position
is now a function of elapsed time — deterministic, exactly paceable, cannot fizzle. The
chemistry downstream is still entirely real; the bays catch and detonate on their own
rules. Only the fuse's own advance is on rails, which is the one part nobody was watching
for emergence anyway.

## The LAB scene

A bench laid out as apparatus rather than as a pile: six glass vessels each charged with
something that wants to react (Na, Hg, Ga, S, I, W), a water trough for the alkali
metals, a heating element wired to a cell, and a lead-shielded pit of uranium. Every one
of the cabinet's systems has a station, so the scene doubles as a tour of what the box
can do.

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
