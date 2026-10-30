/* ==========================================================
   Site-wide glitch background.
   A full-screen canvas behind every page running the same
   analogue-feedback idea as the home photo: it idles with a
   few drifting streaks and flares up around the pointer when
   you move the mouse or scroll.
   Tweak the numbers in SETTINGS to change the character.
   ========================================================== */

(function () {
  var SETTINGS = {
    idle: 0.12,           // how alive the background is when nothing moves (0–1)
    streaks: 26,          // vertical streaks per frame at full energy
    decay: 0.07,          // how fast light fades each frame (higher = darker, calmer)
    zoom: 1.015,          // feedback zoom per frame around the pointer
    drift: 1.5,           // feedback downward drift in px per frame
    saturate: 1.04,       // colour boost per feedback pass (compounds, 1 = off)
    tears: 3,             // horizontal tears per frame at full energy
    spread: 0.22,         // how far around the pointer streaks spawn (share of width)
    screen: [0.2, 0.12, 0.68, 0.65], // area of hero.jpg the streaks take colour from
    colors: ["#00e5ff", "#ff1a00", "#e8ff00", "#0047ff", "#ff00b8", "#00ff8c", "#7a00ff"]
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var base = document.currentScript.src.replace(/glitch-bg\.js.*$/, "");
  var canvas = document.createElement("canvas");
  canvas.className = "glitch-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var img = new Image();
  img.src = base + "images/hero.jpg";

  var W = 0, H = 0;
  var mouse = { x: 0, y: 0, px: 0, py: 0 };
  var energy = SETTINGS.idle;
  var kick = 0;          // extra energy from scrolling, fades out
  var lastScroll = window.scrollY;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!mouse.x) { mouse.x = mouse.px = W / 2; mouse.y = mouse.py = H / 2; }
  }

  function step() {
    var speed = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py);
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    kick *= 0.9;

    var target = Math.min(1, SETTINGS.idle + speed / 30 + kick);
    energy += (target - energy) * (target > energy ? 0.2 : 0.04);
    var k = energy;

    // feedback: last frame redrawn slightly zoomed around the pointer
    var z = 1 + (SETTINGS.zoom - 1) * k;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.96;
    ctx.filter = "saturate(" + SETTINGS.saturate + ")";
    ctx.drawImage(canvas, 0, 0, W, H,
      mouse.x - mouse.x * z, mouse.y - mouse.y * z + SETTINGS.drift * k, W * z, H * z);
    ctx.filter = "none";

    // decay toward black
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = SETTINGS.decay;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (img.complete && img.naturalWidth) {
      ctx.globalCompositeOperation = "lighter";
      var n = Math.round(SETTINGS.streaks * k);
      var iw = img.naturalWidth, ih = img.naturalHeight, sc = SETTINGS.screen;
      for (var i = 0; i < n; i++) {
        // calm: anywhere on screen; excited: clustered around the pointer
        var x = Math.random() < k ? mouse.x + gauss() * W * SETTINGS.spread : Math.random() * W;
        var w = rand(1, 5);
        ctx.globalAlpha = rand(0.2, 0.75) * Math.max(k, 0.35);
        ctx.drawImage(img, iw * rand(sc[0], sc[2]), ih * rand(sc[1], sc[3]), 2, rand(4, 30),
          x, rand(-0.2, 0.6) * H, w, rand(0.2, 1.2) * H);
      }
      for (var j = 0; j < n / 3; j++) {
        ctx.globalAlpha = rand(0.15, 0.6) * k;
        ctx.fillStyle = SETTINGS.colors[(Math.random() * SETTINGS.colors.length) | 0];
        ctx.fillRect(mouse.x + gauss() * W * SETTINGS.spread * 1.4, rand(-0.1, 0.8) * H, rand(1, 3), rand(0.1, 0.8) * H);
      }
    }

    // horizontal tears
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    var t = Math.random() < k ? Math.round(SETTINGS.tears * (0.5 + k)) : 0;
    for (var m = 0; m < t; m++) {
      var by = mouse.y + gauss() * H * 0.3, bh = rand(2, 16);
      ctx.drawImage(canvas, 0, by, W, bh, gauss() * 70 * k, by, W, bh);
    }

    requestAnimationFrame(step);
  }

  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener("scroll", function () {
    var d = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    kick = Math.min(0.8, kick + d / 400);
  }, { passive: true });

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(step);
})();
