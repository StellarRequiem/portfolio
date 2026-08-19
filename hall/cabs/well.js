window.Cab = { id: "well", name: "WELL", mount(canvas, hall) {
  const COLS = 10, ROWS = 20, SIZE = 28;
  canvas.width = COLS * SIZE; canvas.height = ROWS * SIZE;
  const ctx = canvas.getContext("2d");
  const COLORS = {
    I: "#dce8f5", O: "#e6c27a", T: "#7dffa6", S: "#5aa7c9",
    Z: "#c4786a", J: "#8aa0c4", L: "#d4a574",
    G: "#3a4554"
  };
  const LAYER_LINE = { SEED: "#1a222c", SURGE: "#24324a", CRUSH: "#32242c", ABYSS: "#3a1818" };
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
  };
  const KICKS = {
    JLSTZ: {
      "0>1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "1>0":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
      "1>2":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "2>1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
      "2>3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]], "3>2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
      "3>0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "0>3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]
    },
    I: {
      "0>1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "1>0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
      "1>2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], "2>1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
      "2>3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "3>2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
      "3>0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "0>3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
    }
  };

  let grid, queue, cur, hold, canHold, score, lines, level, pieces, dropMs, acc, last, alive;
  let actAt = 0;
  let combo, echo, riseHole, riseMs, riseAcc, layer;
  let tideDealt, tideHist;
  const TIDE = ["I", "O", "T", "S", "Z", "J", "L"];
  const TIDE_OPEN = ["I", "T", "J", "L"];
  function empty() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
  /**
   * TIDE stream — not a 7-bag. Agents with next-5 must not see a closed set.
   * History-4 rerolls (6 tries), no back-to-back, flood cap 2-in-6,
   * I drought cap 12, opening piece from IJTL only.
   */
  function take() {
    if (!tideDealt.length) {
      return tideCommit(TIDE_OPEN[(Math.random() * TIDE_OPEN.length) | 0]);
    }
    if (tideDealt.length >= 12 && tideDealt.slice(-12).indexOf("I") < 0) return tideCommit("I");
    let pick = TIDE[(Math.random() * 7) | 0];
    for (let r = 0; r < 6; r++) {
      const p = TIDE[(Math.random() * 7) | 0];
      if (tideHist.indexOf(p) >= 0) continue;
      if (tideDealt[tideDealt.length - 1] === p) continue;
      if (tideDealt.slice(-6).filter(x => x === p).length >= 2) continue;
      pick = p;
      break;
    }
    return tideCommit(pick);
  }
  function tideCommit(p) {
    tideDealt.push(p);
    tideHist.push(p);
    if (tideHist.length > 4) tideHist.shift();
    return p;
  }
  function spawn(type) {
    return { type, cells: SHAPES[type].map(r => r.slice()), r: type === "I" ? -1 : 0, c: 3, rot: 0 };
  }
  function rotate(m, dir) {
    const n = m.length, out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      out[dir > 0 ? x : n - 1 - x][dir > 0 ? n - 1 - y : y] = m[y][x];
    return out;
  }
  function hits(p, dr = 0, dc = 0, cells = p.cells) {
    for (let y = 0; y < cells.length; y++) for (let x = 0; x < cells[y].length; x++) {
      if (!cells[y][x]) continue;
      const gy = p.r + y + dr, gx = p.c + x + dc;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && grid[gy][gx]) return true;
    }
    return false;
  }
  function ghostY() { let d = 0; while (!hits(cur, d + 1)) d++; return d; }
  function tryRotate(dir) {
    const nextRot = (cur.rot + (dir > 0 ? 1 : 3)) % 4;
    const cells = rotate(cur.cells, dir);
    const table = cur.type === "I" ? KICKS.I : cur.type === "O" ? { [`${cur.rot}>${nextRot}`]: [[0, 0]] } : KICKS.JLSTZ;
    for (const [dx, dy] of (table[`${cur.rot}>${nextRot}`] || [[0, 0]])) {
      if (!hits(cur, -dy, dx, cells)) {
        cur.cells = cells; cur.c += dx; cur.r -= dy; cur.rot = nextRot; return;
      }
    }
  }
  function dropFor(lv) {
    if (lv >= 20) return Math.max(50, 80 - (lv - 20) * 2);
    return Math.max(80, 800 - (lv - 1) * 70);
  }
  function riseFor(lv) {
    if (lv < 5) return 0;
    if (lv < 10) return Math.max(1400, 3600 - (lv - 5) * 400);
    if (lv < 20) return Math.max(700, 1600 - (lv - 10) * 70);
    return Math.max(380, 700 - (lv - 20) * 15);
  }
  function layerOf(lv) {
    if (lv < 5) return "SEED";
    if (lv < 10) return "SURGE";
    if (lv < 20) return "CRUSH";
    return "ABYSS";
  }
  function hud() {
    const bits = [layer];
    if (combo >= 2) bits.push("COMBO " + combo);
    if (echo) bits.push("ECHO");
    if (riseMs) bits.push("RISE");
    return bits.join(" · ");
  }
  function sweep() {
    let n = 0;
    for (let y = ROWS - 1; y >= 0; y--) if (grid[y].every(Boolean)) {
      grid.splice(y, 1); grid.unshift(Array(COLS).fill(null)); n++; y++;
    }
    return n;
  }
  function award(n) {
    if (!n) { combo = 0; return; }
    const L = level;
    score += [0, 100, 300, 500, 800][n] * L;
    if (n === 4 && echo) score += 400 * L;
    if (combo > 0) score += 50 * combo * L;
    combo++;
    echo = n === 4;
    lines += n;
    level = 1 + Math.floor(lines / 10);
    dropMs = dropFor(level);
    riseMs = riseFor(level);
    layer = layerOf(level);
    hall.note(hud());
  }
  function rise() {
    if (!alive || !hall.acted || !riseMs) return;
    if (grid[0].some(Boolean)) { die(); return; }
    grid.shift();
    const row = Array(COLS).fill("G");
    row[riseHole] = null;
    if (layer === "ABYSS" && level >= 30) row[(riseHole + 5) % COLS] = null;
    grid.push(row);
    riseHole = (riseHole + 3) % COLS;
    if (cur && hits(cur)) {
      cur.r--;
      if (hits(cur)) die();
    }
  }
  function lock() {
    for (let y = 0; y < cur.cells.length; y++) for (let x = 0; x < cur.cells[y].length; x++) {
      if (!cur.cells[y][x]) continue;
      const gy = cur.r + y, gx = cur.c + x;
      if (gy < 0) { die(); return; }
      grid[gy][gx] = cur.type;
    }
    pieces++;
    award(sweep());
    canHold = true;
    nextPiece();
    hall.score(score);
  }
  function nextPiece() {
    while (queue.length < 5) queue.push(take());
    cur = spawn(queue.shift());
    if (hits(cur)) die();
  }
  function die() {
    if (!alive) return;
    alive = false;
    hall.score(score);
    hall.over(score);
  }
  function holdSwap() {
    if (!canHold) return;
    canHold = false;
    const t = cur.type;
    if (!hold) { hold = t; nextPiece(); }
    else { const h = hold; hold = t; cur = spawn(h); if (hits(cur)) die(); }
  }
  function applyCmd(cmd) {
    if (cmd === "left" && !hits(cur, 0, -1)) cur.c--;
    else if (cmd === "right" && !hits(cur, 0, 1)) cur.c++;
    else if (cmd === "soft") {
      if (!hits(cur, 1)) { cur.r++; score += 1; hall.score(score); } else lock();
      acc = 0;
    } else if (cmd === "cw") tryRotate(1);
    else if (cmd === "ccw") tryRotate(-1);
    else if (cmd === "hard") {
      const g = ghostY(); cur.r += g; score += 2 * g; hall.score(score); lock(); acc = 0;
    } else if (cmd === "hold") holdSwap();
  }
  function act(cmd, burst) {
    if (!alive || !cur) return;
    const now = performance.now();
    // Echo guard is for HallBus.act + key pulse (same verb twice). A planned
    // burst is many different verbs in one frame — gravity at 80ms cannot wait.
    if (!burst && now - actAt < 10) return;
    actAt = now;
    applyCmd(cmd);
  }
  function actBurst(list) {
    const cmds = Array.isArray(list) ? list : String(list || "").split(/[\s,]+/).filter(Boolean);
    for (let i = 0; i < cmds.length && alive && cur; i++) act(cmds[i], true);
  }
  hall.onKey = e => {
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "soft", ArrowUp: "cw", x: "cw", X: "cw", z: "ccw", Z: "ccw", " ": "hard", c: "hold", C: "hold" };
    if (e.code === "ShiftLeft") act("hold");
    else if (map[e.key]) act(map[e.key]);
  };

  function cell(x, y, color, a = 1) {
    const px = x * SIZE + 1, py = y * SIZE + 1, w = SIZE - 2;
    ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(px, py, w, w);
    if (a > 0.4) {
      ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fillRect(px, py, w, 3);
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(px, py + w - 3, w, 3);
    }
    ctx.globalAlpha = 1;
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = LAYER_LINE[layer] || "#1a222c";
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * SIZE, 0); ctx.lineTo(x * SIZE, ROWS * SIZE); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * SIZE); ctx.lineTo(COLS * SIZE, y * SIZE); ctx.stroke(); }
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x]) cell(x, y, COLORS[grid[y][x]]);
    if (alive && cur) {
      const gy = ghostY();
      for (let y = 0; y < cur.cells.length; y++) for (let x = 0; x < cur.cells[y].length; x++) if (cur.cells[y][x]) {
        const yy = cur.r + y, xx = cur.c + x;
        if (yy + gy >= 0) cell(xx, yy + gy, COLORS[cur.type], 0.18);
        if (yy >= 0) cell(xx, yy, COLORS[cur.type]);
      }
    }
  }
  function tick(t) {
    if (!alive) { draw(); return; }
    raf = requestAnimationFrame(tick);
    const dt = t - last; last = t; acc += dt;
    if (acc >= dropMs) {
      acc = 0;
      if (!hits(cur, 1)) cur.r++; else lock();
    }
    if (riseMs && hall.acted) {
      riseAcc += dt;
      if (riseAcc >= riseMs) { riseAcc = 0; rise(); }
    }
    draw();
  }

  let raf;
  grid = empty(); queue = []; hold = null; canHold = true;
  tideDealt = []; tideHist = [];
  score = 0; lines = 0; level = 1; pieces = 0; dropMs = 800; acc = 0;
  combo = 0; echo = false; riseHole = 9; riseMs = 0; riseAcc = 0; layer = "SEED";
  last = performance.now(); alive = true;
  nextPiece(); hall.score(0);
  hall.note("SEED · combo pays on a second clear · rise starts at L5");
  raf = requestAnimationFrame(tick);

  return {
    destroy() { alive = false; cancelAnimationFrame(raf); },
    act,
    actBurst,
    state() {
      const heights = Array(COLS).fill(0);
      let holes = 0;
      for (let x = 0; x < COLS; x++) {
        let seen = false;
        for (let y = 0; y < ROWS; y++) {
          if (grid[y][x]) { if (!seen) heights[x] = ROWS - y; seen = true; }
          else if (seen) holes++;
        }
      }
      return {
        cab: "well", alive, score, lines, level, pieces, hold, canHold,
        next: queue.slice(0, 5),
        cur: cur ? { type: cur.type, r: cur.r, c: cur.c, rot: cur.rot } : null,
        rows: grid.map(row => row.map(c => c ? c : ".").join("")),
        heights, holes, maxH: Math.max(0, ...heights),
        dropMs, combo, echo, riseMs, riseHole, layer, hud: hud(),
        rand: "tide",
        legal: ["left", "right", "cw", "ccw", "soft", "hard", "hold"]
      };
    }
  };
} };
