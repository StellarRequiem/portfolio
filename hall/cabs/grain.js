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
  const COLS = 320, ROWS = 200, CELL = 2, UI = 168;
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
  /**
   * THE PERIODIC TABLE.
   *
   * All 118, driven by their real physical properties rather than by 118 hand-written
   * behaviours. This works because the cabinet's four systems already are the four
   * properties that matter:
   *
   *   the heat field   is melting point and boiling point
   *   density          is density
   *   charge           is electrical conductivity
   *   detonation       is what an alkali metal does in water
   *
   * So these are not reskins. This is the engine finally being handed real numbers.
   *
   * ── ON THE ACCURACY OF THIS DATA ─────────────────────────────────────────────
   * Melting points, boiling points and densities here are APPROXIMATE VALUES FROM
   * MEMORY. They have not been checked against a reference dataset. They are close
   * enough that the sandbox behaves right — mercury and bromine are liquid at room
   * temperature, gallium melts in your hand at about 30 degrees, tungsten outlasts
   * everything in a fire — but they should not be quoted as physical constants, and
   * anyone wanting real numbers should look them up.
   *
   * Everything from rutherfordium (104) up is worse than approximate: for most of the
   * superheavy elements real science has only predictions, and a few have never existed
   * in quantities large enough to melt. Those rows are plausible fiction and are marked
   * as such by the `predicted` flag.
   *
   * Packed as a string because 118 object literals is a lot of file for what is a table.
   * Fields: Z | symbol | name | melting C | boiling C | density g/cm3 | category
   */
  const PT_CAT = ["ALKALI","ALKALINE","TRANSITION","POST-TRANSITION","METALLOID",
                  "NONMETAL","HALOGEN","NOBLE","LANTHANIDE","ACTINIDE"];
  /** Category colours, in the cabinet's palette rather than a textbook's. */
  const PT_RGB = [
    [232,108,84],   // alkali        — violent
    [226,158,74],   // alkaline
    [150,166,186],  // transition    — the metals
    [136,158,150],  // post-transition
    [128,186,168],  // metalloid
    [122,178,214],  // nonmetal
    [186,206,96],   // halogen
    [176,140,214],  // noble
    [204,142,176],  // lanthanide
    [176,110,120]   // actinide
  ];

  const PT_RAW =
    "1 H Hydrogen -259 -253 0.00009 5;2 He Helium -272 -269 0.00018 7;" +
    "3 Li Lithium 180 1342 0.53 0;4 Be Beryllium 1287 2469 1.85 1;" +
    "5 B Boron 2077 4000 2.34 4;6 C Carbon 3550 4027 2.27 5;" +
    "7 N Nitrogen -210 -196 0.00125 5;8 O Oxygen -218 -183 0.00143 5;" +
    "9 F Fluorine -220 -188 0.0017 6;10 Ne Neon -249 -246 0.0009 7;" +
    "11 Na Sodium 98 883 0.97 0;12 Mg Magnesium 650 1090 1.74 1;" +
    "13 Al Aluminium 660 2519 2.70 3;14 Si Silicon 1414 3265 2.33 4;" +
    "15 P Phosphorus 44 280 1.82 5;16 S Sulfur 115 445 2.07 5;" +
    "17 Cl Chlorine -102 -34 0.0032 6;18 Ar Argon -189 -186 0.0018 7;" +
    "19 K Potassium 63 759 0.86 0;20 Ca Calcium 842 1484 1.55 1;" +
    "21 Sc Scandium 1541 2836 2.99 2;22 Ti Titanium 1668 3287 4.51 2;" +
    "23 V Vanadium 1910 3407 6.11 2;24 Cr Chromium 1907 2671 7.15 2;" +
    "25 Mn Manganese 1246 2061 7.44 2;26 Fe Iron 1538 2861 7.87 2;" +
    "27 Co Cobalt 1495 2927 8.86 2;28 Ni Nickel 1455 2913 8.91 2;" +
    "29 Cu Copper 1085 2562 8.96 2;30 Zn Zinc 420 907 7.13 2;" +
    "31 Ga Gallium 30 2204 5.91 3;32 Ge Germanium 938 2833 5.32 4;" +
    "33 As Arsenic 817 614 5.78 4;34 Se Selenium 221 685 4.81 5;" +
    "35 Br Bromine -7 59 3.12 6;36 Kr Krypton -157 -153 0.0037 7;" +
    "37 Rb Rubidium 39 688 1.53 0;38 Sr Strontium 777 1382 2.64 1;" +
    "39 Y Yttrium 1526 3345 4.47 2;40 Zr Zirconium 1855 4409 6.51 2;" +
    "41 Nb Niobium 2477 4744 8.57 2;42 Mo Molybdenum 2623 4639 10.2 2;" +
    "43 Tc Technetium 2157 4265 11.0 2;44 Ru Ruthenium 2334 4150 12.4 2;" +
    "45 Rh Rhodium 1964 3695 12.4 2;46 Pd Palladium 1555 2963 12.0 2;" +
    "47 Ag Silver 962 2162 10.5 2;48 Cd Cadmium 321 767 8.69 2;" +
    "49 In Indium 157 2072 7.31 3;50 Sn Tin 232 2602 7.29 3;" +
    "51 Sb Antimony 631 1587 6.68 4;52 Te Tellurium 450 988 6.24 4;" +
    "53 I Iodine 114 184 4.93 6;54 Xe Xenon -112 -108 0.0059 7;" +
    "55 Cs Caesium 28 671 1.93 0;56 Ba Barium 727 1897 3.51 1;" +
    "57 La Lanthanum 920 3464 6.15 8;58 Ce Cerium 795 3443 6.77 8;" +
    "59 Pr Praseodymium 935 3520 6.77 8;60 Nd Neodymium 1024 3074 7.01 8;" +
    "61 Pm Promethium 1042 3000 7.26 8;62 Sm Samarium 1072 1794 7.52 8;" +
    "63 Eu Europium 826 1529 5.24 8;64 Gd Gadolinium 1312 3273 7.90 8;" +
    "65 Tb Terbium 1356 3230 8.23 8;66 Dy Dysprosium 1407 2567 8.55 8;" +
    "67 Ho Holmium 1461 2720 8.80 8;68 Er Erbium 1529 2868 9.07 8;" +
    "69 Tm Thulium 1545 1950 9.32 8;70 Yb Ytterbium 824 1196 6.90 8;" +
    "71 Lu Lutetium 1652 3402 9.84 8;72 Hf Hafnium 2233 4603 13.3 2;" +
    "73 Ta Tantalum 3017 5458 16.4 2;74 W Tungsten 3422 5555 19.3 2;" +
    "75 Re Rhenium 3186 5596 20.8 2;76 Os Osmium 3033 5012 22.59 2;" +
    "77 Ir Iridium 2466 4428 22.56 2;78 Pt Platinum 1768 3825 21.45 2;" +
    "79 Au Gold 1064 2856 19.32 2;80 Hg Mercury -39 357 13.53 2;" +
    "81 Tl Thallium 304 1473 11.85 3;82 Pb Lead 327 1749 11.34 3;" +
    "83 Bi Bismuth 271 1564 9.78 3;84 Po Polonium 254 962 9.20 3;" +
    "85 At Astatine 302 337 7.0 6;86 Rn Radon -71 -62 0.0097 7;" +
    "87 Fr Francium 27 677 1.87 0;88 Ra Radium 700 1737 5.50 1;" +
    "89 Ac Actinium 1050 3200 10.07 9;90 Th Thorium 1750 4788 11.72 9;" +
    "91 Pa Protactinium 1568 4027 15.37 9;92 U Uranium 1135 4131 18.95 9;" +
    "93 Np Neptunium 644 3902 20.45 9;94 Pu Plutonium 640 3228 19.82 9;" +
    "95 Am Americium 1176 2011 13.69 9;96 Cm Curium 1345 3110 13.51 9;" +
    "97 Bk Berkelium 986 2627 14.79 9;98 Cf Californium 900 1470 15.10 9;" +
    "99 Es Einsteinium 860 996 8.84 9;100 Fm Fermium 1527 2500 9.70 9;" +
    "101 Md Mendelevium 827 2500 10.30 9;102 No Nobelium 827 2500 9.90 9;" +
    "103 Lr Lawrencium 1627 2600 15.60 9;104 Rf Rutherfordium 2100 5500 23.20 2;" +
    "105 Db Dubnium 2700 5800 29.30 2;106 Sg Seaborgium 2900 6000 35.00 2;" +
    "107 Bh Bohrium 2800 5900 37.10 2;108 Hs Hassium 2700 5800 40.70 2;" +
    "109 Mt Meitnerium 2600 5600 37.40 2;110 Ds Darmstadtium 2500 5400 34.80 2;" +
    "111 Rg Roentgenium 2400 5200 28.70 2;112 Cn Copernicium 10 67 23.70 2;" +
    "113 Nh Nihonium 430 1130 16.00 3;114 Fl Flerovium 70 150 14.00 3;" +
    "115 Mc Moscovium 400 1100 13.50 3;116 Lv Livermorium 340 760 12.90 3;" +
    "117 Ts Tennessine 350 550 7.20 6;118 Og Oganesson 50 80 5.00 7";

  /** Where each element sits on the printed table, so the picker can BE the table. */
  const PT_POS = {};
  (function () {
    const rows = [
      [1, 1], [2, 18],
      [3, 1], [4, 2], [5, 13], [6, 14], [7, 15], [8, 16], [9, 17], [10, 18],
      [11, 1], [12, 2], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18]
    ];
    rows.forEach(function (r, i) { PT_POS[i + 1] = { r: i < 2 ? 1 : (i < 10 ? 2 : 3), c: r[1] }; });
    // periods 4 and 5 fill straight across
    for (let z = 19; z <= 36; z++) PT_POS[z] = { r: 4, c: z - 18 };
    for (let z = 37; z <= 54; z++) PT_POS[z] = { r: 5, c: z - 36 };
    // period 6: La-Lu drop to their own strip
    PT_POS[55] = { r: 6, c: 1 }; PT_POS[56] = { r: 6, c: 2 };
    for (let z = 57; z <= 71; z++) PT_POS[z] = { r: 8, c: z - 53 };   // lanthanide strip
    for (let z = 72; z <= 86; z++) PT_POS[z] = { r: 6, c: z - 68 };
    PT_POS[87] = { r: 7, c: 1 }; PT_POS[88] = { r: 7, c: 2 };
    for (let z = 89; z <= 103; z++) PT_POS[z] = { r: 9, c: z - 85 };  // actinide strip
    for (let z = 104; z <= 118; z++) PT_POS[z] = { r: 7, c: z - 100 };
  })();

  /** Decay chains — the actinides get an identity beyond "another grey solid". */
  const DECAY_CHAIN = {
    "U": "Th", "Th": "Ra", "Ra": "Rn", "Rn": "Po", "Po": "Pb",
    "Pu": "U", "Np": "Pa", "Pa": "Ac", "Ac": "Ra", "Am": "Np", "Cm": "Pu",
    "Cf": "Cm", "Bk": "Am", "Es": "Bk", "Fm": "Cf", "Md": "Es", "No": "Fm",
    "Lr": "Md", "At": "Bi", "Fr": "Ra"
  };
  const PT = [];
  const SYM = {};
  PT_RAW.split(";").forEach(function (row) {
    const f = row.trim().split(/\s+/);
    const cat = +f[6];
    const dens = +f[5];
    PT.push({
      z: +f[0], sym: f[1], name: f[2],
      mp: +f[3], bp: +f[4], dens: dens, cat: cat,
      predicted: +f[0] >= 100,
      // Metals and metalloids conduct; metalloids only once they are hot, which the
      // engine gets to express because conduction is checked per cell.
      cond: cat === 0 || cat === 1 || cat === 2 || cat === 3 || cat === 8 || cat === 9,
      semi: cat === 4,
      radio: cat === 9 || +f[0] === 43 || +f[0] === 61 || +f[0] === 84 ||
             +f[0] === 85 || +f[0] === 86 || +f[0] === 87 || +f[0] === 88
    });
  });

  /** Fold the table into ELEM so the physics loop never learns there are two kinds. */
  const PT_BASE = ELEM.length;
  PT.forEach(function (e) {
    SYM[e.sym] = ELEM.length;
    // Map real g/cm3 onto the cabinet's density scale. Gases are placed by whether they
    // are lighter or heavier than air, which is why xenon pools and helium leaves.
    let d;
    if (e.dens < 0.01) d = e.dens < 0.0013 ? -5 : 3;   // lighter than air, or heavier
    else d = Math.max(4, Math.min(99, Math.round(e.dens * 2.6)));
    ELEM.push({
      n: e.sym, rgb: PT_RGB[e.cat], k: SOLID, d: d,
      mp: e.mp, bp: e.bp, pt: e,
      cond: e.cond ? 1 : 0
    });
  });

  const N_ELEM = ELEM.length;
  const E = {};
  ELEM.forEach(function (e, i) { E[e.n] = i; });

  /**
   * Contact reactions, checked when two cells are orthogonally adjacent.
   *
   * Each row is [a, b, becomesA, becomesB, chance, blastR, blastHeat]. `-1` means leave
   * alone, and the last two are optional — a reaction that ends in a bang carries its
   * own radius rather than needing a special case in the loop. That is what lets the
   * alkali group work: caesium in water is chemistry, not temperature, so it cannot
   * come from a thermal ignition point.
   *
   * Only the ordered pair (a,b) is tested, so a reaction that should work both ways
   * gets two rows — explicit beats a symmetry rule nobody can remember the direction of.
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

  /**
   * Chemistry the periodic table brings with it.
   *
   * Built after PT is folded in, because these reference elements by symbol. Only the
   * reactions worth watching are here: an element whose whole story is "it is a grey
   * solid with a high melting point" already has its identity from the heat field and
   * does not need a row.
   *
   * The alkali group is the centrepiece — lithium fizzes, sodium pops, potassium
   * lights, and caesium takes the sink with it. That gradient is real chemistry and it
   * falls straight onto the detonation system that was already built for explosives.
   */
  (function () {
    function S(sym) { return SYM[sym]; }
    const water = [E.BRIN];

    // alkali metals in water, increasingly violent down the group
    [["Li", 4, 240], ["Na", 7, 420], ["K", 10, 620], ["Rb", 13, 800], ["Cs", 17, 1000],
     ["Fr", 19, 1100]].forEach(function (a) {
      const id = S(a[0]);
      if (id == null) return;
      // Radius and heat climb down the group, which is the real gradient: lithium
      // fizzes, sodium pops, potassium lights its own hydrogen, and caesium takes the
      // sink with it.
      water.forEach(function (w) {
        REACT.push([id, w, E.EMPTY, E.HAZE, 0.9, a[1], a[2]]);
      });
    });

    // alkaline earths react with water too, but politely
    ["Ca", "Sr", "Ba", "Ra"].forEach(function (s) {
      const id = S(s);
      if (id != null) REACT.push([id, E.BRIN, E.EMPTY, E.HAZE, 0.10]);
    });

    // halogens attack metals and bleach living things
    ["F", "Cl", "Br", "I", "At", "Ts"].forEach(function (h) {
      const id = S(h);
      if (id == null) return;
      ["Fe", "Na", "K", "Ca", "Mg", "Al", "Cu", "Zn"].forEach(function (m) {
        const mid = S(m);
        if (mid != null) REACT.push([id, mid, E.EMPTY, E.GRIT, 0.05]);
      });
      REACT.push([id, E.VINE, id, E.SOOT, 0.12]);
      REACT.push([id, E.MITE, E.EMPTY, E.EMPTY, 0.4]);
    });

    // oxygen feeds fire; hydrogen and oxygen make water
    if (S("O") != null) {
      REACT.push([S("O"), E.CIND, E.CIND, E.CIND, 0.6]);
      REACT.push([S("O"), E.EMBR, E.CIND, E.EMBR, 0.3]);
      if (S("H") != null) REACT.push([S("H"), S("O"), E.BRIN, E.EMPTY, 0.03]);
    }
    // hydrogen burns, which is most of what hydrogen is for
    if (S("H") != null) {
      ELEM[S("H")].fire = { at: 120, to: E.CIND, heat: 560 };
      REACT.push([S("H"), E.CIND, E.CIND, E.CIND, 0.9]);
    }
    // phosphorus and sulfur are the classic bench fire hazards
    if (S("P") != null) ELEM[S("P")].fire = { at: 60, to: E.CIND, heat: 420 };
    if (S("S") != null) ELEM[S("S")].fire = { at: 250, to: E.CIND, heat: 300 };
    if (S("Mg") != null) ELEM[S("Mg")].fire = { at: 600, to: E.CIND, heat: 900 };

    // mercury poisons what grows, as quicksilver already does
    if (S("Hg") != null) {
      REACT.push([S("Hg"), E.VINE, S("Hg"), E.SOOT, 0.10]);
      REACT.push([S("Hg"), E.MITE, S("Hg"), E.EMPTY, 0.3]);
    }
    // carbon burns to nothing much, and sodium chloride is salt
    if (S("C") != null) ELEM[S("C")].fire = { at: 700, to: E.EMBR, heat: 420 };
    if (S("Na") != null && S("Cl") != null) REACT.push([S("Na"), S("Cl"), E.SALT, E.EMPTY, 0.25]);
  })();

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
  // Real elements carry a melting and boiling point instead of a melt-into-something-
  // else rule, so their PHASE is derived from temperature rather than baked in.
  const MP = new Int16Array(N_ELEM), BP = new Int16Array(N_ELEM), HASPT = new Uint8Array(N_ELEM);
  const SEMI = new Uint8Array(N_ELEM), RADIO = new Uint8Array(N_ELEM), DECAY_TO = new Uint8Array(N_ELEM);
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
    if (e.pt) {
      HASPT[i] = 1;
      MP[i] = Math.max(-32000, Math.min(32000, e.mp));
      BP[i] = Math.max(-32000, Math.min(32000, e.bp));
      SEMI[i] = e.pt.semi ? 1 : 0;
      RADIO[i] = e.pt.radio ? 1 : 0;
    }
  });
  // resolve decay chains once the whole table exists
  ELEM.forEach(function (e, i) {
    if (e.pt && DECAY_CHAIN[e.pt.sym] != null) {
      const to = SYM[DECAY_CHAIN[e.pt.sym]];
      if (to != null) DECAY_TO[i] = to;
    }
  });

  /**
   * Phase from temperature.
   *
   * This is the change that lets a hundred and eighteen real elements work without a
   * hundred and eighteen hand-written rules. Melting used to swap one element for a
   * different one, which is fine for ice becoming water but wrong for an element:
   * mercury is not a different substance from solid mercury, it is mercury above
   * -39 degrees.
   *
   * Deriving the kind instead gives every element its correct room-temperature phase
   * for free — hydrogen, the noble gases, nitrogen, oxygen, fluorine and chlorine come
   * out as gases; mercury and bromine as liquids; the rest solid — with no extra table
   * rows. Gallium melting in your hand at about thirty degrees is then simply a thing
   * that happens rather than a special case somebody remembered to write.
   */
  function kindOf(m, t) {
    if (!HASPT[m]) return KIND[m];
    if (t >= BP[m]) return GAS;
    if (t >= MP[m]) return LIQUID;
    // POWDER rather than SOLID, and this matters more than it looks.
    //
    // A hundred and four of the hundred and eighteen are solid at room temperature,
    // and a SOLID in this engine does not move. Made solid, most of the periodic table
    // was inert scenery: you could not pour sodium onto water because the sodium just
    // hung in the air where you painted it. Measured — lithium through rubidium
    // produced zero reactions against a water shelf directly beneath them.
    //
    // Granular is also the honest reading. What you are pouring out of a jar is filings
    // or pellets, not a machined block, and a powder still piles up into walls.
    return POWDER;
  }

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
  /** Click targets, rebuilt every paint. Recording the rectangles as they are drawn is
   *  what keeps the hit test and the pixels honest — the previous version recomputed
   *  them from an assumed stride, which is how a palette ends up one button off. */
  let hits = [];

  /**
   * Building tools.
   *
   * Until now the only way to put anything anywhere was to smear a circle into a
   * simulation that never stopped moving, which makes a sandbox a toy rather than
   * something you can build in. Three things fix that, and they are worth having
   * together because each is half-useless without the others:
   *
   *   PAUSE   place things precisely without the world running away underneath you
   *   SHAPES  lines, boxes and flood fill, so a wall is one drag instead of a smear
   *   HEAT    paint temperature directly, instead of dropping lava and hoping
   *
   * STEP advances exactly one frame, which is also the only honest way to watch what
   * a rule actually does — a reaction at 120fps is a guess.
   */
  let ptSel = 0;          // a held periodic element, or 0 for the shelf selection
  let ptOpen = false;     // the periodic table overlay
  const SHAPES_T = ["FREE", "LINE", "BOX", "FILL"];
  let shapeI = 0;
  let paused = false, stepOnce = false;
  let anchor = null;                 // drag origin for LINE and BOX
  let heating = false, cooling = false;
  const HEAT_STEP = 220;             // degrees a heat/cool stroke moves a cell

  function idx(x, y) { return y * COLS + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function shelf() { return SHELVES[shelfI]; }
  function shape() { return SHAPES_T[shapeI]; }
  function tool() {
    if (erasing) return "ERASE";
    if (chipping) return "CHIP";
    if (heating) return "HEAT";
    if (cooling) return "COOL";
    if (ptSel) return ELEM[ptSel].n;
    return shelf().items[Math.min(pickI, shelf().items.length - 1)];
  }
  function clearTools() { erasing = chipping = heating = cooling = false; }
  function pickPt(id) { ptSel = id; clearTools(); note(); }
  function toolType() {
    if (ptSel) return ptSel;
    const t = tool();
    return E[t] == null ? 0 : E[t];
  }
  function amount() { return AMOUNTS[amtI]; }
  function mode() { return MODES[modeI]; }
  function toolKind() {
    if (erasing) return "erase";
    if (chipping) return "chip";
    if (heating) return "heat";
    if (cooling) return "cool";
    return "paint";
  }
  function toolRgb() {
    if (erasing) return [255, 122, 154];
    if (chipping) return [255, 184, 107];
    if (heating) return [255, 138, 60];
    if (cooling) return [120, 198, 240];
    return ELEM[toolType()].rgb;
  }
  /** The line under the aim reticle: what you are holding, and what it does. */
  function toolBlurb() {
    const t = toolType();
    const e = ELEM[t];
    if (!e || !e.pt) return "";
    const p = e.pt;
    // kindOf reports POWDER for anything below its melting point, so read the phase
    // the way a person would rather than the way the engine moves it.
    const phase = AMBIENT >= p.bp ? "gas" : AMBIENT >= p.mp ? "liquid" : "solid";
    return p.z + " " + p.name + " · " + PT_CAT[p.cat].toLowerCase() +
           " · mp " + p.mp + "° · bp " + p.bp + "° · " + phase +
           (p.predicted ? " · predicted" : "");
  }

  function hud() {
    return tool() + " · " + shelf().t + " · G" + gr + " · ×" + amount() + " · " + mode() +
           (shape() !== "FREE" ? " · " + shape() : "") +
           (paused ? " · PAUSED" : "") + (heatOn ? " · THERM" : "");
  }
  function note() {
    // Every path that changes selection ends up here — keys, canvas palette, agent bus,
    // and the menu — so this is the one honest place to keep the toolbar in step.
    if (typeof syncMenu === "function") syncMenu();
    hall.note(hud() + " · 1-6 shelf, QWERTYU pick, H heat view, D erase, F chip");
  }

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
    // A real element never becomes a different element by getting hot — its phase is
    // read live by kindOf. Decay is the one thing that does transmute it.
    if (HASPT[m]) {
      if (RADIO[m] && DECAY_TO[m] && Math.random() < 0.0006) {
        g[i] = DECAY_TO[m];
        temp[i] = Math.min(T_MAX, t + 70);      // decay heat, which is why they are warm
        reacts++; bump(6);
        return true;
      }
      return false;
    }
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
      const conducts = COND[u] || (SEMI[u] && temp[j] > 180);   // metalloids need heat
      if (conducts && Math.random() < 0.7) {
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
        if (r[5]) { blast(x, y, r[5], r[6] || 400); return; }
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
    const kb = kindOf(B, temp[b]);
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

    const k = kindOf(A, temp[i]);

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
    // Gases rise against whatever the field is doing — unless they are heavier than
    // air, which several real ones are. Xenon and radon pool on the floor, helium
    // leaves through the ceiling, and the sign of the density is the whole rule.
    if (k === GAS) {
      const rises = DENS[A] < 0;
      if (m === "FALL") { dx = 0; dy = rises ? -1 : 1; }
      else if (m === "LIFT") { dx = 0; dy = rises ? 1 : -1; }
      else if (rises) dy = -dy;
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
    // The bedrock floor is never breached by a brush — but heat still travels into it,
    // otherwise you could not warm a slab from underneath.
    if (y === ROWS - 1 && g[i] === E.BASE && kind !== "heat" && kind !== "cool") return;
    if (kind === "erase") {
      if (!g[i]) return;
      g[i] = 0; life[i] = 0; temp[i] = AMBIENT;
      return;
    }
    if (kind === "chip") { chipCell(i, y); return; }
    if (kind === "heat" || kind === "cool") {
      // Temperature is a field, so it can be painted like one. This is the difference
      // between "drop lava next to it and hope" and actually asking a question about
      // what a material does at 400 degrees.
      const d = kind === "heat" ? HEAT_STEP : -HEAT_STEP;
      let t = temp[i] + d;
      if (t > T_MAX) t = T_MAX; else if (t < T_MIN) t = T_MIN;
      temp[i] = t;
      return;
    }
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

  /** Bresenham, so a dragged line has no gaps at any angle. */
  function strokeLine(x0, y0, x1, y1, kind) {
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      pourAt(x0, y0, kind);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled box between two corners. Walls and tanks are the two things people build
   *  first and both are miserable to smear out by hand. */
  function strokeBox(x0, y0, x1, y1, kind) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
    const ay = Math.min(y0, y1), by = Math.max(y0, y1);
    const type = toolType();
    for (let y = ay; y <= by; y++)
      for (let x = ax; x <= bx; x++) writeCell(x, y, kind, type);
    hall.score(score);
  }

  /**
   * Flood fill the contiguous region matching whatever is under the cursor.
   *
   * Capped, because an unbounded fill on a 64,000-cell grid with an empty background
   * is a frame you never get back. The cap is generous enough to fill any cavity you
   * would actually build and small enough that a misclick on open air is survivable.
   */
  function strokeFill(sx, sy, kind) {
    const target = g[idx(sx, sy)];
    const type = toolType();
    if (kind === "paint" && type === target) return;
    const CAP = 24000;
    const stack = [sx, sy];
    const done = new Uint8Array(COLS * ROWS);
    let n = 0;
    while (stack.length && n < CAP) {
      const y = stack.pop(), x = stack.pop();
      if (!inb(x, y)) continue;
      const i = idx(x, y);
      if (done[i] || g[i] !== target) continue;
      done[i] = 1;
      writeCell(x, y, kind, type);
      n++;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    hall.score(score);
    return n;
  }

  /** Commit whatever the current shape means for a drag from `anchor` to (x,y). */
  function commitShape(x, y, kind) {
    if (!anchor) return;
    const s = shape();
    if (s === "LINE") strokeLine(anchor.x, anchor.y, x, y, kind);
    else if (s === "BOX") strokeBox(anchor.x, anchor.y, x, y, kind);
    anchor = null;
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
    if (ptOpen) { hits = []; drawPeriodic(); drawPalette(true); return; }
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

    // A shape you cannot see before you commit it is a guess. The preview is dashed so
    // it never reads as material already placed.
    if (anchor) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = rgbCss(c, 0.75);
      const ax = anchor.x * CELL + CELL / 2, ay = anchor.y * CELL + CELL / 2;
      const bx = aimX * CELL + CELL / 2, by = aimY * CELL + CELL / 2;
      if (shape() === "LINE") {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      } else if (shape() === "BOX") {
        ctx.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = rgbCss(c, 0.9);
    }

    ctx.beginPath();
    ctx.arc(aimX * CELL + CELL / 2, aimY * CELL + CELL / 2, r * CELL, 0, Math.PI * 2);
    ctx.stroke();
    // Paused deserves an unmistakable marker — it is the one state where the cabinet
    // looking broken and the cabinet working correctly are the same picture.
    if (paused) {
      ctx.fillStyle = "rgba(255,181,71,.9)";
      ctx.fillRect(10, 10, 5, 16);
      ctx.fillRect(19, 10, 5, 16);
      ctx.font = "600 10px ui-monospace, Menlo, monospace";
      ctx.fillText("PAUSED", 30, 22);
    }
    ctx.restore();
  }

  /**
   * The periodic table, drawn as the periodic table.
   *
   * A hundred and eighteen entries in a dropdown is a list; laid out in periods and
   * groups it is a thing chemists can already read, and the layout itself tells you
   * that the left column is violent and the right column is inert before you have
   * touched anything. Colour is by category, and the cell shows what phase the element
   * is in at room temperature — which the engine derives rather than stores.
   */
  const PT_CW = 33, PT_CH = 25, PT_X = 14, PT_Y = 18;
  function drawPeriodic() {
    const w = COLS * CELL, h = ROWS * CELL;
    ctx.fillStyle = "rgba(4,6,10,.94)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "600 10px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#6ee7ff";
    ctx.fillText("PERIODIC TABLE — click an element · T closes", PT_X, 12);

    for (let i = PT_BASE; i < N_ELEM; i++) {
      const e = ELEM[i], p = e.pt;
      const pos = PT_POS[p.z];
      if (!pos) continue;
      const x = PT_X + (pos.c - 1) * PT_CW;
      const y = PT_Y + (pos.r - 1) * PT_CH + (pos.r >= 8 ? 8 : 0);
      const on = ptSel === i;
      const ph = kindOf(i, AMBIENT);
      ctx.fillStyle = on ? "#1b2c3a" : "#0a0f15";
      ctx.fillRect(x, y, PT_CW - 2, PT_CH - 2);
      ctx.strokeStyle = on ? "#6ee7ff" : rgbCss(e.rgb, 0.5);
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, PT_CW - 3, PT_CH - 3);
      ctx.lineWidth = 1;
      // a phase pip: gas hollow, liquid half, solid filled
      ctx.fillStyle = rgbCss(e.rgb);
      if (ph === GAS) { ctx.strokeStyle = rgbCss(e.rgb); ctx.strokeRect(x + 3.5, y + 3.5, 4, 4); }
      else if (ph === LIQUID) ctx.fillRect(x + 3, y + 5, 5, 3);
      else ctx.fillRect(x + 3, y + 3, 5, 5);
      ctx.fillStyle = on ? "#e6edf5" : rgbCss(e.rgb, 0.95);
      ctx.fillText(p.sym, x + 11, y + 10);
      ctx.fillStyle = "#4d5765";
      ctx.fillText(String(p.z), x + 4, y + 20);
      hits.push({ x: x, y: y, w: PT_CW - 2, h: PT_CH - 2, kind: "pt", i: i });
    }

    // legend — wraps onto a new line rather than folding back over itself
    let lx = PT_X, ly = PT_Y + 10 * PT_CH + 12;
    PT_CAT.forEach(function (c, k) {
      const width = 12 + ctx.measureText(c).width + 14;
      if (lx + width > w - PT_X) { lx = PT_X; ly += 13; }
      ctx.fillStyle = rgbCss(PT_RGB[k]);
      ctx.fillRect(lx, ly, 7, 7);
      ctx.fillStyle = "#5c6675";
      ctx.fillText(c, lx + 11, ly + 7);
      lx += width;
    });
    ctx.fillStyle = "#3f4854";
    ctx.fillText("phase pip: filled = solid · bar = liquid · hollow = gas, all at room temperature", PT_X, ly + 24);
    ctx.fillStyle = "#2f3742";
    ctx.fillText("melting and boiling points are approximate, not reference data; 100+ are predicted", PT_X, ly + 38);
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
  function drawPalette(keepHits) {
    const top = ROWS * CELL;
    const w = COLS * CELL;
    ctx.fillStyle = "#070a0e";
    ctx.fillRect(0, top, w, UI);
    ctx.strokeStyle = "#1b2430";
    ctx.beginPath(); ctx.moveTo(0, top + 0.5); ctx.lineTo(w, top + 0.5); ctx.stroke();

    ctx.font = "600 10px ui-monospace, Menlo, monospace";
    if (!keepHits) hits = [];

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
      hits.push({ x: sx, y: top + 9, w: tw, h: 18, kind: "shelf", i: k });
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
      hits.push({ x: px, y: py, w: bw, h: 30, kind: "pick", i: k });
      px += bw + 5;
    });

    // ERASE and CHIP.
    //
    // These used to exist only as a right-drag, a shift-drag and an undocumented D key,
    // which meant the single most-reached-for tool in a sandbox was invisible.
    //
    // They get their OWN ROW rather than trailing the materials: on a seven- or
    // eight-material shelf the row ran past the 640px edge, so CHIP was drawn
    // off-canvas while its click target stayed reachable — a button you could hit but
    // could not see. Their own row also says the right thing about them, since they are
    // tools rather than things you pour.
    px = 10;
    const ty = top + 74;
    ctx.fillStyle = "#4d5765";
    ctx.fillText("TOOLS", px, ty + 19);
    px += 44;
    [["ERASE", erasing, [255, 122, 154], "D · right-drag"],
     ["CHIP",  chipping, [255, 184, 107], "F · shift-drag"]].forEach(function (t) {
      const name = t[0], on = t[1], c = t[2], hintText = t[3];
      const bw = 108;
      ctx.fillStyle = on ? "#241118" : "#0a0f15";
      ctx.fillRect(px, ty, bw, 30);
      ctx.strokeStyle = on ? rgbCss(c) : rgbCss(c, 0.4);
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(px + 0.5, ty + 0.5, bw - 1, 29);
      ctx.lineWidth = 1;
      ctx.fillStyle = rgbCss(c);
      ctx.fillRect(px + 7, ty + 9, 12, 12);
      ctx.fillStyle = on ? "#f2e9ec" : rgbCss(c, 0.9);
      ctx.fillText(name, px + 25, ty + 14);
      ctx.fillStyle = "#4d5765";
      ctx.fillText(hintText, px + 25, ty + 25);
      hits.push({ x: px, y: ty, w: bw, h: 30, kind: name.toLowerCase() });
      px += bw + 14;
    });

    // current selection, spelled out where the eye already is
    ctx.fillStyle = "#3f4854";
    ctx.fillText("HOLDING", px + 6, ty + 14);
    const held = tool();
    ctx.fillStyle = rgbCss(toolRgb());
    ctx.fillText(held, px + 6, ty + 25);
    const blurb = toolBlurb();
    if (blurb) {
      ctx.fillStyle = "#5c6675";
      ctx.fillText(blurb, px + 6 + ctx.measureText(held).width + 12, ty + 25);
    }

    // tool row
    ctx.fillStyle = "#5c6675";
    const line2 = "GRAVITY " + mode() + " (E) · BRUSH " + gr + " (wheel) · FLOW ×" + amount() + " (shift-wheel)";
    ctx.fillText(line2, 10, top + 124);
    ctx.fillStyle = "#3f4854";
    ctx.fillText("menu above the box picks any of the 41 · H thermal view · R reset · space pour · wheel brush", 10, top + 140);
    ctx.fillStyle = "#2f3742";
    ctx.fillText("heat is a real field: things melt, boil, ignite and freeze because of it. PILE+FILA carry charge. ARC sets off CHRG.", 10, top + 155);
  }

  // ── input ───────────────────────────────────────────────────────────────────
  function setShelf(k) {
    shelfI = Math.max(0, Math.min(SHELVES.length - 1, k));
    pickI = Math.min(pickI, SHELVES[shelfI].items.length - 1);
    ptSel = 0; clearTools();
    note();
  }
  function setPick(k) {
    if (k < 0 || k >= shelf().items.length) return;
    pickI = k;
    ptSel = 0; clearTools();
    note();
  }

  function reset() { loadPreset("DUNES"); }

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
    else if (cmd === "table") { ptOpen = !ptOpen; note(); }
    else if (cmd === "pause") { paused = !paused; note(); }
    else if (cmd === "step") { paused = true; stepOnce = true; note(); }
    else if (cmd === "shape") { shapeI = (shapeI + 1) % SHAPES_T.length; anchor = null; note(); }
    else if (cmd === "heat") { const h = heating; clearTools(); heating = !h; note(); }
    else if (cmd === "cool") { const c = cooling; clearTools(); cooling = !c; note(); }
    else if (cmd === "save") saveScene();
    else if (cmd === "load") loadScene();
    else if (cmd === "reset") reset();
    else return false;
    return true;
  }
  function actBurst(list) { (list || []).forEach(act); }

  function gridFromEvent(ev) {
    const r = canvas.getBoundingClientRect();
    const bx = (ev.clientX - r.left) * (canvas.width / r.width);
    const by = (ev.clientY - r.top) * (canvas.height / r.height);
    // While the table is up it owns the whole surface — clicking through it onto the
    // sand would be a surprise every single time.
    if (ptOpen) { paletteClick(bx, by); return null; }
    if (by >= ROWS * CELL) { paletteClick(bx, by); return null; }
    return {
      x: Math.max(0, Math.min(COLS - 1, (bx / CELL) | 0)),
      y: Math.max(0, Math.min(ROWS - 1, (by / CELL) | 0))
    };
  }

  /** The palette is clickable, because a forty-material shelf that is keyboard-only is
   *  a shelf most people will never see past the first row of. Zones come from what was
   *  actually drawn, so the buttons and their targets cannot drift apart. */
  function paletteClick(bx, by) {
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      if (bx < h.x || bx > h.x + h.w || by < h.y || by > h.y + h.h) continue;
      if (h.kind === "shelf") setShelf(h.i);
      else if (h.kind === "pick") setPick(h.i);
      else if (h.kind === "erase") { erasing = !erasing; chipping = false; syncMenu(); note(); }
      else if (h.kind === "chip") { chipping = !chipping; erasing = false; syncMenu(); note(); }
      else if (h.kind === "pt") { pickPt(h.i); ptOpen = false; }
      return true;
    }
    return false;
  }

  function onDown(ev) {
    const p = gridFromEvent(ev);
    if (!p) return;
    painting = true;
    aimX = p.x; aimY = p.y;
    if (ev.button === 2) paintKind = "erase";
    else if (ev.shiftKey) paintKind = "chip";
    else paintKind = toolKind();

    const s = shape();
    if (s === "LINE" || s === "BOX") {
      // Anchor now, draw on release — the drag is the shape, so nothing is committed
      // until you let go and a preview shows what you are about to get.
      anchor = { x: p.x, y: p.y };
    } else if (s === "FILL") {
      strokeFill(p.x, p.y, paintKind);
    } else {
      pourAt(aimX, aimY, paintKind);
    }
    ev.preventDefault();
  }
  function onMove(ev) {
    const r = canvas.getBoundingClientRect();
    const by = (ev.clientY - r.top) * (canvas.height / r.height);
    if (by >= ROWS * CELL) return;
    const bx = (ev.clientX - r.left) * (canvas.width / r.width);
    aimX = Math.max(0, Math.min(COLS - 1, (bx / CELL) | 0));
    aimY = Math.max(0, Math.min(ROWS - 1, (by / CELL) | 0));
    if (painting && shape() === "FREE") pourAt(aimX, aimY, paintKind);
  }
  function onUp() {
    if (anchor) commitShape(aimX, aimY, paintKind);
    painting = false;
  }
  function onContext(ev) { ev.preventDefault(); }
  function onWheel(ev) {
    ev.preventDefault();
    if (ev.shiftKey) amtI = ev.deltaY > 0 ? Math.min(AMOUNTS.length - 1, amtI + 1) : Math.max(0, amtI - 1);
    else gr = ev.deltaY > 0 ? Math.min(8, gr + 1) : Math.max(1, gr - 1);
    note();
  }

  /**
   * Starting scenes.
   *
   * A sandbox with an empty box asks the player to already know what is interesting.
   * These are the shortest routes to each of the cabinet's systems doing something
   * worth watching, and they double as documentation you can run.
   */
  const PRESETS = {
    "DUNES": function () {
      for (let x = (COLS / 2 | 0) - 30; x < (COLS / 2 | 0) + 30; x++)
        for (let y = ROWS - 16; y < ROWS - 1; y++)
          if (Math.random() < 0.74) g[idx(x, y)] = E.DUNE;
      for (let x = 22; x < 92; x++) g[idx(x, ROWS - 40)] = E.SLAB;
      for (let x = 26; x < 88; x++)
        for (let y = ROWS - 44; y < ROWS - 40; y++) g[idx(x, y)] = E.BRIN;
    },
    "VOLCANO": function () {
      for (let x = 0; x < COLS; x++) {
        const h = 26 + Math.round(22 * Math.exp(-Math.pow((x - COLS / 2) / 46, 2)));
        for (let y = ROWS - h; y < ROWS - 1; y++) {
          const d = Math.abs(x - COLS / 2);
          g[idx(x, y)] = d < 5 ? 0 : (d < 9 ? E.SLAB : (Math.random() < 0.7 ? E.SLAB : E.GRIT));
        }
      }
      for (let y = ROWS - 12; y < ROWS - 2; y++)
        for (let x = (COLS / 2 | 0) - 4; x < (COLS / 2 | 0) + 4; x++) {
          g[idx(x, y)] = E.MAGM; temp[idx(x, y)] = 1300;
        }
    },
    "AQUARIUM": function () {
      for (let x = 40; x < COLS - 40; x++) {
        g[idx(x, ROWS - 60)] = E.VITR;
        for (let y = ROWS - 59; y < ROWS - 1; y++) g[idx(x, y)] = E.BRIN;
      }
      for (let y = ROWS - 60; y < ROWS - 1; y++) { g[idx(40, y)] = E.VITR; g[idx(COLS - 41, y)] = E.VITR; }
      for (let x = 44; x < COLS - 44; x++)
        for (let y = ROWS - 8; y < ROWS - 1; y++) g[idx(x, y)] = E.DUNE;
      for (let k = 0; k < 26; k++) g[idx(50 + ((Math.random() * (COLS - 100)) | 0), ROWS - 10)] = E.GERM;
    },
    "CIRCUIT": function () {
      const y0 = ROWS - 70;
      for (let x = 40; x < COLS - 40; x++) g[idx(x, y0)] = E.FILA;
      for (let y = y0; y < y0 + 40; y++) { g[idx(40, y)] = E.FILA; g[idx(COLS - 41, y)] = E.FILA; }
      for (let x = 40; x < COLS - 40; x++) g[idx(x, y0 + 40)] = E.FILA;
      for (let y = y0 + 41; y < y0 + 48; y++)
        for (let x = 56; x < 64; x++) g[idx(x, y)] = E.PILE;
      for (let x = COLS - 90; x < COLS - 60; x++)
        for (let y = y0 + 42; y < y0 + 50; y++) g[idx(x, y)] = E.CHRG;
    },
    "FOREST": function () {
      for (let x = 0; x < COLS; x++)
        for (let y = ROWS - 10; y < ROWS - 1; y++) g[idx(x, y)] = E.DUNE;
      for (let k = 0; k < 22; k++) {
        const bx = 14 + ((Math.random() * (COLS - 28)) | 0);
        const h = 22 + ((Math.random() * 26) | 0);
        for (let y = ROWS - 10 - h; y < ROWS - 10; y++) { g[idx(bx, y)] = E.PITH; g[idx(bx + 1, y)] = E.PITH; }
        for (let dy = -8; dy <= 4; dy++)
          for (let dx = -7; dx <= 8; dx++)
            if (dx * dx + dy * dy * 2 < 46 && Math.random() < 0.6) {
              const vx = bx + dx, vy = ROWS - 10 - h + dy;
              if (inb(vx, vy) && !g[idx(vx, vy)]) g[idx(vx, vy)] = E.VINE;
            }
      }
    },
    "LAB": function () {
      /**
       * A bench you can run experiments on.
       *
       * Laid out as apparatus rather than as a pile: a row of glass vessels along the
       * bench, each already charged with something that wants to react, a water trough,
       * a heating element wired to a cell, and a shielded pit for the radioactives.
       * The point is that every one of the cabinet's systems has a station here, so the
       * scene doubles as a tour of what the box can do.
       */
      const S = function (sym) { return SYM[sym]; };
      const benchY = ROWS - 46;

      // the bench itself
      for (let x = 4; x < COLS - 4; x++)
        for (let y = benchY; y < benchY + 3; y++) g[idx(x, y)] = E.SLAB;

      // six glass vessels along the bench, each charged with a different experiment
      const charges = [
        S("Na"),  // alkali metal — add water
        S("Hg"),  // already liquid at room temperature
        S("Ga"),  // melts at about 30 degrees, so a heat brush is enough
        S("S"),   // burns
        S("I"),   // sublimes into a violet vapour when warmed
        S("W")    // outlasts everything in a fire
      ];
      charges.forEach(function (mat, k) {
        if (mat == null) return;
        const x0 = 18 + k * 48;
        for (let y = benchY - 26; y < benchY; y++) {
          g[idx(x0, y)] = E.VITR;
          g[idx(x0 + 26, y)] = E.VITR;
        }
        for (let x = x0; x <= x0 + 26; x++) g[idx(x, benchY - 1)] = E.VITR;
        for (let y = benchY - 10; y < benchY - 1; y++)
          for (let x = x0 + 2; x < x0 + 25; x++) g[idx(x, y)] = mat;
      });

      // water trough on the right, for the alkali metals
      for (let x = COLS - 74; x < COLS - 10; x++) {
        g[idx(x, benchY - 20)] = E.VITR;
        for (let y = benchY - 19; y < benchY; y++) g[idx(x, y)] = E.BRIN;
      }
      for (let y = benchY - 20; y < benchY; y++) {
        g[idx(COLS - 75, y)] = E.VITR; g[idx(COLS - 10, y)] = E.VITR;
      }

      // heating element: a cell wired to a filament under the bench
      for (let x = 30; x < 130; x++) g[idx(x, benchY + 8)] = E.FILA;
      for (let y = benchY + 8; y < benchY + 16; y++)
        for (let x = 30; x < 38; x++) g[idx(x, y)] = E.PILE;

      // shielded pit for the radioactives — lead walls, uranium inside
      const px0 = 150, py0 = benchY + 6;
      for (let x = px0; x < px0 + 60; x++)
        for (let y = py0; y < py0 + 3; y++) g[idx(x, y)] = S("Pb") == null ? E.SLAB : S("Pb");
      for (let y = py0; y < py0 + 22; y++) {
        const pb = S("Pb") == null ? E.SLAB : S("Pb");
        g[idx(px0, y)] = pb; g[idx(px0 + 59, y)] = pb;
      }
      if (S("U") != null)
        for (let x = px0 + 4; x < px0 + 56; x++)
          for (let y = py0 + 4; y < py0 + 14; y++) g[idx(x, y)] = S("U");

      // floor
      for (let x = 0; x < COLS; x++)
        for (let y = ROWS - 6; y < ROWS - 1; y++) g[idx(x, y)] = E.SLAB;
    },
    "ICE CAVE": function () {
      for (let x = 0; x < COLS; x++) {
        const h = 40 + Math.round(16 * Math.sin(x / 26) + 10 * Math.sin(x / 9));
        for (let y = ROWS - h; y < ROWS - 1; y++) g[idx(x, y)] = E.RIME;
        for (let y = 1; y < 24 + Math.round(9 * Math.sin(x / 17)); y++) g[idx(x, y)] = E.RIME;
      }
      for (let i = 0; i < g.length; i++) if (g[i] === E.RIME) temp[i] = -30;
      for (let k = 0; k < 40; k++) {
        const x = 8 + ((Math.random() * (COLS - 16)) | 0);
        g[idx(x, ROWS - 46)] = E.SPAR;
      }
    }
  };
  const PRESET_NAMES = Object.keys(PRESETS);

  function loadPreset(name) {
    g.fill(0); life.fill(0); clone.fill(0); temp.fill(AMBIENT); temp2.fill(AMBIENT);
    for (let x = 0; x < COLS; x++) g[idx(x, ROWS - 1)] = E.BASE;
    (PRESETS[name] || PRESETS.DUNES)();
    note();
  }

  // ── save and load ───────────────────────────────────────────────────────────
  /**
   * Run-length encode the grid into localStorage.
   *
   * A sand grid is almost all runs, so RLE takes the 64,000-cell field down to a few
   * kilobytes without needing a compression library. Temperature is dropped on purpose:
   * it re-derives from the materials within a second of loading, and storing it would
   * roughly triple the payload to preserve something the simulation regenerates anyway.
   */
  const SLOT = "hall.grain.slot1";
  function saveScene() {
    const parts = [];
    let run = 1;
    for (let i = 1; i <= g.length; i++) {
      if (i < g.length && g[i] === g[i - 1] && run < 60000) { run++; continue; }
      parts.push(g[i - 1] + "x" + run);
      run = 1;
    }
    try {
      localStorage.setItem(SLOT, parts.join("."));
      hall.note("scene saved · " + Math.round(parts.join(".").length / 1024) + "kb");
    } catch (e) { hall.note("save failed: " + e.message); }
  }
  function loadScene() {
    let s = null;
    try { s = localStorage.getItem(SLOT); } catch (e) { /* storage may be blocked */ }
    if (!s) { hall.note("no saved scene yet — SAVE first"); return false; }
    g.fill(0); life.fill(0); clone.fill(0); temp.fill(AMBIENT); temp2.fill(AMBIENT);
    let i = 0;
    s.split(".").forEach(function (tok) {
      const p = tok.split("x");
      const v = +p[0], n = +p[1];
      for (let k = 0; k < n && i < g.length; k++, i++) {
        g[i] = v;
        life[i] = LIFE0[v];
        if (v === E.MAGM) temp[i] = 1150;
        else if (v === E.CIND || v === E.EMBR) temp[i] = 620;
        else if (v === E.CRYO) temp[i] = -190;
        else if (v === E.RIME || v === E.FLOC) temp[i] = -8;
      }
    });
    note();
    hall.note("scene loaded");
    return true;
  }

  // ── the menu bar ────────────────────────────────────────────────────────────
  /**
   * A real HTML toolbar above the canvas.
   *
   * The canvas palette shows one shelf at a time, which is right for reaching while you
   * paint but wrong for *finding* something — with forty-one materials you should not
   * have to remember which shelf ARC lives on. The dropdown lists everything at once,
   * grouped, so the whole inventory is one click away. Both surfaces drive the same
   * state and each redraws the other, so they can never disagree about what is selected.
   */
  const bar = document.createElement("div");
  bar.className = "grain-bar";
  bar.style.cssText =
    "display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;" +
    "padding:8px 10px;font:600 11px ui-monospace,Menlo,monospace;color:#7d8796;" +
    "background:#070a0e;border:1px solid rgba(110,231,255,.2);max-width:100%";

  function mkLabel(t) {
    const s = document.createElement("span");
    s.textContent = t;
    s.style.cssText = "letter-spacing:.14em;color:#4d5765";
    return s;
  }
  function styleSelect(s) {
    s.style.cssText =
      "background:#0b1017;color:#cfd6df;border:1px solid #243040;padding:4px 6px;" +
      "font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.06em;cursor:pointer";
    return s;
  }

  // material picker — everything, grouped by shelf, plus the tools
  const selMat = styleSelect(document.createElement("select"));
  SHELVES.forEach(function (s, si) {
    const og = document.createElement("optgroup");
    og.label = s.t;
    s.items.forEach(function (name, ii) {
      const o = document.createElement("option");
      o.value = "m:" + si + ":" + ii;
      o.textContent = name;
      og.appendChild(o);
    });
    selMat.appendChild(og);
  });
  // the periodic table, by category, so the dropdown can reach any of the 118 too
  PT_CAT.forEach(function (cat, ci) {
    const og = document.createElement("optgroup");
    og.label = cat;
    for (let i = PT_BASE; i < N_ELEM; i++) {
      if (ELEM[i].pt.cat !== ci) continue;
      const o = document.createElement("option");
      o.value = "e:" + i;
      o.textContent = ELEM[i].pt.z + "  " + ELEM[i].pt.sym + "  " + ELEM[i].pt.name;
      og.appendChild(o);
    }
    selMat.appendChild(og);
  });
  (function () {
    const og = document.createElement("optgroup");
    og.label = "TOOLS";
    [["ERASE", "t:erase"], ["CHIP", "t:chip"],
     ["HEAT +", "t:heat"], ["COOL -", "t:cool"]].forEach(function (t) {
      const o = document.createElement("option");
      o.value = t[1]; o.textContent = t[0];
      og.appendChild(o);
    });
    selMat.appendChild(og);
  })();
  selMat.addEventListener("change", function () {
    const v = selMat.value;
    if (v.charAt(0) === "e") {
      pickPt(+v.slice(2));
      selMat.blur();
      return;
    }
    if (v.charAt(0) === "t") {
      clearTools(); ptSel = 0;
      erasing = v === "t:erase"; chipping = v === "t:chip";
      heating = v === "t:heat"; cooling = v === "t:cool";
    } else {
      const p = v.split(":");
      clearTools(); ptSel = 0;
      shelfI = +p[1]; pickI = +p[2];
    }
    note();
    selMat.blur();      // hand the keyboard back to the cabinet
  });

  // gravity mode
  const selMode = styleSelect(document.createElement("select"));
  MODES.forEach(function (m) {
    const o = document.createElement("option");
    o.value = m; o.textContent = m;
    selMode.appendChild(o);
  });
  selMode.addEventListener("change", function () {
    modeI = MODES.indexOf(selMode.value);
    note(); selMode.blur();
  });

  // brush size and flow
  const selSize = styleSelect(document.createElement("select"));
  for (let i = 1; i <= 8; i++) {
    const o = document.createElement("option");
    o.value = String(i); o.textContent = "G" + i;
    selSize.appendChild(o);
  }
  selSize.addEventListener("change", function () { gr = +selSize.value; note(); selSize.blur(); });

  const selFlow = styleSelect(document.createElement("select"));
  AMOUNTS.forEach(function (a, i) {
    const o = document.createElement("option");
    o.value = String(i); o.textContent = "×" + a;
    selFlow.appendChild(o);
  });
  selFlow.addEventListener("change", function () { amtI = +selFlow.value; note(); selFlow.blur(); });

  function mkButton(text, title, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    b.style.cssText =
      "background:transparent;border:1px solid #243040;color:#8b95a4;padding:4px 9px;" +
      "font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.12em;cursor:pointer";
    b.addEventListener("click", function () { onClick(); b.blur(); });
    return b;
  }
  const btnErase = mkButton("ERASE", "erase (D, or right-drag)", function () {
    erasing = !erasing; chipping = false; note();
  });
  const btnChip = mkButton("CHIP", "chip one step down (F, or shift-drag)", function () {
    chipping = !chipping; erasing = false; note();
  });
  const btnTherm = mkButton("THERM", "thermal camera (H)", function () { act("therm"); });
  const btnTable = mkButton("TABLE", "the periodic table (T)", function () { act("table"); });

  // shape picker
  const selShape = styleSelect(document.createElement("select"));
  SHAPES_T.forEach(function (s) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = { FREE: "FREEHAND", LINE: "LINE", BOX: "BOX", FILL: "FLOOD FILL" }[s];
    selShape.appendChild(o);
  });
  selShape.addEventListener("change", function () {
    shapeI = SHAPES_T.indexOf(selShape.value); anchor = null; note(); selShape.blur();
  });

  const btnPause = mkButton("PAUSE", "freeze the simulation (P)", function () {
    paused = !paused; note();
  });
  const btnStep = mkButton("STEP", "advance exactly one frame (.)", function () {
    paused = true; stepOnce = true; note();
  });

  // starting scenes
  const selPreset = styleSelect(document.createElement("select"));
  (function () {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "SCENE…";
    selPreset.appendChild(o);
    PRESET_NAMES.forEach(function (n) {
      const oo = document.createElement("option");
      oo.value = n; oo.textContent = n;
      selPreset.appendChild(oo);
    });
  })();
  selPreset.addEventListener("change", function () {
    if (selPreset.value) loadPreset(selPreset.value);
    selPreset.value = ""; selPreset.blur();
  });

  const btnSave = mkButton("SAVE", "store this scene in the browser", saveScene);
  const btnLoad = mkButton("LOAD", "restore the stored scene", loadScene);
  const btnReset = mkButton("RESET", "clear the lab (R)", function () { act("reset"); });

  bar.appendChild(mkLabel("MATERIAL"));
  bar.appendChild(selMat);
  bar.appendChild(btnErase);
  bar.appendChild(btnChip);
  bar.appendChild(mkLabel("SHAPE"));
  bar.appendChild(selShape);
  bar.appendChild(mkLabel("BRUSH"));
  bar.appendChild(selSize);
  bar.appendChild(selFlow);
  bar.appendChild(mkLabel("GRAVITY"));
  bar.appendChild(selMode);
  bar.appendChild(btnPause);
  bar.appendChild(btnStep);
  bar.appendChild(btnTherm);
  bar.appendChild(btnTable);
  bar.appendChild(mkLabel("SCENE"));
  bar.appendChild(selPreset);
  bar.appendChild(btnSave);
  bar.appendChild(btnLoad);
  bar.appendChild(btnReset);
  if (canvas.parentNode) canvas.parentNode.insertBefore(bar, canvas);

  /** Push current state into the toolbar. Called whenever anything changes selection,
   *  from either surface, so the two views stay in step. */
  function syncMenu() {
    selMat.value = erasing ? "t:erase" : chipping ? "t:chip"
                 : heating ? "t:heat" : cooling ? "t:cool"
                 : ptSel ? "e:" + ptSel
                 : "m:" + shelfI + ":" + pickI;
    selMode.value = MODES[modeI];
    selShape.value = SHAPES_T[shapeI];
    selSize.value = String(gr);
    selFlow.value = String(amtI);
    function lit(b, on, col) {
      b.style.color = on ? col : "#8b95a4";
      b.style.borderColor = on ? col : "#243040";
    }
    lit(btnErase, erasing, "#ff7a9a");
    lit(btnChip, chipping, "#ffb86b");
    lit(btnTherm, heatOn, "#6ee7ff");
    lit(btnTable, ptOpen, "#6ee7ff");
    lit(btnPause, paused, "#ffb547");
    btnPause.textContent = paused ? "RESUME" : "PAUSE";
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
    if (k === "t" || k === "T") { act("table"); return; }
    if (k === "p" || k === "P") { act("pause"); return; }
    if (k === "." || k === ">") { act("step"); return; }
    if (k === "s" || k === "S") { act("shape"); return; }
    if (k === "g" || k === "G") { act("heat"); return; }
    if (k === "b" || k === "B") { act("cool"); return; }
    if (k === "r" || k === "R") { act("reset"); return; }
    if (k === "f" || k === "F") { const c = chipping; clearTools(); chipping = !c; note(); return; }
    if (k === "d" || k === "D") { const e = erasing; clearTools(); erasing = !e; note(); return; }
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

  /** The opening scene is just the first preset, so there is one definition of it. */
  function seed() { loadPreset("DUNES"); }

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
      if (!paused || stepOnce) {
        sim(t);
        stepOnce = false;
      }
      simMs = simMs * 0.9 + (performance.now() - t0) * 0.1;
      if (hall.keys && hall.keys[" "] && shape() === "FREE") pourAt(aimX, aimY);
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
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
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
        periodic: N_ELEM - PT_BASE,
        held: ELEM[toolType()] && ELEM[toolType()].pt ? ELEM[toolType()].pt.sym : tool(),
        table: ptOpen,
        grain: gr,
        amount: amount(),
        mode: mode(),
        shape: shape(),
        paused: paused,
        therm: heatOn,
        aim: { x: aimX, y: aimY },
        aimTemp: temp[idx(aimX, aimY)],
        filled: filledCount(),
        reacts, poured, burns, blasts, sparks,
        hot: a.hot, fire: a.fire,
        fps,
        hud: hud(),
        legal: ["left","right","up","down","cw","ccw","soft","hard","fire","hold","jump","tuck",
                "chip","erase","heat","cool","therm","table","pause","step","shape","save","load","reset"]
      };
    }
  };
} };
