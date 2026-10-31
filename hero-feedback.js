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
    zoom: 1.022,          // feedback zoom per frame (bigger = faster tunnel)
    drift: 2.5,           // feedback downward drift in px per frame
    persistence: 0.95,    // how much of the last frame survives (0–1)
    saturate: 1.05,       // colour boost applied on every feedback pass (compounds, 1 = off)
    chroma: 4,            // sideways ghost doubling in px on the feedback (0 = off)
    decay: 0.12,          // how fast added light fades each frame (higher = darker, less build-up)
    streaks: 36,          // vertical streaks per frame at full intensity
    screen: [0.2, 0.12, 0.68, 0.65], // bright area of the photo streaks take colour from (left, top, right, bottom as 0–1)
    tears: 5,             // horizontal tears per frame at full intensity
    spread: 0.28,         // how far around the pointer streaks spawn (share of width)
    colors: ["#00e5ff", "#ff1a00", "#e8ff00", "#0047ff", "#ff00b8", "#00ff8c", "#7a00ff"],
    escapes: 1.1,         // fragments leaving the photo per frame at full intensity (0 = off)
    escapeReach: 0.992,   // how far they glide out (closer to 1 = further across the page)
    escapeColors: ["#00b8d4", "#ff1a00", "#0047ff", "#ff00b8", "#00c46a", "#7a00ff", "#111"]
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

    var target = mouse.inside ? Math.min(1, 0.7 + speed / 25) : 0;
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
    ctx.filter = "saturate(" + (1 + (SETTINGS.saturate - 1) * k) + ")";
    ctx.drawImage(canvas, 0, 0, W, H, ox, oy, W * z, H * z);
    ctx.filter = "none";

    // ghost doubling: a sideways offset copy laid over, like a smeared signal
    if (SETTINGS.chroma) {
      ctx.globalAlpha = 0.3 * k;
      ctx.drawImage(canvas, SETTINGS.chroma * dpr * k * (Math.random() < 0.5 ? -1 : 1), 0);
    }

    // decay: darken a little every frame so added light fades instead of piling up to white
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = SETTINGS.decay * k;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    // 2. pull back toward the clean photo so it never fully dissolves
    drawBase(0.05 + (1 - k) * 0.25);

    // 3. vertical streaks: one thin column of the photo stretched top to bottom
    ctx.globalCompositeOperation = "lighter";
    var n = Math.round(SETTINGS.streaks * k);
    for (var i = 0; i < n; i++) {
      var x = mouse.x + gauss() * W * SETTINGS.spread;
      if (x < 0 || x > W) continue;
      var w = rand(1, 6) * dpr;
      // sample colour from the projection screen in the photo
      var sx = img.naturalWidth * rand(SETTINGS.screen[0], SETTINGS.screen[2]);
      var sy = img.naturalHeight * rand(SETTINGS.screen[1], SETTINGS.screen[3]);
      var top = rand(-0.2, 0.5) * H;
      ctx.globalAlpha = rand(0.3, 0.85) * k;
      ctx.drawImage(img, sx, sy, Math.max(1, w / src.s), rand(4, 30), x, top, w, rand(0.3, 1.2) * H);
    }

    // coloured scan lines, like the projector's phosphor trails
    for (var j = 0; j < n / 2; j++) {
      var lx = mouse.x + gauss() * W * SETTINGS.spread * 1.4;
      ctx.globalAlpha = rand(0.25, 0.8) * k;
      ctx.fillStyle = SETTINGS.colors[(Math.random() * SETTINGS.colors.length) | 0];
      ctx.fillRect(lx, rand(-0.1, 0.8) * H, rand(1, 4) * dpr, rand(0.1, 0.9) * H);
    }

    // 4. horizontal tears: shift a band of the image sideways
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    var t = Math.random() < k ? Math.round(SETTINGS.tears * (0.5 + k)) : 0;
    for (var m = 0; m < t; m++) {
      var by = mouse.y + gauss() * H * 0.25;
      var bh = rand(2, 18) * dpr;
      var shift = gauss() * 90 * dpr * k;
      ctx.drawImage(canvas, 0, by, W, bh, shift, by, W, bh);
    }

    // 5. a few tiny lines slip out past the edges onto the page
    if (mouse.inside) spawnEscapes(k, speed);

    requestAnimationFrame(step);
  }

  /* ---------- escaping fragments ----------
     A second canvas covers the whole window, underneath the page content.
     Thin slivers torn from the live feedback image leave the photo's edges
     near the pointer, glide outward, slow down and fade into the background.
     They are copied from the effect every frame, so their colour flickers
     with it; they break into pieces, stutter sideways, drop out for a frame
     and carry red/cyan fringes like a bad signal. Slow ones linger by the
     edge as faint traces. */

  var page = document.createElement("canvas");
  page.className = "page-fx";
  page.setAttribute("aria-hidden", "true");
  document.body.appendChild(page);
  var pctx = page.getContext("2d");
  var PW = 0, PH = 0;
  var bits = [];
  var pageRunning = false, fadeOut = 0;

  function sizePage() {
    var d = Math.min(window.devicePixelRatio || 1, 2);
    PW = window.innerWidth;
    PH = window.innerHeight;
    page.width = Math.round(PW * d);
    page.height = Math.round(PH * d);
    pctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function spawnEscapes(k, speed) {
    var count = SETTINGS.escapes * k * (0.4 + Math.min(speed, 40) / 40);
    var n = Math.floor(count) + (Math.random() < count % 1 ? 1 : 0);
    if (!n) return;
    var r = frame.getBoundingClientRect();
    var mx = r.left + mouse.x / dpr, my = r.top + mouse.y / dpr;
    for (var i = 0; i < n; i++) {
      // mostly slow (they stay near the edge), a few fly far
      var v = 0.15 + Math.pow(Math.random(), 2.5) * 7;
      var b = { life: 1, fade: rand(0.005, 0.016), len: rand(6, 40),
                thick: Math.random() < 0.7 ? rand(1, 2) : rand(2, 4),
                // where in the projection this sliver is torn from (0–1 of the screen area)
                su: Math.random(), sv: Math.random(),
                color: SETTINGS.escapeColors[(Math.random() * SETTINGS.escapeColors.length) | 0] };
      b.horiz = Math.random() < 0.65;
      if (b.horiz) {
        // sideways, like a tear running off the frame
        var dx = Math.random() < (mx - r.left) / r.width ? 1 : -1;
        b.x = dx > 0 ? r.right : r.left;
        b.y = Math.min(r.bottom, Math.max(r.top, my + gauss() * r.height * 0.35));
        b.vx = dx * v;
        b.vy = gauss() * 0.12;
      } else {
        // up or down, like a streak spilling over
        var dy = Math.random() < (my - r.top) / r.height ? 1 : -1;
        b.y = dy > 0 ? r.bottom : r.top;
        b.x = Math.min(r.right, Math.max(r.left, mx + gauss() * r.width * 0.3));
        b.vy = dy * v;
        b.vx = gauss() * 0.12;
      }
      bits.push(b);
    }
    if (!pageRunning) {
      pageRunning = true;
      requestAnimationFrame(pageStep);
    }
  }

  function pageStep() {
    // fade what is already there, so each fragment leaves a short dissolving trail
    pctx.globalCompositeOperation = "destination-out";
    pctx.globalAlpha = 0.1;
    pctx.fillRect(0, 0, PW, PH);
    pctx.globalCompositeOperation = "source-over";

    var sc = SETTINGS.screen;
    var sx0 = W * sc[0], sw = W * (sc[2] - sc[0]);
    var sy0 = H * sc[1], sh = H * (sc[3] - sc[1]);

    for (var i = bits.length - 1; i >= 0; i--) {
      var b = bits[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= SETTINGS.escapeReach;
      b.vy *= SETTINGS.escapeReach;
      b.life -= b.fade;
      if (b.life <= 0 || b.x < -40 || b.x > PW + 40 || b.y < -40 || b.y > PH + 40) {
        bits.splice(i, 1);
        continue;
      }
      if (Math.random() < 0.12) continue;            // signal drop-out: skip a frame

      var sp = Math.hypot(b.vx, b.vy);
      var L = b.len * (0.6 + Math.min(sp, 4) * 0.35); // fast ones smear longer
      var dir = (b.horiz ? b.vx : b.vy) < 0 ? -1 : 1;
      var jit = Math.random() < 0.2 ? gauss() * 3 : 0; // sideways stutter
      var a = b.life * b.life * 0.75;

      // tear the sliver into 1–3 pieces with gaps that change every frame
      var pieces = 1 + ((Math.random() * 3) | 0);
      var at = 0;
      for (var p = 0; p < pieces && at < L; p++) {
        var seg = Math.max(2, (L - at) * rand(0.3, 1) / (pieces - p));
        var sxp = sx0 + sw * ((b.su + rand(-0.02, 0.02) + 1) % 1);
        var syp = sy0 + sh * b.sv;
        pctx.globalAlpha = a * rand(0.6, 1);
        if (b.horiz) {
          var px = dir > 0 ? b.x - at - seg : b.x + at;
          pctx.drawImage(canvas, sxp, syp, Math.max(1, seg * dpr), Math.max(1, b.thick * dpr),
                         px, b.y + jit, seg, b.thick);
        } else {
          var py = dir > 0 ? b.y - at - seg : b.y + at;
          pctx.drawImage(canvas, sxp, syp, Math.max(1, b.thick * dpr), Math.max(1, seg * dpr),
                         b.x + jit, py, b.thick, seg);
        }
        at += seg + rand(1, 8);
      }

      // colour fringe: a hairline of pure colour slipped off the sliver
      if (Math.random() < 0.35) {
        var off = (Math.random() < 0.5 ? -1 : 1) * rand(1, 3);
        pctx.globalAlpha = a * 0.6;
        pctx.fillStyle = b.color;
        if (b.horiz) pctx.fillRect(dir > 0 ? b.x - L : b.x, b.y + off + jit, L * rand(0.3, 1), 1);
        else pctx.fillRect(b.x + off + jit, dir > 0 ? b.y - L : b.y, 1, L * rand(0.3, 1));
      }
    }
    pctx.globalAlpha = 1;

    if (bits.length) fadeOut = 60;
    if (bits.length || fadeOut-- > 0) {
      requestAnimationFrame(pageStep);
    } else {
      pctx.clearRect(0, 0, PW, PH);
      pageRunning = false;
    }
  }

  sizePage();
  window.addEventListener("resize", sizePage);

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
