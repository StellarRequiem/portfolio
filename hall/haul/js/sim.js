/**
 * THE LONG HAUL — pure simulation core.
 *
 * No DOM, no canvas, no randomness outside the seeded RNG. Runs identically in Node
 * (for tuning sweeps) and in the browser (for play). Everything a scene needs to render
 * is derivable from the state object; the sim never draws and never reads input.
 *
 * Determinism contract: same seed + same choice sequence => same run, byte for byte.
 * That is what makes runs shareable, replayable, and regression-testable.
 *
 * CORE TENSION (the thing the whole game rests on):
 *   Travel is progress-based, not calendar-based. Burning hard shortens the voyage —
 *   which is the only real defence against consumable drain — but costs fuel and wears
 *   the drive and life-support. Coasting is mechanically gentle and starves you.
 *   Meanwhile life-support decay compounds: as `mod.life` falls, recycling falls, so
 *   daily consumption *rises*. Neglect it and you enter a death spiral that looks
 *   survivable right up until it isn't.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Haul = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ── seeded RNG (mulberry32) ────────────────────────────────────────────────
  function rngFrom(seed) {
    let a = seed >>> 0;
    function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // Fork from the current state so a choice can be previewed without spending
    // the voyage's own rolls. The next call on the fork matches the next call here.
    next.clone = function () { return rngFrom(a); };
    return next;
  }
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    const v = String(str);
    for (let i = 0; i < v.length; i++) {
      h ^= v.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Nominal voyage length in days at throttle 1 with a healthy drive. */
  const NOMINAL_DAYS = 240;

  /**
   * Fuel that must remain when you reach Mars to brake into orbit. This is the trap
   * that makes "just burn hard the whole way" wrong: sprinting shortens the voyage
   * (good) but spends the very fuel you need to stop at the end (fatal). The player
   * has to budget the reserve from day one, and the game never reminds them.
   */
  const BRAKE_RESERVE = 26;

  // `at` is progress 0..1, so waypoints arrive sooner when you burn harder.
  const WAYPOINTS = [
    { id: "pad",        name: "Pad 12, the Salt",   at: 0.000, kind: "start" },
    { id: "leo",        name: "Low Earth Orbit",        at: 0.013, kind: "transit" },
    { id: "kessler",    name: "The Kessler Belt",       at: 0.046, kind: "hazard" },
    { id: "l2",         name: "L2 Waystation",          at: 0.100, kind: "station" },
    { id: "dark1",      name: "The Long Dark",          at: 0.283, kind: "transit" },
    { id: "flare",      name: "Solar Weather Front",    at: 0.400, kind: "hazard" },
    { id: "turnaround", name: "Turnaround",             at: 0.500, kind: "milestone" },
    { id: "relay",      name: "Deep Space Relay",       at: 0.575, kind: "blackout" },
    { id: "dark2",      name: "The Long Dark II",       at: 0.717, kind: "transit" },
    { id: "hohmann",    name: "Hohmann Correction",     at: 0.817, kind: "check" },
    { id: "approach",   name: "Mars Approach",          at: 0.892, kind: "transit" },
    { id: "aerobrake",  name: "Aerobrake Corridor",     at: 0.950, kind: "crossing" },
    { id: "areo",       name: "Areostationary Orbit",   at: 0.975, kind: "station" },
    { id: "ellipse",    name: "Landing Site: Ellipse Nine", at: 1.000, kind: "end" }
  ];

  const ROLES = [
    { key: "engineer", label: "Flight Engineer",      gates: "repair" },
    { key: "medic",    label: "Medic",                gates: "recovery" },
    { key: "pilot",    label: "Pilot",                gates: "navigation" },
    { key: "botanist", label: "Botanist",             gates: "recycling" },
    { key: "content",  label: "Mission Content Lead", gates: "morale" }
  ];

  /**
   * Crew surnames. Surnames only, never a full name — a bare surname does not read as
   * a specific living person, and the crew are meant to feel like a real international
   * roster rather than a cast.
   *
   * Deliberately wide: a colony ship draws from wherever the programme recruits, and a
   * bigger pool means the five names differ meaningfully run to run. Diacritics are
   * kept because they are part of the names.
   */
  const NAMES = [
    // Slavic — Russian, Polish, Czech, Ukrainian, South Slavic, Bulgarian
    "SOKOLOV", "VOLKOV", "NOVIKOV", "ORLOV", "KUZNETSOV", "MEDVEDEV",
    "KOWALCZYK", "WÓJCIK", "ZIELIŃSKI", "KAMIŃSKI", "LEWANDOWSKA",
    "NOVÁK", "SVOBODA", "DVOŘÁK", "ČERNÝ",
    "BONDARENKO", "KOVALENKO", "TKACHENKO",
    "PETROVIĆ", "JOVANOVIĆ", "MARKOVIĆ", "HORVAT", "DIMITROV", "GEORGIEV",

    // Germanic — German, Austrian, Swiss, Dutch, Nordic
    "SCHNEIDER", "WEBER", "FISCHER", "BECKER", "HOFFMANN", "RICHTER",
    "WAGNER", "ZIMMERMANN", "SCHÄFER", "GRUBER", "HUBER", "STEINER",
    "VAN DIJK", "DE VRIES", "BAKKER", "VISSER",
    "LINDQVIST", "ANDERSSON", "LARSSON", "ERIKSEN", "HALVORSEN", "BJØRNSTAD",

    // Caucasus — Georgian, Armenian, Azerbaijani
    "BERIDZE", "GELASHVILI", "TSERETELI", "JAPARIDZE", "MAISURADZE",
    "HAKOBYAN", "SARGSYAN", "PETROSYAN", "AVETISYAN", "GRIGORYAN",
    "MAMMADOV", "HUSEYNOV", "GULIYEV",

    // and the rest of the roster
    "KOVÁCS", "OKONKWO", "PATEL", "REYES", "HADDAD", "NAKAMURA",
    "ÖZTÜRK", "MBEKI", "FERREIRA", "DUBOIS", "AL-RASHID", "TANAKA",
    "ADEYEMI", "CHEN", "SINGH", "MORALES", "OYELARAN", "RAHMAN"
  ];

  /**
   * Names contributed by supporters, loaded at runtime from the colonist manifest if
   * one is present. They join the same draw as everyone else — a manifest name is a
   * crew member, not a cameo, which means it can also be lost with all hands. That is
   * the deal, and the manifest page says so plainly.
   */
  let PATRON_NAMES = [];
  function registerPatrons(list) {
    PATRON_NAMES = (list || [])
      .map(function (n) { return String(n || "").trim().toUpperCase(); })
      .filter(function (n) { return n.length >= 2 && n.length <= 18; });
    return PATRON_NAMES.length;
  }
  function namePool() {
    return NAMES.concat(PATRON_NAMES);
  }

  /**
   * Funding tier is the difficulty dial, exactly like the original's occupation choice:
   * it changes what you can afford to load, and the score multiplier compensates.
   */
  const TIERS = {
    founder: {
      label: "Founder's Circle", money: 9000, scoreMult: 1.0,
      // Sized for a worn-drive transit (~250 days) plus a degraded recycler,
      // so ordinary repairs and the costly-but-safe event choices actually arrive.
      load: { o2: 280, water: 1020, cal: 940, fuel: 126, parts: 28 }
    },
    contract: {
      label: "Contract Crew", money: 5200, scoreMult: 1.8,
      // A careful watch finishes. Hands-off nominal does not have a pantry for bad luck.
      load: { o2: 206, water: 720, cal: 770, fuel: 108, parts: 15 }
    },
    lottery: {
      label: "Lottery Colonist", money: 2600, scoreMult: 3.2,
      // Short of a full-rations transit on purpose. Ration, repair, or bury someone.
      load: { o2: 190, water: 640, cal: 660, fuel: 90, parts: 11 }
    }
  };

  /**
   * The tier is a pressure dial, not just a pantry. Founder's Circle takes the same
   * events as everyone else and they still cost something — they just don't stack
   * into a death at half distance after the "safe" choice. Lottery is the full dose.
   * Shortage damage (no air, no water, no food) is never scaled: an empty tank kills.
   */
  const TIER_PRESSURE = {
    founder:  { hurt: 0.74, co2: 0.55, heal: 1.20, wear: 0.90 },
    contract: { hurt: 0.90, co2: 0.95, heal: 0.95, wear: 1.00 },
    lottery:  { hurt: 1.00, co2: 1.10, heal: 0.80, wear: 1.12 }
  };
  function pressure(s) { return TIER_PRESSURE[s.tier] || TIER_PRESSURE.contract; }

  const CAUSES = {
    hypoxia: "hypoxia",
    thirst:  "dehydration",
    starve:  "starvation",
    rads:    "radiation exposure",
    drift:   "the drift",
    injury:  "decompression injury",
    co2:     "CO₂ toxicity"
  };

  // Baseline per-person, per-day demand in kg.
  const USE = { o2: 0.84, water: 3.0, cal: 0.62 };

  function makeCrew(rand) {
    const pool = namePool();
    return ROLES.map(function (role) {
      const i = Math.floor(rand() * pool.length);
      const name = pool.splice(i, 1)[0];
      return {
        name: name, role: role.key, label: role.label,
        health: 100, morale: 72, alive: true,
        cause: null, dayLost: null, sick: null
      };
    });
  }

  function createRun(cfg) {
    cfg = cfg || {};
    const seedNum = typeof cfg.seed === "number" ? cfg.seed : hashSeed(cfg.seed || "MANIFEST");
    const rand = rngFrom(seedNum);
    const tierKey = TIERS[cfg.tier] ? cfg.tier : "contract";
    const tier = TIERS[tierKey];
    const buy = cfg.buy || {};

    return {
      seed: seedNum,
      seedLabel: cfg.seed || seedNum,
      rand: rand,
      tier: tierKey,
      tierLabel: tier.label,
      day: 0,
      progress: 0,
      wpIndex: 0,
      throttle: 1,
      ration: 1,
      alive: true,
      arrived: false,
      endReason: null,
      blackout: false,
      money: tier.money,
      res: {
        o2:    buy.o2    != null ? buy.o2    : tier.load.o2,
        water: buy.water != null ? buy.water : tier.load.water,
        cal:   buy.cal   != null ? buy.cal   : tier.load.cal,
        fuel:  buy.fuel  != null ? buy.fuel  : tier.load.fuel,
        parts: buy.parts != null ? buy.parts : tier.load.parts
      },
      mod: { drive: 100, hab: 100, life: 100, cargo: 100 },
      crew: makeCrew(rand),
      log: [],
      memorials: [],
      stats: { events: 0, repairs: 0, corporate: 0, daysShort: 0 }
    };
  }

  // ── derived ────────────────────────────────────────────────────────────────
  function living(s) { return s.crew.filter(function (c) { return c.alive; }); }
  function hasRole(s, key) {
    // A bruised specialist still has the skill. The bonus drops out only when they
    // are about to collapse — the old cutoff at 25 turned a bad week into a spiral
    // the moment the medic crossed it.
    return s.crew.some(function (c) { return c.alive && c.role === key && c.health > 12; });
  }
  function avgMorale(s) {
    const L = living(s);
    if (!L.length) return 0;
    return L.reduce(function (a, c) { return a + c.morale; }, 0) / L.length;
  }

  /**
   * The compounding heart of the game. Recycling scales with life-support condition,
   * so a neglected recycler quietly multiplies your consumption. A living Botanist
   * buys back a slice of it.
   */
  function recycleRate(s) {
    const base = 0.86 * (s.mod.life / 100);
    const bonus = hasRole(s, "botanist") ? 0.05 : 0;
    return Math.max(0, Math.min(0.93, base + bonus));
  }

  /**
   * Rationing scales calories fully and water partially (hygiene discipline), but
   * cannot touch oxygen. That asymmetry is deliberate: the lever the player reaches
   * for must not solve every problem, or there is no decision left to make.
   */
  function dailyUse(s) {
    const n = Math.max(1, living(s).length);
    const rec = recycleRate(s);
    const waterDiscipline = 0.62 + 0.38 * s.ration;
    return {
      o2:    USE.o2 * n * (1 - rec),
      water: USE.water * n * (1 - rec) * waterDiscipline,
      cal:   USE.cal * n * s.ration
    };
  }

  function daysLeft(s) {
    const u = dailyUse(s);
    return {
      o2:    u.o2 > 0    ? Math.floor(s.res.o2 / u.o2)       : 999,
      water: u.water > 0 ? Math.floor(s.res.water / u.water) : 999,
      cal:   u.cal > 0   ? Math.floor(s.res.cal / u.cal)     : 999
    };
  }

  /** Progress per day. A failing drive slows you down — another compounding trap. */
  function speed(s) {
    const driveFactor = 0.55 + 0.45 * (s.mod.drive / 100);
    return (s.throttle * driveFactor) / NOMINAL_DAYS;
  }
  function daysRemainingAtPace(s) {
    const v = speed(s);
    return v > 0 ? Math.ceil((1 - s.progress) / v) : 9999;
  }

  function nextWaypoint(s) { return WAYPOINTS[Math.min(s.wpIndex + 1, WAYPOINTS.length - 1)]; }
  function currentWaypoint(s) { return WAYPOINTS[s.wpIndex]; }

  function note(s, text, kind) {
    s.log.push({ day: s.day, text: text, kind: kind || "info" });
    if (s.log.length > 400) s.log.shift();
  }

  function killCrew(s, member, causeKey) {
    if (!member.alive) return;
    member.alive = false;
    member.cause = CAUSES[causeKey] || causeKey;
    member.dayLost = s.day;
    s.memorials.push({ name: member.name, label: member.label, cause: member.cause, day: s.day });
    note(s, "CREW LOST — " + member.name + " (" + member.label + "). Cause: " + member.cause + ".", "death");
    note(s, "Mission Control notes this does not affect the projected timeline.", "control");
    living(s).forEach(function (c) { c.morale -= 14; });
  }

  /** Spend parts to restore a module. The Engineer makes it go further. */
  function repair(s, moduleKey, partsSpent) {
    const key = s.mod[moduleKey] != null ? moduleKey : "life";
    const spend = Math.min(partsSpent || 1, s.res.parts);
    if (spend <= 0) return 0;
    s.res.parts -= spend;
    const eff = hasRole(s, "engineer") ? 7.5 : 4.0;
    const gain = spend * eff;
    s.mod[key] = Math.min(100, s.mod[key] + gain);
    s.stats.repairs += 1;
    return gain;
  }

  /**
   * Baseline stochastic attrition — the seed of the event system.
   *
   * Without this the voyage is near-deterministic, so a good policy always wins and a
   * bad one always loses, and nothing is ever *lost*. The trail-journey genre's drama
   * comes from a well-run party still burying someone. Scripted events layer on top of
   * this; this is the floor of bad luck that always exists.
   */
  function incident(s) {
    const L = living(s);
    if (!L.length) return;

    // Mechanical faults get likelier as the ship wears.
    const wearRisk = 0.012 + 0.030 * (1 - s.mod.life / 100) + 0.018 * (1 - s.mod.drive / 100);
    if (s.rand() < wearRisk) {
      const keys = ["life", "drive", "hab", "cargo"];
      const k = keys[Math.floor(s.rand() * keys.length)];
      const dmg = 3 + s.rand() * 7;
      s.mod[k] = Math.max(0, s.mod[k] - dmg);
      s.stats.events += 1;
      note(s, "FAULT — " + k + " module degraded (" + dmg.toFixed(1) + "%).", "fault");
      if (k === "hab") {
        const v = L[Math.floor(s.rand() * L.length)];
        v.health -= (6 + s.rand() * 10) * pressure(s).hurt;
        v.sick = "injury";
      }
    }

    // Illness. Low morale and a failing recycler both make crews sick.
    const sickRisk = 0.008 + 0.022 * (1 - avgMorale(s) / 100) + 0.014 * (1 - s.mod.life / 100);
    if (s.rand() < sickRisk) {
      const v = L[Math.floor(s.rand() * L.length)];
      const severity = 10 + s.rand() * 18;
      const mitigated = (hasRole(s, "medic") ? severity * 0.55 : severity) * pressure(s).hurt;
      v.health -= mitigated;
      v.sick = s.rand() < 0.4 ? "rads" : "co2";
      s.stats.events += 1;
      note(s, "MEDICAL — " + v.name + " is unwell (" + v.sick + ").", "medical");
    }
  }

  // ── one day ────────────────────────────────────────────────────────────────
  function step(s) {
    if (!s.alive || s.arrived) return s;
    s.day += 1;

    let L = living(s);
    if (!L.length) {
      s.alive = false;
      s.endReason = "all-hands";
      note(s, "No living crew remain aboard the MANIFEST.", "death");
      return s;
    }

    const n = L.length;
    const u = dailyUse(s);

    s.res.o2    = Math.max(0, s.res.o2 - u.o2);
    s.res.water = Math.max(0, s.res.water - u.water);
    s.res.cal   = Math.max(0, s.res.cal - u.cal);
    // Quadratic in throttle: a hard burn is priced so that sprinting the whole way
    // spends very nearly the entire tank. Sprint is meant to be a knife's edge, not
    // a free win — strand yourself and the trip stretches past your pantry.
    s.res.fuel  = Math.max(0, s.res.fuel - 0.275 * s.throttle * s.throttle);

    // Out of fuel: the drive cannot hold throttle.
    if (s.res.fuel <= 0 && s.throttle > 0.6) s.throttle = 0.6;

    // Wear. Heat from a hard burn hurts life-support too, which is the hidden cost
    // of sprinting — it accelerates the recycling spiral. The daily rates are low
    // enough that a maintained ship stays in the band where recycling still works;
    // a neglected one does not. Events, not the calendar, are what break a module.
    const wear = pressure(s).wear;
    s.mod.drive = Math.max(0, s.mod.drive - 0.048 * wear * s.throttle * (0.9 + s.rand() * 0.3));
    // Heat scales with the square of throttle, so a hard burn cooks the recycler and
    // quietly raises consumption for the rest of the voyage.
    s.mod.life  = Math.max(0, s.mod.life  - 0.072 * wear * (0.85 + s.rand() * 0.3) * (0.72 + 0.5 * s.throttle * s.throttle));

    // travel
    s.progress = Math.min(1, s.progress + speed(s));

    // shortages
    let short = false;
    if (s.res.o2 <= 0)    { short = true; L.forEach(function (c) { c.health -= 10 + s.rand() * 6; c.sick = "hypoxia"; }); }
    if (s.res.water <= 0) { short = true; L.forEach(function (c) { c.health -= 5.5 + s.rand() * 4; c.sick = "thirst"; }); }
    if (s.res.cal <= 0)   { short = true; L.forEach(function (c) { c.health -= 2.4 + s.rand() * 2; c.sick = "starve"; }); }
    if (short) s.stats.daysShort += 1;

    // Under-rationing is slow damage, not just a morale tax — this is what makes
    // "just eat less" a real decision instead of a free lever.
    if (s.ration < 1) {
      const bite = (1 - s.ration);
      // Slow, and a medic on short rations can still out-heal it. The old bite
      // plus a heal gate at full rations made "eat less" a death sentence, which
      // closed Lottery — the tier that has to ration — before Mars.
      L.forEach(function (c) { c.morale -= 0.75 * bite * 2; c.health -= 0.32 * bite * 2; });
    } else if (s.ration > 1) {
      L.forEach(function (c) { c.morale += 0.25; });
    }

    // CO₂ climbs once the scrubber is actually failing, not merely worn.
    // Above the gate a tired recycler costs you stores. Below it, it costs blood.
    if (s.mod.life < 46) {
      const sev = (46 - s.mod.life) * 0.040 * pressure(s).co2;
      L.forEach(function (c) { c.health -= sev; c.sick = "co2"; });
    }

    // The documentary drone breathes whether or not anyone is left to point it at
    // something. With no Content Lead aboard it is pure parasitic load — per STORY.md,
    // losing that slot means the drone has no handler.
    if (s.droneAboard) {
      const handled = hasRole(s, "content");
      s.res.o2 = Math.max(0, s.res.o2 - (handled ? 0.2 : 0.28));
      if (!handled && s.day % 30 === 0) {
        note(s, "The documentary unit is still recording. No one aboard is assigned to it.", "fault");
      }
    }

    // the drift
    const driftBase = s.blackout ? 0.5 : 0.2;
    const damp = hasRole(s, "content") ? 0.55 : 1;
    L.forEach(function (c) {
      c.morale -= driftBase * damp;
      // Despair hurts a fed crew. Short rations already take their health directly;
      // stacking the drift on top of that made the ration lever fatal, and Lottery
      // cannot finish a transit without it.
      if (c.morale < 18 && s.ration >= 1) c.health -= (0.55 + s.rand() * 0.6) * pressure(s).hurt;
      c.morale = Math.max(0, Math.min(100, c.morale));
    });

    // Recovery while the tanks are not empty. A tired scrubber slows it; short
    // rations slow it further. Neither one switches healing off — that gate is
    // what turned a hungry fortnight into a burial.
    const fine = !short && s.mod.life > 48 && s.ration >= 0.65;
    if (fine) {
      let heal = (hasRole(s, "medic") ? 0.85 : 0.38) * pressure(s).heal;
      if (s.mod.life < 70) heal *= 0.6;
      if (s.ration < 1) heal *= 0.55;
      L.forEach(function (c) { if (c.health < 100) c.health = Math.min(100, c.health + heal); });
    }

    incident(s);

    L.forEach(function (c) { if (c.health <= 0) killCrew(s, c, c.sick || "drift"); });

    // waypoints
    while (s.wpIndex < WAYPOINTS.length - 1 && s.progress >= WAYPOINTS[s.wpIndex + 1].at) {
      s.wpIndex += 1;
      const wp = currentWaypoint(s);
      note(s, "WAYPOINT — " + wp.name + " (day " + s.day + ").", "waypoint");
      if (wp.id === "relay") {
        s.blackout = true;
        note(s, "Telemetry link lost. Mission Control is no longer receiving.", "control");
      }
      if (wp.id === "approach" && s.blackout) {
        s.blackout = false;
        note(s, "Link restored. Mission Control welcomes you back and requests an updated crew count.", "control");
      }
      // Orbit insertion: the reserve comes due. Arriving fast and dry is its own
      // kind of failure — the ship makes it to Mars and cannot stop.
      if (wp.id === "areo") {
        // An aerodynamic capture already killed the velocity, so the reserve is never
        // spent — that saved fuel IS the reward for flying the corridor.
        if (s.aeroResult === "captured" || s.aeroResult === "captured-hot") {
          note(s, "Aerodynamic capture confirmed. No insertion burn required.", "waypoint");
        } else if (s.res.fuel >= BRAKE_RESERVE) {
          s.res.fuel -= BRAKE_RESERVE;
          note(s, "Orbit insertion burn complete. Areostationary, nominal.", "waypoint");
        } else {
          const deficit = (BRAKE_RESERVE - s.res.fuel) / BRAKE_RESERVE;
          s.res.fuel = 0;
          s.brakeShortfall = deficit;
          note(s, "INSUFFICIENT RESERVE FOR ORBIT INSERTION.", "death");
          note(s, "Mission Control advises an aggressive aerobrake. There is no second option.", "control");
          s.mod.hab = Math.max(0, s.mod.hab - 55 * deficit);
          s.mod.life = Math.max(0, s.mod.life - 40 * deficit);
          living(s).forEach(function (c) {
            c.health -= 46 * deficit * (0.75 + s.rand() * 0.5);
            c.sick = "injury";
          });
          living(s).forEach(function (c) { if (c.health <= 0) killCrew(s, c, "injury"); });
        }
      }
      if (wp.kind === "end") {
        s.arrived = true;
        s.endReason = "arrived";
        note(s, "The MANIFEST is down at Ellipse Nine.", "arrive");
      }
    }

    if (!living(s).length && !s.arrived) {
      s.alive = false;
      s.endReason = "all-hands";
    }
    return s;
  }

  /**
   * The ledger, in pieces, so a 0 and a 500 are different sentences.
   * Distance counts even when nobody is left to collect it — getting most of the
   * way there is not the same result as dying on the pad. The displayed total
   * floors at zero; `subtotal` can go negative when shortage days eat the rest,
   * and the end screen shows that line rather than a bare zero.
   */
  function scoreParts(s) {
    const surv = living(s).length;
    const crew = surv * 1200;
    const arrival = s.arrived ? 2500 : 0;
    const distance = Math.round(Math.max(0, Math.min(1, s.progress || 0)) * 800);
    const stores = Math.round((Math.max(0, s.res.o2) + Math.max(0, s.res.water) + Math.max(0, s.res.cal)) * 0.35);
    const spirit = Math.round(avgMorale(s) * 4);
    const shortage = (s.stats.daysShort || 0) * 16;
    const mult = TIERS[s.tier] ? TIERS[s.tier].scoreMult : 1;
    const subtotal = crew + arrival + distance + stores + spirit - shortage;
    return {
      crew: crew, arrival: arrival, distance: distance, stores: stores,
      spirit: spirit, shortage: shortage, mult: mult, subtotal: subtotal,
      total: Math.max(0, Math.round(subtotal * mult)),
      surv: surv, progress: s.progress || 0
    };
  }
  function score(s) { return scoreParts(s).total; }

  /**
   * The public API, bound late so choice resolution can call back into it.
   * Event code receives this object as `Haul` and must not see a half-built module.
   */
  let API = null;

  function cloneRun(s) {
    const c = JSON.parse(JSON.stringify(s, function (k, v) {
      return typeof v === "function" ? undefined : v;
    }));
    c.rand = s.rand.clone();
    return c;
  }

  /**
   * Apply a choice, then scale the health it took off by the tier. Positive healing
   * is left alone. A hit that would have killed on Lottery may leave a Founder's
   * Circle crewmember standing; if it does, the death log and the morale shock
   * come back off, because they did not die.
   */
  function commitChoice(s, choice) {
    const snap = s.crew.map(function (c) {
      return { health: c.health, alive: c.alive, name: c.name };
    });
    const mem = s.memorials.length;
    const logN = s.log.length;
    choice.apply(s, API);
    const f = pressure(s).hurt;
    if (f >= 0.999) return;
    const revived = [];
    s.crew.forEach(function (c, i) {
      const p = snap[i];
      if (!p) return;
      if (c.health < p.health) c.health = p.health + (c.health - p.health) * f;
      if (!c.alive && p.alive && c.health > 0) {
        c.alive = true;
        c.cause = null;
        c.dayLost = null;
        revived.push(c.name);
      }
    });
    if (!revived.length) return;
    // killCrew docked 14 morale from whoever was still alive at the moment of death.
    // Put that shock back. A one-point error on a double revival is acceptable;
    // a ghost memorial is not.
    s.crew.forEach(function (c) {
      if (c.alive) c.morale = Math.min(100, c.morale + 14 * revived.length);
    });
    let dropped = 0;
    s.log = s.log.filter(function (line, i) {
      if (i < logN) return true;
      if (line.kind === "death" && revived.some(function (n) { return String(line.text).indexOf(n) >= 0; })) return false;
      if (line.kind === "control" && String(line.text).indexOf("does not affect the projected timeline") >= 0 && dropped < revived.length) {
        dropped += 1;
        return false;
      }
      return true;
    });
    s.memorials = s.memorials.filter(function (m, i) {
      return i < mem || revived.indexOf(m.name) < 0;
    });
  }

  function fmtSigned(n) {
    const r = Math.round(n);
    return (r > 0 ? "+" : "") + r;
  }

  /** What a choice will actually do, from a forked copy of the voyage. */
  function forecast(s, choice) {
    const before = cloneRun(s);
    const after = cloneRun(s);
    try { commitChoice(after, choice); }
    catch (err) { return ["Outcome unclear."]; }
    const bits = [];
    const resName = { o2: "Oxygen", water: "Water", cal: "Calories", fuel: "Fuel", parts: "Parts" };
    const resUnit = { o2: " kg", water: " kg", cal: " kg", fuel: "", parts: "" };
    ["o2", "water", "cal", "fuel", "parts"].forEach(function (k) {
      const d = after.res[k] - before.res[k];
      if (Math.abs(d) < 0.5) return;
      bits.push(resName[k] + " " + fmtSigned(d) + resUnit[k]);
    });
    if (Math.abs((after.money || 0) - (before.money || 0)) >= 1) {
      const d = Math.round(after.money - before.money);
      bits.push("Credit " + (d > 0 ? "+" : "") + d.toLocaleString());
    }
    const modName = { life: "Life support", drive: "Drive", hab: "Habitat", cargo: "Cargo" };
    ["life", "drive", "hab", "cargo"].forEach(function (k) {
      const d = after.mod[k] - before.mod[k];
      if (Math.abs(d) < 0.5) return;
      bits.push(modName[k] + " " + fmtSigned(d) + "%");
    });

    const healthBits = [];
    const deathBits = [];
    after.crew.forEach(function (c, i) {
      const p = before.crew[i];
      if (!p) return;
      if (p.alive && !c.alive) deathBits.push(c.name + " dies (" + (c.cause || "lost") + ")");
      else if (p.alive && c.alive && Math.abs(c.health - p.health) >= 1) healthBits.push({ name: c.name, d: c.health - p.health });
    });
    if (healthBits.length >= 3) {
      const nums = healthBits.map(function (h) { return h.d; });
      const same = nums.every(function (n) { return Math.abs(n - nums[0]) < 1.5; });
      if (same) bits.push("Crew " + fmtSigned(nums[0]) + " health");
      else healthBits.forEach(function (h) { bits.push(h.name + " " + fmtSigned(h.d) + " health"); });
    } else {
      healthBits.forEach(function (h) { bits.push(h.name + " " + fmtSigned(h.d) + " health"); });
    }
    deathBits.forEach(function (t) { bits.push(t); });

    const mb = avgMorale(before), ma = avgMorale(after);
    if (living(after).length && Math.abs(ma - mb) >= 1) bits.push("Morale " + fmtSigned(ma - mb));
    if (!before.droneAboard && after.droneAboard) bits.push("Drone aboard — oxygen every day");
    if (before.throttle !== after.throttle) bits.push("Throttle now " + after.throttle);
    if (!bits.length) bits.push("No change to the ship");
    return bits;
  }

  function simulate(cfg, policy, maxDays) {
    const s = createRun(cfg);
    const cap = maxDays || 600;
    while (s.alive && !s.arrived && s.day < cap) {
      if (policy) policy(s);
      step(s);
    }
    if (!s.arrived && s.alive && s.day >= cap) {
      s.alive = false;
      s.endReason = "adrift";
    }
    return s;
  }

  API = {
    NOMINAL_DAYS: NOMINAL_DAYS,
    BRAKE_RESERVE: BRAKE_RESERVE,
    WAYPOINTS: WAYPOINTS, ROLES: ROLES, TIERS: TIERS, USE: USE, CAUSES: CAUSES,
    NAMES: NAMES,
    registerPatrons: registerPatrons, namePool: namePool,
    rngFrom: rngFrom, hashSeed: hashSeed,
    createRun: createRun, step: step, score: score, scoreParts: scoreParts, simulate: simulate,
    commitChoice: commitChoice, forecast: forecast,
    living: living, hasRole: hasRole, avgMorale: avgMorale,
    recycleRate: recycleRate, dailyUse: dailyUse, daysLeft: daysLeft,
    speed: speed, daysRemainingAtPace: daysRemainingAtPace,
    currentWaypoint: currentWaypoint, nextWaypoint: nextWaypoint,
    repair: repair, killCrew: killCrew, note: note
  };
  return API;
});
