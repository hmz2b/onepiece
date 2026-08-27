/**
 * Le paquet en calque de fond, ouvert par le scroll de page.
 *
 * Principe : le canvas vit dans un `position: fixed` DERRIÈRE le contenu.
 * La section « Les gammes » défile par-dessus comme n'importe quelle section
 * de page — elle n'est ni épinglée ni collée — et sa progression choisit la
 * frame affichée au fond. L'utilisateur ne s'arrête donc jamais : le contenu
 * avance en continu pendant que le paquet s'ouvre derrière.
 *
 * Le scroll reste strictement natif :
 *   - aucun preventDefault sur wheel / touchmove / scroll
 *   - aucune écriture de scrollTop / scrollTo / scrollBy
 *   - aucun conteneur scrollable, aucun `pin`, aucun `position: sticky`
 *   - le calque de fond est en `pointer-events: none`
 *   - ScrollTrigger est en `scrub` : il LIT la position, jamais l'inverse.
 */
(function () {
  "use strict";

  var FRAME_DIR = "assets/frames/";
  var FRAME_COUNT_MAX = 300;
  var MISSING_FRAMES = [64, 65];
  var MAX_DPR = 2;
  var SPARK_COUNT = 22;

  var layer = document.getElementById("packbg");
  var canvas = document.getElementById("packCanvas");
  var ctx = canvas.getContext("2d");
  var loader = document.getElementById("loader");
  var loaderFill = document.getElementById("loaderFill");
  var loaderPct = document.getElementById("loaderPct");
  var burst = document.getElementById("packBurst");
  var flash = document.getElementById("packFlash");
  var rays = document.getElementById("packRays");
  var gammes = document.getElementById("gammes");

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
    var w = layer.clientWidth;
    var h = layer.clientHeight;
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

  /* ---------- séquence ---------- */

  function buildTimeline() {
    var proxy = { f: 0 };
    var last = images.length - 1;

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        // La section des gammes défile normalement ; on se contente de lire
        // où elle en est. Pas de pin, pas de sticky, pas de pause.
        trigger: gammes,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true
      }
    });

    tl.to(proxy, {
      f: last,
      duration: 100,
      onUpdate: function () { drawFrame(Math.round(proxy.f)); }
    }, 0);

    if (reduced) return tl;

    // Déchirure : éclat lumineux puis rayons.
    tl.fromTo(flash, { opacity: 0 }, { opacity: 0.8, duration: 2.5, ease: "power2.out" }, 24)
      .to(flash, { opacity: 0, duration: 6, ease: "power2.in" }, 27);

    tl.fromTo(rays,
      { opacity: 0, scale: 0.72, rotate: 0 },
      { opacity: 0.45, scale: 1.08, rotate: 14, duration: 22, ease: "power1.out" }, 30)
      .to(rays, { opacity: 0, scale: 1.3, duration: 14, ease: "power1.in" }, 58);

    // Éclat : les étincelles jaillissent.
    buildSparks().forEach(function (s, i) {
      tl.fromTo(s.el,
        { opacity: 0, x: 0, y: 0, scale: 0.35, rotate: 0 },
        { opacity: 1, x: s.x, y: s.y, scale: 1, rotate: (i % 2 ? 190 : -160),
          duration: 20, ease: "power3.out" },
        44 + (i % 6) * 0.7);
      tl.to(s.el, { opacity: 0, scale: 0.5, duration: 12, ease: "power1.in" }, 66 + (i % 6) * 0.7);
    });

    return tl;
  }

  /* ---------- le calque s'efface une fois les gammes passées ---------- */

  function fadeLayerAfterGammes() {
    gsap.to(layer, {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: gammes,
        start: "bottom bottom",
        end: "bottom top+=25%",
        scrub: true
      }
    });
  }

  /* ---------- resize ---------- */

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeCanvas();
      ScrollTrigger.refresh();
    }, 140);
  }

  function init() {
    resizeCanvas();
    window.addEventListener("resize", onResize);

    preload().then(function () {
      resizeCanvas();
      gsap.registerPlugin(ScrollTrigger);
      buildTimeline();
      fadeLayerAfterGammes();
      ScrollTrigger.refresh();
      loader.classList.add("is-done");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
