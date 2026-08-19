window.Cab = { id: "cube", name: "CUBE", mount(canvas, hall) {
  const W = 480, H = 640;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const VANISH = 168, NEAR = 580;
  let lane = 1, vis = 1, cool = 0, travel = 0, score = 0, lives = 3, grace = 120, alive = true, raf;
  const cubes = [];
  function spd() { return 0.022 + Math.min(0.07, travel * 0.000012); }
  function proj(ln, z) {
    const scale = 180 / (z + 2.5);
    const y = VANISH + (NEAR - VANISH) * (2.5 / (z + 2.5));
    const x = W / 2 + (ln - 1) * 1.15 * scale;
    return { x, y, s: scale };
  }
  function wave(z0) {
    const lanes = [0, 1, 2];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    const n = travel > 70 && Math.random() < 0.58 ? 2 : 1;
    for (let i = 0; i < n; i++) cubes.push({ lane: lanes[i], z: z0 + i * 0.35 });
  }
  function over() {
    if (!alive) return;
    alive = false;
    hall.score(score);
    hall.over(score);
  }
  function act(cmd) {
    if (!alive || cool > 0) return;
    if (cmd === "left" && lane > 0) { lane--; cool = 8; }
    if (cmd === "right" && lane < 2) { lane++; cool = 8; }
  }
  hall.onKey = e => {
    if (e.key === "ArrowLeft") act("left");
    if (e.key === "ArrowRight") act("right");
  };
  wave(20); wave(26);
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (cool > 0) cool--;
    if (cool === 0) {
      if (hall.keys.ArrowLeft) act("left");
      if (hall.keys.ArrowRight) act("right");
    }
    vis += (lane - vis) * 0.28;
    if (hall.acted) {
      const sp = spd();
      travel += sp;
      score = Math.floor(travel * 10);
      hall.score(score);
      if (grace > 0) grace--;
      let maxZ = 0;
      for (let i = cubes.length - 1; i >= 0; i--) {
        const c = cubes[i];
        c.z -= sp;
        if (c.z > maxZ) maxZ = c.z;
        if (grace <= 0 && c.z < 0.35 && c.z > -0.2 && c.lane === lane) {
          lives--;
          grace = 50;
          if (lives <= 0) { over(); return; }
        }
        if (c.z < -0.35) cubes.splice(i, 1);
      }
      if (maxZ < 12) wave(18 + Math.random() * 2);
    }
    draw();
  }
  function draw() {
    ctx.fillStyle = "#070a0e"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(125,255,166,.05)";
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(W, H);
    ctx.lineTo(W / 2 + 36, VANISH); ctx.lineTo(W / 2 - 36, VANISH);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(139,149,168,.4)";
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + k * 10, VANISH);
      ctx.lineTo(W / 2 + k * 210, H);
      ctx.stroke();
    }
    const hz = (travel * 18) % 1;
    ctx.strokeStyle = "rgba(110,231,255,.12)";
    for (let i = 0; i < 9; i++) {
      const z = (i + hz) * 1.5;
      const p = proj(1, z);
      const half = p.s * 1.7;
      ctx.beginPath(); ctx.moveTo(p.x - half, p.y); ctx.lineTo(p.x + half, p.y); ctx.stroke();
    }
    const sorted = cubes.slice().sort((a, b) => b.z - a.z);
    for (const c of sorted) {
      const p = proj(c.lane, Math.max(0.01, c.z));
      const a = p.s * 0.42;
      ctx.strokeStyle = "#7dffa6";
      ctx.strokeRect(p.x - a, p.y - a, a * 2, a * 2);
      const back = proj(c.lane, c.z + 0.55);
      const b = back.s * 0.42;
      ctx.strokeStyle = "rgba(125,255,166,.45)";
      ctx.beginPath();
      ctx.moveTo(p.x - a, p.y - a); ctx.lineTo(back.x - b, back.y - b);
      ctx.moveTo(p.x + a, p.y - a); ctx.lineTo(back.x + b, back.y - b);
      ctx.moveTo(p.x - a, p.y + a); ctx.lineTo(back.x - b, back.y + b);
      ctx.moveTo(p.x + a, p.y + a); ctx.lineTo(back.x + b, back.y + b);
      ctx.stroke();
      ctx.strokeRect(back.x - b, back.y - b, b * 2, b * 2);
    }
    const pl = proj(vis, 0.08);
    ctx.fillStyle = "#6ee7ff";
    ctx.beginPath();
    ctx.moveTo(pl.x, pl.y - 16);
    ctx.lineTo(pl.x + 14, pl.y + 12);
    ctx.lineTo(pl.x, pl.y + 6);
    ctx.lineTo(pl.x - 14, pl.y + 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8b95a8"; ctx.font = "12px ui-monospace,monospace";
    ctx.fillText("LANE " + "LCR"[lane] + "  SHIPS " + lives, 12, 20);
  }
  hall.score(0);
  hall.note("← → or A/D lane · 3 ships · cubes start farther · Esc hall");
  raf = requestAnimationFrame(tick);
  return {
    destroy() { alive = false; cancelAnimationFrame(raf); },
    act,
    state() {
      return {
        cab: "cube", alive, score, lane, speed: +spd().toFixed(4),
        cubes: cubes.map(c => ({ lane: c.lane, z: +c.z.toFixed(2) })),
        legal: ["left", "right"]
      };
    }
  };
} };
