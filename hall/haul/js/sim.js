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
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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

  // Surnames only — never a full name that reads as a specific real person.
  const NAMES = [
    "KOVÁCS", "OKONKWO", "PATEL", "REYES", "LINDQVIST", "HADDAD", "NAKAMURA",
    "ÖZTÜRK", "MBEKI", "SOKOLOV", "FERREIRA", "DUBOIS", "AL-RASHID", "TANAKA"
  ];

  /**
   * Funding tier is the difficulty dial, exactly like the original's occupation choice:
   * it changes what you can afford to load, and the score multiplier compensates.
   */
  const TIERS = {
    founder: {
      label: "Founder's Circle", money: 9000, scoreMult: 1.0,
      load: { o2: 245, water: 845, cal: 900, fuel: 122, parts: 26 }
    },
    contract: {
      label: "Contract Crew", money: 5200, scoreMult: 1.8,
      load: { o2: 197, water: 692, cal: 742, fuel: 100, parts: 14 }
    },
    lottery: {
      label: "Lottery Colonist", money: 2600, scoreMult: 3.2,
      load: { o2: 190, water: 668, cal: 700, fuel: 92, parts: 13 }
    }
  };

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
    const pool = NAMES.slice();
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
    return s.crew.some(function (c) { return c.alive && c.role === key && c.health > 25; });
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
        v.health -= 6 + s.rand() * 10;
        v.sick = "injury";
      }
    }

    // Illness. Low morale and a failing recycler both make crews sick.
    const sickRisk = 0.008 + 0.022 * (1 - avgMorale(s) / 100) + 0.014 * (1 - s.mod.life / 100);
    if (s.rand() < sickRisk) {
      const v = L[Math.floor(s.rand() * L.length)];
      const severity = 10 + s.rand() * 18;
      const mitigated = hasRole(s, "medic") ? severity * 0.55 : severity;
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
    // of sprinting — it accelerates the recycling spiral.
    s.mod.drive = Math.max(0, s.mod.drive - 0.075 * s.throttle * (0.9 + s.rand() * 0.3));
    // Heat scales with the square of throttle, so a hard burn cooks the recycler and
    // quietly raises consumption for the rest of the voyage.
    s.mod.life  = Math.max(0, s.mod.life  - 0.110 * (0.85 + s.rand() * 0.3) * (0.72 + 0.5 * s.throttle * s.throttle));

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
      L.forEach(function (c) { c.morale -= 0.75 * bite * 2; c.health -= 0.5 * bite * 2; });
    } else if (s.ration > 1) {
      L.forEach(function (c) { c.morale += 0.25; });
    }

    // CO₂ climbs as life-support fails
    if (s.mod.life < 55) {
      const sev = (55 - s.mod.life) * 0.055;
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
      if (c.morale < 18) c.health -= 0.55 + s.rand() * 0.6;
      c.morale = Math.max(0, Math.min(100, c.morale));
    });

    // recovery only when genuinely stable
    const fine = !short && s.mod.life > 62 && s.ration >= 1;
    if (fine) {
      const heal = hasRole(s, "medic") ? 0.85 : 0.3;
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

  function score(s) {
    const surv = living(s).length;
    const base = surv * 1200
      + Math.round(avgMorale(s) * 6)
      + Math.round((s.res.o2 + s.res.water + s.res.cal) * 0.4)
      + (s.arrived ? 2500 : 0)
      - s.stats.daysShort * 40;
    return Math.max(0, Math.round(base * TIERS[s.tier].scoreMult));
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

  return {
    NOMINAL_DAYS: NOMINAL_DAYS,
    BRAKE_RESERVE: BRAKE_RESERVE,
    WAYPOINTS: WAYPOINTS, ROLES: ROLES, TIERS: TIERS, USE: USE, CAUSES: CAUSES,
    rngFrom: rngFrom, hashSeed: hashSeed,
    createRun: createRun, step: step, score: score, simulate: simulate,
    living: living, hasRole: hasRole, avgMorale: avgMorale,
    recycleRate: recycleRate, dailyUse: dailyUse, daysLeft: daysLeft,
    speed: speed, daysRemainingAtPace: daysRemainingAtPace,
    currentWaypoint: currentWaypoint, nextWaypoint: nextWaypoint,
    repair: repair, killCrew: killCrew, note: note
  };
});
