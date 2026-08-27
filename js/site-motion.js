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
      gsap.set("[data-reveal], [data-stagger] > *, [data-pop], .gamme, .gamme-rank, .gamme-name, .gamme-copy, .gamme-go",
        { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 });
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

  /* ---------- gammes : cases de manga alternées ----------
     Chaque case entre depuis SON côté, légèrement pivotée, précédée d'un
     balayage de lignes de vitesse. Les éléments internes (numéro, nom,
     description, bouton) arrivent en cascade et repartent à des vitesses
     différentes pendant le scroll : rien ne bouge en bloc. */

  function revealGammes() {
    gsap.utils.toArray(".gamme").forEach(function (el) {
      var side = parseFloat(el.dataset.side) || -1;   // -1 = gauche, +1 = droite
      var lines = el.querySelector(".gamme-lines");
      var rank = el.querySelector(".gamme-rank");
      var name = el.querySelector(".gamme-name");
      var copy = el.querySelector(".gamme-copy");
      var go = el.querySelector(".gamme-go");

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 82%",
          toggleActions: "play none none reverse"
        }
      });

      // le balayage de vitesse précède la case
      tl.fromTo(lines,
        { opacity: 0, x: side * 140, scaleX: 0.5 },
        { opacity: 0.5, x: side * -30, scaleX: 1, duration: 0.42, ease: "power3.out" }, 0)
        .to(lines, { opacity: 0, x: side * -90, duration: 0.5, ease: "power2.in" }, 0.34);

      // la case tombe en place, penchée puis redressée
      tl.fromTo(el,
        { opacity: 0, x: side * 90, rotate: side * 3.5 },
        { opacity: 1, x: 0, rotate: 0, duration: 0.62, ease: "back.out(1.5)" }, 0.06);

      // contenu en cascade, chacun sa distance
      tl.fromTo([rank, name, copy, go],
        { opacity: 0, x: side * 34 },
        { opacity: 1, x: 0, duration: 0.42, ease: "power2.out", stagger: 0.07 }, 0.2);

      // dérive lente pendant tout le passage à l'écran : les couches internes
      // ne défilent pas à la même vitesse que la case (profondeur)
      gsap.fromTo([name, copy],
        { y: 16 },
        {
          y: -16, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
        });
      gsap.fromTo(rank,
        { y: 26 },
        {
          y: -26, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
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
