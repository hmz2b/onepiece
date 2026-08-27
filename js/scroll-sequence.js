/**
 * Scroll-driven frame-by-frame animation (Apple product-page technique).
 * Scroll position maps to a frame index in a preloaded image sequence,
 * drawn on a <canvas> pinned via position: sticky.
 */
(function () {
  "use strict";

  var FRAME_DIR = "assets/frames/";
  var FRAME_COUNT_MAX = 300;
  var MISSING_FRAMES = [64, 65];
  var FRAME_STEP_PX = 12; // scroll px "spent" per frame, before clamping
  var MAX_DPR = 2;

  var frameUrls = buildFrameList();

  var section = document.getElementById("boutique");
  var sticky = section.querySelector(".frame-sequence__sticky");
  var canvas = document.getElementById("frameCanvas");
  var ctx = canvas.getContext("2d");
  var loader = document.getElementById("loader");
  var loaderFill = document.getElementById("loaderFill");
  var loaderPct = document.getElementById("loaderPct");
  var progressFill = document.getElementById("scrollProgressFill");
  var scrollHint = document.getElementById("scrollHint");
  var captions = [
    { el: document.getElementById("capStart"), from: 0, to: 0.12 },
    { el: document.getElementById("capMid"), from: 0.32, to: 0.6 },
    { el: document.getElementById("capEnd"), from: 0.86, to: 1.01 }
  ];

  var images = [];
  var currentFrameIndex = -1;
  var ready = false;
  var ticking = false;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function buildFrameList() {
    var urls = [];
    for (var n = 1; n <= FRAME_COUNT_MAX; n++) {
      if (MISSING_FRAMES.indexOf(n) !== -1) continue;
      var padded = String(n).padStart(3, "0");
      urls.push(FRAME_DIR + "frame-" + padded + ".jpg");
    }
    return urls;
  }

  function setSectionHeight() {
    var vh = window.innerHeight;
    var scrollDistance = Math.min(vh * 6, Math.max(vh * 3, frameUrls.length * FRAME_STEP_PX));
    section.style.height = Math.round(vh + scrollDistance) + "px";
  }

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var w = sticky.clientWidth;
    var h = sticky.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    if (currentFrameIndex >= 0) drawFrame(currentFrameIndex, true);
  }

  function drawFrame(index, force) {
    if (index === currentFrameIndex && !force) return;
    var img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;

    currentFrameIndex = index;

    var cw = canvas.width;
    var ch = canvas.height;
    var canvasRatio = cw / ch;
    var imgRatio = img.naturalWidth / img.naturalHeight;

    var sx, sy, sw, sh;
    if (imgRatio > canvasRatio) {
      sh = img.naturalHeight;
      sw = sh * canvasRatio;
      sy = 0;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sw = img.naturalWidth;
      sh = sw / canvasRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  function updateCaptions(progress) {
    for (var i = 0; i < captions.length; i++) {
      var c = captions[i];
      var visible = progress >= c.from && progress < c.to;
      c.el.classList.toggle("is-visible", visible);
    }
  }

  function onProgress() {
    if (!ready) return;

    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;
    var scrollableDistance = section.offsetHeight - vh;
    var scrolled = clamp(-rect.top, 0, scrollableDistance);
    var progress = scrollableDistance > 0 ? scrolled / scrollableDistance : 0;

    var frameIndex = Math.round(progress * (images.length - 1));
    drawFrame(frameIndex);

    progressFill.style.width = (progress * 100).toFixed(1) + "%";
    updateCaptions(progress);
    scrollHint.classList.toggle("is-hidden", progress > 0.015);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onProgress();
      ticking = false;
    });
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function preloadFrames() {
    return new Promise(function (resolve) {
      var loaded = 0;
      var total = frameUrls.length;

      frameUrls.forEach(function (src, i) {
        var img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = function () {
          loaded++;
          var pct = Math.round((loaded / total) * 100);
          loaderFill.style.width = pct + "%";
          loaderPct.textContent = pct;
          if (i === 0 && img.complete && img.naturalWidth) {
            images[0] = img;
            drawFrame(0, true);
          }
          if (loaded === total) resolve();
        };
        img.src = src;
        images[i] = img;
      });
    });
  }

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setSectionHeight();
      resizeCanvas();
      onProgress();
    }, 120);
  }

  function init() {
    setSectionHeight();
    resizeCanvas();

    preloadFrames().then(function () {
      ready = true;
      resizeCanvas();
      onProgress();
      loader.classList.add("is-done");
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    if (reducedMotion) {
      // Scroll-scrubbing stays user-driven (not autoplay), but we skip
      // the smooth CSS transitions on captions via the stylesheet's
      // reduced-motion query — nothing else to disable here.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
