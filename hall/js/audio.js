/**
 * HALL — the house score engine.
 *
 * Every cabinet gets original music, generated in the browser from a written score
 * rather than shipped as audio files. Three reasons that is the right call here and
 * not just a size trick:
 *
 *   1. The Hall's contract is original cabinets only. A synthesised score built from
 *      a scale and a progression is unambiguously ours — there is no sample to
 *      clear and no melody borrowed from a machine somebody else built.
 *   2. It weighs nothing. The entire soundtrack for seven games is this file.
 *   3. It can react. A score defined as layers, not as a finished mixdown, can be
 *      arranged live against what the player is actually doing — which is the
 *      difference between a soundtrack and background noise.
 *
 * ADAPTIVE ARRANGEMENT. Each cab reports a tension in 0..1 (stack height in WELL,
 * heat in TAR, closing speed in CUBE). Tension does not just turn a volume knob; it
 * gates whole layers in and out and opens the filter, which is how game scores
 * actually do this — vertical remixing. At rest you hear pad and bass. In trouble
 * the drums, the arpeggio, and finally the lead stack up on top.
 *
 * DETERMINISM. Melodies come from a seeded RNG keyed on the cab id, so WELL's theme
 * is WELL's theme every time you sit down at it. A soundtrack that improvises fresh
 * every session is not a soundtrack, it is a wind chime.
 *
 * TIMING. Notes are scheduled ahead of the clock against AudioContext.currentTime,
 * not fired from rAF. Frame jitter is inaudible in graphics and ruinous in music.
 *
 * AUTOPLAY. No context is created until the player has acted. Browsers require a
 * gesture and, more to the point, a machine that starts making noise at you before
 * you have touched it is obnoxious. Silence is the honest default.
 */
