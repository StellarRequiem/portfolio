(function () {
  const qEl = document.getElementById("q");
  const root = document.getElementById("cabs");
  const status = document.getElementById("status");
  const btnLocal = document.getElementById("mode-local");
  const btnOnline = document.getElementById("mode-online");
  const cfg = window.HALL_CFG || { onlineOrigin: "https://xclusivexo.com/hall/" };

  let mode = localStorage.getItem("hall.mode") === "online" ? "online" : "local";
  let onlineOk = null;
  let filter = "";
  let sel = 0;
  let view = [];

  function norm(s) { return String(s || "").toLowerCase(); }
  function matches(c, f) {
    if (!f) return true;
    const hay = [c.id, c.name, c.blurb, c.genre, c.bank, c.era].join(" ");
    return norm(hay).indexOf(f) !== -1;
  }
  function filtered() { return CABS.filter(c => matches(c, filter)); }

  function cols() {
    if (window.matchMedia("(max-width: 480px)").matches) return 1;
    if (window.matchMedia("(max-width: 860px)").matches) return 2;
    return 4;
  }

  /**
   * Most cabs are single scripts run by the shared `play.html` shell. A long-form cab
   * can instead declare its own `href` and ship as a self-contained surface — it still
   * lists on the marquee and still launches from the console, it just doesn't fit in
   * one canvas.
   */
  function playHref(id) {
    const cab = CABS.find(function (c) { return c.id === id; });
    const q = (cab && cab.href) ? cab.href : "play.html?cab=" + encodeURIComponent(id);
    if (mode === "online") {
      const base = cfg.onlineOrigin.replace(/\/?$/, "/");
      return base + q;
    }
    return q;
  }

  function launch(id) {
    if (!id) return;
    localStorage.setItem("hall.lastCab", id);
    location.href = playHref(id);
  }

  function setMode(next) {
    mode = next === "online" ? "online" : "local";
    localStorage.setItem("hall.mode", mode);
    btnLocal.classList.toggle("on", mode === "local");
    btnOnline.classList.toggle("on", mode === "online");
    paintStatus();
  }

  function paintStatus() {
    const cab = view[sel];
    const n = view.length;
    let venue = mode === "online" ? "ONLINE" : "LOCAL";
    let extra = "";
    if (mode === "online") {
      extra = onlineOk === true
        ? " · origin up"
        : onlineOk === false
          ? " · <span class=\"warn\">origin not shipped / unreachable</span>"
          : " · probing origin…";
    }
    status.innerHTML = venue + extra + " · " + n + " cab" + (n === 1 ? "" : "s")
      + (cab ? " · selected <b>" + cab.name + "</b>  " + cab.blurb : " · no match")
      + (cab ? " · " + playHref(cab.id) : "");
  }

  function paintBoards(id) {
    function fill(lane, el) {
      const rows = Board.top(id || "well", lane);
      el.innerHTML = rows.length
        ? rows.map((r, i) => "<li><span>" + String(i + 1).padStart(2, "0") +
            "</span><span>" + r.tag + "</span><span>" + r.score + "</span></li>").join("")
        : '<li class="empty">no tags yet</li>';
    }
    fill("HUMAN", document.getElementById("human"));
    fill("AGENT", document.getElementById("agent"));
  }

  function render() {
    view = filtered();
    if (sel >= view.length) sel = Math.max(0, view.length - 1);
    const lastId = localStorage.getItem("hall.lastCab");
    if (!filter && lastId) {
      const i = view.findIndex(c => c.id === lastId);
      if (i >= 0 && !root.dataset.moved) sel = i;
    }
    root.innerHTML = "";
    const byBank = {};
    view.forEach(c => {
      const b = c.bank || "floor1";
      (byBank[b] || (byBank[b] = [])).push(c);
    });
    (window.BANKS || []).forEach(bank => {
      const list = byBank[bank.id];
      if (!list || !list.length) return;
      const h = document.createElement("div");
      h.className = "bank";
      h.textContent = bank.title + " · " + list.length;
      root.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "grid";
      list.forEach(c => {
        const i = view.indexOf(c);
        const card = document.createElement("div");
        card.className = "cab" + (i === sel ? " sel" : "");
        card.dataset.id = c.id;
        card.dataset.i = String(i);
        card.tabIndex = -1;
        const hi = (Board.top(c.id, "HUMAN")[0] || {});
        card.innerHTML =
          '<div class="era">' + c.era + " · " + c.genre.toUpperCase() + "</div>" +
          "<h2>" + c.name + "</h2>" +
          "<p>" + c.blurb + "</p>" +
          '<div class="hi">' + (hi.tag ? (hi.tag + "  " + hi.score) : "—  NO TAG") + "</div>";
        card.addEventListener("click", () => {
          if (i === sel && root.dataset.moved === "1") { launch(c.id); return; }
          sel = i; root.dataset.moved = "1"; syncSel();
        });
        card.addEventListener("dblclick", ev => { ev.preventDefault(); launch(c.id); });
        grid.appendChild(card);
      });
      root.appendChild(grid);
    });
    if (!view.length) {
      const empty = document.createElement("div");
      empty.className = "board";
      empty.style.margin = "8px 0";
      empty.innerHTML = '<li class="empty">no cabinets match</li>';
      root.appendChild(empty);
    }
    paintStatus();
    paintBoards(view[sel] && view[sel].id);
    const on = root.querySelector(".cab.sel");
    if (on) on.scrollIntoView({ block: "nearest" });
  }

  function syncSel() {
    root.querySelectorAll(".cab").forEach(el => {
      el.classList.toggle("sel", Number(el.dataset.i) === sel);
    });
    paintStatus();
    paintBoards(view[sel] && view[sel].id);
    const on = root.querySelector(".cab.sel");
    if (on) on.scrollIntoView({ block: "nearest" });
  }

  function move(dx, dy) {
    if (!view.length) return;
    root.dataset.moved = "1";
    const c = cols();
    if (dy) sel = Math.max(0, Math.min(view.length - 1, sel + dy * c));
    if (dx) sel = Math.max(0, Math.min(view.length - 1, sel + dx));
    syncSel();
  }

  qEl.addEventListener("input", () => {
    filter = norm(qEl.value.trim());
    sel = 0;
    delete root.dataset.moved;
    render();
  });
  qEl.addEventListener("keydown", ev => {
    if (ev.key === "Escape") {
      if (qEl.value) { qEl.value = ""; filter = ""; sel = 0; render(); }
      else qEl.blur();
      ev.preventDefault();
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (view[sel]) launch(view[sel].id);
    }
    if (ev.key === "ArrowDown") { qEl.blur(); ev.preventDefault(); move(0, 1); }
  });

  btnLocal.addEventListener("click", () => setMode("local"));
  btnOnline.addEventListener("click", () => setMode("online"));

  addEventListener("keydown", ev => {
    const typing = ev.target === qEl || ev.target.tagName === "INPUT";
    if ((ev.key === "o" || ev.key === "O") && !typing) {
      ev.preventDefault(); setMode(mode === "local" ? "online" : "local");
      return;
    }
    if (ev.key === "/" && !typing) {
      ev.preventDefault(); qEl.focus(); qEl.select();
      return;
    }
    if (typing) return;
    const nav = window.HallKeys && HallKeys.arrowOf(ev);
    if (nav === "ArrowLeft") { ev.preventDefault(); move(-1, 0); return; }
    if (nav === "ArrowRight") { ev.preventDefault(); move(1, 0); return; }
    if (nav === "ArrowUp") { ev.preventDefault(); move(0, -1); return; }
    if (nav === "ArrowDown") { ev.preventDefault(); move(0, 1); return; }
    if (ev.key === "Enter") { ev.preventDefault(); if (view[sel]) launch(view[sel].id); }
    if (ev.key === "Escape" && qEl.value) {
      qEl.value = ""; filter = ""; sel = 0; render();
    }
    if (ev.key.length === 1 && /[a-z0-9]/i.test(ev.key) && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      ev.preventDefault();
      qEl.value += ev.key;
      filter = norm(qEl.value.trim());
      sel = 0;
      delete root.dataset.moved;
      qEl.focus();
      render();
    }
  });

  addEventListener("resize", () => { /* cols() is live */ });

  function probe() {
    const url = cfg.onlineOrigin.replace(/\/?$/, "/") + "index.html";
    fetch(url, { method: "GET", mode: "cors", cache: "no-store" })
      .then(r => { onlineOk = r.ok; paintStatus(); })
      .catch(() => { onlineOk = false; paintStatus(); });
  }

  setMode(mode);
  render();
  probe();
})();
