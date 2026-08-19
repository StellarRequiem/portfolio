window.Cab = { id: "tar", name: "TAR", mount(canvas, hall) {
  const W = 400, H = 640;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const roadL = 70, roadR = W - 70;
  let x = W / 2, y = H - 120, vx = 0, jump = 0, jv = 0;
  let dist = 0, score = 0, heat = 0, alive = true, raf, inv = 0;
  const cars = [], oils = [], bits = [];
  function spawn() {
    if (dist < 800) return;
    if (Math.random() < 0.03) {
      cars.push({
        x: roadL + 30 + Math.random() * (roadR - roadL - 60),
        y: -40, vy: 2 + Math.random() * 2.4, w: 28, h: 40, hue: Math.random()
      });
    }
    if (Math.random() < 0.012) oils.push({ x: roadL + 20 + Math.random() * (roadR - roadL - 40), y: -20, w: 36 });
  }
  function act(cmd) {
    if (!alive) return;
    if (cmd === "left") vx -= 0.7;
    if (cmd === "right") vx += 0.7;
    if ((cmd === "jump" || cmd === "up") && jump === 0) { jump = 1; jv = 7; }
  }
  hall.onKey = e => {
    if (e.key === " " || e.key === "z" || e.key === "Z" || e.key === "ArrowUp") act("jump");
  };
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (hall.keys.ArrowLeft) act("left");
    if (hall.keys.ArrowRight) act("right");
    spawn();
    vx *= 0.86;
    x += vx;
    if (x < roadL + 16) { x = roadL + 16; vx = 0; }
    if (x > roadR - 16) { x = roadR - 16; vx = 0; }
    if (jump) { jv -= 0.35; jump += jv; if (jump <= 0) { jump = 0; jv = 0; } }
    const speed = 6 + Math.min(6, dist / 4000);
    dist += speed;
    score += 1;
    if (inv > 0) inv--;
    for (const c of cars) c.y += speed - c.vy;
    for (const o of oils) o.y += speed;
    for (const b of bits) { b.y += speed; b.t--; }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      if (c.y > H + 50) { cars.splice(i, 1); continue; }
      const hit = jump === 0 && Math.abs(c.x - x) < 26 && Math.abs(c.y - y) < 34;
      if (hit && inv <= 0) {
        const side = x < c.x ? -1 : 1;
        c.x += side * 18; x -= side * 10;
        score += 80; heat++;
        if (c.x < roadL + 10 || c.x > roadR - 10) {
          bits.push({ x: c.x, y: c.y, t: 24 });
          cars.splice(i, 1); score += 200;
        }
        hall.score(score);
      }
    }
    for (let i = oils.length - 1; i >= 0; i--) {
      const o = oils[i];
      if (o.y > H) { oils.splice(i, 1); continue; }
      if (jump === 0 && Math.abs(o.x - x) < 24 && Math.abs(o.y - y) < 20) vx += (Math.random() < 0.5 ? -1 : 1) * 2.4;
    }
    if (x < roadL || x > roadR) { crash(); }
    hall.score(score);
    draw(speed);
  }
  function crash() {
    if (!alive) return;
    alive = false;
    score += Math.floor(dist / 10);
    hall.score(score);
    hall.over(score);
  }
  function draw(speed) {
    ctx.fillStyle = "#1a1510"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2a241c"; ctx.fillRect(0, 0, roadL, H); ctx.fillRect(roadR, 0, W - roadR, H);
    ctx.fillStyle = "#3a3428"; ctx.fillRect(roadL, 0, roadR - roadL, H);
    const off = (dist * 2) % 40;
    ctx.fillStyle = "#e6c27a";
    for (let y = -40; y < H; y += 40) ctx.fillRect(W / 2 - 3, y + off, 6, 18);
    ctx.fillStyle = "rgba(40,40,20,.55)";
    for (const o of oils) { ctx.beginPath(); ctx.ellipse(o.x, o.y, 22, 8, 0, 0, 7); ctx.fill(); }
    for (const c of cars) {
      ctx.fillStyle = c.hue > 0.5 ? "#c4786a" : "#8aa0c4";
      ctx.fillRect(c.x - 14, c.y - 20, 28, 40);
    }
    ctx.save();
    ctx.translate(x, y - jump);
    ctx.fillStyle = (inv % 8) < 5 ? "#7dffa6" : "#dce8f5";
    ctx.fillRect(-12, -18, 24, 36);
    ctx.fillStyle = "#0a0e12"; ctx.fillRect(-8, -10, 16, 10);
    ctx.restore();
    ctx.fillStyle = "#ffb86b";
    for (const b of bits) if (b.t > 0) ctx.fillRect(b.x - 4, b.y - 4, 8, 8);
    ctx.fillStyle = "#8b95a8"; ctx.font = "12px ui-monospace,monospace";
    ctx.fillText("KM " + (dist / 100).toFixed(1) + "  HEAT " + heat, 12, 20);
  }
  hall.score(0);
  hall.note("← → steer · Space/↑ jump · bump them into the berm · Esc hall");
  raf = requestAnimationFrame(tick);
  return {
    destroy() { alive = false; cancelAnimationFrame(raf); },
    act,
    state() {
      return { cab: "tar", alive, score, dist, heat, legal: ["left", "right", "jump"] };
    }
  };
} };
