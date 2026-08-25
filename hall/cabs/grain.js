/**
 * GRAIN — the sand lab.
 *
 * A falling-sand cabinet. Nothing here can kill you and there is nothing to win; the
 * whole cabinet is a box of materials that obey rules, and the fun is finding out what
 * the rules do together.
 *
 * ── WHY THIS IS TABLE-DRIVEN ──────────────────────────────────────────────────
 * The first version hardcoded every interaction as an if/else chain inside touch().
 * That reads fine at twelve elements. It does not survive forty: every new material
 * means editing a branch for each material it might meet, which is quadratic work and
 * quadratic opportunity to get it wrong. So behaviour now lives in data:
 *
 *   ELEM      one row per material — kind, density, colour, thermal points, flags
 *   REACT     one row per ordered pair that does something when they touch
 *
 * Adding a material is adding a row. Adding an interaction is adding a row. The
 * physics loop never changes, which is what makes a lab this size maintainable.
 *
 * ── THE THREE SYSTEMS ─────────────────────────────────────────────────────────
 * 1. HEAT is a real scalar field that diffuses between neighbours, not a per-element
 *    flag. Materials melt, freeze, boil and ignite because of their own temperature,
 *    so ice near lava melts *because the heat got there*, and a long stone wall
 *    genuinely insulates. Emergence comes free once the field is real.
 * 2. CHARGE propagates through conductors as a short-lived ARC. Wire, iron, quicksilver
 *    and brine all conduct; a PILE emits. This is the one system with no analogue in
 *    the falling-sand core, and it is where most of the toys are.
 * 3. DENSITY decides who sinks. One comparison replaces the pile of special cases that
 *    used to hardcode sand-through-water and oil-on-water separately.
 *
 * Names stay in the cabinet's own register — mining and alchemy, four to five letters,
 * never the real-world word. It is an original cabinet and the nomenclature is part of
 * that, not decoration.
 */
