/**
 * Animations de page — GSAP + ScrollTrigger.
 *
 * Tout est piloté par le scroll natif de la fenêtre : on lit la position,
 * on ne l'écrit jamais. Aucune interception de wheel / touchmove / scroll.
 * On n'anime que `transform` et `opacity` (pas de reflow).
 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init() {
    gsap.registerPlugin(ScrollTrigger);

    if (reduced) {
      // Pas de mouvement : tout est visible d'emblée.
      gsap.set("[data-reveal], [data-stagger] > *, [data-pop]", { opacity: 1, y: 0, rotate: 0, scale: 1 });
      splitTitle(true);
      return;
    }

    splitTitle(false);
    revealBlocks();
    staggerGroups();
    settleTilts();
    popBubbles();
    parallaxTextures();
    breathePack();

    ScrollTrigger.refresh();
  }

  /* ---------- titre du hero : mot par mot, façon lettrage ---------- */

  function splitTitle(instant) {
    var title = document.querySelector("[data-split]");
    if (!title) return;

    var words = title.textContent.trim().split(/\s+/);
    title.textContent = "";
    var spans = words.map(function (w, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = w;
      title.appendChild(span);
      if (i < words.length - 1) title.appendChild(document.createTextNode(" "));
      return span;
    });

    if (instant) {
      gsap.set(spans, { opacity: 1, y: 0, rotate: 0, scale: 1 });
      return;
    }

    gsap.fromTo(spans,
      { opacity: 0, y: 42, rotate: -7, scale: 0.86 },
      {
        opacity: 1, y: 0, rotate: 0, scale: 1,
        duration: 0.6,
        ease: "back.out(2.2)",
        stagger: 0.07,
        delay: 0.15
      });
  }

  /* ---------- entrées simples ---------- */

  function revealBlocks() {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 26 },
        {
          opacity: 1, y: 0, duration: 0.65, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        });
    });
  }

  /* ---------- entrées en cascade ---------- */

  function staggerGroups() {
    gsap.utils.toArray("[data-stagger]").forEach(function (group) {
      var items = group.children;
      gsap.fromTo(items,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          duration: 0.6, ease: "power2.out", stagger: 0.11,
          scrollTrigger: { trigger: group, start: "top 82%", once: true }
        });
    });
  }

  /* ---------- cartes catégories : arrivent penchées, se stabilisent ---------- */

  function settleTilts() {
    gsap.utils.toArray("[data-tilt]").forEach(function (el) {
      var finalAngle = parseFloat(el.dataset.tilt) || 0;
      gsap.fromTo(el,
        { rotate: finalAngle - 9, y: 34 },
        {
          rotate: finalAngle, y: 0,
          duration: 0.85, ease: "back.out(1.7)",
          scrollTrigger: { trigger: el, start: "top 84%", once: true }
        });
      // le survol redresse la carte (voir .cat:hover)
      el.addEventListener("mouseenter", function () {
        gsap.to(el, { rotate: 0, duration: 0.22, ease: "power2.out", overwrite: "auto" });
      });
      el.addEventListener("mouseleave", function () {
        gsap.to(el, { rotate: finalAngle, duration: 0.3, ease: "power2.out", overwrite: "auto" });
      });
    });
  }

  /* ---------- bulles : "pop" élastique, l'une après l'autre ---------- */

  function popBubbles() {
    var bubbles = gsap.utils.toArray("[data-pop]");
    if (!bubbles.length) return;

    gsap.fromTo(bubbles,
      { opacity: 0, scale: 0.72, y: 18 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 0.7, ease: "elastic.out(1, 0.62)", stagger: 0.14,
        scrollTrigger: { trigger: bubbles[0].parentNode, start: "top 82%", once: true }
      });
  }

  /* ---------- parallaxe des fonds texturés ---------- */

  function parallaxTextures() {
    gsap.utils.toArray("[data-parallax]").forEach(function (layer) {
      var depth = parseFloat(layer.dataset.parallax) || 0.25;
      gsap.fromTo(layer,
        { yPercent: -depth * 12 },
        {
          yPercent: depth * 12,
          ease: "none",
          scrollTrigger: {
            trigger: layer.parentNode,
            start: "top bottom",
            end: "bottom top",
            scrub: true          // lit le scroll, ne l'écrit jamais
          }
        });
    });
  }

  /* ---------- le paquet "respire" tant qu'il est scellé ---------- */

  function breathePack() {
    var shake = document.getElementById("packShake");
    if (!shake) return;

    var breath = gsap.to(shake, {
      scale: 1.02,
      duration: 2.4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      paused: true
    });

    // La respiration ne tourne que sur la toute première phase du hero,
    // pour ne jamais se superposer à la séquence d'ouverture.
    ScrollTrigger.create({
      trigger: "#pack",
      start: "top top",
      end: "top top-=12%",
      onEnter: function () { breath.play(); },
      onLeave: function () { breath.pause(); gsap.set(shake, { scale: 1 }); },
      onEnterBack: function () { breath.play(); },
      onLeaveBack: function () { breath.pause(); gsap.set(shake, { scale: 1 }); }
    });

    breath.play();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
