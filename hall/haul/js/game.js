/**
 * THE LONG HAUL — browser shell: render loop, dashboard, event presentation.
 *
 * All rules live in sim.js; all drawing lives in scenes.js; all writing lives in
 * events.js. This file is glue and presentation only — it must never decide an
 * outcome, or the determinism contract (same seed => same run) breaks.
 */
(function () {
  "use strict";

  const S = window.HaulScenes;
  const E = window.HaulEvents;

  const $ = function (id) { return document.getElementById(id); };
  const cv = $("view");
  const ctx = cv.getContext("2d");

  let run = null;
  let stars = [];
  let vent = [];
  let raf = null;
  let running = false;
  let tAcc = 0, last = 0;
  let seen = {};
  let pendingEvent = null;
  let typeTimer = null;

  const DAY_MS = 190;          // wall-clock per sim day while RUN is engaged
  let shake = 0;

  // ── setup: tier picker ─────────────────────────────────────────────────────
  const TIER_COPY = {
    founder:  { diff: "FORGIVING · ×1.0", p: "The company likes you. Full pantry, deep tank, spare parts to burn. You will probably arrive." },
    contract: { diff: "STANDARD · ×1.8",  p: "You are here to work. Enough of everything, margin for nothing. Mistakes compound." },
    lottery:  { diff: "BRUTAL · ×3.2",    p: "You won a seat. You did not win supplies. Ration from day one and bury someone anyway." }
  };
  let chosenTier = null;

  (function buildTiers() {
    const wrap = $("tiers");
    Object.keys(window.Haul.TIERS).forEach(function (key) {
      const t = window.Haul.TIERS[key];
      const c = TIER_COPY[key];
      const b = document.createElement("button");
      b.className = "tier";
      b.dataset.tier = key;
      b.innerHTML = "<h3>" + t.label + "</h3><div class='diff'>" + c.diff + "</div><p>" + c.p + "</p>";
      b.addEventListener("click", function () {
        chosenTier = key;
        wrap.querySelectorAll(".tier").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        const go = $("launch");
        go.disabled = false;
        go.textContent = "LAUNCH — " + t.label.toUpperCase();
      });
      wrap.appendChild(b);
    });
  })();

  $("launch").addEventListener("click", function () {
    if (!chosenTier) return;
    start(chosenTier);
  });
  $("again").addEventListener("click", function () {
    $("s-end").classList.add("hide");
    $("s-title").classList.remove("hide");
    $("s-game").style.display = "none";
  });

  function start(tier) {
    run = window.Haul.createRun({ seed: "haul-" + Date.now(), tier: tier });
    seen = {};
    vent = [];
    pendingEvent = null;
    pass = null;
    crossingDone = false;
    running = false;
    tAcc = 0;
    $("s-title").classList.add("hide");
    $("s-end").classList.add("hide");
    $("s-game").style.display = "grid";
    sizeCanvas();
    stars = S.makeStars(run.seed, 220, cv.width, cv.height);
    buildMarks();
    $("runbtn").textContent = "RUN";
    $("runbtn").classList.add("run");
    window.Haul.note(run, "MANIFEST cleared for departure. Astraeus wishes you a productive transit.", "control");
    paintAll();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // ── canvas sizing ──────────────────────────────────────────────────────────
  function sizeCanvas() {
    const r = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(320, Math.floor(r.width * dpr));
    cv.height = Math.max(200, Math.floor(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", function () {
    if (!run) return;
    sizeCanvas();
    stars = S.makeStars(run.seed, 220, cv.width, cv.height);
  });

  function buildMarks() {
    const host = $("b-marks");
    host.innerHTML = "";
    window.Haul.WAYPOINTS.forEach(function (w) {
      const u = document.createElement("u");
      u.style.left = (w.at * 100) + "%";
      host.appendChild(u);
    });
  }

  // ── levers ─────────────────────────────────────────────────────────────────
  document.querySelectorAll("[data-th]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!run) return;
      run.throttle = Number(b.dataset.th);
      document.querySelectorAll("[data-th]").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
    });
  });
  document.querySelectorAll("[data-ra]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!run) return;
      run.ration = Number(b.dataset.ra);
      document.querySelectorAll("[data-ra]").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
    });
  });
  $("fix").addEventListener("click", function () {
    if (!run || run.res.parts <= 0) return;
    const worst = ["life", "drive", "hab", "cargo"].sort(function (a, b) { return run.mod[a] - run.mod[b]; })[0];
    const gain = window.Haul.repair(run, worst, 1);
    window.Haul.note(run, "Repaired " + worst + " (+" + gain.toFixed(1) + "%). Parts remaining: " + run.res.parts + ".", "info");
    paintAll();
  });
  $("runbtn").addEventListener("click", function () {
    running = !running;
    $("runbtn").textContent = running ? "HOLD" : "RUN";
    $("runbtn").classList.toggle("run", !running);
  });

  // ── event presentation ─────────────────────────────────────────────────────
  /**
   * The event pool is two decks: the hand-written events in `events.js` and the larger
   * imported deck in `events-deck.js` (generated from Grok's JSON — see
   * tools/import-deck.js). They share one schema, so they compete on weight in a single
   * weighted draw and the player cannot tell which is which.
   */
  function pickFromPool() {
    const deck = (window.HaulDeck && window.HaulDeck.DECK) || [];
    const pool = E.EVENTS.concat(deck).filter(function (e) {
      if (seen[e.id]) return false;
      return !e.when || e.when(run);
    });
    if (!pool.length) return null;
    let total = 0;
    pool.forEach(function (e) { total += (e.weight || 5); });
    let r = run.rand() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 5);
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function maybeEvent() {
    if (pendingEvent) return;
    // Roughly one scripted beat every ~11 days, seeded so replays match.
    if (run.rand() > 0.09) return;
    const ev = pickFromPool();
    if (!ev) return;
    seen[ev.id] = true;
    pendingEvent = ev;
    running = false;
    $("runbtn").textContent = "RUN";
    $("runbtn").classList.add("run");
    showEvent(ev);
  }

  function showEvent(ev) {
    $("ev-cat").textContent = (ev.cat || "ship").toUpperCase() + " · DAY " + run.day;
    $("ev-cat").className = "cat " + (ev.cat || "");
    $("ev-title").textContent = ev.title;
    const body = $("ev-body");
    const opts = $("ev-opts");
    opts.innerHTML = "";
    body.textContent = "";

    // typewriter — reveals the copy at reading pace, then arms the choices
    let i = 0;
    const full = ev.body;
    clearInterval(typeTimer);
    const cur = document.createElement("span");
    cur.className = "cursor";
    body.appendChild(cur);
    typeTimer = setInterval(function () {
      i += 2;
      body.textContent = full.slice(0, i);
      body.appendChild(cur);
      if (i >= full.length) {
        clearInterval(typeTimer);
        body.textContent = full;
        armChoices(ev, opts);
      }
    }, 12);

    $("s-ev").classList.remove("hide");
  }

  function armChoices(ev, opts) {
    ev.choices.forEach(function (ch) {
      const b = document.createElement("button");
      b.className = "opt";
      // Imported choices can carry a stores requirement. Show it greyed rather than
      // hiding it — knowing what you *can't* afford is information worth having.
      let ok = true;
      if (typeof ch.need === "function") {
        try { ok = !!ch.need(run, window.Haul); } catch (_) { ok = false; }
      }
      b.disabled = !ok;
      const note = ch.note || (ok ? "" : "Insufficient stores.");
      b.innerHTML = "› " + ch.text + (note ? "<small>" + note + "</small>" : "");
      if (!ok) { opts.appendChild(b); return; }
      b.addEventListener("click", function () {
        ch.apply(run, window.Haul);
        run.stats.events += 1;
        shake = 8;
        puff(10);
        $("s-ev").classList.add("hide");
        pendingEvent = null;
        paintAll();
      });
      opts.appendChild(b);
    });
  }

  function puff(n) {
    for (let i = 0; i < n; i++) {
      vent.push({
        x: -20 + Math.random() * 30, y: -6 + Math.random() * 12,
        vx: -0.6 - Math.random() * 1.4, vy: (Math.random() - 0.5) * 1.1,
        life: 26 + Math.random() * 22, max: 48, hot: Math.random() < 0.35
      });
    }
  }

  // ── dashboard ──────────────────────────────────────────────────────────────
  const GAUGES = [
    { k: "o2",    label: "OXYGEN",  unit: "kg", max: 260 },
    { k: "water", label: "WATER",   unit: "kg", max: 880 },
    { k: "cal",   label: "CALORIE", unit: "kg", max: 920 },
    { k: "fuel",  label: "FUEL",    unit: "u",  max: 132 },
    { k: "parts", label: "PARTS",   unit: "",   max: 32 }
  ];

  function paintGauges() {
    const host = $("gauges");
    const dl = window.Haul.daysLeft(run);
    const need = window.Haul.daysRemainingAtPace(run);
    host.innerHTML = "";
    GAUGES.forEach(function (g) {
      const v = run.res[g.k];
      const frac = Math.max(0, Math.min(1, v / g.max));
      let cls = "g";
      let sub = "";
      if (g.k === "o2" || g.k === "water" || g.k === "cal") {
        const d = dl[g.k];
        sub = d > 900 ? "—" : d + "d left";
        if (d < need) cls += " crit";
        else if (d < need * 1.25) cls += " warn";
      } else if (g.k === "fuel") {
        sub = "brake needs " + window.Haul.BRAKE_RESERVE;
        if (v < window.Haul.BRAKE_RESERVE) cls += " crit";
        else if (v < window.Haul.BRAKE_RESERVE * 1.7) cls += " warn";
      } else {
        sub = run.mod.life < 70 ? "recycler needs work" : "";
        if (v <= 0) cls += " crit";
      }
      const el = document.createElement("div");
      el.className = cls;
      el.innerHTML =
        "<label>" + g.label + "</label>" +
        "<div class='v'>" + (g.k === "parts" ? v : v.toFixed(0)) + "<span style='color:var(--dim);font-size:9px'> " + g.unit + "</span></div>" +
        "<div class='b'><i style='width:" + (frac * 100) + "%'></i></div>" +
        "<div class='d'>" + sub + "</div>";
      host.appendChild(el);
    });
  }

  /** What each role actually gates, straight from STORY.md — so a death reads as a
   *  capability loss, not just a number going down. */
  const ROLE_GATES = {
    engineer: "Repairs restore ~7.5% per part instead of 4%. Packs a fuller EVA thruster pack and a leaner regulator.",
    medic:    "Illness severity roughly halved. Crew recover ~0.85%/day instead of 0.3%.",
    pilot:    "Aerobrake corridor holds a steadier line and answers the controls. Without one, the corridor wanders hard.",
    botanist: "Adds ~5 points of recycling efficiency. Water and oxygen stretch further.",
    content:  "Damps the drift by ~45%. Handles the documentary drone so it earns its oxygen."
  };
  let selCrew = null;

  function paintCrew() {
    const host = $("crewlist");
    host.innerHTML = "";
    run.crew.forEach(function (c, i) {
      const d = document.createElement("div");
      d.className = "cm" + (c.alive ? "" : " dead") + (selCrew === i ? " sel" : "");
      const hpc = c.health > 60 ? "" : c.health > 30 ? " low" : " crit";
      d.innerHTML =
        "<div class='n'><span>" + c.name + "</span><span style='color:var(--dim);font-size:10px'>" +
        (c.alive ? Math.max(0, c.health).toFixed(0) : "—") + "</span></div>" +
        "<div class='r'>" + c.label + (c.alive ? "" : " · " + c.cause) + "</div>" +
        (c.alive ? "<div class='hp" + hpc + "'><i style='width:" + Math.max(0, c.health) + "%'></i></div>" : "");
      d.addEventListener("click", function () {
        selCrew = (selCrew === i) ? null : i;
        paintCrew();
      });
      host.appendChild(d);
    });

    const det = $("crewdetail");
    det.innerHTML = "";
    if (selCrew != null) {
      const c = run.crew[selCrew];
      const el = document.createElement("div");
      el.className = "cdet";
      el.innerHTML = "<b>" + c.name + " · " + c.label + "</b>" +
        (c.alive
          ? "Health " + c.health.toFixed(0) + " · morale " + c.morale.toFixed(0) +
            (c.sick ? " · " + c.sick : "") +
            "<div class='gate' style='margin-top:5px'>" + ROLE_GATES[c.role] + "</div>"
          : "Lost day " + c.dayLost + " — " + c.cause +
            "<div class='gate' style='margin-top:5px'>CAPABILITY LOST: " + ROLE_GATES[c.role] + "</div>");
      det.appendChild(el);
    }
  }

  /** Ship schematic — module condition as a picture, not four numbers. */
  function paintShip() {
    const c = $("schem");
    const x = c.getContext("2d");
    const W = c.width, H = c.height;
    x.fillStyle = "#070c14"; x.fillRect(0, 0, W, H);

    function col(v) {
      return v > 70 ? "#3df0bb" : v > 40 ? "#ffb547" : "#ff7a9a";
    }
    function box(px, py, pw, ph, v, label) {
      x.fillStyle = "rgba(20,30,42,.9)";
      x.fillRect(px, py, pw, ph);
      x.fillStyle = col(v);
      x.globalAlpha = 0.28;
      x.fillRect(px, py + ph * (1 - v / 100), pw, ph * (v / 100));
      x.globalAlpha = 1;
      x.strokeStyle = col(v); x.lineWidth = 1;
      x.strokeRect(px + .5, py + .5, pw - 1, ph - 1);
      x.fillStyle = "#c8d2dc"; x.font = "8px ui-monospace,monospace";
      x.fillText(label, px + 3, py + 10);
      x.fillStyle = col(v); x.font = "700 10px ui-monospace,monospace";
      x.fillText(v.toFixed(0), px + 3, py + ph - 5);
    }
    box(8,   14, 40, 50, run.mod.drive, "DRIVE");
    box(54,  14, 40, 50, run.mod.life,  "LIFE");
    box(100, 14, 40, 50, run.mod.cargo, "CARGO");
    box(146, 14, 44, 50, run.mod.hab,   "HAB");

    // spine
    x.strokeStyle = "#3a4a5a";
    x.beginPath(); x.moveTo(8, 74); x.lineTo(190, 74); x.stroke();

    x.fillStyle = "#6c8aa6"; x.font = "8px ui-monospace,monospace";
    x.fillText("MANIFEST · MODULE INTEGRITY", 8, 88);

    // the compounding mechanic, made visible
    const rec = window.Haul.recycleRate(run) * 100;
    x.fillStyle = "#6c8aa6";
    x.fillText("RECYCLER", 8, 106);
    x.fillStyle = "rgba(20,30,42,.9)";
    x.fillRect(8, 110, 182, 8);
    x.fillStyle = rec > 75 ? "#3df0bb" : rec > 55 ? "#ffb547" : "#ff7a9a";
    x.fillRect(8, 110, 182 * (rec / 100), 8);
    x.fillStyle = "#c8d2dc"; x.font = "700 9px ui-monospace,monospace";
    x.fillText(rec.toFixed(0) + "% RECLAIMED", 12, 117);

    const u = window.Haul.dailyUse(run);
    const host = $("shipstats");
    host.innerHTML = "";
    function row(label, val, cls) {
      const d = document.createElement("div");
      d.className = "sst";
      d.innerHTML = "<span>" + label + "</span><b class='" + (cls || "") + "'>" + val + "</b>";
      host.appendChild(d);
    }
    row("O₂ / day", u.o2.toFixed(2) + " kg", u.o2 > 1.6 ? "crit" : u.o2 > 1.0 ? "warn" : "good");
    row("Water / day", u.water.toFixed(2) + " kg", u.water > 5 ? "crit" : u.water > 3.4 ? "warn" : "good");
    row("Calories / day", u.cal.toFixed(2) + " kg", "");
    row("Crew aboard", window.Haul.living(run).length + " / 5", "");
    row("Drone", run.droneAboard ? (window.Haul.hasRole(run, "content") ? "crewed" : "unhandled") : "—",
      run.droneAboard && !window.Haul.hasRole(run, "content") ? "crit" : "");

    const note = document.createElement("div");
    note.className = "sst-note";
    note.textContent = rec < 70
      ? "Recycling is falling. Every point lost raises daily draw for the rest of the voyage — this compounds."
      : "Recycler nominal. Keep it there; consumption climbs as it degrades.";
    host.appendChild(note);
  }

  function paintRoute() {
    const host = $("routelist");
    host.innerHTML = "";
    window.Haul.WAYPOINTS.forEach(function (w, i) {
      const d = document.createElement("div");
      const cls = i < run.wpIndex ? " done" : i === run.wpIndex ? " here" : "";
      d.className = "rw" + cls;
      const eta = i > run.wpIndex
        ? Math.max(0, Math.ceil((w.at - run.progress) / Math.max(1e-6, window.Haul.speed(run))))
        : null;
      d.innerHTML = "<i></i><span>" + w.name + "</span><span>" +
        (i < run.wpIndex ? "✓" : i === run.wpIndex ? "HERE" : "+" + eta + "d") + "</span>";
      host.appendChild(d);
    });
  }

  /**
   * Three voices, per STORY.md: Mission Control is institutional and amber, the ship log
   * is bureaucratic and dim, and the blackout is *silence* — we show the gap rather than
   * filling it, because the absence is the point.
   */
  function paintLog() {
    const ship = $("logbox");
    const ctl = $("controllog");
    ship.innerHTML = "";
    ctl.innerHTML = "";

    run.log.filter(function (l) { return l.kind !== "control"; }).slice(-7).forEach(function (l) {
      const d = document.createElement("div");
      d.className = l.kind;
      d.textContent = "d" + String(l.day).padStart(3, "0") + "  " + l.text;
      ship.appendChild(d);
    });

    const ctlLines = run.log.filter(function (l) { return l.kind === "control"; }).slice(-6);
    $("ctl-state").textContent = run.blackout ? "· NO SIGNAL" : "";
    if (run.blackout) {
      const d = document.createElement("div");
      d.className = "silence";
      d.textContent = "— no traffic —";
      ctl.appendChild(d);
    } else if (!ctlLines.length) {
      const d = document.createElement("div");
      d.textContent = "—";
      ctl.appendChild(d);
    } else {
      ctlLines.forEach(function (l) {
        const d = document.createElement("div");
        d.textContent = "d" + String(l.day).padStart(3, "0") + "  " + l.text;
        ctl.appendChild(d);
      });
    }
  }

  document.querySelectorAll(".rt").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".rt").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      ["crew", "ship", "route"].forEach(function (t) {
        $("tab-" + t).classList.toggle("hide", t !== b.dataset.tab);
      });
      paintAll();
    });
  });

  function paintBar() {
    $("b-day").textContent = run.day;
    $("b-wp").textContent = window.Haul.currentWaypoint(run).name;
    const eta = window.Haul.daysRemainingAtPace(run);
    $("b-eta").textContent = eta > 900 ? "—" : eta + "d";
    $("b-track").style.width = (run.progress * 100).toFixed(2) + "%";
    const st = $("b-status");
    if (run.blackout) { st.className = "warn"; st.textContent = "◈ COMMS BLACKOUT"; }
    else { st.className = ""; st.textContent = "LINK NOMINAL"; }
  }

  function paintAll() {
    paintBar(); paintGauges(); paintCrew(); paintLog();
    if (!$("tab-ship").classList.contains("hide")) paintShip();
    if (!$("tab-route").classList.contains("hide")) paintRoute();
  }

  // ── main frame ─────────────────────────────────────────────────────────────
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!run) return;
    const dt = last ? ts - last : 16;
    last = ts;

    if (running && !pendingEvent && run.alive && !run.arrived) {
      tAcc += dt;
      while (tAcc >= DAY_MS) {
        tAcc -= DAY_MS;
        const before = run.crew.filter(function (c) { return c.alive; }).length;
        window.Haul.step(run);
        const after = run.crew.filter(function (c) { return c.alive; }).length;
        if (after < before) { shake = 16; puff(22); }

        // The corridor halts the voyage until the player commits to a way across.
        const wp = window.Haul.currentWaypoint(run);
        if (wp.kind === "crossing" && !crossingDone && run.alive) {
          paintAll();
          offerCrossing();
          break;
        }

        if (run.alive && !run.arrived) maybeEvent();
        if (!run.alive || run.arrived) { running = false; showEnd(); break; }
      }
      paintAll();
    }

    draw(ts);
  }

  function draw(ts) {
    const w = cv.clientWidth, h = cv.clientHeight;
    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, w, h);
    S.drawNebula(ctx, w, h, run.seed);
    S.drawStars(ctx, stars, w, h, ts * 0.06, 0.5 + run.throttle * 1.1);

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake * 0.5, (Math.random() - 0.5) * shake * 0.5);
      shake *= 0.88;
      if (shake < 0.3) shake = 0;
    }

    // Earth shrinks behind you; Mars grows ahead. The whole voyage in one image.
    const pe = Math.max(0, 1 - run.progress * 5.5);
    if (pe > 0) S.drawEarth(ctx, w * 0.12, h * 0.74, 54 * pe);
    const pm = Math.pow(run.progress, 2.6);
    S.drawMars(ctx, w * 0.78, h * 0.40, 6 + 200 * pm, ts);

    if (pendingEvent && pendingEvent.art) S.drawVignette(ctx, pendingEvent.art, w, h, ts);
    if (run.blackout) S.drawVignette(ctx, "blackout", w, h, ts);

    // vent particles
    for (let i = vent.length - 1; i >= 0; i--) {
      const p = vent[i];
      p.x += p.vx; p.y += p.vy; p.life -= 1;
      if (p.life <= 0) vent.splice(i, 1);
    }

    S.drawShip(ctx, w * 0.40, h * 0.56, Math.min(2.1, Math.max(1.1, w / 620)),
      run.mod, run.throttle, ts, vent);
    ctx.restore();
  }

  // ── the crossing ───────────────────────────────────────────────────────────
  const A = window.HaulAero;
  const acv = $("aeroview");
  const actx = acv.getContext("2d");
  let pass = null, pitchInput = 0, aeroRaf = null, crossingDone = false;

  /**
   * Four ways across, exactly as the trail-genre river worked: each is correct in
   * some state and fatal in another. Fuel, hull, time, and money are four different
   * currencies, and by day 228 you rarely have all four.
   */
  function offerCrossing() {
    running = false;
    $("runbtn").textContent = "RUN";
    $("runbtn").classList.add("run");

    const fuel = run.res.fuel;
    const canBurn = fuel >= window.Haul.BRAKE_RESERVE;
    const canTug = run.money >= 3200;
    const hab = run.mod.hab;

    $("cross-body").innerHTML =
      "Mars fills the forward ports. You are carrying <b>" + fuel.toFixed(0) + "</b> units of fuel; " +
      "a clean insertion burn needs <b>" + window.Haul.BRAKE_RESERVE + "</b>. " +
      "Thermal protection is at <b>" + hab.toFixed(0) + "%</b>." +
      (canBurn ? "" : "<br><br><span style='color:var(--rose)'>You cannot afford the burn.</span>");

    const opts = $("cross-opts");
    opts.innerHTML = "";

    function opt(label, note, enabled, fn) {
      const b = document.createElement("button");
      b.className = "opt";
      b.disabled = !enabled;
      b.innerHTML = "› " + label + (note ? "<small>" + note + "</small>" : "");
      if (enabled) b.addEventListener("click", function () {
        $("s-cross").classList.add("hide");
        fn();
      });
      opts.appendChild(b);
    }

    opt("Direct insertion burn",
      canBurn ? "Spends " + window.Haul.BRAKE_RESERVE + " fuel. Safe. No corridor."
              : "Requires " + window.Haul.BRAKE_RESERVE + " fuel. You do not have it.",
      canBurn,
      function () {
        window.Haul.note(run, "Committing to a direct insertion burn.", "waypoint");
        resumeAfterCrossing();
      });

    opt("Fly the aerobrake",
      "Costs no fuel. You fly the corridor yourself. The hull pays if you get it wrong.",
      true, startPass);

    opt("Slow spiral",
      "Safe. Costs roughly three weeks of consumables you may not have.",
      true,
      function () {
        for (let i = 0; i < 21 && run.alive; i++) window.Haul.step(run);
        window.Haul.note(run, "Spiralling down over three weeks. Everyone keeps breathing, slowly.", "waypoint");
        run.aeroResult = "captured";
        resumeAfterCrossing();
      });

    opt("Hire a tug from the waystation",
      canTug ? "Costs 3,200. Someone else does the hard part."
             : "Costs 3,200. You have " + run.money.toLocaleString() + ".",
      canTug,
      function () {
        run.money -= 3200;
        run.aeroResult = "captured";
        window.Haul.note(run, "A tug has matched velocity. The invoice arrives before the tug does.", "control");
        resumeAfterCrossing();
      });

    $("s-cross").classList.remove("hide");
  }

  function resumeAfterCrossing() {
    crossingDone = true;
    paintAll();
  }

  function sizeAero() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    acv.width = Math.floor(window.innerWidth * dpr);
    acv.height = Math.floor(window.innerHeight * dpr);
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startPass() {
    pass = A.createPass(run, window.Haul);
    pitchInput = 0;
    $("aero-result").classList.add("hide");
    $("s-aero").classList.remove("hide");
    sizeAero();
    if (!aeroRaf) aeroRaf = requestAnimationFrame(aeroFrame);
  }

  function aeroFrame(ts) {
    if ($("s-aero").classList.contains("hide")) { aeroRaf = null; return; }
    aeroRaf = requestAnimationFrame(aeroFrame);
    if (pass && !pass.done) {
      A.stepPass(pass, pitchInput, 0.34, run.rand);
      if (pass.done) endPass();
    }
    if (pass) A.draw(actx, pass, acv.clientWidth, acv.clientHeight, ts);
  }

  const AERO_COPY = {
    "captured":     ["CAPTURED", "A clean pass. You bled the velocity in the corridor and never spent the reserve — that fuel is still aboard."],
    "captured-hot": ["CAPTURED — HOT", "You are in orbit, but the pass ran past the thermal limit. The hull is compromised and the crew took it."],
    "skipped":      ["SKIPPED OUT", "Too shallow, too long. The atmosphere threw you back into vacuum with the corridor behind you. You will come around again."],
    "burned":       ["THERMAL FAILURE", "You held it too deep for too long. The corridor took the ship."]
  };

  function endPass() {
    const outcome = A.resolve(pass, run, window.Haul);
    const copy = AERO_COPY[outcome] || AERO_COPY.burned;
    $("ar-head").textContent = copy[0];
    $("ar-head").style.color =
      outcome === "captured" ? "var(--mint)" :
      outcome === "captured-hot" ? "var(--amber)" :
      outcome === "skipped" ? "var(--cyan)" : "var(--rose)";
    $("ar-body").textContent = copy[1];
    $("aero-result").classList.remove("hide");
    paintAll();
  }

  $("ar-ok").addEventListener("click", function () {
    $("s-aero").classList.add("hide");
    // A skip-out puts you back in the corridor queue rather than ending the attempt.
    if (run.aeroResult === "skipped") { crossingDone = false; run.aeroResult = null; }
    else resumeAfterCrossing();
    if (!run.alive) showEnd();
  });

  $("aero-up").addEventListener("mousedown", function () { pitchInput = -1; });
  $("aero-dn").addEventListener("mousedown", function () { pitchInput = 1; });
  ["mouseup", "mouseleave"].forEach(function (e) {
    $("aero-up").addEventListener(e, function () { pitchInput = 0; });
    $("aero-dn").addEventListener(e, function () { pitchInput = 0; });
  });
  window.addEventListener("keydown", function (e) {
    if ($("s-aero").classList.contains("hide")) return;
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { pitchInput = 1; e.preventDefault(); }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { pitchInput = -1; e.preventDefault(); }
  });
  window.addEventListener("keyup", function (e) {
    if (["ArrowDown", "ArrowUp", "s", "S", "w", "W"].indexOf(e.key) >= 0) pitchInput = 0;
  });
  window.addEventListener("resize", function () {
    if (!$("s-aero").classList.contains("hide")) sizeAero();
  });

  // ── EVA salvage ────────────────────────────────────────────────────────────
  const V = window.HaulEva;
  const ecv = $("evaview");
  const ectx = ecv.getContext("2d");
  let walk = null, thrust = { x: 0, y: 0 }, evaRaf = null;

  function sizeEva() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ecv.width = Math.floor(window.innerWidth * dpr);
    ecv.height = Math.floor(window.innerHeight * dpr);
    ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Player-initiated, exactly like the trail original's hunt. It is never free: the
   * suit breathes out of ship stores, so a long walk costs the whole crew whether or
   * not the walker comes back.
   */
  function startEva() {
    if (!run || !run.alive || run.arrived) return;
    if (!window.Haul.living(run).length) return;
    running = false;
    $("runbtn").textContent = "RUN";
    $("runbtn").classList.add("run");
    walk = V.createEva(run, window.Haul);
    thrust = { x: 0, y: 0 };
    $("eva-result").classList.add("hide");
    $("s-eva").classList.remove("hide");
    sizeEva();
    if (!evaRaf) evaRaf = requestAnimationFrame(evaFrame);
  }

  function evaFrame(ts) {
    if ($("s-eva").classList.contains("hide")) { evaRaf = null; return; }
    evaRaf = requestAnimationFrame(evaFrame);
    if (walk && !walk.done) {
      V.stepEva(walk, thrust, 1.0, run.rand);
      if (walk.done) endEva();
    }
    if (walk) V.draw(ectx, walk, ecv.clientWidth, ecv.clientHeight, ts);
  }

  function endEva() {
    const before = window.Haul.living(run).length;
    const outcome = V.resolve(walk, run, window.Haul);
    const got = walk.haul;
    if (outcome === "returned") {
      const empty = !walk.tookOff;
      $("ev-head").textContent = empty ? "EVA ABORTED" : "BACK INSIDE";
      $("ev-head").style.color = empty ? "var(--dim)" : "var(--mint)";
      $("ev-body").textContent = empty
        ? "The hatch never closed behind them. Nothing gained, a little air spent."
        : walk.walker.name + " is back through the lock with " +
          Math.round(got.parts) + " parts, " + Math.round(got.o2) + " kg oxygen, " +
          Math.round(got.water) + " kg water and " + Math.round(got.cal) + " kg stores.";
    } else {
      $("ev-head").textContent = "TETHER RECOVERED EMPTY";
      $("ev-head").style.color = "var(--rose)";
      $("ev-body").textContent = walk.walker.name +
        " ran the suit dry outside the lock. The salvage went with them.";
    }
    if (window.Haul.living(run).length < before) { shake = 18; puff(20); }
    paintAll();
    $("eva-result").classList.remove("hide");
  }

  $("eva").addEventListener("click", startEva);
  $("ev-ok").addEventListener("click", function () {
    $("s-eva").classList.add("hide");
    walk = null;
    if (!run.alive) showEnd();
  });

  // on-screen pad
  document.querySelectorAll("[data-ev]").forEach(function (b) {
    const dir = b.dataset.ev;
    const set = function (on) {
      if (dir === "up") thrust.y = on ? -1 : 0;
      if (dir === "down") thrust.y = on ? 1 : 0;
      if (dir === "left") thrust.x = on ? -1 : 0;
      if (dir === "right") thrust.x = on ? 1 : 0;
    };
    b.addEventListener("mousedown", function () { set(true); });
    ["mouseup", "mouseleave"].forEach(function (e) { b.addEventListener(e, function () { set(false); }); });
  });

  const EVA_KEYS = {
    ArrowUp: ["y", -1], w: ["y", -1], W: ["y", -1],
    ArrowDown: ["y", 1], s: ["y", 1], S: ["y", 1],
    ArrowLeft: ["x", -1], a: ["x", -1], A: ["x", -1],
    ArrowRight: ["x", 1], d: ["x", 1], D: ["x", 1]
  };
  window.addEventListener("keydown", function (e) {
    if ($("s-eva").classList.contains("hide")) return;
    const k = EVA_KEYS[e.key];
    if (k) { thrust[k[0]] = k[1]; e.preventDefault(); }
  });
  window.addEventListener("keyup", function (e) {
    if ($("s-eva").classList.contains("hide")) return;
    const k = EVA_KEYS[e.key];
    if (k && thrust[k[0]] === k[1]) thrust[k[0]] = 0;
  });
  window.addEventListener("resize", function () {
    if (!$("s-eva").classList.contains("hide")) sizeEva();
  });

  /**
   * Inspection hook, same idea as the Hall cabs' `state()`. Read-only access to the
   * live run for testing and tuning in the page. `poke` exists so a render pass can
   * be verified at an arbitrary point in the voyage without playing 240 real days —
   * it is a test affordance, never used by gameplay.
   */
  window.HaulDebug = {
    state: function () { return run; },
    running: function () { return running; },
    pass: function () { return pass; },
    pitch: function (v) { pitchInput = v; return pitchInput; },
    walk: function () { return walk; },
    thrust: function (x, y) { thrust = { x: x, y: y }; return thrust; },
    startEva: startEva,
    poke: function (patch) {
      if (!run || !patch) return null;
      Object.keys(patch).forEach(function (k) {
        if (k === "mod" || k === "res") Object.assign(run[k], patch[k]);
        else run[k] = patch[k];
      });
      paintAll();
      return run;
    }
  };

  // ── end ────────────────────────────────────────────────────────────────────
  function showEnd() {
    const alive = window.Haul.living(run).length;
    const sc = window.Haul.score(run);
    const good = run.arrived && alive > 0;
    $("e-head").className = good ? "good" : "bad";
    $("e-head").textContent = run.arrived ? (alive ? "TOUCHDOWN" : "THE SHIP ARRIVED") : "LOST WITH ALL HANDS";

    let sub;
    if (run.arrived && alive) {
      sub = alive + " of 5 walked out onto Ellipse Nine after " + run.day + " days.<br>" +
            "Astraeus has recorded the mission as a success.";
    } else if (run.arrived) {
      sub = "The MANIFEST made orbit on schedule with no one alive to log it.<br>" +
            "Astraeus has recorded the mission as a success.";
    } else {
      sub = "The MANIFEST went quiet on day " + run.day + ", " +
            (run.progress * 100).toFixed(0) + "% of the way to Mars.<br>" +
            "Mission Control has updated the projected timeline.";
    }
    $("e-sub").innerHTML = sub;
    $("e-score").textContent = "SCORE  " + sc.toLocaleString() + "   ·   " + run.tierLabel;

    const st = $("e-stones");
    st.innerHTML = "";
    if (!run.memorials.length) {
      const d = document.createElement("div");
      d.className = "stone";
      d.style.borderLeftColor = "var(--mint)";
      d.innerHTML = "<b>NO LOSSES</b><span>Every name on the manifest arrived.</span>";
      st.appendChild(d);
    }
    run.memorials.forEach(function (m) {
      const d = document.createElement("div");
      d.className = "stone";
      d.innerHTML = "<b>" + m.name + "</b><span>" + m.label + " · " + m.cause + " · day " + m.day + "</span>";
      st.appendChild(d);
    });

    setTimeout(function () { $("s-end").classList.remove("hide"); }, 700);
  }
})();
