/**
 * Hero — séquence image par image pilotée par le SCROLL DE PAGE.
 *
 * Règle absolue respectée ici :
 *   - aucun preventDefault sur wheel / touchmove / scroll
 *   - aucune écriture de scrollTop / scrollTo / scrollBy
 *   - aucun conteneur scrollable qui intercepte le geste
 *   - `position: sticky` est purement visuel (CSS), pas un mécanisme de capture
 *   - ScrollTrigger (scrub) LIT la position de scroll, il ne l'écrit jamais.
 *     On n'utilise pas `pin`, pour rester sur du sticky CSS pur.
 */
(function () {
  "use strict";

  var FRAME_DIR = "assets/frames/";
  var FRAME_COUNT_MAX = 300;
  var MISSING_FRAMES = [64, 65];
  var MAX_DPR = 2;
  var SPARK_COUNT = 22;

  var section = document.getElementById("pack");
  var stage = section.querySelector(".pack-stage");
  var shake = document.getElementById("packShake");
  var canvas = document.getElementById("packCanvas");
  var ctx = canvas.getContext("2d");
  var loader = document.getElementById("loader");
  var loaderFill = document.getElementById("loaderFill");
  var loaderPct = document.getElementById("loaderPct");
  var railFill = document.getElementById("packRailFill");
  var burst = document.getElementById("packBurst");
  var flash = document.getElementById("packFlash");
  var rays = document.getElementById("packRays");
  var stampSealed = document.getElementById("stampSealed");
  var stampChecked = document.getElementById("stampChecked");
  var caps = Array.prototype.slice.call(section.querySelectorAll(".pack-cap"));

  var frameUrls = buildFrameList();
  var images = [];
  var drawnIndex = -1;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function buildFrameList() {
    var urls = [];
    for (var n = 1; n <= FRAME_COUNT_MAX; n++) {
      if (MISSING_FRAMES.indexOf(n) !== -1) continue;
      urls.push(FRAME_DIR + "frame-" + String(n).padStart(3, "0") + ".jpg");
    }
    return urls;
  }

  /* ---------- canvas ---------- */

  function resizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    if (drawnIndex >= 0) drawFrame(drawnIndex, true);
  }

  function drawFrame(index, force) {
    if (index === drawnIndex && !force) return;
    var img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;

    drawnIndex = index;

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

  /* ---------- préchargement ---------- */

  function preload() {
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
          if (i === 0) drawFrame(0, true);
          if (loaded === total) resolve();
        };
        img.src = src;
        images[i] = img;
      });
    });
  }

  /* ---------- étincelles ---------- */

  function buildSparks() {
    var sparks = [];
    var kinds = ["", " spark-red", " spark-pale"];
    for (var i = 0; i < SPARK_COUNT; i++) {
      var el = document.createElement("i");
      el.className = "spark" + kinds[i % kinds.length];
      burst.appendChild(el);
      var angle = (i / SPARK_COUNT) * Math.PI * 2 + (i % 3) * 0.11;
      var reach = 190 + (i % 5) * 62;
      sparks.push({
        el: el,
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach * 0.82 - 60
      });
    }
    return sparks;
  }

  /* ---------- séquence maîtresse ---------- */

  function buildTimeline() {
    var proxy = { f: 0 };
    var last = images.length - 1;

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,              // lit le scroll, ne l'écrit jamais
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          railFill.style.width = (self.progress * 100).toFixed(2) + "%";
        }
      }
    });

    // Piste principale : la position de scroll choisit la frame (0 → 100).
    tl.to(proxy, {
      f: last,
      duration: 100,
      onUpdate: function () {
        drawFrame(Math.round(proxy.f));
      }
    }, 0);

    // Légendes d'étape — une seule à l'écran à la fois.
    var windows = [[1, 15], [21, 39], [47, 67], [80, 99]];
    caps.forEach(function (cap, i) {
      var w = windows[i];
      tl.fromTo(cap,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 3, ease: "power2.out",
          onStart: function () { cap.classList.add("is-on"); },
          onReverseComplete: function () { cap.classList.remove("is-on"); } },
        w[0]);
      tl.to(cap, { opacity: 0, y: -12, duration: 3, ease: "power2.in" }, w[1]);
    });

    // Tampon SCELLÉ — coup sec avec dépassement.
    tl.fromTo(stampSealed,
      { opacity: 0, scale: 1.45, rotate: -13 },
      { opacity: 1, scale: 1, rotate: -13, duration: 3, ease: "back.out(3)" }, 2);
    tl.to(stampSealed, { opacity: 0, scale: 0.94, duration: 3 }, 17);

    if (!reduced) {
      // Étape 1 — vibration : le paquet s'agite avant de céder.
      tl.to(shake, { x: -5, y: 3, duration: 1.6, ease: "power1.inOut" }, 3)
        .to(shake, { x: 6, y: -3, duration: 1.6, ease: "power1.inOut" }, 6)
        .to(shake, { x: -7, y: 4, duration: 1.6, ease: "power1.inOut" }, 9)
        .to(shake, { x: 5, y: -4, duration: 1.6, ease: "power1.inOut" }, 12)
        .to(shake, { x: 0, y: 0, duration: 2.4, ease: "power2.out" }, 15);

      // Étape 2 — déchirure : éclat lumineux + rayons.
      tl.fromTo(flash, { opacity: 0 }, { opacity: 0.85, duration: 2.5, ease: "power2.out" }, 24)
        .to(flash, { opacity: 0, duration: 6, ease: "power2.in" }, 27);

      tl.fromTo(rays,
        { opacity: 0, scale: 0.72, rotate: 0 },
        { opacity: 0.5, scale: 1.08, rotate: 14, duration: 22, ease: "power1.out" }, 30)
        .to(rays, { opacity: 0, scale: 1.3, duration: 14, ease: "power1.in" }, 58);

      // Étape 3 — éclat : les cartes/étincelles jaillissent.
      var sparks = buildSparks();
      sparks.forEach(function (s, i) {
        tl.fromTo(s.el,
          { opacity: 0, x: 0, y: 0, scale: 0.35, rotate: 0 },
          { opacity: 1, x: s.x, y: s.y, scale: 1, rotate: (i % 2 ? 190 : -160),
            duration: 20, ease: "power3.out" },
          44 + (i % 6) * 0.7);
        tl.to(s.el, { opacity: 0, scale: 0.5, duration: 12, ease: "power1.in" }, 66 + (i % 6) * 0.7);
      });
    }

    // Étape 4 — stabilisation : tampon VÉRIFIÉ.
    tl.fromTo(stampChecked,
      { opacity: 0, scale: 1.5, rotate: 9 },
      { opacity: 1, scale: 1, rotate: 9, duration: 4, ease: "back.out(2.6)" }, 82);

    return tl;
  }

  /* ---------- resize ---------- */

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeCanvas();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 140);
  }

  /* ---------- init ---------- */

  function init() {
    resizeCanvas();
    window.addEventListener("resize", onResize);

    preload().then(function () {
      resizeCanvas();
      gsap.registerPlugin(ScrollTrigger);
      buildTimeline();
      ScrollTrigger.refresh();
      loader.classList.add("is-done");
      document.dispatchEvent(new CustomEvent("pack:ready"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
