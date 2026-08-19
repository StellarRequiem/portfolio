window.Cab = { id: "grain", name: "GRAIN", mount(canvas, hall) {
  const COLS = 320, ROWS = 200, CELL = 2, UI = 92;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL + UI;
  canvas.style.zIndex = "5";
  canvas.style.position = "relative";
  const ctx = canvas.getContext("2d", { alpha: false });
  const img = ctx.createImageData(COLS * CELL, ROWS * CELL);
  const pix = img.data;

  const E = {
    EMPTY: 0, DUNE: 1, SALT: 2, BRIN: 3, OIL: 4, CIND: 5, MAGM: 6,
    HAZE: 7, FUME: 8, SLAB: 9, RIME: 10, PITH: 11, VINE: 12
  };
  const TOOLS = ["DUNE","SALT","BRIN","OIL","CIND","MAGM","HAZE","FUME","SLAB","RIME","PITH","VINE","ERASE","CHIP"];
  const RGB = [
    [8, 10, 14],
    [196, 164, 106],
    [214, 210, 196],
    [74, 138, 176],
    [58, 72, 42],
    [232, 96, 54],
    [186, 62, 28],
    [174, 196, 206],
    [118, 92, 64],
    [92, 100, 112],
    [186, 214, 222],
    [112, 78, 48],
    [62, 138, 78]
  ];
  const MODES = ["FALL", "LIFT", "GALE", "TIDE", "ZERO", "CRUSH", "WELL", "SPIN"];
  const AMOUNTS = [1, 4, 16, 48, 96];
  const POWDER = { [E.DUNE]: 1, [E.SALT]: 1 };
  const LIQUID = { [E.BRIN]: 1, [E.OIL]: 1, [E.MAGM]: 1 };
  const GAS = { [E.HAZE]: 1, [E.FUME]: 1, [E.CIND]: 1 };
  const SOLID = { [E.SLAB]: 1, [E.RIME]: 1, [E.PITH]: 1, [E.VINE]: 1 };
  const HOT = { [E.CIND]: 1, [E.MAGM]: 1 };

  const g = new Uint8Array(COLS * ROWS);
  const life = new Uint8Array(COLS * ROWS);
  const seen = new Uint8Array(COLS * ROWS);
  let alive = true, raf, actAt = 0;
  let score = 0, reacts = 0, poured = 0;
  let elemI = 0, grain = 2, amtI = 2, modeI = 0;
  let aimX = (COLS / 2) | 0, aimY = (ROWS / 3) | 0;
  let painting = false, pointerOn = false, paintKind = "paint";
  let stamp = 1;
  let fps = 0, fpsFrames = 0, fpsStamp = 0;

  function idx(x, y) { return y * COLS + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function tool() { return TOOLS[elemI]; }
  function amount() { return AMOUNTS[amtI]; }
  function mode() { return MODES[modeI]; }
  function toolKind() {
    const t = tool();
    if (t === "ERASE") return "erase";
    if (t === "CHIP") return "chip";
    return "paint";
  }
  function toolRgb() {
    const t = tool();
    if (t === "ERASE") return [255, 122, 154];
    if (t === "CHIP") return [255, 184, 107];
    return RGB[E[t]] || RGB[1];
  }
  function rgbCss(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (a == null ? 1 : a) + ")";
  }

  function note() {
    hall.note(tool() + " · G" + grain + " · ×" + amount() + " · " + mode() + " · keymap under the well");
  }
  function hud() {
    return tool() + " · G" + grain + " · ×" + amount() + " · " + mode();
  }

  function react(i, type, lf) {
    g[i] = type; life[i] = lf || 0; reacts++; score += 8; hall.score(score);
  }

  function chipCell(i, y) {
    if (y === ROWS - 1 && g[i] === E.SLAB) return false;
    const t = g[i];
    if (!t) return false;
    if (t === E.SLAB || t === E.PITH) { g[i] = E.DUNE; life[i] = 0; }
    else if (t === E.RIME) { g[i] = E.SALT; life[i] = 0; }
    else if (t === E.MAGM) { g[i] = E.DUNE; life[i] = 0; }
    else if (t === E.VINE || t === E.CIND || t === E.HAZE || t === E.FUME || t === E.OIL || t === E.BRIN) {
      g[i] = 0; life[i] = 0;
    } else return false;
    reacts++; score += 4;
    return true;
  }

  function writeCell(x, y, kind, type) {
    if (!inb(x, y)) return;
    const i = idx(x, y);
    if (y === ROWS - 1 && g[i] === E.SLAB) return;
    if (kind === "erase") {
      if (!g[i]) return;
      g[i] = 0; life[i] = 0;
      return;
    }
    if (kind === "chip") { chipCell(i, y); return; }
    if (!type) return;
    g[i] = type;
    life[i] = type === E.CIND ? (18 + Math.random() * 22) | 0 : type === E.VINE ? 4 : 0;
    poured++; score += 1;
  }

  function pourAt(cx, cy, kind) {
    kind = kind || toolKind();
    const type = E[tool()] || 0;
    const r = Math.max(1, grain);
    const rad = r + 1;
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++)
        writeCell(cx + dx, cy + dy, kind, type);
    const n = amount();
    for (let k = 0; k < n; k++) {
      const ox = ((Math.random() * 2 - 1) * r * 2) | 0;
      const oy = ((Math.random() * 2 - 1) * r * 2) | 0;
      for (let dy = 0; dy < r; dy++)
        for (let dx = 0; dx < r; dx++)
          writeCell(cx + ox + dx, cy + oy + dy, kind, type);
    }
    hall.score(score);
  }

  function tryMove(x, y, nx, ny, stampNow) {
    if (!inb(nx, ny)) return false;
    const a = idx(x, y), b = idx(nx, ny);
    if (seen[b] === stampNow) return false;
    const A = g[a], B = g[b];
    if (B === E.EMPTY) {
      g[b] = A; life[b] = life[a]; g[a] = 0; life[a] = 0;
      seen[b] = stampNow;
      return true;
    }
    if (A === E.DUNE && B === E.BRIN) {
      g[b] = A; life[b] = life[a]; g[a] = E.BRIN; life[a] = 0;
      seen[b] = stampNow;
      return true;
    }
    if (A === E.MAGM && (B === E.BRIN || B === E.OIL || B === E.HAZE)) {
      g[b] = A; life[b] = life[a]; g[a] = B === E.BRIN ? E.HAZE : E.EMPTY; life[a] = 0;
      seen[b] = stampNow;
      return true;
    }
    if (A === E.OIL && B === E.BRIN) {
      g[b] = A; life[b] = life[a]; g[a] = E.BRIN; life[a] = 0;
      seen[b] = stampNow;
      return true;
    }
    if (A === E.SALT && B === E.BRIN) {
      react(a, E.BRIN, 0);
      return true;
    }
    return false;
  }

  function touch(x, y) {
    const i = idx(x, y);
    const t = g[i];
    if (!t) return;
    const n4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let k = 0; k < 4; k++) {
      const nx = x + n4[k][0], ny = y + n4[k][1];
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny), u = g[j];
      if (t === E.CIND) {
        if (u === E.PITH || u === E.VINE || u === E.OIL || u === E.FUME) react(j, E.CIND, 16 + Math.random() * 16);
        else if (u === E.BRIN) { react(i, E.HAZE, 0); return; }
        else if (u === E.RIME) react(j, E.BRIN, 0);
      } else if (t === E.MAGM) {
        if (u === E.DUNE) react(j, E.SLAB, 0);
        else if (u === E.BRIN) { react(j, E.HAZE, 0); react(i, E.RIME, 0); return; }
        else if (u === E.PITH || u === E.VINE || u === E.OIL) react(j, E.CIND, 20);
        else if (u === E.RIME) react(j, E.BRIN, 0);
        else if (u === E.FUME) react(j, E.CIND, 12);
      } else if (t === E.VINE && u === E.EMPTY) {
        let wet = false, dirt = false;
        for (let q = 0; q < 4; q++) {
          const vx = x + n4[q][0], vy = y + n4[q][1];
          if (!inb(vx, vy)) continue;
          const w = g[idx(vx, vy)];
          if (w === E.BRIN) wet = true;
          if (w === E.DUNE) dirt = true;
        }
        if (wet && dirt && Math.random() < 0.04) react(j, E.VINE, 4);
      }
    }
    if (t === E.CIND) {
      if (life[i] > 0) life[i]--;
      if (life[i] <= 0) { g[i] = Math.random() < 0.35 ? E.SALT : E.EMPTY; life[i] = 0; }
    }
    if (t === E.HAZE && y <= 1 && Math.random() < 0.02) react(i, E.BRIN, 0);
  }

  function pref(x, y, m, t) {
    const cx = COLS / 2, cy = ROWS / 2;
    if (m === "WELL") {
      const dx = cx - x, dy = cy - y;
      if (Math.abs(dx) > Math.abs(dy)) return { dx: dx > 0 ? 1 : -1, dy: 0 };
      return { dx: 0, dy: dy > 0 ? 1 : -1 };
    }
    if (m === "SPIN") {
      const dx = x - cx, dy = y - cy;
      const tx = -dy, ty = dx;
      if (Math.abs(tx) > Math.abs(ty)) return { dx: tx > 0 ? 1 : -1, dy: 0 };
      return { dx: 0, dy: ty > 0 ? 1 : -1 };
    }
    if (m === "LIFT") return { dx: 0, dy: -1 };
    if (m === "GALE") return { dx: 1, dy: 1 };
    if (m === "TIDE") return { dx: Math.sin(t / 640) >= 0 ? 1 : -1, dy: 1 };
    if (m === "ZERO") return { dx: 0, dy: Math.random() < 0.28 ? 1 : 0 };
    return { dx: 0, dy: 1 };
  }

  function stepCell(x, y, m, t, stampNow) {
    const i = idx(x, y);
    const A = g[i];
    if (!A || SOLID[A]) { if (A) touch(x, y); return; }
    const p = pref(x, y, m, t);
    let dx = p.dx, dy = p.dy;
    if (GAS[A] && m === "FALL") { dx = 0; dy = -1; }
    if (GAS[A] && m === "LIFT") { dx = 0; dy = 1; }
    const side = Math.random() < 0.5 ? -1 : 1;
    if (POWDER[A]) {
      if (tryMove(x, y, x + dx, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx + side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx - side, y + dy, stampNow)) return;
    } else if (LIQUID[A]) {
      if (A === E.MAGM && (stampNow & 1) === 0) { touch(x, y); return; }
      if (tryMove(x, y, x + dx, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx + side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx - side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + side, y, stampNow)) return;
      if (tryMove(x, y, x - side, y, stampNow)) return;
    } else if (GAS[A]) {
      if (tryMove(x, y, x + dx, y + dy, stampNow)) return;
      if (tryMove(x, y, x + dx + side, y + dy, stampNow)) return;
      if (tryMove(x, y, x + side, y, stampNow)) return;
      if (tryMove(x, y, x - side, y, stampNow)) return;
    }
    touch(x, y);
  }

  function sim(t) {
    const m = mode();
    const passes = m === "CRUSH" ? 2 : 1;
    for (let p = 0; p < passes; p++) {
      stamp = (stamp + 1) & 255 || 1;
      const stampNow = stamp;
      if (m === "LIFT") {
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) stepCell(x, y, m, t, stampNow);
      } else {
        for (let y = ROWS - 2; y >= 0; y--)
          for (let x = 0; x < COLS; x++) stepCell(x, y, m, t, stampNow);
      }
    }
  }

  function paint() {
    const rgb = RGB;
    const pw = COLS * CELL;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = rgb[g[idx(x, y)]] || rgb[0];
        const jitter = ((x * 13 + y * 7) & 3);
        const r = Math.min(255, c[0] + jitter), gv = Math.min(255, c[1] + jitter), b = Math.min(255, c[2]);
        const x0 = x * CELL, y0 = y * CELL;
        for (let py = 0; py < CELL; py++) {
          let o = ((y0 + py) * pw + x0) * 4;
          for (let px = 0; px < CELL; px++) {
            pix[o] = r; pix[o + 1] = gv; pix[o + 2] = b; pix[o + 3] = 255;
            o += 4;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    drawAim();
    drawToolHud();
    drawStats();
    drawKeys();
  }

  function drawStats() {
    const w = 132, h = 58, x = COLS * CELL - w - 8, y = 8;
    ctx.fillStyle = "rgba(7,10,14,.82)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#243040";
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = "600 10px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#7d8796";
    ctx.fillText("SPAWN", x + 10, y + 16);
    ctx.fillText("LIVE", x + 10, y + 32);
    ctx.fillText("FPS", x + 10, y + 48);
    ctx.font = "700 13px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#ffb86b";
    ctx.textAlign = "right";
    ctx.fillText(String(poured).replace(/\B(?=(\d{3})+(?!\d))/g, ","), x + w - 10, y + 16);
    ctx.fillStyle = "#e8edf5";
    ctx.fillText(String(filledCount()).replace(/\B(?=(\d{3})+(?!\d))/g, ","), x + w - 10, y + 32);
    ctx.fillStyle = fps >= 50 ? "#7dffa6" : fps >= 30 ? "#ffb86b" : "#ff7a9a";
    ctx.fillText(String(fps), x + w - 10, y + 48);
    ctx.textAlign = "left";
  }

  function drawAim() {
    const c = toolRgb();
    const ax = aimX * CELL, ay = aimY * CELL;
    const s = (grain + 1) * CELL;
    ctx.fillStyle = rgbCss(c, 0.28);
    ctx.fillRect(ax - s, ay - s, s * 2, s * 2);
    ctx.strokeStyle = rgbCss(c, 0.95);
    ctx.lineWidth = 2;
    ctx.strokeRect(ax - s + 0.5, ay - s + 0.5, s * 2 - 1, s * 2 - 1);
    ctx.lineWidth = 1;
    if (toolKind() === "erase") {
      ctx.strokeStyle = "#ff7a9a";
      ctx.beginPath();
      ctx.moveTo(ax - s + 3, ay - s + 3); ctx.lineTo(ax + s - 3, ay + s - 3);
      ctx.moveTo(ax + s - 3, ay - s + 3); ctx.lineTo(ax - s + 3, ay + s - 3);
      ctx.stroke();
    } else if (toolKind() === "chip") {
      ctx.strokeStyle = "#ffb86b";
      ctx.beginPath();
      ctx.moveTo(ax - s + 4, ay); ctx.lineTo(ax + s - 4, ay);
      ctx.moveTo(ax - 2, ay - s + 4); ctx.lineTo(ax + 4, ay + 2);
      ctx.stroke();
    }
  }

  function drawToolHud() {
    const c = toolRgb();
    const kind = toolKind();
    const x = 8, y = 8, w = 168, h = 58;
    ctx.fillStyle = "rgba(7,10,14,.82)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = rgbCss(c, 0.85);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = rgbCss(c, 1);
    ctx.fillRect(x + 6, y + 6, 28, 28);
    ctx.strokeStyle = "#e8edf5";
    ctx.strokeRect(x + 6.5, y + 6.5, 27, 27);
    if (kind === "erase") {
      ctx.strokeStyle = "#0b0e13";
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 30, y + 30);
      ctx.moveTo(x + 30, y + 10); ctx.lineTo(x + 10, y + 30);
      ctx.stroke();
    }
    ctx.font = "700 13px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#e8edf5";
    ctx.fillText(tool(), x + 42, y + 18);
    ctx.font = "600 10px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#7d8796";
    const verb = kind === "erase" ? "ERASE" : kind === "chip" ? "CHIP" : "POUR";
    ctx.fillText(verb + " · " + mode(), x + 42, y + 32);
    const bx = x + 42, by = y + 40;
    const bs = Math.max(4, grain * 3);
    ctx.fillStyle = rgbCss(c, 0.95);
    ctx.fillRect(bx, by, bs, bs);
    ctx.strokeStyle = "#e8edf5";
    ctx.strokeRect(bx + 0.5, by + 0.5, bs - 1, bs - 1);
    ctx.fillStyle = "#7d8796";
    ctx.fillText("G" + grain + "  ×" + amount(), bx + bs + 8, by + 10);
  }

  function drawKeys() {
    const y0 = ROWS * CELL;
    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(0, y0, canvas.width, UI);
    ctx.fillStyle = "#243040";
    ctx.fillRect(0, y0, canvas.width, 1);
    let sx = 10;
    const sy = y0 + 10;
    for (let i = 0; i < TOOLS.length; i++) {
      const name = TOOLS[i];
      const col = name === "ERASE" ? [255, 122, 154] : name === "CHIP" ? [255, 184, 107] : (RGB[E[name]] || RGB[0]);
      const on = i === elemI;
      ctx.fillStyle = rgbCss(col, on ? 1 : 0.55);
      ctx.fillRect(sx, sy, 16, 16);
      ctx.strokeStyle = on ? "#7dffa6" : "#243040";
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, 15, 15);
      ctx.lineWidth = 1;
      if (on) {
        ctx.font = "700 9px ui-monospace, Menlo, monospace";
        ctx.fillStyle = "#7dffa6";
        ctx.fillText(name, sx, sy + 28);
      }
      sx += on ? 44 : 20;
    }
    ctx.font = "600 11px ui-monospace, Menlo, monospace";
    const rows = [
      ["POUR  drag / Space", "ERASE  right-click / Q", "CHIP  shift-click / F"],
      ["SIZE  [ ]  wheel", "AMOUNT  E  shift-wheel", "ELEM  X / Z   FLUX  C   Esc hall"]
    ];
    const colW = canvas.width / 3;
    rows.forEach((cols, ri) => {
      cols.forEach((txt, ci) => {
        const hot = (toolKind() === "erase" && txt.indexOf("ERASE") === 0)
          || (toolKind() === "chip" && txt.indexOf("CHIP") === 0)
          || (toolKind() === "paint" && txt.indexOf("POUR") === 0);
        ctx.fillStyle = hot ? "#7dffa6" : "#c5cdd8";
        ctx.fillText(txt, 10 + ci * colW, y0 + 56 + ri * 14);
      });
    });
  }

  function act(cmd) {
    if (!alive) return;
    const now = performance.now();
    if (now - actAt < 10) return;
    actAt = now;
    if (cmd === "left") aimX = Math.max(1, aimX - Math.max(2, grain));
    else if (cmd === "right") aimX = Math.min(COLS - 2, aimX + Math.max(2, grain));
    else if (cmd === "up") aimY = Math.max(1, aimY - Math.max(2, grain));
    else if (cmd === "down") aimY = Math.min(ROWS - 3, aimY + Math.max(2, grain));
    else if (cmd === "cw") elemI = (elemI + 1) % TOOLS.length;
    else if (cmd === "ccw") elemI = (elemI + TOOLS.length - 1) % TOOLS.length;
    else if (cmd === "soft") grain = Math.max(1, grain - 1);
    else if (cmd === "hard") grain = Math.min(8, grain + 1);
    else if (cmd === "jump") amtI = (amtI + 1) % AMOUNTS.length;
    else if (cmd === "hold") modeI = (modeI + 1) % MODES.length;
    else if (cmd === "fire") pourAt(aimX, aimY);
    else if (cmd === "tuck") pourAt(aimX, aimY, "erase");
    note();
  }

  function gridFromEvent(ev) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const bx = (ev.clientX - r.left) * (canvas.width / r.width);
    const by = (ev.clientY - r.top) * (canvas.height / r.height);
    if (by >= ROWS * CELL) return null;
    return {
      x: Math.max(0, Math.min(COLS - 1, (bx / CELL) | 0)),
      y: Math.max(0, Math.min(ROWS - 1, (by / CELL) | 0))
    };
  }

  function onDown(ev) {
    const p = gridFromEvent(ev);
    if (!p) return;
    painting = true; pointerOn = true;
    aimX = p.x; aimY = p.y;
    if (ev.button === 2) paintKind = "erase";
    else if (ev.shiftKey) paintKind = "chip";
    else paintKind = toolKind();
    pourAt(aimX, aimY, paintKind);
    ev.preventDefault();
  }
  function onMove(ev) {
    const p = gridFromEvent(ev);
    if (!p) return;
    aimX = p.x; aimY = p.y;
    pointerOn = true;
    if (painting) pourAt(aimX, aimY, paintKind);
  }
  function onContext(ev) { ev.preventDefault(); }
  function onUp() { painting = false; }
  function onWheel(ev) {
    ev.preventDefault();
    if (ev.shiftKey) {
      amtI = ev.deltaY > 0 ? Math.min(AMOUNTS.length - 1, amtI + 1) : Math.max(0, amtI - 1);
    } else {
      grain = ev.deltaY > 0 ? Math.min(8, grain + 1) : Math.max(1, grain - 1);
    }
    note();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContext);
  canvas.style.touchAction = "none";
  canvas.style.cursor = "crosshair";

  hall.onKey = e => {
    const map = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      " ": "fire", x: "cw", X: "cw", z: "ccw", Z: "ccw",
      c: "hold", C: "hold", e: "jump", E: "jump",
      q: "tuck", Q: "tuck"
    };
    if (e.key === "[" || e.key === "-") act("soft");
    else if (e.key === "]" || e.key === "=" || e.key === "+") act("hard");
    else if (e.key === "f" || e.key === "F") pourAt(aimX, aimY, "chip");
    else if (map[e.key]) act(map[e.key]);
  };

  function filledCount() {
    let n = 0;
    for (let i = 0; i < g.length; i++) if (g[i]) n++;
    return n;
  }

  function tick(t) {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    try {
      if (t) {
        fpsFrames++;
        if (!fpsStamp) fpsStamp = t;
        const span = t - fpsStamp;
        if (span >= 400) {
          fps = Math.round(fpsFrames * 1000 / span);
          fpsFrames = 0;
          fpsStamp = t;
        }
      }
      sim(t);
      if (hall.keys && hall.keys[" "]) pourAt(aimX, aimY);
      paint();
    } catch (err) { console.error("GRAIN", err); }
  }

  for (let x = 0; x < COLS; x++) g[idx(x, ROWS - 1)] = E.SLAB;
  for (let x = (COLS / 2 | 0) - 22; x < (COLS / 2 | 0) + 22; x++)
    for (let y = ROWS - 14; y < ROWS - 1; y++)
      if (Math.random() < 0.72) g[idx(x, y)] = E.DUNE;
  hall.score(0);
  note();
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      hall.onKey = null;
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
    },
    act,
    state() {
      return {
        cab: "grain",
        alive,
        score,
        elem: tool(),
        grain,
        amount: amount(),
        mode: mode(),
        aim: { x: aimX, y: aimY },
        filled: filledCount(),
        reacts,
        poured,
        fps,
        hud: hud(),
        legal: ["left", "right", "up", "down", "cw", "ccw", "soft", "hard", "fire", "hold", "jump", "tuck"]
      };
    }
  };
} };
