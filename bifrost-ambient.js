/**
 * Bifrost ambient rain — shared site theme.
 * Fixed full-viewport rune-rain + calmer drift + grid/spine.
 * Idempotent; off under prefers-reduced-motion; pauses when tab hidden.
 * Safe to load on every public page (not realm/village game canvases).
 */
(function () {
  if (window.__bifrostAmbient) return;
  window.__bifrostAmbient = true;

  var reduce =
    window.matchMedia &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  var style = document.createElement("style");
  style.setAttribute("data-bifrost", "1");
  style.textContent =
    ".bf-backdrop{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}" +
    ".bf-backdrop canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".bf-backdrop .bf-rain{opacity:.36}" +
    ".bf-backdrop .bf-drift{opacity:.68}" +
    ".bf-grid{position:absolute;inset:0;background-image:" +
    "linear-gradient(rgba(86,206,255,.08) 1px,transparent 1px)," +
    "linear-gradient(90deg,rgba(86,206,255,.08) 1px,transparent 1px);" +
    "background-size:44px 44px;" +
    "-webkit-mask-image:linear-gradient(transparent,#000 7%,#000 93%,transparent);" +
    "mask-image:linear-gradient(transparent,#000 7%,#000 93%,transparent)}" +
    ".bf-spine{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);" +
    "width:min(1060px,100%);" +
    "background:radial-gradient(ellipse 58% 68% at 50% 26%,rgba(2,6,13,.62),rgba(2,6,13,.34) 64%,transparent)}" +
    ".bf-glow{position:absolute;border-radius:50%;pointer-events:none}" +
    ".bf-wm{position:absolute;right:1.5vw;bottom:0;font-family:ui-monospace,Menlo,monospace;" +
    "font-size:44vh;line-height:.8;color:rgba(86,206,255,.07);user-select:none}" +
    /* content rides above ambient */
    "body.bf-on>header,body.bf-on>main,body.bf-on>footer,body.bf-on>section," +
    "body.bf-on .page,body.bf-on .wrap,body.bf-on .doc,body.bf-on .app,body.bf-on .hero-inner," +
    "body.bf-on .report-header,body.bf-on .report-page{position:relative;z-index:1}" +
    "body.bf-on header.hero{position:relative;z-index:1}" +
    "@media print{.bf-backdrop,.backdrop[data-bifrost]{display:none!important}}";
  document.head.appendChild(style);

  if (reduce) return;

  document.body.classList.add("bf-on");

  function ensureBackdrop() {
    var root =
      document.querySelector(".bf-backdrop") ||
      document.querySelector(".backdrop");
    if (!root) {
      root = document.createElement("div");
      root.className = "bf-backdrop backdrop";
      root.setAttribute("aria-hidden", "true");
      root.setAttribute("data-bifrost", "1");
      var nav = document.querySelector("nav.xn");
      if (nav && nav.nextSibling) {
        nav.parentNode.insertBefore(root, nav.nextSibling);
      } else if (nav) {
        nav.parentNode.appendChild(root);
      } else {
        document.body.insertBefore(root, document.body.firstChild);
      }
    } else {
      root.classList.add("bf-backdrop", "backdrop");
      root.setAttribute("data-bifrost", "1");
      root.setAttribute("aria-hidden", "true");
    }
    return root;
  }

  var root = ensureBackdrop();

  function ensureCanvas(preferredId, cls, legacyId) {
    /* Prefer canvases inside the fixed backdrop so rain is sitewide, not hero-clipped */
    var cv =
      root.querySelector("#" + preferredId + ", canvas." + cls) ||
      (legacyId ? document.getElementById(legacyId) : null);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.id = preferredId;
      cv.className = cls;
      cv.setAttribute("aria-hidden", "true");
      root.insertBefore(cv, root.firstChild);
    } else {
      if (cv.parentNode !== root) {
        /* Move hero-local rain into fixed backdrop for uniform coverage */
        root.insertBefore(cv, root.firstChild);
      }
      cv.classList.add(cls);
      if (!cv.id) cv.id = preferredId;
    }
    return cv;
  }

  var rain = ensureCanvas("bf-rain", "bf-rain", "rain");
  var drift = ensureCanvas("bf-drift", "bf-drift", "drift");

  if (!root.querySelector(".bf-grid, .bg-grid, .gridbg")) {
    var g = document.createElement("div");
    g.className = "bf-grid bg-grid";
    root.appendChild(g);
  }
  if (!root.querySelector(".bf-spine, .spine")) {
    var s = document.createElement("div");
    s.className = "bf-spine spine";
    root.appendChild(s);
  }
  if (!root.querySelector(".bf-glow, .bg-glow")) {
    var glows = [
      "top:-14vh;right:-10vw;width:56vw;height:56vh;background:radial-gradient(circle,rgba(86,206,255,.17),transparent 66%)",
      "top:42%;left:-16vw;width:52vw;height:52vh;background:radial-gradient(circle,rgba(155,140,255,.13),transparent 70%)",
      "bottom:-8vh;right:4vw;width:48vw;height:48vh;background:radial-gradient(circle,rgba(61,240,187,.09),transparent 70%)",
    ];
    for (var gi = 0; gi < glows.length; gi++) {
      var gl = document.createElement("div");
      gl.className = "bf-glow bg-glow";
      gl.setAttribute("style", glows[gi]);
      root.appendChild(gl);
    }
  }
  if (!root.querySelector(".bf-wm, .bg-wm")) {
    var wm = document.createElement("div");
    wm.className = "bf-wm bg-wm";
    wm.setAttribute("aria-hidden", "true");
    wm.innerHTML = "&#10689;";
    root.appendChild(wm);
  }

  var GLYPHS_RAIN =
    "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚ∑∫∂∇λπ∞⊕⊗σμΔ0123456789".split("");
  var GLYPHS_DRIFT =
    "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛋᛏᛒᛖᛗᛚ∑∫∂∇λπ∞⊕⊗".split("");

  function hue(i, cols) {
    var t = i / Math.max(cols, 1);
    return t < 0.5
      ? 280 - (280 - 185) * (t / 0.5)
      : 185 - (185 - 45) * ((t - 0.5) / 0.5);
  }

  function engine(cv, opts) {
    if (!cv) return;
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    var sp = opts.sp;
    var cols = 1;
    var drops = [];
    var timer = null;
    var glyphs = opts.glyphs;
    var fade = opts.fade;
    var speed = opts.speed;
    var reset = opts.reset;
    var font = opts.font;
    var alpha = opts.alpha;

    function size() {
      cv.width = innerWidth;
      cv.height = innerHeight;
      cols = Math.max(1, Math.floor(cv.width / sp));
      drops = [];
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * (cv.height / sp);
    }

    function draw() {
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.font = font;
      for (var i = 0; i < cols; i++) {
        ctx.fillStyle =
          "hsla(" + hue(i, cols).toFixed(0) + ",92%," + alpha + ")";
        ctx.fillText(
          glyphs[Math.floor(Math.random() * glyphs.length)],
          i * sp,
          drops[i] * sp
        );
        if (drops[i] * sp > cv.height && Math.random() > reset) drops[i] = 0;
        drops[i] += speed;
      }
    }

    function start() {
      if (!timer) timer = setInterval(draw, opts.interval);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    size();
    start();
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }

  /* Denser rain — same DNA as homepage hero rain, full viewport */
  engine(rain, {
    sp: 15,
    glyphs: GLYPHS_RAIN,
    fade: "rgba(2,6,13,0.16)",
    speed: 0.5,
    reset: 0.975,
    font: "12px monospace",
    alpha: "66%,0.85",
    interval: 70,
  });

  /* Calmer page drift */
  engine(drift, {
    sp: 30,
    glyphs: GLYPHS_DRIFT,
    fade: "rgba(2,6,13,0.065)",
    speed: 0.42,
    reset: 0.99,
    font: "13px monospace",
    alpha: "64%,0.62",
    interval: 95,
  });
})();
