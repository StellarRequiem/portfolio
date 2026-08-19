/** Discrete observe/act bus. Agents click [data-act] or HallBus.act — not analog sticks. */
window.HallBus = {
  last: null,
  handle: null,
  hall: null,
  keys: null,
  meta: null,
  _latches: Object.create(null),

  attach(opts) {
    this.handle = opts.handle || null;
    this.hall = opts.hall;
    this.keys = opts.keys;
    this.meta = opts.meta;
    this.paint();
    if (!this._tick) {
      this._tick = setInterval(() => this.paint(), 100);
    }
    return this;
  },

  map: {
    left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
    fire: " ", soft: "ArrowDown", hard: " ", jump: " ",
    cw: "ArrowUp", ccw: "z", hold: "c", tuck: "ArrowDown"
  },

  pulse(cmd, ms) {
    const key = this.map[cmd] || cmd;
    const keys = this.keys;
    const hall = this.hall;
    if (!keys) return;
    keys[key] = true;
    if (key === "ArrowLeft") keys.a = keys.A = true;
    if (key === "ArrowRight") keys.d = keys.D = true;
    if (key === "ArrowUp") keys.w = keys.W = true;
    if (key === "ArrowDown") keys.s = keys.S = true;
    if (hall && hall.onKey) {
      hall.onKey({ key: key, code: key === " " ? "Space" : key, type: "keydown", preventDefault() {} });
    }
    const hold = Math.max(40, ms || (cmd === "up" || cmd === "tuck" ? 140 : 70));
    clearTimeout(this._latches[key]);
    this._latches[key] = setTimeout(() => {
      keys[key] = false;
      if (key === "ArrowLeft") keys.a = keys.A = false;
      if (key === "ArrowRight") keys.d = keys.D = false;
      if (key === "ArrowUp") keys.w = keys.W = false;
      if (key === "ArrowDown") keys.s = keys.S = false;
    }, hold);
  },

  act(cmd) {
    cmd = String(cmd || "").trim().toLowerCase();
    if (!cmd) return this.state();
    if (this.hall) this.hall.acted = true;
    if (this.handle && typeof this.handle.act === "function") {
      try { this.handle.act(cmd); } catch (_) {}
    }
    this.pulse(cmd);
    return this.state();
  },

  actMany(cmds, gap) {
    const list = Array.isArray(cmds) ? cmds : String(cmds).split(/[\s,]+/).filter(Boolean);
    let i = 0;
    const step = () => {
      if (i >= list.length) { this.paint(); return; }
      this.act(list[i++]);
      setTimeout(step, gap || 50);
    };
    step();
    return { queued: list.length };
  },

  /** One-frame burst. WELL uses this so 80ms gravity cannot lock mid-plan. */
  actBurst(cmds) {
    const list = Array.isArray(cmds) ? cmds : String(cmds).split(/[\s,]+/).filter(Boolean);
    if (this.hall) this.hall.acted = true;
    if (this.handle && typeof this.handle.actBurst === "function") {
      try { this.handle.actBurst(list); } catch (_) {}
    } else if (this.handle && typeof this.handle.act === "function") {
      for (let i = 0; i < list.length; i++) {
        try { this.handle.act(list[i], true); } catch (_) {}
      }
    }
    this.paint();
    return this.state();
  },

  state() {
    let snap = {
      cab: this.meta && this.meta.id,
      name: this.meta && this.meta.name,
      alive: true,
      score: 0,
      legal: ["left", "right", "up", "down", "fire"]
    };
    if (this.handle && typeof this.handle.state === "function") {
      try { snap = Object.assign(snap, this.handle.state() || {}); } catch (_) {}
    }
    const el = document.getElementById("score");
    if (el && !snap.score) snap.score = Number(String(el.textContent).replace(/,/g, "")) || 0;
    snap.t = Date.now();
    this.last = snap;
    return snap;
  },

  paint() {
    const snap = this.state();
    const pre = document.getElementById("telem");
    if (pre) pre.textContent = "TELEM " + JSON.stringify(snap);
    const legal = document.getElementById("acts");
    if (legal && Array.isArray(snap.legal)) {
      legal.querySelectorAll("[data-act]").forEach(btn => {
        btn.hidden = snap.legal.indexOf(btn.getAttribute("data-act")) < 0
          && ["left", "right", "up", "down", "fire"].indexOf(btn.getAttribute("data-act")) < 0;
      });
    }
    const extra = document.getElementById("extra");
    if (extra) extra.textContent = snap.hud || "";
    try { localStorage.setItem("hall.telem.v1", JSON.stringify(snap)); } catch (_) {}
  }
};
