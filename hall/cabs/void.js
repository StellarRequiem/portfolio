window.Cab = { id: "void", name: "VOID", mount(canvas, hall) {
  const W = 720, H = 540;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
  const bullets = [];
  const rocks = [];
  let score = 0, lives = 3, cool = 0, inv = 120, alive = true, raf;
  function wrap(o) { o.x = (o.x + W) % W; o.y = (o.y + H) % H; }
  function spawnRock(x, y, r) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.6 + Math.random() * 1.4;
    const verts = 7 + (Math.random() * 4 | 0);
    const jag = [];
    for (let i = 0; i < verts; i++) jag.push(0.72 + Math.random() * 0.4);
    rocks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, jag, spin: (Math.random() - 0.5) * 0.03, rot: 0 });
  }
  function wave(n) {
    for (let i = 0; i < n; i++) {
      let x, y;
      do { x = Math.random() * W; y = Math.random() * H; }
      while (Math.hypot(x - ship.x, y - ship.y) < 160);
      spawnRock(x, y, 36);
    }
  }
  function resetShip() {
    ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0; ship.a = -Math.PI / 2; inv = 120;
  }
  function die() {
    lives--;
    if (lives <= 0) { alive = false; hall.over(score); return; }
    resetShip();
  }
  function act(cmd) {
    if (!alive) return;
    if (cmd === "left") ship.a -= 0.09;
    if (cmd === "right") ship.a += 0.09;
    if (cmd === "up") { ship.vx += Math.cos(ship.a) * 0.18; ship.vy += Math.sin(ship.a) * 0.18; }
    if (cmd === "fire" && cool <= 0) {
      bullets.push({ x: ship.x + Math.cos(ship.a) * 14, y: ship.y + Math.sin(ship.a) * 14,
        vx: Math.cos(ship.a) * 7 + ship.vx, vy: Math.sin(ship.a) * 7 + ship.vy, t: 42 });
      cool = 10;
    }
  }
  hall.onKey = e => {
    if (e.key === " " || e.key === "x" || e.key === "X") act("fire");
  };
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (hall.keys.ArrowLeft) act("left");
    if (hall.keys.ArrowRight) act("right");
    if (hall.keys.ArrowUp) act("up");
    if (hall.keys[" "]) act("fire");
    if (cool > 0) cool--;
    if (inv > 0) inv--;
    ship.vx *= 0.99; ship.vy *= 0.99;
    ship.x += ship.vx; ship.y += ship.vy; wrap(ship);
    for (const b of bullets) { b.x += b.vx; b.y += b.vy; wrap(b); b.t--; }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].t <= 0) bullets.splice(i, 1);
    if (hall.acted) for (const r of rocks) { r.x += r.vx; r.y += r.vy; r.rot += r.spin; wrap(r); }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      for (let j = rocks.length - 1; j >= 0; j--) {
        const r = rocks[j];
        if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
          bullets.splice(i, 1);
          rocks.splice(j, 1);
          score += r.r > 24 ? 20 : r.r > 14 ? 50 : 100;
          hall.score(score);
          if (r.r > 14) { spawnRock(r.x, r.y, r.r * 0.55); spawnRock(r.x, r.y, r.r * 0.55); }
          break;
        }
      }
    }
    if (inv <= 0) {
      for (const r of rocks) {
        if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 8) { die(); break; }
      }
    }
    if (rocks.length === 0) wave(4 + Math.min(6, (score / 400) | 0));
    draw();
  }
  function draw() {
    ctx.fillStyle = "#070a0e"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(125,255,166,.08)";
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.strokeStyle = "#7dffa6";
    for (const r of rocks) {
      ctx.beginPath();
      const n = r.jag.length;
      for (let i = 0; i <= n; i++) {
        const t = (i % n) / n * Math.PI * 2 + r.rot;
        const rr = r.r * r.jag[i % n];
        const x = r.x + Math.cos(t) * rr, y = r.y + Math.sin(t) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#ffb86b";
    for (const b of bullets) { ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3); }
    if (inv <= 0 || (inv % 8) < 5) {
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
      ctx.strokeStyle = "#6ee7ff"; ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(-10, 8); ctx.lineTo(-6, 0); ctx.lineTo(-10, -8);
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#8b95a8"; ctx.font = "12px ui-monospace,monospace";
    ctx.fillText("SHIPS " + lives, 12, 20);
  }
  wave(4); hall.score(0);
  hall.note("← → rotate · ↑ thrust · Space fire · wrap field · Esc hall");
  raf = requestAnimationFrame(tick);
  return {
    destroy() { alive = false; cancelAnimationFrame(raf); },
    act,
    state() {
      return { cab: "void", alive, score, lives, rocks: rocks.length, legal: ["left", "right", "up", "fire"] };
    }
  };
} };
