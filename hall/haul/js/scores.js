/**
 * HALL — the scores.
 *
 * One theme per cabinet, plus the rule that turns that cabinet's own telemetry into
 * a tension value the arrangement follows. The rule matters more than the notes: it
 * is what makes each score belong to its game rather than merely play over it.
 *
 * Modes were chosen for what the game feels like, not at random:
 *   WELL   aeolian          — plain minor. Inevitability. The stack only goes up.
 *   VOID   dorian           — minor with a lifted sixth. Cold, but open, not hostile.
 *   TAR    phrygian         — flat second. The nastiest interval in the box, for heat.
 *   FLIP   mixolydian       — flat seventh over major. Bright and slightly drunk.
 *   CUBE   harmonic minor   — the raised seventh leans forward. Approach, closing in.
 *   GRAIN  lydian           — sharp fourth. Curiosity. Nothing here wants to kill you.
 *   HAUL   aeolian, slow    — 240 days. The tune has to survive being heard all of it.
 *
 * Tension rules read state the cab already publishes for its agent lane, so the music
 * is driven by the same numbers an agent plays on. No cab was modified to feed the
 * soundtrack — if the score needs a number, it uses one the game already told the truth about.
 */
(function (root) {
  "use strict";

  const clamp = function (v) { return Math.max(0, Math.min(1, v || 0)); };

  const SCORES = {
    /* Stacking puzzle. Tension is literally how full the well is, with holes counted
       against you — a clean stack at height 12 is calmer than a holed stack at 9. */
    well: {
      def: { id: "well", trim: 0.818, root: 57, mode: "aeolian", bpm: 138, bars: 4,
             prog: [0, 5, 3, 4], bassWave: "square", arpWave: "square", leadWave: "square",
             bassAt: function (b) { return b % 4 === 0 || b === 14; } },
      tension: function (s) {
        if (!s) return 0;
        const h = clamp((s.maxH || 0) / 20);
        const holes = clamp((s.holes || 0) / 14);
        const rise = s.riseMs ? 0.15 : 0;
        return clamp(h * 0.72 + holes * 0.22 + rise);
      }
    },

    /* Rock field. Density is the threat, and a lost life spikes it — the moment after
       you are hit is the loudest the score gets, then it settles. */
    void: {
      def: { id: "void", trim: 1.143, root: 50, mode: "dorian", bpm: 96, bars: 4,
             prog: [0, 3, 6, 4], bassWave: "triangle", arpWave: "triangle", leadWave: "sawtooth",
             bassAt: function (b) { return b === 0 || b === 6 || b === 10; } },
      tension: function (s) {
        if (!s) return 0;
        const rocks = clamp((s.rocks || 0) / 16);   // late waves split well past 11
        const hurt = clamp((3 - (s.lives == null ? 3 : s.lives)) / 3);
        return clamp(0.1 + rocks * 0.6 + hurt * 0.34);
      }
    },

    /* Race.
       RECALIBRATED against a real run. Heat was read as a 0-12 dial; it is an
       unbounded collision counter that reached 291 in twenty seconds of bad driving,
       so the score pegged at maximum almost immediately and stayed there for the rest
       of the run — the same saturation the engine was fixed for, reintroduced through
       a guessed constant.
       It is now a RATE: collisions since the last sample. Sustained bad driving is
       loud, a clean stretch lets the music come back down, and the score can actually
       respond to how you are driving instead of to how long you have been alive.
       Distance stays as a slow floor, scaled to a real run rather than to a guess. */
    tar: {
      def: { id: "tar", trim: 0.882, root: 52, mode: "phrygian", bpm: 152, bars: 4,
             prog: [0, 0, 6, 5], bassWave: "sawtooth", arpWave: "square", leadWave: "sawtooth",
             bassAt: function (b) { return b % 2 === 0; } },
      tension: function (s, prev) {
        if (!s) return 0;
        // Measured: an unsteered car takes 13-23 hits per sample window, a driver who
        // is actually steering takes none. Weighting the rate too heavily made the
        // score binary — pegged for the crasher, and so quiet for the clean driver that
        // the drums never came in at all. Distance carries more of it now, so a long
        // clean run still builds, and the rate has room before it saturates.
        const rate = prev ? Math.max(0, (s.heat || 0) - prev) : 0;
        const hot = clamp(rate / 20);
        const far = clamp((s.dist || 0) / 25000);
        return clamp(0.18 + hot * 0.45 + far * 0.37);
      },
      rate: "heat"
    },

    /* Pinball.
       CORRECTED. This first read `balls` as a multiball count and scored it upward,
       which had the arrangement backwards in the worst possible way: the table opened
       at tension 0.85 and got CALMER every time you drained. `balls` is balls
       remaining, and `locked` is the boolean for the ball sitting in the plunger.
       So: the plunger is the quiet moment, a live ball is the tense one, and your last
       ball is the tensest thing on the table. */
    flip: {
      def: { id: "flip", trim: 0.939, root: 48, mode: "mixolydian", bpm: 128, bars: 4,
             prog: [0, 4, 5, 4], bassWave: "triangle", arpWave: "square", leadWave: "square",
             bassAt: function (b) { return b % 4 === 0 || b === 7; } },
      tension: function (s) {
        if (!s) return 0;
        const spent = clamp((3 - (s.balls == null ? 3 : s.balls)) / 3);
        const live = s.locked ? 0 : 1;   // locked === in the plunger === not yet in play
        return clamp(0.15 + spent * 0.42 + live * 0.4);
      }
    },

    /* Depth dodge. Speed is the whole game, and it only ever rises — a monotonic
       tension curve, which is the point. There is no calming down in CUBE. */
    cube: {
      def: { id: "cube", trim: 1.050, root: 54, mode: "harmMinor", bpm: 112, bars: 4,
             prog: [0, 0, 5, 6], bassWave: "sawtooth", arpWave: "sawtooth", leadWave: "square",
             bassAt: function (b) { return b % 4 === 0; } },
      tension: function (s) {
        if (!s) return 0;
        const sp = clamp(((s.speed || 0.022) - 0.022) / 0.07);
        const near = clamp((s.cubes ? s.cubes.length : 0) / 9);
        return clamp(0.14 + sp * 0.62 + near * 0.28);
      }
    },

    /* The sand lab. Nothing here can kill you, so tension is not danger — it is how much
       is happening, and of what kind. A still cabinet is nearly silent. A cabinet where
       something is *burning* is a different piece of music from one where somebody is
       quietly pouring sand, which is the whole point of scoring a sandbox: the score is
       the only thing in the room that reacts to what you built. */
    grain: {
      def: { id: "grain", trim: 1.156, root: 55, mode: "lydian", bpm: 84, bars: 8,
             prog: [0, 4, 2, 5], bassWave: "triangle", arpWave: "triangle", leadWave: "triangle",
             bassAt: function (b) { return b === 0 || b === 10; } },
      tension: function (s, prev) {
        if (!s) return 0;
        // Rate, not total: what matters is whether something is happening now.
        const rate = prev ? Math.max(0, (s.reacts || 0) - prev) : 0;
        const busy = clamp(rate / 90);
        // Grid is 320x200 = 64,000 cells and starts around 750 filled. A divisor of
        // 2,600 pegged at 4% full — a few seconds of pouring and the term was spent.
        const full = clamp(((s.filled || 0) - 750) / 18000);
        // Fire and heat carry their own weight, so setting the lab alight moves the
        // music even when the reaction *count* is not especially high.
        const burning = clamp((s.fire || 0) / 900);
        const heat = clamp((s.hot || 0) / 2600);
        // Weights sum to 1.0 exactly, so a lab that is merely well alight still has
        // somewhere left to go — the top of the range should cost something.
        return clamp(0.06 + busy * 0.36 + full * 0.14 + burning * 0.26 + heat * 0.18);
      },
      rate: "reacts"
    },

    /* The voyage. Eight bars at 68 because this one plays for a very long time and a
       short loop would become the reason somebody turns the sound off. Tension is the
       ship's condition, not the player's excitement. */
    haul: {
      def: { id: "haul", trim: 1.130, root: 50, mode: "aeolian", bpm: 68, bars: 8,
             prog: [0, 5, 3, 6], bassWave: "triangle", arpWave: "triangle", leadWave: "sawtooth",
             bassAt: function (b) { return b === 0 || b === 8; } },
      tension: function (s) {
        if (!s) return 0;
        // Fewer crew, worse habitat, and thinner stores all push the same direction.
        const lost = clamp((5 - (s.living == null ? 5 : s.living)) / 5);
        const hab = clamp((100 - (s.hab == null ? 100 : s.hab)) / 100);
        const thin = clamp(1 - (s.margin == null ? 1 : s.margin));

        // Distance covered is its own pressure, independent of anything going wrong.
        //
        // Without this the score never reached its upper layers: a ship that had lost
        // a crew member and half its habitat still measured 0.29, so the melody and the
        // counter-line — everything above 0.6 — were unreachable in ordinary play and
        // most players would never have heard the tune at all. A 240-day transit should
        // also simply *build*, the way the last week of a long crossing feels different
        // from the first even when nothing has gone wrong.
        const far = clamp(s.progress || 0);

        return clamp(0.1 + lost * 0.34 + hab * 0.24 + thin * 0.22 + far * 0.32);
      }
    }
  };

  root.HallScores = {
    get: function (id) { return SCORES[id] || null; },
    ids: function () { return Object.keys(SCORES); },
    all: SCORES
  };
})(typeof window !== "undefined" ? window : globalThis);
