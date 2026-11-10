/* CLIP CHECK — run in the browser preview on every screen before reporting a
   layout change (Pavan, 2026-11-10: "these things should happen before the
   final thing is executed"). Miss M-047: a fold wrapper's overflow-hidden cut
   the top off Create Order and the ends off the views row's rule.

   Finds every visible control or rule that a NON-SCROLLING clipping ancestor
   (overflow hidden / clip) cuts part of. Scroll containers are skipped — a
   card half-scrolled out of a lane is not a bug. Returns [] when clean.

   Use: paste into javascript_tool, or `await (await import(url)).default()`. */
(() => {
  const TOL = 0.5;
  const sel =
    'button, a[href], input, select, textarea, [role="tab"], [role="button"], [role="switch"], [role="checkbox"], [data-slot="separator"], h1, h2, h3';
  const scrolls = (el) => {
    const cs = getComputedStyle(el);
    const y = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
    const x = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
    return x || y;
  };
  const clips = (el) => {
    const cs = getComputedStyle(el);
    return /(hidden|clip)/.test(cs.overflowX) || /(hidden|clip)/.test(cs.overflowY);
  };
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (el.closest('[aria-hidden="true"], [inert], .sr-only')) continue;
    if (Number(getComputedStyle(el).opacity) === 0) continue; // parked out of sight on purpose
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (scrolls(p)) break; // inside a scroller: partial is expected
      if (!clips(p)) continue;
      const pr = p.getBoundingClientRect();
      const cut = {
        top: pr.top - r.top > TOL,
        bottom: r.bottom - pr.bottom > TOL,
        left: pr.left - r.left > TOL,
        right: r.right - pr.right > TOL,
      };
      const sides = Object.keys(cut).filter((k) => cut[k]);
      // Fully outside = hidden on purpose (a folded row); only PARTIAL cuts count.
      const outside = r.bottom <= pr.top || r.top >= pr.bottom || r.right <= pr.left || r.left >= pr.right;
      if (outside) break; // tucked fully out of its own box on purpose (a fold, a slide-in)
      if (sides.length) {
        out.push({
          what: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40),
          cutAt: sides.join("+"),
          by: (p.className && p.className.toString().slice(0, 80)) || p.tagName,
        });
        break;
      }
    }
  }
  return out;
})();
