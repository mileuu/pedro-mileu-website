/* ==========================================================
   Hero photo: analogue video-feedback effect on hover.
   The canvas redraws the photo, then while the pointer is over it:
   - feeds the previous frame back into itself, slightly zoomed
     around the pointer (camera pointed at its own monitor),
   - smears thin columns of the photo into vertical streaks,
   - tears horizontal bands sideways.
   Moving the pointer faster pushes the effect harder.
   Tweak the numbers in SETTINGS to change the character.
   ========================================================== */

(function () {
  var SETTINGS = {
    zoom: 1.012,          // feedback zoom per frame (bigger = faster tunnel)
    drift: 1.2,           // feedback downward drift in px per frame
    persistence: 0.9,     // how much of the last frame survives (0–1)
    streaks: 22,          // vertical streaks per frame at full intensity
    screen: [0.2, 0.12, 0.68, 0.65], // bright area of the photo streaks take colour from (left, top, right, bottom as 0–1)
    tears: 2,             // horizontal tears per frame at full intensity
    spread: 0.18,         // how far around the pointer streaks spawn (share of width)
    colors: ["#38d4ff", "#ff3b24", "#d8ff2e", "#2f5bff", "#ff4fd2", "#3affc4"]
  };

  var frame = document.querySelector(".hero-frame");
  if (!frame) return;
  var img = frame.querySelector("img");
  var canvas = frame.querySelector(".hero-fx");
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.remove();
    return;
  }

  var W = 0, H = 0, dpr = 1;
  var src = { x: 0, y: 0, w: 1, h: 1, s: 1 }; // which part of the photo is visible (object-fit: cover)
  var mouse = { x: 0, y: 0, px: 0, py: 0, inside: false };
  var intensity = 0;
  var running = false;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  function measure() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth * dpr);
    H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) return;
    canvas.width = W;
    canvas.height = H;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var s = Math.max(W / iw, H / ih);
    src.s = s;
    src.w = W / s;
    src.h = H / s;
    src.x = (iw - src.w) / 2;
    src.y = (ih - src.h) / 2;
    drawBase(1);
  }

  function drawBase(alpha) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function step() {
    var speed = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) / dpr;
    mouse.px = mouse.x;
    mouse.py = mouse.y;

    var target = mouse.inside ? Math.min(1, 0.45 + speed / 30) : 0;
    intensity += (target - intensity) * (target > intensity ? 0.15 : 0.05);

    if (!mouse.inside && intensity < 0.01) {
      intensity = 0;
      drawBase(1);
      running = false;
      return;
    }

    var k = intensity;

    // 1. feedback: redraw the last frame onto itself, zoomed around the pointer
    var z = 1 + (SETTINGS.zoom - 1) * k;
    var ox = mouse.x - mouse.x * z;
    var oy = mouse.y - mouse.y * z + SETTINGS.drift * dpr * k;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = SETTINGS.persistence;
    ctx.drawImage(canvas, 0, 0, W, H, ox, oy, W * z, H * z);

    // 2. pull back toward the clean photo so it never fully dissolves
    drawBase(0.05 + (1 - k) * 0.25);

    // 3. vertical streaks: one thin column of the photo stretched top to bottom
    ctx.globalCompositeOperation = "lighter";
    var n = Math.round(SETTINGS.streaks * k);
    for (var i = 0; i < n; i++) {
      var x = mouse.x + gauss() * W * SETTINGS.spread;
      if (x < 0 || x > W) continue;
      var w = rand(1, 4) * dpr;
      // sample colour from the projection screen in the photo
      var sx = img.naturalWidth * rand(SETTINGS.screen[0], SETTINGS.screen[2]);
      var sy = img.naturalHeight * rand(SETTINGS.screen[1], SETTINGS.screen[3]);
      var top = rand(-0.2, 0.5) * H;
      ctx.globalAlpha = rand(0.25, 0.8) * k;
      ctx.drawImage(img, sx, sy, Math.max(1, w / src.s), rand(4, 30), x, top, w, rand(0.3, 1.2) * H);
    }

    // coloured scan lines, like the projector's phosphor trails
    for (var j = 0; j < n / 2; j++) {
      var lx = mouse.x + gauss() * W * SETTINGS.spread * 1.4;
      ctx.globalAlpha = rand(0.1, 0.45) * k;
      ctx.fillStyle = SETTINGS.colors[(Math.random() * SETTINGS.colors.length) | 0];
      ctx.fillRect(lx, rand(-0.1, 0.8) * H, rand(1, 2.5) * dpr, rand(0.1, 0.7) * H);
    }

    // 4. horizontal tears: shift a band of the image sideways
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    var t = Math.random() < k ? Math.round(SETTINGS.tears * (0.5 + k)) : 0;
    for (var m = 0; m < t; m++) {
      var by = mouse.y + gauss() * H * 0.25;
      var bh = rand(2, 18) * dpr;
      var shift = gauss() * 50 * dpr * k;
      ctx.drawImage(canvas, 0, by, W, bh, shift, by, W, bh);
    }

    requestAnimationFrame(step);
  }

  function start() {
    if (!running) {
      running = true;
      requestAnimationFrame(step);
    }
  }

  function move(e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * dpr;
    mouse.y = (e.clientY - r.top) * dpr;
    if (!mouse.inside) {
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.inside = true;
    }
    start();
  }

  canvas.addEventListener("pointerenter", move);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", function () { mouse.inside = false; });
  canvas.addEventListener("pointercancel", function () { mouse.inside = false; });

  function init() {
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(canvas);
    else window.addEventListener("resize", measure);
  }

  if (img.complete && img.naturalWidth) init();
  else img.addEventListener("load", init);
})();
