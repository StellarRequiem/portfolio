/* ask-widget.js — a self-contained "ask about my work" panel for the StellarRequiem portfolio.
 *
 * WHY static + curated (not a live LLM): the page is a static, offline-first PWA with no backend,
 * so it cannot safely hold an API key. Every answer here is sourced verbatim-in-substance from the
 * public copy already on this page — no claim is made that the page does not already make. That keeps
 * the portfolio's own rule ("verified work, or it doesn't ship") true of its assistant too.
 *
 * UPGRADE PATH (live later): all intelligence funnels through one async function, answer(query).
 * Today it resolves against the curated set below. To go live, swap its body for a fetch() to a
 * serverless proxy that holds the key — the UI, the chips, and the grounding set stay exactly as-is.
 *
 * No network. No analytics. No data leaves the browser. Keyboard-accessible; honors reduced-motion.
 */
(function () {
  "use strict";
  var GH = "https://github.com/StellarRequiem/";
  function repo(name) { return '<a href="' + GH + name + '" target="_blank" rel="noopener">' + name + "</a>"; }
  var MAIL = "alexanderprice91@yahoo.com";

  // The grounding set. Each entry: a chip label + keywords (for free-text) + an answer drawn from the
  // page's own copy. id "fallback" is the honest no-match reply (it offers, it never fabricates).
  var KB = [
    { id: "throughline", chip: "What's the through-line?",
      keys: ["through", "principle", "philosophy", "about", "who", "summary", "overall"],
      a: "One principle runs through everything: <b>verified work, or it doesn't ship.</b> Each project is something a third party can re-run — CI-green repos, runnable proofs, a public calibration log, and honest gaps stated on every deliverable. <em>No belief without verification.</em>" },
    { id: "verity", chip: "What is verity-core?",
      keys: ["verity", "gate", "proof", "claim", "accuracy", "statistical", "ci gate"],
      a: "<b>The gate.</b> " + repo("verity-core") + " refuses a claim like “95% accuracy” until it clears statistical hygiene — sample size, out-of-sample, leakage, lift over base rate — then <em>proves</em> it: the claim ships a re-runnable command and the number must reproduce or CI fails. 17 domain packs · CI gate · MCP tool." },
    { id: "security", chip: "Tell me about the security research",
      keys: ["security", "research", "offensive", "pentest", "red team", "authorization", "scope", "disclosure", "vuln"],
      a: "Offensive technique applied <b>under explicit authorization, with audit.</b> " + repo("scope-gate") + " is a deny-by-default authorization gate — test only what you're explicitly authorized to. Recent public evidence includes FastMCP merged fixes for versioned authorization checks and Streamable HTTP event replay isolation, cited as public upstream fixes rather than CVE/GHSA claims. Everything is tracked with claim cards, append-only journals, and verification receipts." },
    { id: "mcpbench", chip: "What did mcp-bench find?",
      keys: ["mcp-bench", "mcpbench", "scanner", "sast", "benchmark security", "authz", "authorization logic", "0/11"],
      a: "Do MCP security scanners actually catch authorization-logic bugs? " + repo("mcp-bench") + " is an independent, reproducible benchmark seeded with real confirmed findings. Current expanded corpus: 19 labeled cases, including 11 authz-logic cases across 10 root-cause classes, 2 control bugs, and 6 clean negatives. Result: mature SAST catches controls but misses the authz-logic class — <b>0/11</b>. Scanners run only in a disposable CI runner." },
    { id: "verifiable", chip: "How is your work verifiable?",
      keys: ["verifiable", "verify", "reproduce", "re-run", "rerun", "trust", "evidence", "how do i know"],
      a: "Not a portfolio of assertions — one you can re-run.<br>① <b>CI-green or it doesn't ship.</b><br>② <b>Runnable proofs</b> — the exact command to reproduce.<br>③ <b>A public, hash-chained calibration log</b> scored over time.<br>④ <b>Honest gaps, stated.</b> An unverifiable claim does not count." },
    { id: "calibration", chip: "What's the calibration log?",
      keys: ["calibration", "brier", "prediction", "honest", "track record", "edge"],
      a: repo("calibration-log") + " is a public, hash-chained prediction record scored over time (Brier + calibration). Honesty you can't doctor — it reports the real number whether there's an edge or not." },
    { id: "val", chip: "What is Verified AI Labor?",
      keys: ["verified ai labor", "labor", "platform", "agents", "pipeline", "company", "org"],
      a: "Can a company be run as agents? Only if you can trust what each agent says it did. " + repo("verified-ai-labor") + " is a working prototype of exactly that — a 13-stage pipeline where every result-claim is verity-gated and every action hash-chain-logged, observable in a live console. Around it sit " + repo("groundtruth-bench") + " (citation faithfulness re-runnable to the same hash) and the trust tooling (firewall · grounded · reality-anchor)." },
    { id: "scorecheck", chip: "What is scorecheck?",
      keys: ["scorecheck", "adjudicate", "cherry", "leaderboard", "reproduced", "receipt"],
      a: repo("scorecheck") + " adjudicates a published benchmark claim against its raw run-logs — <b>REPRODUCED / DID-NOT-REPRODUCE / CHERRY-PICKED</b> — sealed into a re-runnable receipt. It surfaces the dropped, flipped, and fabricated rows that re-run leaderboards miss. Survived a 3-lens adversarial pass." },
    { id: "workflow", chip: "How does the workflow work?",
      keys: ["workflow", "process", "bible", "journal", "claim cards", "false positive", "how you work", "rails"],
      a: "The public workflow is scope → orient → map → draft → verify → ship → journal → review. It is intentionally copyable: public-safe context, no secrets, no private exploit steps, proof-carrying claims, false-positive diagnosis, and append-only receipts. Read the full breakdown at <a href=\"/workflow/\">/workflow/</a>." },
    { id: "contact", chip: "How can I get in touch?",
      keys: ["contact", "touch", "email", "hire", "reach", "available", "work with"],
      a: "Reach Alex at <a href=\"mailto:" + MAIL + "\">" + MAIL + "</a>, or <a href=\"https://github.com/StellarRequiem\" target=\"_blank\" rel=\"noopener\">github.com/StellarRequiem</a> · <a href=\"https://x.com/StellarRequiem\" target=\"_blank\" rel=\"noopener\">@StellarRequiem</a>. Available for verification, AI-eval, and security-audit work." },
  ];
  var FALLBACK = "I can speak to the security research, <b>verity-core</b>, <b>mcp-bench</b>, the workflow bible, the calibration log, <b>Verified AI Labor</b>, <b>scorecheck</b>, or how the work is verifiable — pick a chip below, or reach Alex directly at <a href=\"mailto:" + MAIL + "\">" + MAIL + "</a>.";

  // answer(query) — the single seam. Curated today; swap for a proxy fetch() to go live.
  function answer(query) {
    var q = (query || "").toLowerCase();
    var exact = KB.filter(function (e) { return e.chip.toLowerCase() === q; })[0];
    if (exact) return exact.a;
    var best = null, score = 0;
    KB.forEach(function (e) {
      var s = e.keys.reduce(function (n, k) { return n + (q.indexOf(k) >= 0 ? k.length : 0); }, 0);
      if (s > score) { score = s; best = e; }
    });
    return score > 0 ? best.a : FALLBACK;
  }

  // ---- styles (scoped .srq-*; reuse the page's palette vars so it reads native) ----
  var css = ''
    + '.srq-fab{position:fixed;right:20px;bottom:20px;z-index:9998;display:flex;align-items:center;gap:8px;'
    + 'padding:10px 15px;border-radius:30px;border:1px solid var(--line);background:rgba(6,16,30,.92);'
    + 'color:var(--cy);font-family:var(--mono);font-size:12.5px;letter-spacing:.04em;cursor:pointer;'
    + 'box-shadow:0 0 14px rgba(86,206,255,.28),0 6px 20px rgba(0,0,0,.5);backdrop-filter:blur(6px);transition:.18s}'
    + '.srq-fab:hover{box-shadow:0 0 22px rgba(86,206,255,.5),0 6px 20px rgba(0,0,0,.5);transform:translateY(-1px)}'
    + '.srq-fab .rune{font-size:15px;filter:drop-shadow(0 0 6px var(--cy))}'
    + '.srq-panel{position:fixed;right:20px;bottom:20px;z-index:9999;width:min(384px,92vw);max-height:min(74vh,620px);'
    + 'display:none;flex-direction:column;border-radius:16px;border:1px solid var(--line);background:linear-gradient(180deg,#081625,#050c16);'
    + 'box-shadow:0 0 0 1px rgba(86,206,255,.18),0 0 26px rgba(86,206,255,.22),0 18px 50px rgba(0,0,0,.6);overflow:hidden}'
    + '.srq-panel.open{display:flex}'
    + '.srq-head{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid var(--hair);background:rgba(4,10,20,.7)}'
    + '.srq-head .rune{color:var(--cy);filter:drop-shadow(0 0 6px var(--cy))}'
    + '.srq-title{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--cy)}'
    + '.srq-sub{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;color:#95aec3}'
    + '.srq-x{margin-left:auto;width:24px;height:24px;border:1px solid var(--hair);background:transparent;color:var(--dim);'
    + 'border-radius:7px;font-size:13px;cursor:pointer;line-height:1}.srq-x:hover{color:var(--cy);border-color:var(--line)}'
    + '.srq-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px}'
    + '.srq-log::-webkit-scrollbar{width:6px}.srq-log::-webkit-scrollbar-thumb{background:rgba(86,206,255,.25);border-radius:3px}'
    + '.srq-msg{max-width:88%;padding:9px 11px;border-radius:11px;font-family:var(--sans);font-size:13px;line-height:1.55}'
    + '.srq-msg a{color:var(--cy);text-decoration:none;border-bottom:1px solid rgba(86,206,255,.4)}'
    + '.srq-bot{align-self:flex-start;background:rgba(86,206,255,.07);border:1px solid var(--hair);color:var(--tx)}'
    + '.srq-user{align-self:flex-end;background:rgba(61,240,187,.12);border:1px solid rgba(61,240,187,.3);color:#eafff7}'
    + '.srq-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 12px}'
    + '.srq-chip{font-family:var(--mono);font-size:11px;letter-spacing:.02em;color:var(--cy);background:rgba(86,206,255,.06);'
    + 'border:1px solid var(--hair);border-radius:14px;padding:5px 10px;cursor:pointer;transition:.12s}'
    + '.srq-chip:hover{background:rgba(86,206,255,.14);border-color:var(--line)}'
    + '.srq-form{display:flex;gap:7px;padding:10px 12px;border-top:1px solid var(--hair);background:rgba(4,10,20,.7)}'
    + '.srq-in{flex:1;background:rgba(2,6,13,.8);border:1px solid var(--hair);border-radius:9px;color:var(--tx);'
    + 'font-family:var(--sans);font-size:13px;padding:8px 11px;outline:none}.srq-in:focus{border-color:var(--line)}'
    + '.srq-send{background:rgba(86,206,255,.1);border:1px solid var(--line);color:var(--cy);border-radius:9px;'
    + 'font-family:var(--mono);font-size:12px;padding:0 13px;cursor:pointer}.srq-send:hover{background:rgba(86,206,255,.2)}'
    + '@media (prefers-reduced-motion:reduce){.srq-fab,.srq-chip,.srq-send,.srq-in,.srq-x{transition:none}.srq-fab:hover{transform:none}}';

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function init() {
    var style = el("style"); style.textContent = css; document.head.appendChild(style);

    var fab = el("button", "srq-fab", '<span class="rune" aria-hidden="true">&#10689;</span>Ask about my work');
    fab.setAttribute("aria-label", "Ask about my work");
    fab.setAttribute("aria-controls", "srq-panel"); fab.setAttribute("aria-expanded", "false");

    var panel = el("div", "srq-panel"); panel.id = "srq-panel"; panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Ask about StellarRequiem's work");
    panel.innerHTML =
      '<div class="srq-head"><span class="rune" aria-hidden="true">&#10689;</span>'
      + '<div><div class="srq-title">Ask about my work</div><div class="srq-sub">StellarRequiem · curated</div></div>'
      + '<button class="srq-x" aria-label="Close">&#10005;</button></div>'
      + '<div class="srq-log" id="srq-log" role="log" aria-live="polite"></div>'
      + '<div class="srq-chips" id="srq-chips"></div>'
      + '<form class="srq-form" id="srq-form"><input class="srq-in" id="srq-in" type="text" '
      + 'placeholder="Ask about a project…" autocomplete="off" aria-label="Ask a question"/>'
      + '<button class="srq-send" type="submit">Send</button></form>';

    document.body.appendChild(fab); document.body.appendChild(panel);

    var log = panel.querySelector("#srq-log"), chips = panel.querySelector("#srq-chips");
    var form = panel.querySelector("#srq-form"), input = panel.querySelector("#srq-in");
    var greeted = false;

    function push(cls, html) { var m = el("div", "srq-msg " + cls, html); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function ask(query) { push("srq-user", query.replace(/</g, "&lt;")); setTimeout(function () { push("srq-bot", answer(query)); }, 90); }

    KB.forEach(function (e) {
      var c = el("button", "srq-chip", e.chip);
      c.onclick = function () { ask(e.chip); };
      chips.appendChild(c);
    });

    function open() {
      panel.classList.add("open"); fab.style.display = "none"; fab.setAttribute("aria-expanded", "true");
      if (!greeted) { greeted = true;
        push("srq-bot", "Hi — I'm the assistant for <b>Alex Price (StellarRequiem)</b>. Ask about the security research, the Verified-AI-Labor platform, or how any of it is verifiable. Pick a question or type your own."); }
      input.focus();
    }
    function close() { panel.classList.remove("open"); fab.style.display = "flex"; fab.setAttribute("aria-expanded", "false"); fab.focus(); }

    fab.onclick = open;
    panel.querySelector(".srq-x").onclick = close;
    form.onsubmit = function (ev) { ev.preventDefault(); var q = input.value.trim(); if (!q) return; ask(q); input.value = ""; };
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && panel.classList.contains("open")) close(); });
    // Trap Tab within the open dialog (WCAG dialog pattern) — cycle among its focusables, never escape to the page.
    panel.addEventListener("keydown", function (ev) {
      if (ev.key !== "Tab") return;
      var f = panel.querySelectorAll("button, input, a[href]");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
