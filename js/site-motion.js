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
      gsap.set("[data-reveal], [data-stagger] > *, [data-pop], .gamme", { opacity: 1, y: 0, rotate: 0, scale: 1 });
      splitTitle(true);
      return;
    }

    splitTitle(false);
    revealBlocks();
    staggerGroups();
    revealGammes();
    popBubbles();
    parallaxTextures();

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

  /* ---------- gammes : entrée/sortie douce au passage ---------- */

  function revealGammes() {
    gsap.utils.toArray(".gamme").forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 46 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 22%", toggleActions: "play none none reverse" }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
