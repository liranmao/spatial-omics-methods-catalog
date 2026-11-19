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

  if (!cover) return;
  let ticking = false;
  const update = () => {
    const h = cover.offsetHeight || 1;
    cover.style.setProperty("--p", Math.min(Math.max(scrollY / (h * .8), 0), 1).toFixed(3));
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
