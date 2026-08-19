/**
 * THE LONG HAUL — EVA salvage.
 *
 * The trail-genre hunting minigame, translated. The original's tension was never
 * marksmanship — it was that you could shoot far more than you could carry home. The
 * walk back was the game.
 *
 * Here: the suit's oxygen IS the clock, and it is drawn from the ship's own reserve, so
 * a long EVA costs the whole crew. Debris further out is worth more. Every part you
 * collect adds mass, and mass makes you harder to stop — in vacuum there is no drag, so
 * a heavy return is a slow return. Greed is priced in the one currency that kills you.
 *
 * Newtonian: thrust changes velocity, nothing slows you down but more thrust. That is
 * both the skill and the trap.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulEva = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FIELD_W = 1400;      // world units
  const FIELD_H = 900;
  const AIRLOCK = { x: 90, y: FIELD_H / 2, r: 62 };

  const SUIT_O2       = 100;     // suit charge, also the clock
  const O2_IDLE       = 0.030;   // per tick just existing
  const O2_THRUST     = 0.030;   // extra while burning
  const PROP_START    = 100;
  const PROP_THRUST   = 0.085;
  const THRUST_ACCEL  = 0.045;
  const GRAB_RANGE    = 26;
  const BASE_MASS     = 1.0;
  const MASS_PER_KG   = 0.045;   // how much each unit of haul dulls your thrust

  /** Debris further from the airlock is worth more — that is the whole decision. */
  function makeDebris(rand) {
    const out = [];
    const n = 15 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const t = rand();
      const x = 260 + t * (FIELD_W - 400);
      const y = 70 + rand() * (FIELD_H - 140);
      const far = (x - 260) / (FIELD_W - 400);      // 0 near … 1 far
      const roll = rand();
      let kind, value, mass;
      if (roll < 0.42)      { kind = "parts";  value = 1 + Math.round(far * 4); mass = 3 + far * 5; }
      else if (roll < 0.68) { kind = "o2";     value = 6 + far * 26;            mass = 4 + far * 6; }
      else if (roll < 0.88) { kind = "water";  value = 14 + far * 52;           mass = 6 + far * 9; }
      else                  { kind = "cal";    value = 12 + far * 44;           mass = 5 + far * 8; }
      out.push({
        x: x, y: y, kind: kind, value: value, mass: mass,
        r: 7 + far * 7, taken: false,
        spin: (rand() - 0.5) * 0.04, rot: rand() * 6.283,
        drift: { x: (rand() - 0.5) * 0.16, y: (rand() - 0.5) * 0.16 }
      });
    }
    return out;
  }

  function createEva(s, Haul) {
    const engineer = Haul.hasRole(s, "engineer");
    const crew = Haul.living(s);
    // Whoever goes outside is a real named person, and they can fail to come back.
    const walker = crew.length
      ? crew.slice().sort(function (a, b) { return b.health - a.health; })[0]
      : null;
    return {
      walker: walker,
      x: AIRLOCK.x, y: AIRLOCK.y, vx: 0, vy: 0,
      o2: SUIT_O2,
      // An Engineer packs the tether better: a fuller thruster pack and a leaner
      // regulator. Both are real numbers, not flavour.
      prop: PROP_START + (engineer ? 26 : 0),
      propMax: PROP_START + (engineer ? 26 : 0),
      o2Rate: engineer ? 0.90 : 1.0,
      debris: makeDebris(s.rand),
      haul: { parts: 0, o2: 0, water: 0, cal: 0 },
      mass: 0,
      docked: true,
      done: false,
      outcome: null,
      tookOff: false,
      elapsed: 0
    };
  }

  function totalMass(e) { return BASE_MASS + e.mass * MASS_PER_KG; }
  function inAirlock(e) {
    return Math.hypot(e.x - AIRLOCK.x, e.y - AIRLOCK.y) < AIRLOCK.r;
  }

  /**
   * @param {object} input {x:-1..1, y:-1..1} thrust direction
   */
  function stepEva(e, input, dt, rand) {
    if (e.done) return e;
    e.elapsed += dt;

    const thrusting = (input.x !== 0 || input.y !== 0) && e.prop > 0;
    const m = totalMass(e);

    if (thrusting) {
      const len = Math.hypot(input.x, input.y) || 1;
      const a = THRUST_ACCEL / m;
      e.vx += (input.x / len) * a * dt;
      e.vy += (input.y / len) * a * dt;
      e.prop = Math.max(0, e.prop - PROP_THRUST * dt);
      if (!e.tookOff && !inAirlock(e)) e.tookOff = true;
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // field walls are soft — you bounce, you do not die on them
    if (e.x < 12) { e.x = 12; e.vx = Math.abs(e.vx) * 0.4; }
    if (e.x > FIELD_W - 12) { e.x = FIELD_W - 12; e.vx = -Math.abs(e.vx) * 0.4; }
    if (e.y < 12) { e.y = 12; e.vy = Math.abs(e.vy) * 0.4; }
    if (e.y > FIELD_H - 12) { e.y = FIELD_H - 12; e.vy = -Math.abs(e.vy) * 0.4; }

    // oxygen burns whether or not you are doing anything useful
    e.o2 -= (O2_IDLE + (thrusting ? O2_THRUST : 0)) * e.o2Rate * dt;

    // debris drifts
    e.debris.forEach(function (d) {
      if (d.taken) return;
      d.x += d.drift.x * dt; d.y += d.drift.y * dt; d.rot += d.spin * dt;
      if (d.x < 200 || d.x > FIELD_W - 20) d.drift.x *= -1;
      if (d.y < 20 || d.y > FIELD_H - 20) d.drift.y *= -1;
    });

    // collect on contact
    e.debris.forEach(function (d) {
      if (d.taken) return;
      if (Math.hypot(e.x - d.x, e.y - d.y) < GRAB_RANGE + d.r) {
        d.taken = true;
        e.haul[d.kind] += d.value;
        e.mass += d.mass;
      }
    });

    e.docked = inAirlock(e);

    if (e.docked && e.tookOff) {
      e.done = true;
      e.outcome = "returned";
    } else if (e.o2 <= 0) {
      e.done = true;
      // You cannot suffocate standing in your own airlock. Running the clock out with
      // the hatch in reach is a wasted EVA, not a death.
      e.outcome = e.docked ? "returned" : "lost";
    }
    return e;
  }

  /** Headless flight for tuning. */
  function runEva(s, Haul, policy, cap) {
    const e = createEva(s, Haul);
    let guard = 0;
    while (!e.done && guard++ < (cap || 40000)) {
      stepEva(e, policy(e), 1.0, s.rand);
    }
    if (!e.done) { e.done = true; e.outcome = "timeout"; }
    return e;
  }

  /**
   * Bank the haul, or bury the walker. The suit's oxygen came out of ship stores, so
   * even a successful EVA has a floor cost — going outside is never free.
   */
  function resolve(e, s, Haul) {
    const spent = (SUIT_O2 - Math.max(0, e.o2)) * 0.42;
    s.res.o2 = Math.max(0, s.res.o2 - spent);

    if (e.outcome === "returned") {
      s.res.parts += Math.round(e.haul.parts);
      s.res.o2    += Math.round(e.haul.o2);
      s.res.water += Math.round(e.haul.water);
      s.res.cal   += Math.round(e.haul.cal);
      Haul.note(s, "EVA complete. " + e.walker.name + " is back inside with " +
        Math.round(e.haul.parts) + " parts, " + Math.round(e.haul.o2) + " kg O₂, " +
        Math.round(e.haul.water) + " kg water, " + Math.round(e.haul.cal) + " kg stores.", "info");
      return "returned";
    }

    // Ran the suit dry outside. This is a death with a name on it.
    if (e.walker) Haul.killCrew(s, e.walker, "hypoxia");
    Haul.note(s, "The tether came back empty.", "death");
    return "lost";
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const KIND_COL = {
    parts: "#6ee7ff", o2: "#3df0bb", water: "#8ab6ff", cal: "#ffb547"
  };
  const KIND_LABEL = { parts: "PARTS", o2: "O₂", water: "H₂O", cal: "STORES" };

  function draw(ctx, e, w, h, t) {
    const sc = Math.min(w / FIELD_W, h / FIELD_H);
    const ox = (w - FIELD_W * sc) / 2;
    const oy = (h - FIELD_H * sc) / 2;

    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(sc, sc);

    // starfield
    for (let i = 0; i < 90; i++) {
      const sx = (i * 197 % FIELD_W), sy = (i * 419 % FIELD_H);
      ctx.fillStyle = i % 5 === 0 ? "rgba(234,244,255,.5)" : "rgba(140,170,200,.28)";
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // value gradient — a visual reminder that the good stuff is far from the door
    const vg = ctx.createLinearGradient(260, 0, FIELD_W, 0);
    vg.addColorStop(0, "rgba(110,231,255,0.00)");
    vg.addColorStop(1, "rgba(194,86,44,0.10)");
    ctx.fillStyle = vg;
    ctx.fillRect(260, 0, FIELD_W - 260, FIELD_H);

    // the ship + airlock
    ctx.fillStyle = "rgba(110,231,255,0.07)";
    ctx.beginPath(); ctx.arc(AIRLOCK.x, AIRLOCK.y, AIRLOCK.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.docked ? "#3df0bb" : "#6ee7ff";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.arc(AIRLOCK.x, AIRLOCK.y, AIRLOCK.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#5c6773";
    ctx.fillRect(0, AIRLOCK.y - 88, 62, 176);
    ctx.fillStyle = "#c8d2dc";
    ctx.fillRect(50, AIRLOCK.y - 22, 22, 44);
    ctx.fillStyle = "#ffb547";
    ctx.fillRect(4, AIRLOCK.y - 62, 8, 8);
    ctx.fillRect(4, AIRLOCK.y + 54, 8, 8);
    ctx.fillStyle = "#6c8aa6";
    ctx.font = "13px ui-monospace,monospace";
    ctx.fillText("AIRLOCK", 8, AIRLOCK.y - 100);

    // debris
    e.debris.forEach(function (d) {
      if (d.taken) return;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = KIND_COL[d.kind];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -d.r);
      ctx.lineTo(d.r * 0.85, -d.r * 0.2);
      ctx.lineTo(d.r * 0.55, d.r * 0.85);
      ctx.lineTo(-d.r * 0.55, d.r * 0.85);
      ctx.lineTo(-d.r * 0.85, -d.r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#03050a";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = KIND_COL[d.kind];
      ctx.font = "9px ui-monospace,monospace";
      ctx.fillText(KIND_LABEL[d.kind], d.x - 12, d.y + d.r + 13);
      ctx.globalAlpha = 1;
    });

    // tether back to the airlock — the umbilical you are always aware of
    ctx.strokeStyle = "rgba(110,231,255,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(AIRLOCK.x, AIRLOCK.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();

    // the walker
    ctx.save();
    ctx.translate(e.x, e.y);
    const ang = Math.atan2(e.vy, e.vx);
    ctx.rotate(ang);
    ctx.fillStyle = e.o2 < 25 ? "#ff7a9a" : "#e8edf5";
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#233043";
    ctx.beginPath(); ctx.arc(2.5, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8fa4b8";
    ctx.fillRect(-11, -5.5, 5, 11);
    ctx.restore();

    // grab radius
    ctx.strokeStyle = "rgba(61,240,187,0.22)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(e.x, e.y, GRAB_RANGE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // ── HUD ──────────────────────────────────────────────────────────────────
    function bar(x, y, ww, label, frac, col, txt) {
      ctx.fillStyle = "#6c8aa6";
      ctx.font = "9px ui-monospace,monospace";
      ctx.fillText(label, x, y - 5);
      ctx.fillStyle = "rgba(20,30,42,0.92)";
      ctx.fillRect(x, y, ww, 7);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, ww * Math.max(0, Math.min(1, frac)), 7);
      ctx.fillStyle = "#c8d2dc";
      ctx.font = "10px ui-monospace,monospace";
      ctx.fillText(txt, x + ww + 8, y + 7);
    }

    const gw = Math.min(180, w * 0.2);
    const o2f = e.o2 / SUIT_O2;
    bar(16, 22, gw, "SUIT OXYGEN",
      o2f, o2f < 0.25 ? "#ff7a9a" : o2f < 0.5 ? "#ffb547" : "#3df0bb",
      e.o2.toFixed(0) + "%");
    bar(16, 48, gw, "PROPELLANT",
      e.prop / (e.propMax || PROP_START), "#6ee7ff",
      Math.max(0, e.prop).toFixed(0));
    bar(16, 74, gw, "HAUL MASS — SLOWS YOU",
      Math.min(1, e.mass / 90), "#ffb547", e.mass.toFixed(0) + " kg");

    // haul tally
    let hx = 16, hy = 108;
    ctx.font = "10px ui-monospace,monospace";
    ["parts", "o2", "water", "cal"].forEach(function (k) {
      ctx.fillStyle = KIND_COL[k];
      ctx.fillText(KIND_LABEL[k] + " " + Math.round(e.haul[k]), hx, hy);
      hx += 74;
    });

    if (e.walker) {
      ctx.fillStyle = "#6c8aa6";
      ctx.font = "10px ui-monospace,monospace";
      ctx.fillText("OUTSIDE: " + e.walker.name, 16, 128);
    }

    // the nag that matters
    if (!e.docked && e.tookOff) {
      const dist = Math.hypot(e.x - AIRLOCK.x, e.y - AIRLOCK.y);
      const warn = o2f < 0.42;
      ctx.fillStyle = warn ? "#ff7a9a" : "#6c8aa6";
      ctx.font = (warn ? "700 " : "") + "11px ui-monospace,monospace";
      ctx.textAlign = "right";
      ctx.fillText((warn ? "⚠ GET BACK — " : "") + "RANGE TO AIRLOCK " + Math.round(dist), w - 16, 26);
      ctx.textAlign = "left";
    }
  }

  return {
    FIELD_W: FIELD_W, FIELD_H: FIELD_H, AIRLOCK: AIRLOCK,
    SUIT_O2: SUIT_O2, PROP_START: PROP_START, GRAB_RANGE: GRAB_RANGE,
    createEva: createEva, stepEva: stepEva, runEva: runEva,
    resolve: resolve, draw: draw, totalMass: totalMass, inAirlock: inAirlock
  };
});
