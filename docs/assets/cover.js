/* Cover entrance + scroll fade, and one gentle reveal for section heads and cards. */
(() => {
  "use strict";
  const cover = document.getElementById("top");
  requestAnimationFrame(() => document.documentElement.classList.add("cover-in"));
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Reveal: content is visible by default; only elements below the fold get the class before they enter.
  const targets = document.querySelectorAll(".sec-head, .stages, .pipe-grid, .tl-chart, .filters, .closing .card");
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: "0px 0px -6% 0px" });
  targets.forEach(el => {
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("rv"); io.observe(el); }
  });

  // Scroll-out fade: like the cover, each block eases up, shrinks a little and fades as it leaves under the nav.
  // The long methods table (and its status line and note) is left alone.
  const fades = [...document.querySelectorAll(
    ".sec-head, .stages, .pipe-grid, .tl-chart, .filters, .closing .card, .foot-inner")];
  const navH = () => document.getElementById("topnav")?.offsetHeight || 0;
  const fadeOut = () => {
    const line = navH(), vh = innerHeight;
    for (const el of fades) {
      const r = el.getBoundingClientRect();
      const p = Math.min(Math.max((line - 40 - r.top) / (Math.min(r.height, vh * .6) || 1), 0), 1);
      if (p <= 0) { if (el.dataset.fx) { el.style.opacity = el.style.translate = el.style.scale = el.style.transition = el.style.filter = ""; delete el.dataset.fx; } continue; }
      el.dataset.fx = 1;
      el.style.transition = "none";
      el.style.opacity = Math.max(1 - p * 1.1, 0).toFixed(3);
      el.style.translate = `0 ${(-p * 40).toFixed(1)}px`;
      el.style.scale = (1 - p * .04).toFixed(4);
      el.style.filter = p > .05 ? `blur(${(p * 4).toFixed(2)}px)` : "";
    }
  };

  let ticking = false;
  const update = () => {
    if (cover) {
      const h = cover.offsetHeight || 1;
      cover.style.setProperty("--p", Math.min(Math.max(scrollY / (h * .8), 0), 1).toFixed(3));
    }
    fadeOut();
    ticking = false;
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", req);
  update();
})();