window.Cab = { id: "grain", name: "GRAIN", mount(canvas, hall) {
  const COLS = 320, ROWS = 200, CELL = 2, UI = 132;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL + UI;
  canvas.style.zIndex = "5";
  canvas.style.position = "relative";
  const ctx = canvas.getContext("2d", { alpha: false });
  const img = ctx.createImageData(COLS * CELL, ROWS * CELL);
  const pix = img.data;

  // ── kinds ───────────────────────────────────────────────────────────────────
  const NONE = 0, POWDER = 1, LIQUID = 2, GAS = 3, SOLID = 4, WALL = 5;

  const AMBIENT = 20;        // room temperature, in the lab's own degrees
  const T_MIN = -220, T_MAX = 1600;

  /**
   * The materials.
   *
   * d      density — who displaces whom. Gases are negative so they rise through air.
   * melt   {at, to} — above this temperature it becomes `to`
   * frz    {at, to} — below this temperature it becomes `to`
   * fire   {at, to, heat} — ignition point, what it leaves behind, and how much it
   *        raises the local temperature while burning
   * det    {at, r, heat} — detonates at this temperature, with this blast radius.
   *        Distinct from `fire` on purpose: a charge that merely *burns* when heated is
   *        a firework. Checking detonation before combustion is what lets one blast set
   *        off the next one.
   * emit   degrees this material pushes into its own cell every tick (a heat source)
   * life   ticks before it decays into `dec` (0 = permanent)
   * cond   conducts charge
   * ins    resists heat diffusion (an insulator)
   */
  const ELEM = [
    /* 0  */ { n:"EMPTY", rgb:[8,10,14],      k:NONE,   d:0 },
    /* 1  */ { n:"DUNE",  rgb:[196,164,106],  k:POWDER, d:14, melt:{at:1150,to:27} },
    /* 2  */ { n:"SALT",  rgb:[214,210,196],  k:POWDER, d:12, melt:{at:800,to:6} },
    /* 3  */ { n:"BRIN",  rgb:[74,138,176],   k:LIQUID, d:10, melt:{at:100,to:7}, frz:{at:0,to:10} },
    /* 4  */ { n:"OIL",   rgb:[58,72,42],     k:LIQUID, d:8,  fire:{at:180,to:5,heat:260} },
    /* 5  */ { n:"CIND",  rgb:[232,96,54],    k:GAS,    d:-3, emit:34, life:38, dec:13 },
    /* 6  */ { n:"MAGM",  rgb:[186,62,28],    k:LIQUID, d:18, emit:60, frz:{at:620,to:9} },
    /* 7  */ { n:"HAZE",  rgb:[174,196,206],  k:GAS,    d:-2, frz:{at:96,to:3}, life:190, dec:3 },
    /* 8  */ { n:"FUME",  rgb:[118,92,64],    k:GAS,    d:-2, life:150, dec:0 },
    /* 9  */ { n:"SLAB",  rgb:[92,100,112],   k:SOLID,  d:60, melt:{at:1100,to:6}, ins:1 },
    /* 10 */ { n:"RIME",  rgb:[186,214,222],  k:SOLID,  d:9,  melt:{at:2,to:3} },
    /* 11 */ { n:"PITH",  rgb:[112,78,48],    k:SOLID,  d:30, fire:{at:220,to:5,heat:230}, ins:1 },
    /* 12 */ { n:"VINE",  rgb:[62,138,78],    k:SOLID,  d:20, fire:{at:160,to:5,heat:180} },

    // ── powders ────────────────────────────────────────────────────────────────
    /* 13 */ { n:"SOOT",  rgb:[62,58,54],     k:POWDER, d:6 },
    /* 14 */ { n:"CARB",  rgb:[38,36,40],     k:POWDER, d:16, fire:{at:340,to:19,heat:420} },
    /* 15 */ { n:"NITR",  rgb:[168,148,72],   k:POWDER, d:13, det:{at:120,r:5,heat:520} },
    /* 16 */ { n:"FLOC",  rgb:[228,238,244],  k:POWDER, d:5,  melt:{at:1,to:3} },
    /* 17 */ { n:"GERM",  rgb:[142,158,74],   k:POWDER, d:11, fire:{at:200,to:5,heat:150} },
    /* 18 */ { n:"GRIT",  rgb:[128,120,104],  k:POWDER, d:15 },
    /* 19 */ { n:"EMBR",  rgb:[214,132,48],   k:POWDER, d:12, emit:22, life:150, dec:13 },

    // ── liquids ────────────────────────────────────────────────────────────────
    /* 20 */ { n:"ETCH",  rgb:[168,214,64],   k:LIQUID, d:11 },
    /* 21 */ { n:"QUIK",  rgb:[178,186,196],  k:LIQUID, d:34, cond:1, frz:{at:-38,to:26} },
    /* 22 */ { n:"MUCK",  rgb:[104,146,84],   k:LIQUID, d:12, fire:{at:260,to:5,heat:120} },
    /* 23 */ { n:"CRYO",  rgb:[132,198,226],  k:LIQUID, d:7,  emit:-70, melt:{at:-180,to:7} },
    /* 24 */ { n:"SAP",   rgb:[196,132,58],   k:LIQUID, d:13, fire:{at:190,to:5,heat:200}, frz:{at:24,to:29} },

    // ── gases ──────────────────────────────────────────────────────────────────
    /* 25 */ { n:"DAMP",  rgb:[126,150,120],  k:GAS,    d:-2, fire:{at:110,to:5,heat:620} },
    /* 26 */ { n:"FERR",  rgb:[136,140,150],  k:SOLID,  d:50, cond:1, melt:{at:1300,to:6} },
    /* 27 */ { n:"VITR",  rgb:[172,206,214],  k:SOLID,  d:40, melt:{at:1000,to:6} },
    /* 28 */ { n:"MIAS",  rgb:[168,196,96],   k:GAS,    d:-1, life:340, dec:0 },
    /* 29 */ { n:"TALL",  rgb:[226,214,176],  k:SOLID,  d:9,  melt:{at:62,to:24}, fire:{at:210,to:5,heat:170} },
    /* 30 */ { n:"LOFT",  rgb:[206,196,232],  k:GAS,    d:-6, life:420, dec:0, fire:{at:120,to:5,heat:540} },
    /* 31 */ { n:"SPAR",  rgb:[152,214,232],  k:SOLID,  d:44, melt:{at:1250,to:6} },

    // ── the machinery ──────────────────────────────────────────────────────────
    /* 32 */ { n:"FILA",  rgb:[204,158,72],   k:SOLID,  d:45, cond:1, melt:{at:1080,to:6} },
    /* 33 */ { n:"PILE",  rgb:[96,196,168],   k:SOLID,  d:55, cond:1 },
    /* 34 */ { n:"ARC",   rgb:[255,246,164],  k:GAS,    d:-1, emit:16, life:3, dec:0 },
    /* 35 */ { n:"CORD",  rgb:[168,120,96],   k:SOLID,  d:22, fire:{at:130,to:5,heat:260} },
    /* 36 */ { n:"CHRG",  rgb:[210,72,86],    k:SOLID,  d:26, det:{at:330,r:15,heat:950} },
    /* 37 */ { n:"FONT",  rgb:[128,110,214],  k:WALL,   d:90 },
    /* 38 */ { n:"SINK",  rgb:[36,28,52],     k:WALL,   d:90 },
    /* 39 */ { n:"BLGT",  rgb:[186,74,178],   k:SOLID,  d:18, life:0 },
    /* 40 */ { n:"BASE",  rgb:[52,58,66],     k:WALL,   d:99, ins:1 },
    /* 41 */ { n:"MITE",  rgb:[236,180,90],   k:SOLID,  d:19, fire:{at:150,to:5,heat:90} }
  ];
  const N_ELEM = ELEM.length;
  const E = {};
  ELEM.forEach(function (e, i) { E[e.n] = i; });

  /**
   * Contact reactions, checked when two cells are orthogonally adjacent.
   *
   * Each row is [a, b, becomesA, becomesB, chance]. `-1` means leave alone. Only the
   * ordered pair (a,b) is tested, so a reaction that should work both ways gets two
   * rows — explicit beats a symmetry rule nobody can remember the direction of.
   *
   * These are the interactions that are genuinely chemical. Anything that is really
   * "it got hot enough" belongs in a melt/fire entry above instead, so that heat stays
   * one system rather than being re-implemented per pair.
   */
  const REACT = [
    // brine and salt
    [E.SALT, E.BRIN, E.EMPTY, E.BRIN, 0.55],
    [E.DUNE, E.ETCH,  E.EMPTY, E.ETCH, 0.10],

    // acid eats nearly everything, slowly, and spends itself doing it
    [E.ETCH, E.SLAB,  E.EMPTY, E.EMPTY, 0.05],
    [E.ETCH, E.PITH,  E.EMPTY, E.EMPTY, 0.14],
    [E.ETCH, E.FERR,  E.EMPTY, E.EMPTY, 0.07],
    [E.ETCH, E.VINE,  E.EMPTY, E.EMPTY, 0.22],
    [E.ETCH, E.VITR,  E.ETCH,  E.ETCH,  0.01],
    [E.ETCH, E.BRIN,  E.BRIN,  E.BRIN,  0.06],
    [E.ETCH, E.RIME,  E.ETCH,  E.BRIN,  0.20],
    [E.ETCH, E.BASE,  E.EMPTY, E.BASE,  0.02],

    // growth: a seed with water and sand becomes a vine; vines creep along wet sand
    [E.GERM, E.BRIN,  E.VINE,  E.EMPTY, 0.06],
    [E.VINE, E.BRIN,  E.VINE,  E.VINE,  0.012],
    [E.GERM, E.MUCK,  E.VINE,  E.EMPTY, 0.10],

    // blight converts anything organic and spreads; fire is the only cure
    [E.BLGT, E.VINE,  E.BLGT,  E.BLGT,  0.14],
    [E.BLGT, E.PITH,  E.BLGT,  E.BLGT,  0.05],
    [E.BLGT, E.GERM,  E.BLGT,  E.BLGT,  0.20],
    [E.BLGT, E.MUCK,  E.BLGT,  E.BLGT,  0.16],
    [E.BLGT, E.CIND,  E.EMPTY, E.CIND,  0.85],
    [E.BLGT, E.EMBR,  E.SOOT,  E.EMBR,  0.60],

    // lava's own chemistry, the parts that are not just temperature
    [E.MAGM, E.BRIN,  E.SLAB,  E.HAZE,  0.42],
    [E.MAGM, E.DUNE,  E.MAGM,  E.VITR,  0.05],
    [E.MAGM, E.CRYO,  E.SLAB,  E.HAZE,  0.90],

    // cryogen flashes off against anything warm-blooded and freezes what it touches
    [E.CRYO, E.BRIN,  E.CRYO,  E.RIME,  0.60],
    [E.CRYO, E.VINE,  E.CRYO,  E.EMPTY, 0.14],
    [E.CRYO, E.MUCK,  E.CRYO,  E.RIME,  0.30],

    // chlorine is nasty to living things and settles out on stone
    [E.MIAS, E.VINE,  E.MIAS,  E.SOOT,  0.10],
    [E.MIAS, E.GERM,  E.MIAS,  E.SOOT,  0.14],
    [E.MIAS, E.BRIN,  E.EMPTY, E.ETCH,  0.03],

    // slime is alive enough to be a nuisance
    [E.MUCK, E.BRIN,  E.MUCK,  E.MUCK,  0.008],
    [E.MUCK, E.SOOT,  E.MUCK,  E.MUCK,  0.05],

    // the drain and the source
    [E.SINK, E.EMPTY, E.SINK,  E.EMPTY, 0],

    // rust: iron plus brine, slowly
    [E.FERR, E.BRIN,  E.GRIT,  E.BRIN,  0.004],
    [E.FERR, E.ETCH,  E.GRIT,  E.ETCH,  0.10],

    // steam condensing on cold stone
    [E.HAZE, E.RIME,  E.BRIN,  E.RIME,  0.18],

    // crystal grows along anything wet, slowly, so a geode is something you cultivate
    // rather than something you paint
    [E.SPAR, E.BRIN,  E.SPAR,  E.SPAR,  0.010],
    [E.SPAR, E.MUCK,  E.SPAR,  E.SPAR,  0.004],
    [E.SPAR, E.ETCH,  E.EMPTY, E.ETCH,  0.06],

    // snow packs into ice under its own kind, and salt cuts it
    [E.FLOC, E.RIME,  E.RIME,  E.RIME,  0.02],
    [E.SALT, E.RIME,  E.EMPTY, E.BRIN,  0.30],
    [E.SALT, E.FLOC,  E.EMPTY, E.BRIN,  0.40],

    // firedamp pools and finds a flame, which is the whole reason miners feared it
    [E.DAMP, E.CIND,  E.CIND,  E.CIND,  0.9],
    [E.DAMP, E.EMBR,  E.CIND,  E.EMBR,  0.5],

    // soot and grit are rubble, but rubble should still go somewhere
    [E.SOOT, E.BRIN,  E.MUCK,  E.EMPTY, 0.02],
    [E.GRIT, E.MAGM,  E.MAGM,  E.MAGM,  0.06],

    // quicksilver beads up and poisons what grows
    [E.QUIK, E.VINE,  E.QUIK,  E.SOOT,  0.10],
    [E.QUIK, E.GERM,  E.QUIK,  E.SOOT,  0.14],

    // the mite: it eats loose ground and leaves tunnels, breeds a little in slime,
    // and drowns
    // Measured at 0.30 these ate half the opening dune in about five seconds, which
    // reads as deletion rather than as tunnelling. Slower is better here: the pleasure
    // is watching the galleries open up.
    [E.MITE, E.DUNE,  E.MITE,  E.EMPTY, 0.10],
    [E.MITE, E.GRIT,  E.MITE,  E.EMPTY, 0.07],
    [E.MITE, E.SOOT,  E.MITE,  E.EMPTY, 0.10],
    [E.MITE, E.VINE,  E.MITE,  E.MITE,  0.03],
    [E.MITE, E.MUCK,  E.MITE,  E.MITE,  0.02],
    [E.MITE, E.BRIN,  E.EMPTY, E.BRIN,  0.30],
    [E.MITE, E.ETCH,  E.EMPTY, E.ETCH,  0.60],
    [E.MITE, E.BLGT,  E.BLGT,  E.BLGT,  0.30]
  ];

  /** Reaction lookup: REACT_AT[a] is the list of rows whose first element is `a`. */
  const REACT_AT = [];
  for (let i = 0; i < N_ELEM; i++) REACT_AT.push(null);
  REACT.forEach(function (r) {
    if (!REACT_AT[r[0]]) REACT_AT[r[0]] = [];
    REACT_AT[r[0]].push(r);
  });

  /** Flat typed lookups, read once per cell per frame — object property access here is
   *  measurably slower than an array index at 64,000 cells a frame. */
  const KIND = new Uint8Array(N_ELEM), DENS = new Int16Array(N_ELEM);
  const COND = new Uint8Array(N_ELEM), INSU = new Uint8Array(N_ELEM);
  const EMIT = new Int16Array(N_ELEM), LIFE0 = new Int16Array(N_ELEM), DECAY = new Uint8Array(N_ELEM);
  const MELT_AT = new Int16Array(N_ELEM), MELT_TO = new Uint8Array(N_ELEM);
  const FRZ_AT = new Int16Array(N_ELEM), FRZ_TO = new Uint8Array(N_ELEM);
  const FIRE_AT = new Int16Array(N_ELEM), FIRE_TO = new Uint8Array(N_ELEM), FIRE_HEAT = new Int16Array(N_ELEM);
  const DET_AT = new Int16Array(N_ELEM), DET_R = new Uint8Array(N_ELEM), DET_HEAT = new Int16Array(N_ELEM);
  ELEM.forEach(function (e, i) {
    KIND[i] = e.k || 0; DENS[i] = e.d || 0;
    COND[i] = e.cond ? 1 : 0; INSU[i] = e.ins ? 1 : 0;
    EMIT[i] = e.emit || 0; LIFE0[i] = e.life || 0; DECAY[i] = e.dec || 0;
    MELT_AT[i] = e.melt ? e.melt.at : 32767; MELT_TO[i] = e.melt ? e.melt.to : 0;
    FRZ_AT[i]  = e.frz  ? e.frz.at  : -32768; FRZ_TO[i]  = e.frz  ? e.frz.to  : 0;
    FIRE_AT[i] = e.fire ? e.fire.at : 32767; FIRE_TO[i] = e.fire ? e.fire.to : 0;
    FIRE_HEAT[i] = e.fire ? e.fire.heat : 0;
    DET_AT[i] = e.det ? e.det.at : 32767; DET_R[i] = e.det ? e.det.r : 0;
    DET_HEAT[i] = e.det ? e.det.heat : 0;
  });

  // ── palette, tools, modes ───────────────────────────────────────────────────
  /** Grouped so a forty-material palette is still navigable — 1-6 pick a shelf,
   *  then the row of keys under it picks the material off that shelf. */
  const SHELVES = [
    { t: "EARTH",  items: ["DUNE","SALT","GRIT","SOOT","CARB","SLAB","BASE"] },
    { t: "WATER",  items: ["BRIN","OIL","MUCK","SAP","ETCH","QUIK","CRYO"] },
    { t: "FIRE",   items: ["CIND","MAGM","EMBR","NITR","CORD","CHRG","TALL"] },
    { t: "AIR",    items: ["HAZE","FUME","DAMP","MIAS","LOFT"] },
    { t: "LIFE",   items: ["VINE","GERM","PITH","MITE","BLGT","RIME","FLOC"] },
    { t: "WORKS",  items: ["FILA","PILE","ARC","FERR","VITR","SPAR","FONT","SINK"] }
  ];
  const MODES = ["FALL", "LIFT", "GALE", "TIDE", "ZERO", "CRUSH", "WELL", "SPIN"];
  const AMOUNTS = [1, 4, 16, 48, 96];

  const g = new Uint8Array(COLS * ROWS);          // material
  const life = new Int16Array(COLS * ROWS);       // ticks remaining, for decaying stuff
  const temp = new Int16Array(COLS * ROWS);       // the heat field
  const temp2 = new Int16Array(COLS * ROWS);      // diffusion scratch
  const clone = new Uint8Array(COLS * ROWS);      // what each FONT has learned to copy
  const seen = new Uint8Array(COLS * ROWS);
  temp.fill(AMBIENT); temp2.fill(AMBIENT);

  let alive = true, raf;
  let score = 0, reacts = 0, poured = 0, burns = 0, blasts = 0, sparks = 0;
  let shelfI = 0, pickI = 0, gr = 2, amtI = 2, modeI = 0;
  let aimX = (COLS / 2) | 0, aimY = (ROWS / 3) | 0;
  let painting = false, paintKind = "paint";
  let stamp = 1, frame = 0;
  let fps = 0, fpsFrames = 0, fpsStamp = 0;
  let simMs = 0;
  let heatOn = false;                              // the thermal-camera overlay
  let erasing = false, chipping = false;

  function idx(x, y) { return y * COLS + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function shelf() { return SHELVES[shelfI]; }
  function tool() {
    if (erasing) return "ERASE";
    if (chipping) return "CHIP";
    return shelf().items[Math.min(pickI, shelf().items.length - 1)];
  }
  function toolType() { const t = tool(); return E[t] == null ? 0 : E[t]; }
  function amount() { return AMOUNTS[amtI]; }
  function mode() { return MODES[modeI]; }
  function toolKind() {
    if (erasing) return "erase";
    if (chipping) return "chip";
    return "paint";
  }
  function toolRgb() {
    if (erasing) return [255, 122, 154];
    if (chipping) return [255, 184, 107];
    return ELEM[toolType()].rgb;
  }

  function hud() {
    return tool() + " · " + shelf().t + " · G" + gr + " · ×" + amount() + " · " + mode() +
           (heatOn ? " · THERM" : "");
  }
  function note() { hall.note(hud() + " · 1-6 shelf, QWERTYU pick, H heat view"); }

  function bump(n) { score += n; hall.score(score); }

  // ── heat ────────────────────────────────────────────────────────────────────
  /**
   * Diffuse the temperature field one step.
   *
   * A five-point blend: each cell moves a fraction of the way toward the average of
   * its neighbours. Insulators pass much less, which is what makes a stone wall or a
   * plank actually shield what is behind it rather than merely being labelled as
   * shielding. Empty air also bleeds slowly back toward ambient so a room does not
   * stay at furnace temperature forever after the lava is gone.
   *
   * This is the single most expensive thing in the frame, so it is a flat typed-array
   * loop with no function calls and no allocation.
   */
  function diffuse() {
    const w = COLS, h = ROWS;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const t = temp[i];
        const m = g[i];
        const up    = y > 0     ? temp[i - w] : t;
        const down  = y < h - 1 ? temp[i + w] : t;
        const left  = x > 0     ? temp[i - 1] : t;
        const right = x < w - 1 ? temp[i + 1] : t;
        const avg = (up + down + left + right) >> 2;
        // Insulators move a quarter as fast toward their surroundings.
        let next = INSU[m] ? t + ((avg - t) >> 3) : t + ((avg - t) >> 1);
        const em = EMIT[m];
        if (em) next += em;
        // Air relaxes toward room temperature.
        //
        // This was `(AMBIENT - next) >> 5`, and an arithmetic shift of anything smaller
        // than 32 truncates to zero — so once the room was within 31 degrees of ambient
        // it stopped relaxing entirely and simply stayed there. Measured: after a
        // cryogen spill the box settled at -11 degrees and held it indefinitely. A
        // sign-aware minimum step of one degree costs nothing and actually converges.
        if (m === 0) {
          const d = AMBIENT - next;
          if (d > 0) next += d > 32 ? (d >> 5) : 1;
          else if (d < 0) next -= (-d) > 32 ? ((-d) >> 5) : 1;
        }
        if (next > T_MAX) next = T_MAX;
        else if (next < T_MIN) next = T_MIN;
        temp2[i] = next;
      }
    }
    temp.set(temp2);
  }

  /**
   * Phase and combustion for one cell, decided purely by its own temperature.
   * Returns true if the cell changed identity, so the caller can stop working on it.
   */
  function thermal(i, m) {
    const t = temp[i];
    if (t >= DET_AT[m]) {
      g[i] = 0; life[i] = 0;                      // consume the charge, then go off
      blast((i % COLS) | 0, (i / COLS) | 0, DET_R[m], DET_HEAT[m]);
      return true;
    }
    if (t >= FIRE_AT[m]) {
      const to = FIRE_TO[m];
      g[i] = to; life[i] = LIFE0[to];
      temp[i] = t + FIRE_HEAT[m];
      if (temp[i] > T_MAX) temp[i] = T_MAX;
      burns++; reacts++; bump(3);
      return true;
    }
    if (t >= MELT_AT[m]) {
      const to = MELT_TO[m];
      g[i] = to; life[i] = LIFE0[to];
      reacts++; bump(2);
      return true;
    }
    if (t <= FRZ_AT[m]) {
      const to = FRZ_TO[m];
      g[i] = to; life[i] = LIFE0[to];
      reacts++; bump(2);
      return true;
    }
    return false;
  }

  // ── explosions ──────────────────────────────────────────────────────────────
  /**
   * Detonate at a point: clear a disc, throw heat and fire outward, and leave smoke.
   *
   * Deliberately not a "delete a circle" — the ring of debris and the temperature
   * spike are what make a blast chain into whatever is next to it, which is the entire
   * reason to have explosives in a box like this.
   */
  function blast(cx, cy, r, heat) {
    blasts++;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= ROWS) continue;
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= COLS) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const i = idx(x, y);
        if (g[i] === E.BASE) continue;              // bedrock is the one thing that holds
        const edge = d2 / r2;
        temp[i] = Math.min(T_MAX, temp[i] + (heat * (1 - edge)) | 0);
        // Leave other detonators standing. Clearing them here destroyed the very cells
        // the blast was meant to trigger, so a row of charges only ever fired once —
        // they are heated and left to go off on their own next tick instead.
        if (DET_AT[g[i]] !== 32767) continue;
        if (edge < 0.55) {
          g[i] = Math.random() < 0.5 ? E.CIND : E.EMPTY;
          life[i] = g[i] ? LIFE0[E.CIND] : 0;
        } else if (Math.random() < 0.5) {
          g[i] = E.FUME; life[i] = LIFE0[E.FUME];
        }
      }
    }
    bump(40);
  }

  // ── charge ──────────────────────────────────────────────────────────────────
  /**
   * Spread an ARC into adjacent conductors.
   *
   * Charge is modelled as a short-lived material rather than as a flag on the wire,
   * which means it is visible, it travels at a speed you can watch, and it obeys the
   * same decay machinery everything else does. A conductor that has just carried an
   * arc goes on cooldown via `life` on the arc itself, so a loop of wire pulses
   * instead of latching solid.
   */
  function conduct(x, y, i) {
    const n4x = [0, 0, 1, -1], n4y = [1, -1, 0, 0];
    for (let k = 0; k < 4; k++) {
      const nx = x + n4x[k], ny = y + n4y[k];
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny), u = g[j];
      if (COND[u] && Math.random() < 0.7) {
        // The arc rides on top of the conductor: the wire stays, the charge moves.
        const above = ny > 0 ? idx(nx, ny - 1) : -1;
        if (above >= 0 && g[above] === 0) { g[above] = E.ARC; life[above] = LIFE0[E.ARC]; sparks++; }
      } else if (u === E.CHRG) {
        blast(nx, ny, 13, 900);
      } else if (u === E.DAMP || u === E.NITR || u === E.CORD || u === E.OIL) {
        temp[j] = Math.max(temp[j], FIRE_AT[u] + 10);   // arcs light what they can
      }
    }
  }

  // ── contact reactions ───────────────────────────────────────────────────────
  const N4X = [0, 0, 1, -1], N4Y = [1, -1, 0, 0];

  /**
   * Run the reaction table for one cell against its four neighbours, plus the handful
   * of behaviours that are stateful enough to need code rather than a table row.
   */
  function touch(x, y, i) {
    const A = g[i];
    if (!A) return;

    // decay
    const l0 = LIFE0[A];
    if (l0) {
      if (life[i] > 0) life[i]--;
      if (life[i] <= 0) {
        g[i] = DECAY[A];
        life[i] = LIFE0[DECAY[A]];
        return;
      }
    }

    if (A === E.ARC) { conduct(x, y, i); return; }

    // A battery pushes a charge upward on a slow pulse.
    if (A === E.PILE && (frame % 14) === 0) {
      const j = y > 0 ? idx(x, y - 1) : -1;
      if (j >= 0 && g[j] === 0) { g[j] = E.ARC; life[j] = LIFE0[E.ARC]; sparks++; }
    }

    const rows = REACT_AT[A];
    for (let k = 0; k < 4; k++) {
      const nx = x + N4X[k], ny = y + N4Y[k];
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny), B = g[j];

      // A source copies the first real material it meets, then produces it forever.
      if (A === E.FONT) {
        if (!clone[i] && B && B !== E.FONT) clone[i] = B;
        else if (clone[i] && B === 0 && Math.random() < 0.22) {
          g[j] = clone[i]; life[j] = LIFE0[clone[i]];
          poured++; bump(1);
        }
        continue;
      }
      // A drain removes whatever reaches it.
      if (A === E.SINK) {
        if (B && B !== E.SINK && B !== E.BASE) { g[j] = 0; life[j] = 0; bump(1); }
        continue;
      }
      // A charge touching an explosive is the whole point of explosives.
      if (A === E.CHRG && (B === E.CIND || B === E.MAGM || B === E.ARC || B === E.EMBR)) {
        blast(x, y, 14, 950);
        return;
      }
      // Burning things heat what is next to them, which is how fire spreads at all.
      if (A === E.CIND || A === E.EMBR || A === E.MAGM) {
        const add = A === E.MAGM ? 24 : 30;
        if (temp[j] < T_MAX) temp[j] += add;
      }

      if (!rows) continue;
      for (let q = 0; q < rows.length; q++) {
        const r = rows[q];
        if (r[1] !== B) continue;
        if (r[4] <= 0 || Math.random() >= r[4]) continue;
        if (r[2] >= 0) { g[i] = r[2]; life[i] = LIFE0[r[2]]; }
        if (r[3] >= 0) { g[j] = r[3]; life[j] = LIFE0[r[3]]; }
        reacts++; bump(4);
        if (r[2] >= 0 && g[i] !== A) return;   // this cell is something else now
        break;
      }
    }
  }

  // ── movement ────────────────────────────────────────────────────────────────
  /**
   * Try to move the cell at (x,y) into (nx,ny).
   *
   * Displacement is decided by density alone. That single comparison replaces what
   * used to be a hand-written case per pair — sand sinks through water, oil floats on
   * it, and quicksilver drops through both because 34 > 10 > 8, not because anybody
   * wrote those three rules down.
   */
  function tryMove(x, y, nx, ny, stampNow) {
    if (!inb(nx, ny)) return false;
    const a = idx(x, y), b = idx(nx, ny);
    if (seen[b] === stampNow) return false;
    const A = g[a], B = g[b];
    if (B === A) return false;

    if (B === 0) {
      g[b] = A; life[b] = life[a]; temp[b] = temp[a];
      g[a] = 0; life[a] = 0;
      seen[b] = stampNow;
      return true;
    }
    const kb = KIND[B];
    if (kb === SOLID || kb === WALL) return false;
    // Only sink into something lighter, and only when actually heading that way.
    if (DENS[A] <= DENS[B]) return false;
    if (ny < y && KIND[A] !== GAS) return false;

    const tb = temp[b];
    g[b] = A; life[b] = life[a]; temp[b] = temp[a];
    g[a] = B; life[a] = 0; temp[a] = tb;
    seen[b] = stampNow;
    return true;
  }

  function pref(x, y, m, t) {
    const cx = COLS / 2, cy = ROWS / 2;
    if (m === "WELL") {
      const dx = cx - x, dy = cy - y;
      if (Math.abs(dx) > Math.abs(dy)) return { dx: dx > 0 ? 1 : -1, dy: 0 };
      return { dx: 0, dy: dy > 0 ? 1 : -1 };
    }
    if (m === "SPIN") {
      const dx = x - cx, dy = y - cy;
      const tx = -dy, ty = dx;
      if (Math.abs(tx) > Math.abs(ty)) return { dx: tx > 0 ? 1 : -1, dy: 0 };
      return { dx: 0, dy: ty > 0 ? 1 : -1 };
    }
    if (m === "LIFT") return { dx: 0, dy: -1 };
    if (m === "GALE") return { dx: 1, dy: 1 };
    if (m === "TIDE") return { dx: Math.sin(t / 640) >= 0 ? 1 : -1, dy: 1 };
    if (m === "ZERO") return { dx: 0, dy: Math.random() < 0.28 ? 1 : 0 };
    return { dx: 0, dy: 1 };
  }

  function stepCell(x, y, m, t, stampNow) {
    const i = idx(x, y);
    const A = g[i];
    if (!A) return;
    if (thermal(i, A)) return;

    const k = KIND[A];

    // The mite walks.
    //
    // Everything else in the cabinet is a material that reacts; this is the one thing
    // with intent, so it gets its own short movement rule rather than a kind. It falls
    // when unsupported, otherwise picks a direction and tunnels — the eating is left to
    // the reaction table, so what it can chew through is data like everything else.
    if (A === E.MITE) {
      if ((frame + x + y) % 3 === 0) {
        const below = y < ROWS - 1 ? idx(x, y + 1) : -1;
        if (below >= 0 && g[below] === 0) {
          tryMove(x, y, x, y + 1, stampNow);
        } else {
          const dirs = [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]];
          const d = dirs[(Math.random() * dirs.length) | 0];
          tryMove(x, y, x + d[0], y + d[1], stampNow);
        }
      }
      touch(x, y, i);
      return;
    }

    if (k === SOLID || k === WALL) { touch(x, y, i); return; }

    const p = pref(x, y, m, t);
    let dx = p.dx, dy = p.dy;
    // Gases rise against whatever the field is doing, because they are gases.
    if (k === GAS) {
      if (m === "FALL") { dx = 0; dy = -1; }
      else if (m === "LIFT") { dx = 0; dy = 1; }
      else dy = -dy;
    }
    const side = Math.random() < 0.5 ? -1 : 1;

    if (k === POWDER) {
      if (tryMove(x, y, x + dx, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx + side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx - side, y + dy, stampNow)) return;
    } else if (k === LIQUID) {
      if (A === E.MAGM && (stampNow & 1) === 0) { touch(x, y, i); return; }
      if (tryMove(x, y, x + dx, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx + side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx - side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + side, y, stampNow)) return;
      if (tryMove(x, y, x - side, y, stampNow)) return;
    } else if (k === GAS) {
      if (tryMove(x, y, x + dx, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx + side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + side, y, stampNow)) return;
      if (tryMove(x, y, x - side, y, stampNow)) return;
    }
    touch(x, y, i);
  }

  function sim(t) {
    const m = mode();
    const passes = m === "CRUSH" ? 2 : 1;
    frame++;
    // Heat is slower than motion and does not need a step per pass; every other frame
    // is indistinguishable at 60fps and halves the most expensive loop in the cabinet.
    if ((frame & 1) === 0) diffuse();
    for (let p = 0; p < passes; p++) {
      stamp = (stamp + 1) & 255 || 1;
      const stampNow = stamp;
      if (m === "LIFT") {
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) stepCell(x, y, m, t, stampNow);
      } else {
        for (let y = ROWS - 2; y >= 0; y--) {
          // Alternate scan direction so material does not drift sideways over time.
          if ((y & 1) === (frame & 1)) { for (let x = 0; x < COLS; x++) stepCell(x, y, m, t, stampNow); }
          else { for (let x = COLS - 1; x >= 0; x--) stepCell(x, y, m, t, stampNow); }
        }
      }
    }
  }

  // ── painting ────────────────────────────────────────────────────────────────
  function chipCell(i, y) {
    if (y === ROWS - 1 && g[i] === E.BASE) return false;
    const t = g[i];
    if (!t) return false;
    // Chipping breaks a material down one step toward rubble rather than deleting it.
    const DOWN = {
      [E.SLAB]: E.GRIT, [E.BASE]: E.SLAB, [E.PITH]: E.SOOT, [E.RIME]: E.BRIN,
      [E.MAGM]: E.SLAB, [E.VITR]: E.DUNE, [E.SPAR]: E.GRIT, [E.FERR]: E.GRIT,
      [E.FILA]: E.GRIT, [E.PILE]: E.GRIT, [E.CARB]: E.SOOT, [E.TALL]: E.SOOT,
      [E.CHRG]: E.NITR, [E.CORD]: E.SOOT, [E.FONT]: 0, [E.SINK]: 0, [E.BLGT]: 0
    };
    const to = DOWN[t];
    if (to === undefined) { g[i] = 0; life[i] = 0; }
    else { g[i] = to; life[i] = LIFE0[to]; }
    reacts++; bump(2);
    return true;
  }

  function writeCell(x, y, kind, type) {
    if (!inb(x, y)) return;
    const i = idx(x, y);
    if (y === ROWS - 1 && g[i] === E.BASE) return;      // never breach the floor
    if (kind === "erase") {
      if (!g[i]) return;
      g[i] = 0; life[i] = 0; temp[i] = AMBIENT;
      return;
    }
    if (kind === "chip") { chipCell(i, y); return; }
    if (!type) return;
    g[i] = type;
    life[i] = LIFE0[type];
    clone[i] = 0;
    // Materials arrive at a sensible temperature rather than at room temperature, so
    // dropping lava does not need a frame of diffusion before it acts like lava.
    if (type === E.MAGM) temp[i] = 1150;
    else if (type === E.CIND || type === E.EMBR) temp[i] = 620;
    else if (type === E.CRYO) temp[i] = -190;
    else if (type === E.RIME || type === E.FLOC) temp[i] = -8;
    else temp[i] = AMBIENT;
    poured++; score += 1;
  }

  function pourAt(cx, cy, kind) {
    kind = kind || toolKind();
    const type = toolType();
    const r = Math.max(1, gr);
    const rad = r + 1;
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++)
        if (dx * dx + dy * dy <= rad * rad) writeCell(cx + dx, cy + dy, kind, type);
    const n = amount();
    for (let k = 0; k < n; k++) {
      const ox = ((Math.random() * 2 - 1) * r * 2) | 0;
      const oy = ((Math.random() * 2 - 1) * r * 2) | 0;
      for (let dy = 0; dy < r; dy++)
        for (let dx = 0; dx < r; dx++)
          writeCell(cx + ox + dx, cy + oy + dy, kind, type);
    }
    hall.score(score);
  }

  // ── render ──────────────────────────────────────────────────────────────────
  /** Thermal palette for the overlay: cold blue through room grey to white hot. */
  function heatRgb(t) {
    if (t < AMBIENT) {
      const f = Math.max(0, (t - T_MIN) / (AMBIENT - T_MIN));
      return [(30 + f * 40) | 0, (60 + f * 70) | 0, (150 + f * 60) | 0];
    }
    const f = Math.min(1, (t - AMBIENT) / 900);
    if (f < 0.5) { const u = f / 0.5; return [(40 + u * 200) | 0, (44 + u * 60) | 0, (52 + u * 10) | 0]; }
    const u = (f - 0.5) / 0.5;
    return [255, (104 + u * 150) | 0, (62 + u * 180) | 0];
  }

  function paint() {
    const pw = COLS * CELL;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = idx(x, y);
        const m = g[i];
        let c;
        if (heatOn) c = heatRgb(temp[i]);
        else {
          c = ELEM[m].rgb;
          // Hot material glows toward its own fire colour — you can see a bar of iron
          // coming up to heat before it melts, which is most of the pleasure of having
          // a temperature field at all.
          const t = temp[i];
          if (m && t > 300) {
            const f = Math.min(1, (t - 300) / 800);
            c = [Math.min(255, (c[0] + f * 210)) | 0,
                 Math.min(255, (c[1] + f * 90)) | 0,
                 Math.min(255, (c[2] + f * 30)) | 0];
          }
        }
        const jitter = ((x * 13 + y * 7) & 3);
        const r = Math.min(255, c[0] + jitter), gv = Math.min(255, c[1] + jitter), b = Math.min(255, c[2]);
        const x0 = x * CELL, y0 = y * CELL;
        for (let py = 0; py < CELL; py++) {
          let o = ((y0 + py) * pw + x0) * 4;
          for (let px = 0; px < CELL; px++) {
            pix[o] = r; pix[o + 1] = gv; pix[o + 2] = b; pix[o + 3] = 255;
            o += 4;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    drawAim();
    drawStats();
    drawPalette();
  }

  function rgbCss(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (a == null ? 1 : a) + ")";
  }

  function drawAim() {
    const r = Math.max(1, gr) + 1;
    const c = toolRgb();
    ctx.save();
    ctx.strokeStyle = rgbCss(c, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(aimX * CELL + CELL / 2, aimY * CELL + CELL / 2, r * CELL, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawStats() {
    const w = 150, h = 74, x = COLS * CELL - w - 8, y = 8;
    ctx.fillStyle = "rgba(7,10,14,.84)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#243040";
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = "600 10px ui-monospace, Menlo, monospace";
    const rows = [
      ["LIVE", filledCount().toLocaleString()],
      ["REACT", reacts.toLocaleString()],
      ["BURN/BLAST", burns.toLocaleString() + " / " + blasts],
      ["HEAT @AIM", temp[idx(aimX, aimY)] + "°"],
      ["FPS", fps + "  " + simMs.toFixed(1) + "ms"]
    ];
    rows.forEach(function (r, k) {
      ctx.fillStyle = "#7d8796";
      ctx.fillText(r[0], x + 9, y + 15 + k * 12);
      ctx.fillStyle = "#cfd6df";
      ctx.textAlign = "right";
      ctx.fillText(r[1], x + w - 9, y + 15 + k * 12);
      ctx.textAlign = "left";
    });
  }

  /**
   * The palette.
   *
   * Forty materials will not fit in a cycle-through-with-one-key list, so they sit on
   * six labelled shelves with the current shelf spelled out in full. The swatch is the
   * material's actual render colour, which makes the palette double as a legend.
   */
  function drawPalette() {
    const top = ROWS * CELL;
    const w = COLS * CELL;
    ctx.fillStyle = "#070a0e";
    ctx.fillRect(0, top, w, UI);
    ctx.strokeStyle = "#1b2430";
    ctx.beginPath(); ctx.moveTo(0, top + 0.5); ctx.lineTo(w, top + 0.5); ctx.stroke();

    ctx.font = "600 10px ui-monospace, Menlo, monospace";

    // shelf tabs
    let sx = 10;
    SHELVES.forEach(function (s, k) {
      const on = k === shelfI;
      const tw = ctx.measureText(s.t).width + 18;
      ctx.fillStyle = on ? "#132030" : "#0b1017";
      ctx.fillRect(sx, top + 9, tw, 18);
      ctx.strokeStyle = on ? "#6ee7ff" : "#1b2430";
      ctx.strokeRect(sx + 0.5, top + 9.5, tw - 1, 17);
      ctx.fillStyle = on ? "#6ee7ff" : "#5c6675";
      ctx.fillText((k + 1) + " " + s.t, sx + 9, top + 22);
      sx += tw + 6;
    });

    // the current shelf's materials
    const keys = "QWERTYUI";
    const items = shelf().items;
    let px = 10;
    const py = top + 38;
    items.forEach(function (name, k) {
      const on = !erasing && !chipping && k === Math.min(pickI, items.length - 1);
      const c = ELEM[E[name]].rgb;
      const bw = 62;
      ctx.fillStyle = on ? "#16202c" : "#0a0f15";
      ctx.fillRect(px, py, bw, 30);
      ctx.strokeStyle = on ? rgbCss(c) : "#1b2430";
      ctx.strokeRect(px + 0.5, py + 0.5, bw - 1, 29);
      ctx.fillStyle = rgbCss(c);
      ctx.fillRect(px + 6, py + 8, 12, 12);
      ctx.fillStyle = on ? "#e6edf5" : "#8b95a4";
      ctx.fillText(name, px + 23, py + 14);
      ctx.fillStyle = "#4d5765";
      ctx.fillText(keys[k] || "", px + 23, py + 25);
      px += bw + 5;
    });

    // tool row
    ctx.fillStyle = "#5c6675";
    const line2 = "MODE " + mode() + "  ([ ]) · SIZE " + gr + " (wheel) · FLOW ×" + amount() +
                  " (shift-wheel) · " + (erasing ? "ERASE" : chipping ? "CHIP" : tool());
    ctx.fillText(line2, 10, top + 88);
    ctx.fillStyle = "#3f4854";
    ctx.fillText("right-drag ERASE · shift-drag CHIP · H thermal view · R reset · F chip at aim · space pour", 10, top + 104);
    ctx.fillStyle = "#2f3742";
    ctx.fillText("heat is a real field: things melt, boil, ignite and freeze because of it. PILE+FILA carry charge. ARC sets off CHRG.", 10, top + 119);
  }

  // ── input ───────────────────────────────────────────────────────────────────
  function setShelf(k) {
    shelfI = Math.max(0, Math.min(SHELVES.length - 1, k));
    pickI = Math.min(pickI, SHELVES[shelfI].items.length - 1);
    erasing = chipping = false;
    note();
  }
  function setPick(k) {
    if (k < 0 || k >= shelf().items.length) return;
    pickI = k;
    erasing = chipping = false;
    note();
  }

  function reset() {
    g.fill(0); life.fill(0); clone.fill(0); temp.fill(AMBIENT); temp2.fill(AMBIENT);
    seed();
    note();
  }

  /**
   * The agent bus. Every verb the Hall can send maps to something a hand could do, so
   * an agent and a human are playing the same cabinet rather than two different ones.
   */
  function act(cmd) {
    if (cmd === "left") aimX = Math.max(0, aimX - 4);
    else if (cmd === "right") aimX = Math.min(COLS - 1, aimX + 4);
    else if (cmd === "up") aimY = Math.max(0, aimY - 4);
    else if (cmd === "down") aimY = Math.min(ROWS - 1, aimY + 4);
    else if (cmd === "fire") pourAt(aimX, aimY);
    else if (cmd === "cw") setPick((pickI + 1) % shelf().items.length);
    else if (cmd === "ccw") setPick((pickI - 1 + shelf().items.length) % shelf().items.length);
    else if (cmd === "hold") setShelf((shelfI + 1) % SHELVES.length);
    else if (cmd === "jump") { modeI = (modeI + 1) % MODES.length; note(); }
    else if (cmd === "soft") { gr = Math.max(1, gr - 1); note(); }
    else if (cmd === "hard") { gr = Math.min(8, gr + 1); note(); }
    else if (cmd === "tuck") { amtI = (amtI + 1) % AMOUNTS.length; note(); }
    else if (cmd === "chip") pourAt(aimX, aimY, "chip");
    else if (cmd === "erase") pourAt(aimX, aimY, "erase");
    else if (cmd === "therm") { heatOn = !heatOn; note(); }
    else if (cmd === "reset") reset();
    else return false;
    return true;
  }
  function actBurst(list) { (list || []).forEach(act); }

  function gridFromEvent(ev) {
    const r = canvas.getBoundingClientRect();
    const bx = (ev.clientX - r.left) * (canvas.width / r.width);
    const by = (ev.clientY - r.top) * (canvas.height / r.height);
    if (by >= ROWS * CELL) { paletteClick(bx, by); return null; }
    return {
      x: Math.max(0, Math.min(COLS - 1, (bx / CELL) | 0)),
      y: Math.max(0, Math.min(ROWS - 1, (by / CELL) | 0))
    };
  }

  /** The palette is clickable, because a forty-material shelf that is keyboard-only is
   *  a shelf most people will never see past the first row of. */
  function paletteClick(bx, by) {
    const top = ROWS * CELL;
    ctx.font = "600 10px ui-monospace, Menlo, monospace";
    if (by >= top + 9 && by <= top + 27) {
      let sx = 10;
      for (let k = 0; k < SHELVES.length; k++) {
        const tw = ctx.measureText(SHELVES[k].t).width + 18;
        if (bx >= sx && bx <= sx + tw) { setShelf(k); return; }
        sx += tw + 6;
      }
      return;
    }
    if (by >= top + 38 && by <= top + 68) {
      const k = Math.floor((bx - 10) / 67);
      if (k >= 0 && k < shelf().items.length) setPick(k);
    }
  }

  function onDown(ev) {
    const p = gridFromEvent(ev);
    if (!p) return;
    painting = true;
    aimX = p.x; aimY = p.y;
    if (ev.button === 2) paintKind = "erase";
    else if (ev.shiftKey) paintKind = "chip";
    else paintKind = toolKind();
    pourAt(aimX, aimY, paintKind);
    ev.preventDefault();
  }
  function onMove(ev) {
    const r = canvas.getBoundingClientRect();
    const by = (ev.clientY - r.top) * (canvas.height / r.height);
    if (by >= ROWS * CELL) return;
    const bx = (ev.clientX - r.left) * (canvas.width / r.width);
    aimX = Math.max(0, Math.min(COLS - 1, (bx / CELL) | 0));
    aimY = Math.max(0, Math.min(ROWS - 1, (by / CELL) | 0));
    if (painting) pourAt(aimX, aimY, paintKind);
  }
  function onUp() { painting = false; }
  function onContext(ev) { ev.preventDefault(); }
  function onWheel(ev) {
    ev.preventDefault();
    if (ev.shiftKey) amtI = ev.deltaY > 0 ? Math.min(AMOUNTS.length - 1, amtI + 1) : Math.max(0, amtI - 1);
    else gr = ev.deltaY > 0 ? Math.min(8, gr + 1) : Math.max(1, gr - 1);
    note();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContext);
  canvas.style.touchAction = "none";
  canvas.style.cursor = "crosshair";

  const PICK_KEYS = "qwertyui";
  hall.onKey = function (e) {
    const k = e.key;
    if (k >= "1" && k <= "6") { setShelf(+k - 1); return; }
    const pi = PICK_KEYS.indexOf(String(k).toLowerCase());
    if (pi >= 0) { setPick(pi); return; }
    if (k === "h" || k === "H") { act("therm"); return; }
    if (k === "r" || k === "R") { act("reset"); return; }
    if (k === "f" || k === "F") { act("chip"); return; }
    if (k === "d" || k === "D") { erasing = !erasing; chipping = false; note(); return; }
    if (k === "[" || k === "-") { act("soft"); return; }
    if (k === "]" || k === "=" || k === "+") { act("hard"); return; }
    const map = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      " ": "fire", x: "cw", X: "cw", z: "ccw", Z: "ccw",
      c: "hold", C: "hold", e: "jump", E: "jump", a: "tuck", A: "tuck"
    };
    if (map[k]) act(map[k]);
  };

  function filledCount() {
    let n = 0;
    for (let i = 0; i < g.length; i++) if (g[i]) n++;
    return n;
  }

  /** Cheap activity read for the score engine — how much of the lab is hot or burning. */
  function activity() {
    let hot = 0, fire = 0;
    for (let i = 0; i < g.length; i += 7) {          // sampled, not exhaustive
      const m = g[i];
      if (!m) continue;
      if (temp[i] > 260) hot++;
      if (m === E.CIND || m === E.MAGM || m === E.EMBR) fire++;
    }
    return { hot: hot * 7, fire: fire * 7 };
  }

  function seed() {
    for (let x = 0; x < COLS; x++) g[idx(x, ROWS - 1)] = E.BASE;
    for (let x = (COLS / 2 | 0) - 30; x < (COLS / 2 | 0) + 30; x++)
      for (let y = ROWS - 16; y < ROWS - 1; y++)
        if (Math.random() < 0.74) g[idx(x, y)] = E.DUNE;
    // a shelf of stone to build against, and a puddle, so the box is never empty
    for (let x = 22; x < 92; x++) g[idx(x, ROWS - 40)] = E.SLAB;
    for (let x = 26; x < 88; x++)
      for (let y = ROWS - 44; y < ROWS - 40; y++) g[idx(x, y)] = E.BRIN;
  }

  function tick(t) {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    try {
      if (t) {
        fpsFrames++;
        if (!fpsStamp) fpsStamp = t;
        const span = t - fpsStamp;
        if (span >= 400) { fps = Math.round(fpsFrames * 1000 / span); fpsFrames = 0; fpsStamp = t; }
      }
      const t0 = performance.now();
      sim(t);
      simMs = simMs * 0.9 + (performance.now() - t0) * 0.1;
      if (hall.keys && hall.keys[" "]) pourAt(aimX, aimY);
      paint();
    } catch (err) { console.error("GRAIN", err); }
  }

  seed();
  hall.score(0);
  note();
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      hall.onKey = null;
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
    },
    act,
    actBurst,
    state() {
      const a = activity();
      return {
        cab: "grain",
        alive,
        score,
        elem: tool(),
        shelf: shelf().t,
        elements: N_ELEM - 1,
        grain: gr,
        amount: amount(),
        mode: mode(),
        therm: heatOn,
        aim: { x: aimX, y: aimY },
        aimTemp: temp[idx(aimX, aimY)],
        filled: filledCount(),
        reacts, poured, burns, blasts, sparks,
        hot: a.hot, fire: a.fire,
        fps,
        hud: hud(),
        legal: ["left","right","up","down","cw","ccw","soft","hard","fire","hold","jump","tuck","chip","erase","therm","reset"]
      };
    }
  };
} };
