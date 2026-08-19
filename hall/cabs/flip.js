window.Cab = { id: "flip", name: "FLIP", mount(canvas, hall) {
  const W = 420, H = 640;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const walls = [
    [30, 30, 390, 30], [390, 30, 390, 560], [30, 30, 30, 560],
    [30, 560, 150, 620], [390, 560, 270, 620]
  ];
  const bumpers = [
    { x: 150, y: 180, r: 22, v: 0 },
    { x: 270, y: 180, r: 22, v: 0 },
    { x: 210, y: 280, r: 26, v: 0 }
  ];
  const L = { x: 155, y: 540, a: 0.5, down: 0.55, up: -0.45, on: false, hold: 0 };
  const R = { x: 265, y: 540, a: Math.PI - 0.5, down: Math.PI - 0.55, up: Math.PI + 0.45, on: false, hold: 0 };
  let ball = { x: 372, y: 500, vx: 0, vy: 0, r: 7, live: false };
  let plunge = 0, balls = 3, score = 0, alive = true, raf, locked = true;
  function act(cmd) {
    if (!alive) return;
    if (cmd === "left") { L.on = true; L.hold = 8; }
    if (cmd === "right") { R.on = true; R.hold = 8; }
    if (cmd === "fire" || cmd === "down") plunge = Math.min(18, plunge + 1.2);
    if (cmd === "hard" && locked) launch();
  }
  function launch() {
    if (!locked || balls <= 0) return;
    locked = false; ball.live = true;
    ball.x = 372; ball.y = 500;
    ball.vx = -0.4; ball.vy = -8 - plunge * 0.55;
    plunge = 0;
  }
  hall.onKey = e => {
    if (e.key === " " ) { if (locked) launch(); }
    if (e.type === "keydown" && e.key === "ArrowDown") act("fire");
  };
  addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") L.on = false;
    if (e.key === "ArrowRight") R.on = false;
  });
  function bounceLine(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const px = ball.x - x1, py = ball.y - y1;
    const d = px * nx + py * ny;
    const t = (px * dx + py * dy) / (len * len);
    if (t < 0 || t > 1) return;
    if (d > 0 && d < ball.r + 1) {
      ball.x += nx * (ball.r + 1 - d);
      ball.y += ny * (ball.r + 1 - d);
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) { ball.vx -= 1.7 * vn * nx; ball.vy -= 1.7 * vn * ny; }
    }
  }
  function flipper(F, left) {
    const target = F.on ? F.up : F.down;
    F.a += (target - F.a) * 0.45;
    const x2 = F.x + Math.cos(F.a) * 56;
    const y2 = F.y + Math.sin(F.a) * 56;
    bounceLine(F.x, F.y, x2, y2);
    if (F.on) {
      const mx = (F.x + x2) / 2, my = (F.y + y2) / 2;
      if (Math.hypot(ball.x - mx, ball.y - my) < 28) {
        const kick = left ? -0.4 : 0.4;
        ball.vy -= 3.2; ball.vx += kick * 3;
      }
    }
    return [F.x, F.y, x2, y2];
  }
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (L.hold > 0) { L.on = true; L.hold--; }
    else L.on = !!hall.keys.ArrowLeft;
    if (R.hold > 0) { R.on = true; R.hold--; }
    else R.on = !!hall.keys.ArrowRight;
    if (hall.keys.ArrowDown && locked) act("fire");
    if (!locked && ball.live) {
      ball.vy += 0.18;
      ball.vx *= 0.995; ball.vy *= 0.995;
      ball.x += ball.vx; ball.y += ball.vy;
      for (const w of walls) bounceLine(w[0], w[1], w[2], w[3]);
      flipper(L, true); flipper(R, false);
      for (const b of bumpers) {
        const d = Math.hypot(ball.x - b.x, ball.y - b.y);
        if (d < b.r + ball.r) {
          const nx = (ball.x - b.x) / (d || 1), ny = (ball.y - b.y) / (d || 1);
          ball.x = b.x + nx * (b.r + ball.r);
          ball.y = b.y + ny * (b.r + ball.r);
          ball.vx = nx * 6; ball.vy = ny * 6;
          b.v = 8; score += 100; hall.score(score);
        }
        if (b.v > 0) b.v--;
      }
      if (ball.y > H + 20) {
        balls--;
        if (balls <= 0) { alive = false; hall.over(score); return; }
        locked = true; ball.live = false; ball.x = 372; ball.y = 500; ball.vx = 0; ball.vy = 0;
      }
    }
    draw();
  }
  function draw() {
    ctx.fillStyle = "#0b1014"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#2a3140"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, 560); ctx.lineTo(30, 30); ctx.lineTo(390, 30); ctx.lineTo(390, 560);
    ctx.stroke();
    ctx.strokeStyle = "#3a4454";
    ctx.beginPath(); ctx.moveTo(30, 560); ctx.lineTo(150, 620); ctx.moveTo(390, 560); ctx.lineTo(270, 620); ctx.stroke();
    ctx.fillStyle = "#1a222c"; ctx.fillRect(364, 120, 20, 430);
    for (const b of bumpers) {
      ctx.beginPath(); ctx.fillStyle = b.v ? "#7dffa6" : "#5aa7c9";
      ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    }
    function drawF(F) {
      ctx.strokeStyle = "#ffb86b"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(F.x, F.y);
      ctx.lineTo(F.x + Math.cos(F.a) * 56, F.y + Math.sin(F.a) * 56); ctx.stroke();
    }
    drawF(L); drawF(R);
    ctx.fillStyle = "#dce8f5";
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
    if (locked) {
      ctx.fillStyle = "#6ee7ff";
      ctx.fillRect(368, 500, 12, 20 + plunge);
    }
    ctx.fillStyle = "#8b95a8"; ctx.font = "12px ui-monospace,monospace"; ctx.lineWidth = 1;
    ctx.fillText("BALLS " + balls + (locked ? "  HOLD ↓ CHARGE  SPACE LAUNCH" : ""), 12, 22);
  }
  hall.score(0);
  hall.note("← → flippers · hold ↓ charge plunger · Space launch · nodes score · Esc hall");
  raf = requestAnimationFrame(tick);
  return {
    destroy() { alive = false; cancelAnimationFrame(raf); },
    act,
    state() {
      return { cab: "flip", alive, score, balls, locked, legal: ["left", "right", "down", "fire", "hard"] };
    }
  };
} };
