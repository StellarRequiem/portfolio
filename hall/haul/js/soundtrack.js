/**
 * THE LONG HAUL — file soundtrack.
 *
 * Cue sheet: audio/tracks.json. Files: audio/tracks/<base>.ogg and .mp3.
 * Looping is an AudioBufferSourceNode on a decoded buffer (loop / loopStart /
 * loopEnd), not an <audio> element. Track changes crossfade. A missing file is
 * skipped. Nothing starts until the first gesture, and the preference sticks
 * in localStorage.
 *
 * While a reel is actually playing, this holds the speakers and the procedural
 * cabinet score (HallAudio) waits. An empty cabinet leaves that score alone.
 */
(function (root) {
  "use strict";

  var STORE_ON = "haul.ost.on";
  var STORE_VOL = "haul.ost.volume";
  var STORE_SHUFFLE = "haul.ost.shuffle";
  var BASE_NAME = /^[A-Za-z0-9._-]+$/;

  var enabled = readOn();
  var volume = readVol();
  var shuffle = readShuffle();
  var formats = [];
  var fadeSec = 1.5;
  var cueCount = 0;
  var playlist = [];
  var order = [];
  var currentIndex = -1;
  var active = null;
  var ctx = null;
  var master = null;
  var bus = null;
  var ready = false;
  var gesture = false;
  var pendingStart = false;
  var holding = false;
  var token = 0;
  var booting = false;
  var decoded = new Object(null);

  function readOn() {
    try { return localStorage.getItem(STORE_ON) !== "off"; }
    catch (e) { return true; }
  }
  function readVol() {
    try {
      var raw = localStorage.getItem(STORE_VOL);
      if (raw == null || raw === "") return 0.8;
      var n = Number(raw);
      if (!isFinite(n)) return 0.8;
      return clamp(n, 0, 1);
    } catch (e) { return 0.8; }
  }
  function readShuffle() {
    try { return localStorage.getItem(STORE_SHUFFLE) === "on"; }
    catch (e) { return false; }
  }
  function persist() {
    try {
      localStorage.setItem(STORE_ON, enabled ? "on" : "off");
      localStorage.setItem(STORE_VOL, String(volume));
      localStorage.setItem(STORE_SHUFFLE, shuffle ? "on" : "off");
    } catch (e) {}
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function seconds(v) {
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
    return null;
  }
  function safeBase(name) {
    if (typeof name !== "string") return "";
    var base = name.trim();
    return BASE_NAME.test(base) ? base : "";
  }

  /**
   * OGG Vorbis when the browser can play it, otherwise MP3.
   * Ties go to OGG — that is the delivered master, MP3 is the fallback.
   * The other extension is still tried if the preferred file is missing.
   */
  function formatOrder() {
    var el = root.document.createElement("audio");
    function rank(type) {
      var v = "";
      try { v = el.canPlayType(type) || ""; } catch (e) { v = ""; }
      if (v === "probably") return 2;
      if (v === "maybe") return 1;
      return 0;
    }
    var ogg = rank('audio/ogg; codecs="vorbis"');
    var mp3 = rank("audio/mpeg");
    if (mp3 > ogg) return ["mp3", "ogg"];
    return ["ogg", "mp3"];
  }

  function regionFor(track, buffer) {
    var dur = Math.max(0.001, (buffer && buffer.duration) || 0);
    if (!track || track.mode === "one-shot") {
      return { loop: false, loopStart: 0, loopEnd: dur, offset: 0 };
    }
    var loopStart = seconds(track.loopStart);
    var loopEnd = seconds(track.loopEnd);
    if (loopStart == null || loopStart <= 0 || loopStart >= dur) {
      return { loop: true, loopStart: 0, loopEnd: dur, offset: 0 };
    }
    if (loopEnd == null || loopEnd <= loopStart || loopEnd > dur) loopEnd = dur;
    return {
      loop: true,
      loopStart: loopStart,
      loopEnd: loopEnd,
      offset: track.mode === "loop" ? loopStart : 0
    };
  }

  /**
   * Sample-accurate plan for one title. Intro ends where the body begins.
   * The tail is not in this plan; it is scheduled when the title ends or
   * the player leaves it.
   */
  function timeline(track, buffers, t0) {
    var events = [];
    var t = t0 || 0;
    buffers = buffers || {};
    if (buffers.intro && buffers.intro.duration > 0) {
      events.push({
        role: "intro", start: t, duration: buffers.intro.duration,
        loop: false, offset: 0
      });
      t += buffers.intro.duration;
    }
    if (!buffers.main) return events;
    var region = regionFor(track, buffers.main);
    events.push({
      role: "main",
      start: t,
      duration: buffers.main.duration,
      loop: region.loop,
      loopStart: region.loopStart,
      loopEnd: region.loopEnd,
      offset: region.offset
    });
    t += buffers.main.duration;
    // Tail is an exit, not part of the body. A one-shot ends here; the tail is
    // scheduled on the way out so a skip can still play it.
    if (track && track.mode === "one-shot") events.push({ role: "end", start: t });
    return events;
  }

  function fileUrl(manifestUrl, folder, base, ext) {
    return new URL(folder + "/" + base + "." + ext, manifestUrl).href;
  }

  function looksLikeAudio(res) {
    if (!res || !res.ok) return false;
    var ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.indexOf("text/html") !== -1) return false;
    return true;
  }

  function probe(url) {
    return fetch(url, { method: "HEAD" }).then(function (res) {
      if (res.status === 405 || res.status === 501) {
        return fetch(url, { headers: { Range: "bytes=0-0" } }).then(looksLikeAudio, function () { return false; });
      }
      return looksLikeAudio(res);
    }, function () { return false; });
  }

  function resolveBase(manifestUrl, folder, base) {
    var name = safeBase(base);
    if (!name) return Promise.resolve("");
    var i = 0;
    function step() {
      if (i >= formats.length) return Promise.resolve("");
      var url = fileUrl(manifestUrl, folder, name, formats[i]);
      i += 1;
      return probe(url).then(function (ok) { return ok ? url : step(); });
    }
    return step();
  }

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === "suspended") {
        var again = ctx.resume();
        if (again && typeof again.catch === "function") again.catch(function () {});
      }
      return ctx;
    }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    bus = ctx.createGain();
    bus.connect(master);
    master.connect(ctx.destination);
    if (ctx.state === "suspended") {
      var resumed = ctx.resume();
      if (resumed && typeof resumed.catch === "function") resumed.catch(function () {});
    }
    return ctx;
  }

  function decode(url) {
    if (!url) return Promise.resolve(null);
    if (!ctx) return Promise.resolve(null);
    if (Object.prototype.hasOwnProperty.call(decoded, url)) return decoded[url];
    var job = fetch(url).then(function (res) {
      if (!looksLikeAudio(res)) return null;
      return res.arrayBuffer();
    }).then(function (ab) {
      if (!ab) return null;
      return ctx.decodeAudioData(ab.slice(0));
    }).then(function (buf) {
      if (!buf) delete decoded[url];
      return buf || null;
    }, function () {
      delete decoded[url];
      return null;
    });
    decoded[url] = job;
    return job;
  }

  function loadBuffers(track) {
    if (!ensureCtx()) return Promise.resolve(null);
    return Promise.all([
      decode(track.mainUrl),
      track.introUrl ? decode(track.introUrl) : Promise.resolve(null),
      track.tailUrl ? decode(track.tailUrl) : Promise.resolve(null)
    ]).then(function (parts) {
      if (!parts[0]) return null;
      return { main: parts[0], intro: parts[1], tail: parts[2] };
    }, function () { return null; });
  }

  function fisher(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function rebuildOrder(start) {
    var rest = [];
    for (var i = 0; i < playlist.length; i++) if (i !== start) rest.push(i);
    order = [start].concat(fisher(rest));
  }

  function advance(index) {
    var n = playlist.length;
    if (n <= 1) return 0;
    if (!shuffle) return (index + 1) % n;
    if (!order.length) rebuildOrder(index);
    var pos = order.indexOf(index);
    if (pos < 0) pos = 0;
    if (pos + 1 >= order.length) {
      rebuildOrder(index);
      return order.length > 1 ? order[1] : order[0];
    }
    return order[pos + 1];
  }

  function ramp(param, from, to, t, dur, shape) {
    var n = 48;
    var curve = new Float32Array(n);
    var i;
    var p;
    var w;
    dur = Math.max(0.05, dur);
    for (i = 0; i < n; i++) {
      p = n === 1 ? 1 : i / (n - 1);
      w = shape === "in" ? Math.sin(p * Math.PI / 2) : Math.cos(p * Math.PI / 2);
      curve[i] = Math.max(0.0001, shape === "in" ? from + (to - from) * w : to + (from - to) * w);
    }
    try {
      param.cancelScheduledValues(t);
      param.setValueAtTime(Math.max(0.0001, from), t);
      param.setValueCurveAtTime(curve, t + 0.001, dur);
    } catch (e) {
      try {
        param.cancelScheduledValues(t);
        param.setValueAtTime(Math.max(0.0001, from), t);
        param.linearRampToValueAtTime(Math.max(0.0001, to), t + dur);
      } catch (e2) {}
    }
  }

  function ping() {
    try { root.document.dispatchEvent(new CustomEvent("haul-ost")); } catch (e) {}
  }

  function takeSpeakers() {
    if (holding) return;
    holding = true;
    if (root.HallAudio && root.HallAudio.running()) {
      try { root.HallAudio.stop(0.25); } catch (e) {}
    }
    ping();
  }

  function releaseSpeakers() {
    if (!holding) return;
    holding = false;
    ping();
    if (root.HallAudio && root.HallAudio.enabled() && !root.HallAudio.running()) {
      try { root.HallAudio.wake(); } catch (e) {}
    }
  }

  function clearTimer(voice) {
    if (voice && voice.timer) {
      clearTimeout(voice.timer);
      voice.timer = 0;
    }
  }

  function stopTail(voice, when) {
    if (!voice || !voice.tailSrc) return;
    try { voice.tailSrc.stop(when); } catch (e) {}
    try { if (voice.tailGain) voice.tailGain.disconnect(); } catch (e2) {}
    voice.tailSrc = null;
    voice.tailGain = null;
  }

  function silenceVoice(voice, when) {
    if (!voice) return;
    clearTimer(voice);
    voice.sources.forEach(function (src) {
      try { src.onended = null; } catch (e) {}
      try { src.stop(when); } catch (e2) {}
    });
    var wait = ctx ? Math.max(0, (when - ctx.currentTime) * 1000) + 300 : 300;
    setTimeout(function () {
      try { voice.gain.disconnect(); } catch (e) {}
    }, wait);
  }

  function spillTail(voice, t) {
    if (!voice || !voice.tailBuffer || voice.tailPlayed || !ctx) return 0;
    voice.tailPlayed = true;
    var g = ctx.createGain();
    g.connect(bus);
    g.gain.setValueAtTime(1, t);
    var src = ctx.createBufferSource();
    src.buffer = voice.tailBuffer;
    src.connect(g);
    var when = Math.max(t, ctx.currentTime + 0.02);
    try { src.start(when); } catch (e) { return 0; }
    var dur = voice.tailBuffer.duration;
    var fadeAt = when + Math.max(0, dur - fadeSec);
    ramp(g.gain, 1, 0.0001, fadeAt, Math.min(fadeSec, Math.max(0.05, dur)), "out");
    setTimeout(function () {
      try { src.stop(); } catch (e) {}
      try { g.disconnect(); } catch (e2) {}
    }, (dur + 0.35) * 1000);
    return dur;
  }

  function schedule(voice, buffers, t0) {
    var events = timeline(voice.track, buffers, t0);
    events.forEach(function (ev) {
      if (ev.role === "end") return;
      var buffer = ev.role === "intro" ? buffers.intro : ev.role === "tail" ? buffers.tail : buffers.main;
      if (!buffer) return;
      var src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(voice.gain);
      if (ev.loop) {
        src.loop = true;
        src.loopStart = ev.loopStart;
        src.loopEnd = ev.loopEnd;
      }
      var when = ev.start < ctx.currentTime ? ctx.currentTime + 0.02 : ev.start;
      var offset = ev.offset || 0;
      if (offset < 0) offset = 0;
      if (offset >= buffer.duration) offset = 0;
      try { src.start(when, offset); }
      catch (e) {
        try { src.disconnect(); } catch (e2) {}
        if (!ev.loop) return;
        var retry = ctx.createBufferSource();
        retry.buffer = buffer;
        retry.loop = true;
        retry.connect(voice.gain);
        try { retry.start(when); } catch (e3) { return; }
        voice.sources.push(retry);
        return;
      }
      voice.sources.push(src);
    });
    return events;
  }

  function armOneShot(voice, events) {
    if (!voice.track || voice.track.mode !== "one-shot") return;
    var bodyEnd = 0;
    events.forEach(function (ev) {
      if (ev.role === "end") bodyEnd = ev.start;
      else bodyEnd = Math.max(bodyEnd, ev.start + (ev.duration || 0));
    });
    var tailDur = scheduleExitTail(voice, bodyEnd);
    var nextAt = bodyEnd + tailDur - fadeSec;
    var wait = Math.max(0.05, nextAt - ctx.currentTime);
    voice.timer = setTimeout(function () {
      if (active !== voice) return;
      voice.tailPlayed = true;
      go(advance(voice.index));
    }, wait * 1000);
  }

  function cancelFutureTail(voice) {
    if (!voice || !voice.tailSrc || !ctx) return;
    if (voice.tailAt != null && ctx.currentTime + 0.03 < voice.tailAt) {
      try { voice.tailSrc.stop(); } catch (e) {}
      try { if (voice.tailGain) voice.tailGain.disconnect(); } catch (e2) {}
      voice.tailSrc = null;
      voice.tailGain = null;
      voice.tailPlayed = false;
    }
  }

  function scheduleExitTail(voice, when) {
    if (!voice || !voice.tailBuffer || voice.tailPlayed || !ctx) return 0;
    voice.tailPlayed = true;
    voice.tailAt = when;
    var g = ctx.createGain();
    g.connect(bus);
    g.gain.setValueAtTime(1, when);
    var src = ctx.createBufferSource();
    src.buffer = voice.tailBuffer;
    src.connect(g);
    var startAt = when < ctx.currentTime ? ctx.currentTime + 0.02 : when;
    try { src.start(startAt); }
    catch (e) {
      voice.tailPlayed = false;
      try { g.disconnect(); } catch (e2) {}
      return 0;
    }
    voice.tailSrc = src;
    voice.tailGain = g;
    var dur = voice.tailBuffer.duration;
    var fadeAt = startAt + Math.max(0, dur - fadeSec);
    ramp(g.gain, 1, 0.0001, fadeAt, Math.min(fadeSec, Math.max(0.05, dur)), "out");
    setTimeout(function () {
      try { src.stop(); } catch (err) {}
      try { g.disconnect(); } catch (err2) {}
    }, (dur + 0.4) * 1000);
    return dur;
  }

  function startVoice(track, buffers, index) {
    if (!ctx || !enabled) return;
    var t = ctx.currentTime + 0.05;
    var outgoing = active;
    var inAt = t;
    var tailDur = 0;
    if (outgoing) {
      clearTimer(outgoing);
      cancelFutureTail(outgoing);
      tailDur = spillTail(outgoing, t);
      if (tailDur > 0) {
        ramp(outgoing.gain.gain, outgoing.gain.gain.value || 1, 0.0001, t, Math.min(0.2, fadeSec), "out");
        silenceVoice(outgoing, t + 0.25);
        inAt = t + Math.max(0, tailDur - fadeSec);
      } else {
        ramp(outgoing.gain.gain, outgoing.gain.gain.value || 1, 0.0001, t, fadeSec, "out");
        silenceVoice(outgoing, t + fadeSec + 0.04);
        inAt = t;
      }
      if (tailDur === 0 && outgoing.tailGain) {
        try { ramp(outgoing.tailGain.gain, outgoing.tailGain.gain.value || 1, 0.0001, t, fadeSec, "out"); } catch (e) {}
      }
    }
    var voice = {
      track: track,
      index: index,
      gain: ctx.createGain(),
      sources: [],
      tailBuffer: buffers.tail || null,
      tailPlayed: false,
      tailAt: null,
      tailSrc: null,
      tailGain: null,
      looping: track.mode !== "one-shot",
      timer: 0
    };
    voice.gain.connect(bus);
    voice.gain.gain.setValueAtTime(0.0001, inAt);
    var events = schedule(voice, buffers, inAt);
    ramp(voice.gain.gain, 0.0001, 1, inAt, outgoing ? fadeSec : 0.22, "in");
    active = voice;
    currentIndex = index;
    if (shuffle) {
      if (!order.length || order.indexOf(index) < 0) rebuildOrder(index);
    }
    paint();
    armOneShot(voice, events);
    var nxt = advance(index);
    if (playlist[nxt]) loadBuffers(playlist[nxt]);
  }

  function go(index) {
    var my = ++token;
    return attempt(index, my, 0);
  }

  function attempt(index, my, skips) {
    if (my !== token || !enabled) return Promise.resolve("cancelled");
    if (!playlist.length || skips > playlist.length) return Promise.resolve(false);
    if (index < 0 || index >= playlist.length) index = 0;
    var track = playlist[index];
    paintLoading(track);
    return loadBuffers(track).then(function (buffers) {
      if (my !== token || !enabled) return "cancelled";
      if (!buffers || !buffers.main) return attempt(advance(index), my, skips + 1);
      startVoice(track, buffers, index);
      return true;
    }, function () { return false; });
  }

  function giveUp() {
    booting = false;
    if (active && ctx) {
      stopTail(active, ctx.currentTime + 0.05);
      silenceVoice(active, ctx.currentTime + 0.05);
    }
    active = null;
    releaseSpeakers();
    paint();
  }

  function bootPlayback() {
    if (booting || active) return;
    if (!enabled || !gesture || !ready || !playlist.length) return;
    if (!ensureCtx()) return;
    booting = true;
    takeSpeakers();
    var index = 0;
    if (shuffle) {
      index = Math.floor(Math.random() * playlist.length);
      rebuildOrder(index);
    }
    go(index).then(function (ok) {
      booting = false;
      if (ok === false) giveUp();
    }, function () { booting = false; giveUp(); });
  }

  function stopAll() {
    token++;
    booting = false;
    pendingStart = false;
    if (active && ctx) {
      stopTail(active, ctx.currentTime + 0.05);
      ramp(active.gain.gain, active.gain.gain.value || 1, 0.0001, ctx.currentTime, 0.2, "out");
      silenceVoice(active, ctx.currentTime + 0.25);
    }
    active = null;
    releaseSpeakers();
    paint();
  }

  function unlock() {
    gesture = true;
    if (!enabled) return;
    if (ready && !playlist.length) return;
    ensureCtx();
    if (ready) bootPlayback();
    else pendingStart = true;
  }

  function fromControl(ev) {
    var t = ev && ev.target;
    if (!t || !t.closest) return false;
    return !!t.closest("[data-ost-toggle], [data-ost-next], [data-ost-shuffle], [data-ost-volume]");
  }

  function setEnabled(on) {
    enabled = !!on;
    persist();
    paint();
    if (!enabled) {
      stopAll();
      return enabled;
    }
    gesture = true;
    if (ready && !playlist.length) return enabled;
    ensureCtx();
    bootPlayback();
    return enabled;
  }

  function setVolume(v) {
    volume = clamp(Number(v) || 0, 0, 1);
    if (master) master.gain.value = volume;
    persist();
    var pct = String(Math.round(volume * 100));
    root.document.querySelectorAll("[data-ost-volume] input").forEach(function (input) {
      if (input.value !== pct) input.value = pct;
    });
  }

  function onNext() {
    if (!enabled) return;
    gesture = true;
    if (!ensureCtx()) return;
    if (!ready) { pendingStart = true; return; }
    if (!playlist.length) return;
    if (!active) { bootPlayback(); return; }
    takeSpeakers();
    go(advance(currentIndex));
  }

  function onShuffle() {
    shuffle = !shuffle;
    persist();
    if (playlist.length) rebuildOrder(currentIndex >= 0 ? currentIndex : 0);
    paint();
    if (!enabled) return;
    gesture = true;
    ensureCtx();
    if (!active && ready) bootPlayback();
  }

  function statusText() {
    if (!enabled) return "Music off.";
    if (!ready) return "Checking the cue sheet.";
    if (active) return active.track.id + "  " + active.track.title;
    if (!playlist.length) {
      if (!cueCount) return "No soundtrack cue sheet.";
      return cueCount + " titles on the cue sheet. Audio files are not in the cabinet yet.";
    }
    return playlist.length + " on the reel. Music starts on the first move.";
  }

  function paintLoading(track) {
    var text = track ? "Loading " + track.title : statusText();
    root.document.querySelectorAll("[data-ost-now]").forEach(function (el) {
      el.textContent = text;
    });
  }

  function paint() {
    var text = statusText();
    root.document.querySelectorAll("[data-ost-now]").forEach(function (el) {
      el.textContent = text;
    });
    root.document.querySelectorAll("[data-ost-toggle]").forEach(function (el) {
      el.textContent = enabled ? "MUSIC ON" : "MUSIC OFF";
      el.setAttribute("aria-pressed", enabled ? "true" : "false");
      el.classList.toggle("off", !enabled);
    });
    root.document.querySelectorAll("[data-ost-shuffle]").forEach(function (el) {
      el.setAttribute("aria-pressed", shuffle ? "true" : "false");
      el.classList.toggle("on", shuffle);
    });
  }

  function bind() {
    root.document.querySelectorAll("[data-ost-toggle]").forEach(function (el) {
      el.addEventListener("click", function () {
        setEnabled(!enabled);
        el.blur();
      });
    });
    root.document.querySelectorAll("[data-ost-next]").forEach(function (el) {
      el.addEventListener("click", function () {
        onNext();
        el.blur();
      });
    });
    root.document.querySelectorAll("[data-ost-shuffle]").forEach(function (el) {
      el.addEventListener("click", function () {
        onShuffle();
        el.blur();
      });
    });
    root.document.querySelectorAll("[data-ost-volume] input").forEach(function (input) {
      input.value = String(Math.round(volume * 100));
      input.addEventListener("input", function () {
        setVolume(Number(input.value) / 100);
        if (enabled) unlock();
      });
    });
    root.document.addEventListener("pointerdown", function (ev) {
      if (fromControl(ev)) return;
      unlock();
    }, true);
    root.document.addEventListener("keydown", function (ev) {
      if (ev.repeat) return;
      if (ev.key === "m" || ev.key === "M") return;
      var tag = ev.target && ev.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      unlock();
    }, true);
    paint();
  }

  function loadManifest() {
    formats = formatOrder();
    var manifestUrl = new URL("audio/tracks.json", root.document.baseURI);
    fetch(manifestUrl.href).then(function (res) {
      if (!res.ok) return null;
      return res.json();
    }).then(function (manifest) {
      if (!manifest || !Array.isArray(manifest.tracks)) {
        cueCount = 0;
        playlist = [];
        return;
      }
      var fade = seconds(manifest.crossfadeSeconds);
      if (fade != null) fadeSec = clamp(fade, 0.2, 5);
      var folder = String(manifest.folder || "tracks").replace(/^\/+|\/+$/g, "") || "tracks";
      cueCount = manifest.tracks.length;
      var jobs = manifest.tracks.map(function (row) {
        var file = safeBase(row && row.file);
        if (!file) return Promise.resolve(null);
        return resolveBase(manifestUrl, folder, file).then(function (mainUrl) {
          if (!mainUrl) return null;
          var intro = safeBase(row.intro);
          var tail = safeBase(row.tail);
          return Promise.all([
            intro ? resolveBase(manifestUrl, folder, intro) : Promise.resolve(""),
            tail ? resolveBase(manifestUrl, folder, tail) : Promise.resolve("")
          ]).then(function (extra) {
            return {
              id: safeBase(row.id) || file,
              title: (row.title && String(row.title)) || file,
              file: file,
              mode: row.mode === "one-shot" || row.mode === "one-shot-then-loop" ? row.mode : "loop",
              loopStart: row.loopStart,
              loopEnd: row.loopEnd,
              mainUrl: mainUrl,
              introUrl: extra[0] || "",
              tailUrl: extra[1] || ""
            };
          });
        });
      });
      return Promise.all(jobs).then(function (rows) {
        playlist = rows.filter(function (row) { return row && row.mainUrl; });
      });
    }, function () {
      cueCount = 0;
      playlist = [];
    }).then(function () {
      ready = true;
      paint();
      if (pendingStart && enabled && gesture) bootPlayback();
    });
  }

  bind();
  loadManifest();

  root.HaulSoundtrack = {
    occupying: function () { return holding; },
    enabled: function () { return enabled; },
    setEnabled: setEnabled,
    setVolume: setVolume,
    next: onNext,
    ready: function () { return ready; },
    debug: function () {
      return {
        ready: ready,
        enabled: enabled,
        shuffle: shuffle,
        volume: volume,
        gesture: gesture,
        occupying: holding,
        formats: formats.slice(),
        cue: cueCount,
        playlist: playlist.map(function (t) {
          return { id: t.id, title: t.title, mode: t.mode, intro: !!t.introUrl, tail: !!t.tailUrl };
        }),
        current: active ? {
          id: active.track.id,
          title: active.track.title,
          looping: active.looping,
          sources: active.sources.length
        } : null,
        context: ctx ? ctx.state : null
      };
    },
    _region: regionFor,
    _timeline: timeline
  };
})(typeof window !== "undefined" ? window : globalThis);
