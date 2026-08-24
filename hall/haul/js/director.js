/**
 * THE LONG HAUL — the event director.
 *
 * Owns *when* an event fires and *which* one, for both the browser and the headless
 * tuner. This module exists because that logic used to live inside game.js next to the
 * DOM, which meant the tuning harness could not see it: every balance number we
 * measured came from baseline attrition alone while the shipped game was also spending
 * resources through ~11 events a voyage. The harness was measuring a different game.
 *
 * Three pools feed one weighted draw and the player cannot tell them apart:
 *   authored  — hand-written beats (events.js), mostly the satire
 *   deck      — the imported corpus (events-deck.js)
 *   physics   — generated engineering faults (physics.js), real failure modes
 *
 * Cadence is here too. A flat per-day roll permits two events on consecutive days,
 * which is what made the voyage feel like a slideshow; the cooldown is what actually
 * guarantees travel between beats.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HaulDirector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CADENCE = {
    chance: 0.085,     // per-day roll, only once the cooldown has expired
    cooldown: 10,      // days of guaranteed travel after any event
    grace: 8,          // no events at all before this day
    physicsShare: 0.42 // fraction of draws pulled from the engineering pool
  };

  function ready(s, lastEventDay, C) {
    C = C || CADENCE;
    if (s.day < C.grace) return false;
    if (s.day - lastEventDay < C.cooldown) return false;
    return s.rand() <= C.chance;
  }

  /**
   * Choose an event. `pools` is { authored, deck, physics } — any may be absent, which
   * is what lets the tuner run a subset and attribute outcomes to one pool at a time.
   */
  function choose(s, Haul, seen, pools) {
    pools = pools || {};

    // Engineering faults get their own share of the draw so the technical material
    // does not get buried under a much larger authored corpus.
    if (pools.physics && s.rand() < CADENCE.physicsShare) {
      const ev = pools.physics.generate(s, Haul, seen);
      if (ev) return ev;
    }

    // Gates receive the sim module explicitly — see the note in events.js. A gate that
    // throws is treated as closed rather than crashing the draw.
    const flat = [].concat(pools.authored || [], pools.deck || []).filter(function (e) {
      if (seen && seen[e.id]) return false;
      if (!e.when) return true;
      try { return !!e.when(s, Haul); } catch (_) { return false; }
    });
    if (!flat.length) {
      // Authored pool exhausted — fall back to engineering, which is generative and
      // therefore never runs out.
      if (pools.physics) return pools.physics.generate(s, Haul, seen);
      return null;
    }
    let total = 0;
    flat.forEach(function (e) { total += (e.weight || 5); });
    let r = s.rand() * total;
    for (let i = 0; i < flat.length; i++) {
      r -= (flat[i].weight || 5);
      if (r <= 0) return flat[i];
    }
    return flat[flat.length - 1];
  }

  /** Choices the current state can actually afford. */
  function affordable(ev, s, Haul) {
    return ev.choices.filter(function (c) {
      if (typeof c.need !== "function") return true;
      try { return !!c.need(s, Haul); } catch (_) { return false; }
    });
  }

  /**
   * Resolve an event headlessly for tuning. `strategy` decides which affordable choice
   * a simulated player takes — the point is that different strategies should produce
   * measurably different survival, or the choices are not really choices.
   */
  function resolve(ev, s, Haul, strategy) {
    const opts = affordable(ev, s, Haul);
    if (!opts.length) return null;
    let idx;
    if (strategy === "first") idx = 0;
    else if (strategy === "last") idx = opts.length - 1;
    else if (strategy === "cautious") idx = 0;               // first is conventionally the safe/costly one
    else if (strategy === "cheap") idx = opts.length - 1;    // last is conventionally the do-nothing one
    else idx = Math.floor(s.rand() * opts.length);           // "random"
    const c = opts[idx];
    try { c.apply(s, Haul); } catch (_) { return null; }
    return c;
  }

  return {
    CADENCE: CADENCE,
    ready: ready,
    choose: choose,
    affordable: affordable,
    resolve: resolve
  };
});
