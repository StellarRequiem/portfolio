/**
 * THE LONG HAUL — procedural scene renderer.
 *
 * Per the art contract in DESIGN.md: every scene ships a deterministic procedural
 * renderer FIRST, so the game is playable with zero art dependency. Painted PNGs swap
 * in per-asset later with these as permanent fallbacks.
 *
 * Visual law (inverse of the realm bible): vacuum has no fill light. One hard key
 * source, deep black shadow, no soft warm ambient. Warmth only ever comes from
 * screens, fire, and Mars itself.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulScenes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PAL = {
    void0:  "#04060a",
    void1:  "#080d16",
    hull:   "#c8d2dc",
    hullDk: "#5c6773",
    hullSh: "#232c38",
    rust:   "#c2562c",
    rustDk: "#7d3319",
    rustLt: "#e8834f",
    cyan:   "#6ee7ff",
    amber:  "#ffb547",
    mint:   "#3df0bb",
    rose:   "#ff7a9a",
    dim:    "#6c8aa6"
  };

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

  // ── starfield ──────────────────────────────────────────────────────────────
  function makeStars(seed, n, w, h) {
    const r = rngFrom(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        x: r() * w,
        y: r() * h,
        z: 0.25 + r() * 0.75,          // parallax depth
        s: r() < 0.86 ? 1 : 2,
        tw: r() * Math.PI * 2          // twinkle phase
      });
    }
    return out;
  }

  function drawStars(ctx, stars, w, h, t, drift) {
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const x = (st.x - t * drift * st.z) % w;
      const px = x < 0 ? x + w : x;
      const a = 0.30 + 0.55 * st.z * (0.72 + 0.28 * Math.sin(t * 0.0016 + st.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = st.z > 0.8 ? "#eaf4ff" : "#9fb6cc";
      ctx.fillRect(px | 0, st.y | 0, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawNebula(ctx, w, h, seed) {
    const r = rngFrom(seed ^ 0x9e37);
    for (let i = 0; i < 3; i++) {
      const cx = r() * w, cy = r() * h;
      const rad = (0.28 + r() * 0.34) * Math.max(w, h);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const hue = i === 0 ? "40,80,140" : i === 1 ? "90,50,120" : "30,110,120";
      g.addColorStop(0, "rgba(" + hue + ",0.16)");
      g.addColorStop(1, "rgba(" + hue + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ── Mars, growing as the voyage proceeds ───────────────────────────────────
  function drawMars(ctx, cx, cy, radius, t) {
    if (radius < 0.6) return;
    ctx.save();

    // atmosphere halo
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.3);
    halo.addColorStop(0, "rgba(232,131,79,0.30)");
    halo.addColorStop(1, "rgba(232,131,79,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2); ctx.fill();

    // body — hard terminator, no fill light
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius * 0.7, cy + radius);
    g.addColorStop(0, PAL.rustLt);
    g.addColorStop(0.45, PAL.rust);
    g.addColorStop(0.78, PAL.rustDk);
    g.addColorStop(1, "#160a06");
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    // surface mottling, deterministic
    const r = rngFrom(0x4d41);
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * radius * 0.92;
      const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
      const rr = radius * (0.05 + r() * 0.16);
      ctx.fillStyle = r() < 0.5 ? "#40170c" : "#f0a377";
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
    }
    // polar cap
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#e8eef5";
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.12, cy - radius * 0.86, radius * 0.42, radius * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawEarth(ctx, cx, cy, radius) {
    if (radius < 0.6) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    g.addColorStop(0, "#6fb6e8");
    g.addColorStop(0.5, "#2d6f9e");
    g.addColorStop(1, "#07131f");
    ctx.fillStyle = g;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#3f7a4a";
    const r = rngFrom(0x3a12);
    for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2, d = r() * radius * 0.8;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, radius * (0.12 + r() * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * The MANIFEST, side elevation. Module condition is visible: damaged sections
   * darken toward hull-shadow and vent particles. The ship should look like
   * industrial freight, not a sleek concept render — it is a truck.
   */
  function drawShip(ctx, x, y, scale, mod, throttle, t, vent) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    function cond(v) { return Math.max(0, Math.min(1, v / 100)); }
    function hullFor(v) {
      const c = cond(v);
      if (c > 0.72) return PAL.hull;
      if (c > 0.42) return PAL.hullDk;
      return PAL.hullSh;
    }

    // drive plume — flickers with throttle
    if (throttle > 0.05) {
      const len = 30 * throttle * (0.82 + 0.18 * Math.sin(t * 0.05));
      const pg = ctx.createLinearGradient(-46, 0, -46 - len, 0);
      pg.addColorStop(0, "rgba(110,231,255,0.92)");
      pg.addColorStop(0.35, "rgba(120,170,255,0.5)");
      pg.addColorStop(1, "rgba(90,120,255,0)");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(-46, -6);
      ctx.lineTo(-46 - len, -1.6);
      ctx.lineTo(-46 - len, 1.6);
      ctx.lineTo(-46, 6);
      ctx.closePath();
      ctx.fill();
    }

    // drive bell
    ctx.fillStyle = hullFor(mod.drive);
    ctx.beginPath();
    ctx.moveTo(-46, -7); ctx.lineTo(-34, -10); ctx.lineTo(-34, 10); ctx.lineTo(-46, 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.hullSh;
    ctx.fillRect(-36, -10, 3, 20);

    // spine
    ctx.fillStyle = PAL.hullDk;
    ctx.fillRect(-34, -2.5, 46, 5);

    // life-support ring — the module that decides the voyage
    const lifeC = cond(mod.life);
    ctx.fillStyle = hullFor(mod.life);
    ctx.fillRect(-22, -11, 12, 22);
    ctx.fillStyle = lifeC > 0.5 ? PAL.mint : PAL.rose;
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.004));
    ctx.fillRect(-20, -8, 8, 3);
    ctx.globalAlpha = 1;

    // cargo pods
    ctx.fillStyle = hullFor(mod.cargo);
    for (let i = 0; i < 3; i++) ctx.fillRect(-8 + i * 9, -9, 7, 18);
    ctx.fillStyle = PAL.hullSh;
    for (let i = 0; i < 3; i++) ctx.fillRect(-8 + i * 9, -1, 7, 2);

    // hab cylinder + lit windows
    ctx.fillStyle = hullFor(mod.hab);
    ctx.beginPath();
    ctx.moveTo(20, -12); ctx.lineTo(44, -8); ctx.lineTo(48, 0);
    ctx.lineTo(44, 8); ctx.lineTo(20, 12);
    ctx.closePath(); ctx.fill();
    const habC = cond(mod.hab);
    ctx.fillStyle = habC > 0.4 ? PAL.amber : PAL.hullSh;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = habC > 0.4 ? (0.55 + 0.45 * Math.sin(t * 0.002 + i)) : 0.25;
      ctx.fillRect(26 + i * 5, -3, 3, 3);
    }
    ctx.globalAlpha = 1;

    // solar wings
    ctx.strokeStyle = PAL.hullDk;
    ctx.lineWidth = 1.2;
    ctx.fillStyle = "rgba(60,110,150,0.55)";
    [-1, 1].forEach(function (s) {
      ctx.save();
      ctx.translate(-14, 0);
      ctx.beginPath();
      ctx.moveTo(0, s * 11); ctx.lineTo(-3, s * 34); ctx.lineTo(11, s * 34); ctx.lineTo(9, s * 11);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // venting — the visual tell that something just broke
    if (vent && vent.length) {
      vent.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
        ctx.fillStyle = p.hot ? PAL.rustLt : "#cfe6f5";
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
      });
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── vignette backdrops for event scenes ────────────────────────────────────
  const VIGNETTE = {
    "debris-field": function (ctx, w, h, t) {
      const r = rngFrom(0xdeb1);
      for (let i = 0; i < 46; i++) {
        const bx = (r() * w + t * (0.12 + r() * 0.3)) % w;
        const by = r() * h;
        const sz = 1 + r() * 5;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(t * 0.001 * (r() - 0.5) * 8);
        ctx.fillStyle = i % 3 === 0 ? PAL.hullDk : PAL.hullSh;
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz * (0.4 + r() * 0.9));
        ctx.restore();
      }
    },
    "solar-flare": function (ctx, w, h, t) {
      const g = ctx.createLinearGradient(0, 0, w, h * 0.4);
      const pulse = 0.24 + 0.14 * Math.sin(t * 0.006);
      g.addColorStop(0, "rgba(255,181,71," + pulse + ")");
      g.addColorStop(0.55, "rgba(194,86,44,0.10)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 26; i++) {
        const y = (i / 26) * h;
        ctx.fillStyle = "rgba(255,214,150,0.5)";
        ctx.fillRect(0, y + Math.sin(t * 0.004 + i) * 5, w, 0.6);
      }
      ctx.globalAlpha = 1;
    },
    "station": function (ctx, w, h, t) {
      ctx.save();
      ctx.translate(w * 0.74, h * 0.42);
      ctx.strokeStyle = PAL.hullDk;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.0004;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
        ctx.stroke();
      }
      ctx.fillStyle = PAL.hull;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = PAL.amber;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.003);
      ctx.fillRect(-6, -6, 4, 4); ctx.fillRect(2, 1, 4, 4);
      ctx.globalAlpha = 1;
      ctx.restore();
    },
    "blackout": function (ctx, w, h, t) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.10 + 0.06 * Math.sin(t * 0.01);
      ctx.fillStyle = PAL.rose;
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      ctx.globalAlpha = 1;
    }
  };

  function drawVignette(ctx, key, w, h, t) {
    const fn = VIGNETTE[key];
    if (fn) fn(ctx, w, h, t);
  }

  return {
    PAL: PAL,
    rngFrom: rngFrom,
    makeStars: makeStars,
    drawStars: drawStars,
    drawNebula: drawNebula,
    drawMars: drawMars,
    drawEarth: drawEarth,
    drawShip: drawShip,
    drawVignette: drawVignette,
    VIGNETTE_KEYS: Object.keys(VIGNETTE)
  };
});