(function (root) {
  "use strict";

  const STORE = "hall.audio";
  const LOOKAHEAD_MS = 25;    // how often the scheduler wakes
  const HORIZON = 0.12;       // how far ahead of the clock it writes notes

  let ctx = null;
  let master = null;
  let timer = null;
  let score = null;
  let step = 0;               // sixteenth-note counter since the score started
  let nextTime = 0;
  let tension = 0, tensionSmooth = 0;
  let tally = null;              // set only by the offline render harness
  function count(layer) { if (tally) tally[layer] = (tally[layer] || 0) + 1; }
  let enabled = localStorage.getItem(STORE) !== "off";
  let started = false;

  // ── theory ────────────────────────────────────────────────────────────────
  /** Semitone offsets from the root. Modes, because a mode is a mood you can name. */
  const MODES = {
    aeolian:   [0, 2, 3, 5, 7, 8, 10],   // natural minor — driving, dark
    dorian:    [0, 2, 3, 5, 7, 9, 10],   // minor with a lifted sixth — spacious
    phrygian:  [0, 1, 3, 5, 7, 8, 10],   // flat second — menace
    mixolydian:[0, 2, 4, 5, 7, 9, 10],   // flat seventh — bouncy, arcade
    lydian:    [0, 2, 4, 6, 7, 9, 11],   // sharp fourth — bright, curious
    harmMinor: [0, 2, 3, 5, 7, 8, 11]    // raised seventh — tension that wants to resolve
  };

  /** MIDI note -> Hz. Equal temperament, A4 = 440. */
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /** Scale degree -> MIDI, wrapping octaves so a melody can run past seven notes. */
  function degree(root, mode, d) {
    const s = MODES[mode] || MODES.aeolian;
    const oct = Math.floor(d / s.length);
    const i = ((d % s.length) + s.length) % s.length;
    return root + s[i] + 12 * oct;
  }

  /** mulberry32, same generator the games use. A theme should be reproducible. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashOf(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  // ── voices ────────────────────────────────────────────────────────────────
  /**
   * One shaped oscillator note. `type` picks the timbre, the gain envelope does the
   * rest — a short attack and an exponential tail is most of what makes a synth note
   * read as plucked rather than as a tone generator left switched on.
   */
  function tone(t, freq, dur, type, level, opts) {
    opts = opts || {};
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.glide), t + dur);
    if (opts.detune) o.detune.setValueAtTime(opts.detune, t);

    const peak = Math.max(0.0001, level);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = o;
    if (opts.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(opts.cutoff, t);
      if (opts.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, opts.sweep), t + dur);
      f.Q.value = opts.q || 1;
      node.connect(f); node = f;
    }
    node.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** Filtered noise — hats, snares, wind, the dry rattle of a sand cabinet. */
  function noise(t, dur, level, opts) {
    opts = opts || {};
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // A fixed-seed noise burst so a rendered bar is byte-identical run to run, which
    // is what lets the offline harness assert on levels at all.
    const r = rng(opts.seed || 0x9E3779B9);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type || "highpass";
    f.frequency.setValueAtTime(opts.freq || 6000, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, opts.sweep), t + dur);
    f.Q.value = opts.q || 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, level), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  /** Kick: a sine dropped hard in pitch. The oldest trick and still the best one. */
  function kick(t, level) {
    tone(t, 132, 0.17, "sine", level, { glide: 55, attack: 0.004 });
  }

  // ── the scheduler ─────────────────────────────────────────────────────────
  /**
   * Writes one sixteenth of music at time `t`. Everything the arrangement does —
   * which layers sound, how open the filter is — is decided here against the
   * smoothed tension, so the music moves with play instead of cutting between states.
   */
  function emit(t, i) {
    const S = score;
    const T = tensionSmooth;
    const bar = Math.floor(i / 16);
    const beat = i % 16;
    const chord = S.prog[bar % S.prog.length];
    const r = S.melodyAt(i);

    // Per-cab trim. The audit measured a 4 dB spread in peak level between cabinets
    // (cube 0.710 against grain 0.445), which is very audible when you walk the floor.
    const K = S.trim;

    // PAD — always present. The floor of the arrangement.
    //
    // The resting level used to render at about -46 dBFS, which is silence once a game
    // starts making its own noise. A score you cannot hear at rest is not a quiet score,
    // it is a broken one, so the floor is now well above the noise and the *range* from
    // rest to full does the dynamics instead.
    if (beat === 0) {
      const open = 420 + T * 2600;
      count("pad");
      [0, 2, 4].forEach(function (n, k) {
        const m = degree(S.root, S.mode, chord + n) + (k === 0 ? -12 : 0);
        tone(t, hz(m), S.beat * 3.6, "sawtooth", K * (0.085 + T * 0.03),
          { cutoff: open, q: 3, attack: 0.25, detune: k * 6 - 6 });
      });
    }

    // BASS — from a whisper of tension upward. Roots and fifths, on the beat.
    if (T > 0.04 && S.bassAt(beat)) {
      count("bass");
      const m = degree(S.root, S.mode, chord) - 24 + (beat === 8 ? 7 : 0);
      // Duck the bass where the kick lands.
      //
      // The audit caught CUBE pinned at peak 0.710 across three different tension
      // levels — the sign of one transient slamming the compressor rather than the
      // music getting louder. It was the kick's pitch drop passing straight through
      // the bass fundamental on the same sixteenth and summing. Ducking is what a
      // mixing desk would do here, and it keeps the low end the kick's alone.
      const onKick = T > 0.22 && beat % 8 === 0;
      const duck = onKick ? 0.55 : 1;
      tone(t, hz(m), S.beat * 1.6, S.bassWave || "triangle", K * duck * (0.14 + T * 0.06),
        { cutoff: 700 + T * 900, attack: onKick ? 0.03 : 0.01 });
      // At the top of the range the bass picks up an octave below it. Weight, not volume.
      if (T > 0.78 && !onKick) {
        tone(t, hz(m - 12), S.beat * 1.4, "sine", K * 0.1 * (T - 0.78) / 0.22,
          { attack: 0.02 });
      }
    }

    // DRUMS — the first thing that makes it feel like trouble.
    if (T > 0.22) {
      if (beat % 8 === 0) { count("drums"); kick(t, K * (0.32 + T * 0.14)); }
      // Above 0.82 the kick doubles up — the pattern itself gets more urgent rather
      // than just louder, which is the whole complaint the audit raised.
      if (T > 0.82 && beat % 8 === 6) { count("drums"); kick(t, K * 0.26); }
      if (beat === 4 || beat === 12) {
        count("drums");
        noise(t, 0.11, K * (0.11 + T * 0.09), { type: "bandpass", freq: 1900, q: 0.9, seed: 0x5EED });
      }
      if (T > 0.45) {
        // Eighths to start with, sixteenths once it is genuinely bad.
        const hatOn = T > 0.75 ? true : (beat % 2 === 0);
        if (hatOn) count("drums");
        if (hatOn) noise(t, 0.035, K * (0.03 + T * 0.03), { type: "highpass", freq: 8200, seed: 0xA17 + beat });
      }
    }

    // ARP — the engine-room layer. Sixteenths through the chord.
    if (T > 0.38) {
      count("arp");
      const m = degree(S.root, S.mode, chord + (beat % 3) * 2) + 12;
      tone(t, hz(m), S.beat * 0.7, S.arpWave || "square", K * (0.045 + T * 0.035),
        { cutoff: 1200 + T * 3800, q: 2, attack: 0.004 });
    }

    // LEAD — held back until it means something. The melody is the last card played.
    // Lead density rises with tension: 35% of the marked notes at the bottom of its
    // range, all of them at the top.
    const leadDensity = 0.35 + Math.max(0, (T - 0.6) / 0.4) * 0.65;
    if (T > 0.6 && r.on && r.w <= leadDensity) {
      count("lead");
      const m = degree(S.root, S.mode, r.deg) + 12;
      tone(t, hz(m), S.beat * r.len, S.leadWave || "square", K * (0.075 + T * 0.045),
        { cutoff: 2200 + T * 4200, q: 1.5, attack: 0.006 });
      // Octave doubling at the very top. Cheap, and it is what every arcade board did.
      if (T > 0.88) {
        tone(t, hz(m + 12), S.beat * r.len * 0.8, "square", K * 0.03 * (T - 0.88) / 0.12,
          { cutoff: 5000, attack: 0.006 });
      }
    }

    // COUNTER-LINE — the top third of the range. Before this existed, tension 0.70 and
    // tension 1.00 rendered identical note counts on every cab and the last third of
    // the dial was decorative.
    if (T > 0.72) {
      const c = S.counterAt(i);
      if (c.on) {
        count("counter");
        const m = degree(S.root, S.mode, c.deg);
        tone(t, hz(m), S.beat * 0.9, "triangle", K * 0.055 * (T - 0.72) / 0.28,
          { cutoff: 1800 + T * 2000, q: 1.2, attack: 0.01 });
      }
    }
  }

  function tick() {
    if (!ctx || !score) return;
    // Ease toward the reported tension. A hard cut in arrangement is a jump scare;
    // over about a second it reads as the music noticing.
    tensionSmooth += (tension - tensionSmooth) * 0.06;
    while (nextTime < ctx.currentTime + HORIZON) {
      emit(nextTime, step);
      step++;
      nextTime += score.beat;
    }
  }

  // ── public surface ────────────────────────────────────────────────────────
  /**
   * Build a playable score from a cab definition. The melody is drawn once from the
   * seeded generator and then frozen into a loop, so it is a tune rather than an
   * endless improvisation.
   */
  function compile(def) {
    const bpm = def.bpm || 120;
    const beat = 60 / bpm / 4;                 // a sixteenth
    const rand = rng(hashOf("hall:" + def.id));
    const bars = def.bars || 4;
    const cells = bars * 16;

    // Draw a melody: mostly rests, stepwise motion, occasional leap. Written this way
    // because a line that plays on every sixteenth reads as an alarm, not a tune.
    const line = [];
    let d = 4;
    for (let i = 0; i < cells; i++) {
      const strong = i % 4 === 0;
      const on = rand() < (strong ? 0.55 : 0.16);
      if (on) {
        const leap = rand() < 0.22;
        d += leap ? (rand() < 0.5 ? 3 : -3) : (rand() < 0.5 ? 1 : -1);
        if (d > 11) d -= 7;
        if (d < 0) d += 7;
      }
      // Each note carries a weight. At the bottom of the lead's range only the
      // strongest notes sound and the line reads as sparse and picked-out; as tension
      // rises the weaker ones fill in. The audit showed lead firing a flat 5-8 times
      // regardless of tension, so the melody was the one layer not participating.
      line.push({ on: on, deg: d, len: on && rand() < 0.3 ? 2.4 : 1.1,
                  w: strong ? rand() * 0.5 : 0.5 + rand() * 0.5 });
    }

    // A second, denser line used only when tension is near the top. The audit showed
    // the arrangement saturating at 0.70 — every layer already in, so the last third
    // of the range only turned a volume knob. This line is what the top third buys.
    const counter = [];
    let cd = 7;
    for (let i = 0; i < cells; i++) {
      const on = rand() < 0.42;
      if (on) {
        cd += rand() < 0.5 ? 1 : -1;
        if (cd > 12) cd -= 7;
        if (cd < 2) cd += 7;
      }
      counter.push({ on: on, deg: cd });
    }

    return {
      id: def.id,
      root: def.root, mode: def.mode, beat: beat, bpm: bpm,
      prog: def.prog || [0, 5, 3, 4],
      bassWave: def.bassWave, arpWave: def.arpWave, leadWave: def.leadWave,
      trim: def.trim == null ? 1 : def.trim,
      bassAt: def.bassAt || function (b) { return b % 4 === 0; },
      melodyAt: function (i) { return line[i % cells]; },
      counterAt: function (i) { return counter[i % cells]; }
    };
  }

  /**
   * The output bus, shared by the live context and the offline render so the audit
   * measures the same signal path the player hears.
   *
   * The highpass is not a tone control, it is headroom. The audit found CUBE's peak
   * pinned at exactly 0.7103 across three tension levels — the signature of one
   * transient hitting the compressor so hard that different inputs squashed to the
   * same output, pumping the whole mix under it. CUBE's RMS was actually *below*
   * average, so it was never loud, just spiky: the kick's pitch drop was dumping
   * energy below 45 Hz, which no laptop or phone speaker reproduces and which was
   * therefore costing headroom for nothing.
   */
  function buildBus(context, input, output) {
    const hp = context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 38;
    hp.Q.value = 0.7;
    const comp = context.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.004;
    input.connect(hp); hp.connect(comp); comp.connect(output);
    return comp;
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    buildBus(ctx, master, ctx.destination);
    return ctx;
  }

  /** Start a cab's score. Safe to call before any gesture — it simply will not sound. */
  function play(def) {
    score = compile(def);
    step = 0;
    tension = 0; tensionSmooth = 0;
    if (!enabled) return false;
    if (!ensureCtx()) return false;
    if (ctx.state === "suspended") ctx.resume();
    started = true;
    nextTime = ctx.currentTime + 0.08;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.2);
    if (timer) clearInterval(timer);
    timer = setInterval(tick, LOOKAHEAD_MS);
    return true;
  }

  function stop(fade) {
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx && master) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + (fade == null ? 0.6 : fade));
    }
    started = false;
  }

  function setTension(v) {
    tension = Math.max(0, Math.min(1, v || 0));
    return tension;
  }

  function setEnabled(on) {
    enabled = !!on;
    localStorage.setItem(STORE, enabled ? "on" : "off");
    if (!enabled) stop(0.25);
    else if (score) play(pending || score);
    return enabled;
  }

  let pending = null;
  /** Arm a score to start on the player's first action, per the autoplay note above. */
  function arm(def) {
    pending = def;
    score = compile(def);
  }
  function wake() {
    if (started || !pending) return false;
    return play(pending);
  }

  /**
   * Render a score offline and hand back the buffer.
   *
   * This exists so the audit measures the arrangement the page actually plays. The
   * first version of the harness re-implemented emit() alongside it, which meant the
   * audit could pass while the engine drifted underneath it — a test that cannot fail
   * for the right reason. Here the live scheduler and the audit run the same code, and
   * the context is swapped underneath it for the duration of the render.
   */
  function renderOffline(def, T, seconds, Ctor) {
    const OC = Ctor || root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!OC) return Promise.reject(new Error("no OfflineAudioContext"));
    const SR = 44100;
    const saved = { ctx: ctx, master: master, score: score, ts: tensionSmooth, tally: tally };

    const off = new OC(1, Math.floor(SR * seconds), SR);
    ctx = off;
    master = off.createGain();
    master.gain.value = 0.9;
    buildBus(off, master, off.destination);

    const S = compile(def);
    score = S;
    tensionSmooth = T;
    tally = {};

    let t = 0.05, i = 0;
    while (t < seconds - 0.3) { emit(t, i); i++; t += S.beat; }

    const counted = tally;
    const p = off.startRendering().then(function (buf) {
      return { buffer: buf, notes: counted, bpm: S.bpm, mode: S.mode, trim: S.trim };
    });

    ctx = saved.ctx; master = saved.master; score = saved.score;
    tensionSmooth = saved.ts; tally = saved.tally;
    return p;
  }

  root.HallAudio = {
    arm: arm, wake: wake, play: play, stop: stop,
    tension: setTension,
    // Both the raw target and the smoothed value the arrangement is actually using —
    // they differ for about a second after any change, which is the point of the ease.
    tensionNow: function () { return { target: tension, smooth: tensionSmooth }; },
    enabled: function () { return enabled; },
    setEnabled: setEnabled,
    running: function () { return started; },
    context: function () { return ctx; },
    renderOffline: renderOffline,
    // exposed for the offline render harness
    _internals: { compile: compile, MODES: MODES, hz: hz, degree: degree, rng: rng, hashOf: hashOf }
  };
})(typeof window !== "undefined" ? window : globalThis);
