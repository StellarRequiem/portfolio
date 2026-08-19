/**
 * THE LONG HAUL — the Aerobrake.
 *
 * Act III's river crossing. Per NAMING.md the corridor offers four ways across:
 * direct burn / aerobrake / slow spiral / tug. This module is the aerobrake itself —
 * the one moment the player's hands should shake.
 *
 * THE LOOP: only depth bleeds velocity, and only depth builds heat. You must go as
 * deep as you dare for as long as you dare, then pull up and cool before the hull
 * gives. Sustained full depth bleeds just enough to capture at almost exactly the
 * moment it burns you through — so the pass cannot be held down, it has to be
 * *flown*. That is the whole game compressed into forty seconds.
 *
 * Pure logic is separated from rendering so the pass can be simulated headlessly and
 * tuned the same way the voyage was.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulAero = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ARC_TOTAL   = 100;    // length of the atmospheric pass
  const VEL_START   = 1.00;
  const VEL_CAPTURE = 0.30;   // at or below this you are captured
  const SKIP_DEPTH  = 0.10;   // shallower than this stops bleeding entirely

  /** Heat the hull tolerates before burn-through. A battered ship has less margin. */
  function heatLimit(mod) {
    return 0.55 + 0.45 * (Math.max(0, Math.min(100, mod.hab)) / 100);
  }

  /**
   * @param {object} s     live run state
   * @param {object} Haul  sim module (for role checks)
   */
  function createPass(s, Haul) {
    const pilot = Haul.hasRole(s, "pilot");
    return {
      arc: 0,
      vel: VEL_START,
      heat: 0,
      depth: 0.12,
      cmd: 0.12,
      shear: 0,
      shearPhase: s.rand() * Math.PI * 2,
      pilot: pilot,
      // A living Pilot flies a steadier line and has real control authority. Without
      // one the corridor wanders hard enough to throw you into the thermal band or
      // out of the atmosphere on its own — which is the Pilot slot earning its keep.
      shearAmp: pilot ? 0.075 : 0.215,
      authority: pilot ? 0.030 : 0.014,
      limit: heatLimit(s.mod),
      done: false,
      outcome: null,
      peakHeat: 0,
      deepTime: 0
    };
  }

  /**
   * Advance the pass.
   * @param {number} input -1 pull up · 0 hold · +1 push deeper
   * @param {number} dt    arc units this tick
   * @param {function} rand seeded RNG from the run
   */
  function stepPass(p, input, dt, rand) {
    if (p.done) return p;

    p.cmd = Math.max(0, Math.min(1, p.cmd + input * p.authority * dt * 12));

    // Turbulence: two out-of-phase waves plus noise, so the wander never settles into
    // a rhythm you can memorise. You are never exactly where you commanded, which is
    // what makes this a flight and not a slider.
    p.shearPhase += dt * 0.09;
    p.shear = Math.sin(p.shearPhase) * p.shearAmp * 0.72
            + Math.sin(p.shearPhase * 2.37 + 1.1) * p.shearAmp * 0.44
            + (rand() - 0.5) * p.shearAmp * 0.6;
    p.depth = Math.max(0, Math.min(1, p.cmd + p.shear));

    // Only real depth bleeds velocity.
    if (p.depth > SKIP_DEPTH) {
      p.vel = Math.max(0, p.vel - Math.pow(p.depth, 1.5) * 0.021 * dt);
      p.deepTime += dt;
    }

    // Heat in, heat out.
    p.heat += Math.pow(p.depth, 2.3) * 0.030 * dt;
    p.heat -= Math.max(0, 0.35 - p.depth) * 0.045 * dt;
    p.heat = Math.max(0, p.heat);
    if (p.heat > p.peakHeat) p.peakHeat = p.heat;

    p.arc += dt;

    if (p.heat >= p.limit) {
      p.done = true;
      p.outcome = "burned";
    } else if (p.vel <= VEL_CAPTURE) {
      p.done = true;
      p.outcome = p.heat > p.limit * 0.72 ? "captured-hot" : "captured";
    } else if (p.arc >= ARC_TOTAL) {
      p.done = true;
      p.outcome = "skipped";
    }
    return p;
  }

  /** Headless helper: fly the whole pass with a policy. Used by the tuner. */
  function flyPass(s, Haul, policy) {
    const p = createPass(s, Haul);
    let guard = 0;
    while (!p.done && guard++ < 20000) {
      stepPass(p, policy(p), 0.35, s.rand);
    }
    return p;
  }

  /**
   * Apply the pass result to the run. This is the only place the aerobrake touches
   * game state, so consequences stay auditable.
   */
  function resolve(p, s, Haul) {
    const L = Haul.living(s);
    switch (p.outcome) {
      case "captured":
        Haul.note(s, "Aerobrake nominal. Captured at " + (p.vel * 100).toFixed(0) +
          "% entry velocity, peak thermal " + (p.peakHeat * 100).toFixed(0) + "%.", "waypoint");
        Haul.note(s, "Mission Control congratulates the crew on a fuel-efficient arrival.", "control");
        s.aeroResult = "captured";
        return "captured";

      case "captured-hot":
        Haul.note(s, "Captured — but the pass ran hot. Thermal protection is compromised.", "fault");
        s.mod.hab = Math.max(0, s.mod.hab - 26);
        s.mod.life = Math.max(0, s.mod.life - 12);
        L.forEach(function (c) {
          c.health -= 14 + s.rand() * 12;
          c.sick = "injury";
        });
        L.forEach(function (c) { if (c.health <= 0) Haul.killCrew(s, c, "injury"); });
        s.aeroResult = "captured-hot";
        return "captured-hot";

      case "skipped":
        Haul.note(s, "Skipped out. The MANIFEST is back in vacuum with the corridor behind it.", "fault");
        Haul.note(s, "Mission Control recommends attempting the corridor again at the next opportunity.", "control");
        // Bounced back out: the voyage stretches, and everyone keeps breathing.
        s.progress = Math.max(0.90, s.progress - 0.035);
        s.wpIndex = Math.max(0, s.wpIndex - 1);
        s.aeroResult = "skipped";
        return "skipped";

      case "burned":
      default:
        Haul.note(s, "THERMAL FAILURE IN THE CORRIDOR.", "death");
        s.mod.hab = Math.max(0, s.mod.hab - 62);
        s.mod.life = Math.max(0, s.mod.life - 45);
        L.forEach(function (c) {
          c.health -= 42 + s.rand() * 30;
          c.sick = "injury";
        });
        L.forEach(function (c) { if (c.health <= 0) Haul.killCrew(s, c, "injury"); });
        if (Haul.living(s).length) {
          Haul.note(s, "What is left of the MANIFEST is in a capture orbit.", "fault");
          s.aeroResult = "burned";
        } else {
          s.alive = false;
          s.endReason = "burned";
        }
        return "burned";
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const C = {
    void: "#03050a", rust: "#c2562c", rustLt: "#e8834f", hot: "#ffd08a",
    hull: "#c8d2dc", dim: "#6c8aa6", cyan: "#6ee7ff", mint: "#3df0bb",
    amber: "#ffb547", rose: "#ff7a9a"
  };

  function draw(ctx, p, w, h, t) {
    ctx.fillStyle = C.void;
    ctx.fillRect(0, 0, w, h);

    // Mars limb: the planet fills the lower frame, curving away.
    const horizonY = h * 1.62;
    const R = h * 1.30;
    const cx = w * 0.5;

    // atmosphere band — the thing you are flying through
    const glow = ctx.createRadialGradient(cx, horizonY, R * 0.90, cx, horizonY, R * 1.16);
    glow.addColorStop(0, "rgba(232,131,79,0)");
    glow.addColorStop(0.55, "rgba(232,131,79,0.30)");
    glow.addColorStop(0.82, "rgba(255,208,138,0.22)");
    glow.addColorStop(1, "rgba(110,231,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // planet body
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, horizonY, R, 0, Math.PI * 2);
    ctx.clip();
    const g = ctx.createLinearGradient(0, h * 0.45, 0, h);
    g.addColorStop(0, C.rustLt);
    g.addColorStop(0.45, C.rust);
    g.addColorStop(1, "#4a1b0c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // corridor guides — the band you are trying to hold
    const bandTop = h * 0.22, bandBot = h * 0.78;
    function depthToY(d) { return bandTop + (bandBot - bandTop) * d; }

    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(110,231,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(0, depthToY(SKIP_DEPTH)); ctx.lineTo(w, depthToY(SKIP_DEPTH));
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,122,154,0.42)";
    ctx.beginPath();
    ctx.moveTo(0, depthToY(0.88)); ctx.lineTo(w, depthToY(0.88));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "9px ui-monospace,monospace";
    ctx.fillStyle = "rgba(110,231,255,0.6)";
    ctx.fillText("SKIP-OUT — NO BRAKING ABOVE THIS LINE", 12, depthToY(SKIP_DEPTH) - 5);
    ctx.fillStyle = "rgba(255,122,154,0.7)";
    ctx.fillText("THERMAL LIMIT", 12, depthToY(0.88) + 12);

    // the ship, riding the corridor
    const sx = w * 0.36;
    const sy = depthToY(p.depth);
    const sheath = Math.min(1, p.depth * 0.75 + p.heat * 0.55);

    if (sheath > 0.05) {
      const plume = 46 + 120 * sheath;
      const pg = ctx.createLinearGradient(sx - 14, sy, sx - 14 - plume, sy);
      pg.addColorStop(0, "rgba(255,232,190," + (0.75 * sheath) + ")");
      pg.addColorStop(0.35, "rgba(255,150,80," + (0.5 * sheath) + ")");
      pg.addColorStop(1, "rgba(200,60,30,0)");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy - 11 * sheath - 4);
      ctx.lineTo(sx - 10 - plume, sy - 2);
      ctx.lineTo(sx - 10 - plume, sy + 2);
      ctx.lineTo(sx - 10, sy + 11 * sheath + 4);
      ctx.closePath();
      ctx.fill();

      // shock ripples
      ctx.strokeStyle = "rgba(255,220,170," + (0.30 * sheath) + ")";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const o = ((t * 0.22 + i * 26) % 78);
        ctx.beginPath();
        ctx.arc(sx - 6 - o, sy, 9 + o * 0.42, Math.PI * 0.42, Math.PI * 1.58);
        ctx.stroke();
      }
    }

    // hull, nose-first into the flow
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-0.12);
    ctx.fillStyle = p.heat > p.limit * 0.72 ? C.hot : C.hull;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-2, -8); ctx.lineTo(-13, -6);
    ctx.lineTo(-13, 6); ctx.lineTo(-2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(20,28,38,0.85)";
    ctx.fillRect(-9, -4, 7, 8);
    ctx.restore();

    // ── HUD ────────────────────────────────────────────────────────────────
    function gauge(x, y, ww, label, frac, col, txt) {
      ctx.fillStyle = C.dim;
      ctx.font = "9px ui-monospace,monospace";
      ctx.fillText(label, x, y - 5);
      ctx.fillStyle = "rgba(20,30,42,0.9)";
      ctx.fillRect(x, y, ww, 7);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, ww * Math.max(0, Math.min(1, frac)), 7);
      ctx.fillStyle = C.hull;
      ctx.font = "10px ui-monospace,monospace";
      ctx.fillText(txt, x + ww + 8, y + 7);
    }

    const gw = Math.min(190, w * 0.24);

    // velocity — capture zone marked so the goal is legible at a glance
    gauge(16, 22, gw, "ENTRY VELOCITY", p.vel, p.vel > VEL_CAPTURE ? C.cyan : C.mint,
      (p.vel * 100).toFixed(0) + "%");
    ctx.fillStyle = "rgba(61,240,187,0.85)";
    ctx.fillRect(16 + gw * VEL_CAPTURE - 1, 20, 2, 11);

    // heat — limit marked, because a damaged hull has a lower one
    const heatCol = p.heat > p.limit * 0.72 ? C.rose : p.heat > p.limit * 0.45 ? C.amber : C.mint;
    gauge(16, 48, gw, "THERMAL LOAD", p.heat / p.limit, heatCol,
      (p.heat / p.limit * 100).toFixed(0) + "%");

    // pass progress
    gauge(16, 74, gw, "CORRIDOR", p.arc / ARC_TOTAL, C.dim,
      Math.max(0, ARC_TOTAL - p.arc).toFixed(0));

    if (!p.pilot) {
      ctx.fillStyle = C.rose;
      ctx.font = "10px ui-monospace,monospace";
      ctx.fillText("NO PILOT ABOARD — CONTROL AUTHORITY DEGRADED", 16, 104);
    }
  }

  return {
    ARC_TOTAL: ARC_TOTAL,
    VEL_START: VEL_START,
    VEL_CAPTURE: VEL_CAPTURE,
    SKIP_DEPTH: SKIP_DEPTH,
    heatLimit: heatLimit,
    createPass: createPass,
    stepPass: stepPass,
    flyPass: flyPass,
    resolve: resolve,
    draw: draw
  };
});
