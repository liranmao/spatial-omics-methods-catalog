/* Hero (pipeline from Figure 1 + animated task schematic) and the timeline screen. */
(() => {
  "use strict";
  const C = window.Catalog;
  if (!C) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // What each task does, in one line, and which schematic shows it.
  const TASK_INFO = {
    "Spatially variable gene identification": ["svg", "Find genes whose expression follows tissue structure."],
    "Cell-type deconvolution": ["deconv", "Estimate the mix of cell types inside each spot."],
    "Spatial gene expression prediction": ["predict", "Predict expression from histology, or impute unmeasured genes."],
    "Spatial alignment": ["align", "Register serial or cross-platform slices into one frame."],
    "Multi-sample & multi-modal integration": ["integrate", "Combine samples and modalities into a shared representation."],
    "Foundation models": ["fm", "Pretrain on large spatial atlases, then reuse across tasks."],
    "Uncertainty quantification": ["uq", "Attach calibrated uncertainty to predictions and interactions."],
    "Cell communication & interpretable models": ["network", "Model cell–cell signalling and niche effects with readable models."],
    "Gene regulatory networks": ["grn", "Infer which transcription factors regulate which genes, with spatial context."],
    "Trajectory inference": ["traj", "Follow cells through development or time across tissue space."],
  };

  // ---------------- Hero task list ----------------
  const counts = t => C.data.filter(m => m.categories.includes(t));
  const maxN = Math.max(...C.tasks.map(t => counts(t).length));
  const list = $("hero-tasks");
  list.innerHTML = C.tasks.map((t, i) => {
    const ms = counts(t);
    const n = k => ms.filter(m => C.paradigmClass[m.paradigm] === k).length;
    return `<button type="button" class="ht" data-hero-task="${esc(t)}" data-i="${i}" style="--d:${i}">
      <span class="ht-name">${esc(t)}</span>
      <span class="ht-track" aria-hidden="true"><span class="ht-bar" style="width:${(ms.length / maxN) * 100}%"><span class="b-stat" style="flex:${n("stat")}"></span><span class="b-hyb" style="flex:${n("hyb")}"></span><span class="b-dl" style="flex:${n("dl")}"></span></span></span>
      <span class="ht-n">${ms.length}</span></button>`;
  }).join("");
  list.addEventListener("click", e => {
    const b = e.target.closest(".ht");
    if (b) C.setTask(b.dataset.heroTask);
  });

  // ---------------- Inset schematic (canvas) ----------------
  const canvas = $("inset-canvas");
  const ctx = canvas.getContext("2d");
  const PAL = { a: "#8fb8e8", b: "#f2bd6b", c: "#c7a0e2", d: "#8fd0a0", dim: "rgba(255,255,255,.10)", ink: "rgba(255,255,255,.85)" };
  let W = 0, H = 0, mode = "deconv", modeStart = performance.now(), current = 1, hover = false, visible = true;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Smooth pseudo-random field, deterministic.
  const field = (x, y, s = 0) => (Math.sin(x * 3.1 + s) * Math.cos(y * 2.7 - s * .7) + Math.sin((x + y) * 4.3 + s * 1.3) * .5 + Math.cos(x * 7.1 - y * 5.3 + s) * .25) / 1.75;
  const inTissue = (x, y) => { // x,y in [0,1]
    const dx = (x - .5) / .47, dy = (y - .5) / .43;
    return dx * dx + dy * dy < 1 + .12 * field(x * 1.3, y * 1.3, 2);
  };
  const ease = p => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 3);
  function hexSpots(cols) {
    const out = [], dx = 1 / cols, dy = dx * .866, rows = Math.floor(1 / dy * (H / W)) || 1;
    for (let j = 0; j < rows + 1; j++) for (let i = 0; i < cols + 1; i++) {
      const x = (i + (j % 2 ? .5 : 0)) * dx, y = j * dy * (W / H);
      if (x <= 1 && y <= 1) out.push([x, y]);
    }
    return out;
  }
  const mix = (c1, c2, t) => {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
  };
  const ramp = t => t < .5 ? mix("#1f4e9c", "#8fd0a0", t * 2) : mix("#8fd0a0", "#f2bd6b", (t - .5) * 2);

  const DRAW = {
    svg(t) {
      const sp = hexSpots(22), r = W / 22 * .4, hx = .5 + .22 * Math.sin(t / 2200), hy = .5 + .18 * Math.cos(t / 2600);
      for (const [x, y] of sp) {
        if (!inTissue(x, y)) { dot(x, y, r * .5, PAL.dim); continue; }
        const g = Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / .03) * .85 + .15 * (field(x, y) + 1) / 2;
        dot(x, y, r * (.75 + .25 * g), ramp(g));
      }
      label("one gene's expression follows the tissue");
    },
    deconv(t) {
      const sp = hexSpots(14), r = W / 14 * .42, p = ease((t % 6000) / 1600);
      for (const [x, y] of sp) {
        if (!inTissue(x, y)) { dot(x, y, r * .4, PAL.dim); continue; }
        let w = [field(x, y, 0) + 1.2, field(x, y, 2) + 1.2, field(x, y, 4) + 1.2].map(v => Math.max(v, .05) ** 2);
        const s = w.reduce((a, b) => a + b); w = w.map(v => v / s);
        const cx = x * W, cy = y * H;
        if (p < .02) { dot(x, y, r, "rgba(255,255,255,.35)"); continue; }
        let a0 = -Math.PI / 2;
        [PAL.a, PAL.b, PAL.c].forEach((col, k) => {
          const a1 = a0 + w[k] * Math.PI * 2 * p;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); a0 = a1;
        });
      }
      label("each spot becomes a mixture of cell types");
    },
    predict(t) {
      const sweep = ((t % 5200) / 4200);
      const sx = Math.min(sweep, 1) * W;
      const sp = hexSpots(9), r = W / 9 * .4;
      for (const [x, y] of sp) {
        if (x * W > sx && inTissue(x, y)) dot(x, y, r, ramp((field(x * .6, y * .6, 1) + 1) / 2));
        else if (x * W > sx) dot(x, y, r * .35, PAL.dim);
      }
      const px = W / 48;
      for (let gx = 0; gx * px < sx; gx++) for (let gy = 0; gy * px < H; gy++) {
        const x = (gx + .5) * px / W, y = (gy + .5) * px / H;
        if (!inTissue(x, y)) continue;
        ctx.fillStyle = ramp((field(x * .6, y * .6, 1) + 1) / 2 * .8 + (field(x * 3, y * 3, 5) + 1) / 2 * .2);
        ctx.fillRect(gx * px, gy * px, px - .5, px - .5);
      }
      if (sweep < 1) { ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(sx - 1, 0, 2, H); }
      label("coarse spots → fine expression map");
    },
    align(t) {
      const p = ease(((t % 5000) - 600) / 2600);
      const sp = hexSpots(13), r = W / 13 * .3;
      const th = (1 - p) * .55, ox = (1 - p) * .16, oy = (1 - p) * -.08;
      for (const [x, y] of sp) if (inTissue(x, y)) dot(x, y, r, "rgba(143,184,232,.55)");
      for (const [x, y] of sp) {
        if (!inTissue(x, y)) continue;
        const dx = x - .5, dy = (y - .5) * H / W;
        const rx = .5 + dx * Math.cos(th) - dy * Math.sin(th) + ox, ry = .5 + (dx * Math.sin(th) + dy * Math.cos(th)) * W / H + oy;
        ring(rx, ry, r * 1.05, "rgba(242,189,107,.95)");
      }
      label(p > .98 ? "slices in one coordinate frame" : "registering slice 2 onto slice 1");
    },
    integrate(t) {
      const p = ease(((t % 5600) - 500) / 2600), sp = hexSpots(14), r = W / 14 * .2;
      const cols = [PAL.a, PAL.d, PAL.c];
      cols.forEach((col, k) => {
        const off = (k - 1) * .22 * (1 - p);
        for (const [x, y] of sp) {
          if (!inTissue(x, y)) continue;
          const ix = .5 + (x - .5) * .8 + (y - .5) * .3, iy = .5 + (y - .5) * .45 + off;
          dot(ix, iy, r, col.replace("#", "#") , .55 + .45 * p * (k === 1 ? 1 : .6));
        }
      });
      label(p > .98 ? "one shared representation" : "modalities and samples → shared space");
    },
    fm(t) {
      // Pretraining atlases (left) stream into one embedding (centre), which feeds downstream tasks (right).
      const pad = Math.max(18, W * .05), top = 34, bot = H - 40, rowsH = bot - top;
      const cx = W * .5, cy = top + rowsH / 2, R = Math.min(W * .17, rowsH * .36);
      const pulse = .5 + .5 * Math.sin(t / 900);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      // glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.1);
      g.addColorStop(0, `rgba(155,107,255,${.30 + .10 * pulse})`); g.addColorStop(.45, "rgba(46,168,255,.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - R * 2.2, cy - R * 2.2, R * 4.4, R * 4.4);
      ctx.restore();
      // atlas tiles
      const ts = Math.min(W * .1, rowsH / 3 - 14), rowH = rowsH / 3, tiles = [];
      for (let k = 0; k < 6; k++) {
        const c = k % 2, r = k >> 1;
        tiles.push({ x: pad + c * (ts + 8), y: top + r * rowH + (rowH - ts) / 2, k, col: [PAL.a, PAL.d, PAL.c, PAL.b, PAL.d, PAL.a][k] });
      }
      // tasks
      const TK = [["Domains", PAL.d], ["Deconvolve", PAL.b], ["Predict", PAL.a], ["Niches", PAL.c]];
      const rowT = rowsH / 4, gs = Math.min(W * .075, rowT - 24), out = Math.min(1, Math.max(0, (t - 900) / 1400));
      const tasks = TK.map(([name, col], i) => ({ name, col, x: W - pad - gs / 2 - 10, y: top + i * rowT + (rowT - gs - 14) / 2 + gs / 2 }));
      const bz = (a, c, b, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * c + q * q * b;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      // inbound particles
      tiles.forEach(tl => {
        const x0 = tl.x + ts, y0 = tl.y + ts / 2, cxp = (x0 + cx) / 2;
        for (let j = 0; j < 5; j++) {
          const q = ((t / 2100) + j / 5 + tl.k * .13) % 1;
          const x = bz(x0, cxp, cx, q), y = bz(y0, y0, cy, q), a = Math.sin(q * Math.PI) * .9;
          pdot(x, y, 1.8, tl.col, a); pdot(x, y, 4.5, tl.col, a * .18);
        }
      });
      // outbound particles
      if (out > 0) tasks.forEach((tk, i) => {
        const cxp = (cx + tk.x) / 2;
        for (let j = 0; j < 4; j++) {
          const q = ((t / 1900) + j / 4 + i * .21) % 1;
          const x = bz(cx, cxp, tk.x - gs / 2 - 6, q), y = bz(cy, tk.y, tk.y, q), a = Math.sin(q * Math.PI) * out;
          pdot(x, y, 1.8, tk.col, a); pdot(x, y, 4.5, tk.col, a * .18);
        }
      });
      ctx.restore();
      // embedding sphere: clustered points on a slowly turning globe
      const ang = t * .00032, ca = Math.cos(ang), sa = Math.sin(ang), tilt = .42, ct = Math.cos(tilt), st = Math.sin(tilt);
      const pts = SPHERE.map(([x, y, z, col]) => {
        const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
        const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
        return [cx + x1 * R, cy + y2 * R, z2, col];
      }).sort((a, b) => a[2] - b[2]);
      for (const [x, y, z, col] of pts) pdot(x, y, 1.1 + 1.5 * (z + 1) / 2, col, .22 + .78 * (z + 1) / 2);
      // tiles drawn on top
      tiles.forEach(tl => {
        rrect(tl.x, tl.y, ts, ts, 7); ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1; ctx.stroke();
        const n = 6, s = ts / (n + 1), cols = [tl.col, PAL.c, PAL.a];
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const u = (i + .5) / n, v = (j + .5) / n;
          if ((u - .5) ** 2 + (v - .5) ** 2 > .23 + .05 * field(u * 2, v * 2, tl.k)) continue;
          const f = [0, 2, 4].map(o => field(u * 2.2 + tl.k, v * 2.2, o + tl.k));
          pdot(tl.x + s * (i + 1), tl.y + s * (j + 1), s * .32, cols[f.indexOf(Math.max(...f))], .8);
        }
      });
      // task glyphs
      tasks.forEach((tk, i) => {
        const a = .25 + .75 * out, h = gs / 2;
        ctx.globalAlpha = a;
        rrect(tk.x - h - 6, tk.y - h - 6, gs + 12, gs + 12, 10); ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
        if (i === 0) { [PAL.d, PAL.a, PAL.c].forEach((c, k) => { ctx.beginPath(); ctx.arc(tk.x, tk.y, h * (1 - k * .3), 0, Math.PI * 2); ctx.fillStyle = c; ctx.globalAlpha = a * (.5 + k * .2); ctx.fill(); }); }
        if (i === 1) { let a0 = -Math.PI / 2; [[PAL.b, .45], [PAL.a, .3], [PAL.c, .25]].forEach(([c, w]) => { const a1 = a0 + w * Math.PI * 2; ctx.beginPath(); ctx.moveTo(tk.x, tk.y); ctx.arc(tk.x, tk.y, h * .9, a0, a1); ctx.closePath(); ctx.fillStyle = c; ctx.globalAlpha = a; ctx.fill(); a0 = a1; }); }
        if (i === 2) { const n = 4, s = gs / n; for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) { ctx.fillStyle = ramp((field(u / n, v / n, 1 + t / 3000) + 1) / 2); ctx.globalAlpha = a; ctx.fillRect(tk.x - h + u * s + .5, tk.y - h + v * s + .5, s - 1, s - 1); } }
        if (i === 3) { const nd = [[0, -.8], [.75, .5], [-.75, .5], [0, .05]]; ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.globalAlpha = a; ctx.beginPath(); nd.slice(0, 3).forEach(([x, y]) => { ctx.moveTo(tk.x, tk.y + .05 * h); ctx.lineTo(tk.x + x * h, tk.y + y * h); }); ctx.moveTo(tk.x, tk.y - .8 * h); ctx.lineTo(tk.x + .75 * h, tk.y + .5 * h); ctx.stroke(); nd.forEach(([x, y], k) => { ctx.beginPath(); ctx.arc(tk.x + x * h, tk.y + y * h, h * .22, 0, Math.PI * 2); ctx.fillStyle = [PAL.c, PAL.a, PAL.d, PAL.b][k]; ctx.fill(); }); }
        ctx.globalAlpha = a;
        ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillText(tk.name, tk.x, tk.y + h + 20);
        ctx.globalAlpha = 1;
      });
      // headers
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"; ctx.fillStyle = "rgba(255,255,255,.42)";
      ctx.textAlign = "left"; ctx.fillText("ATLASES", pad, 20);
      ctx.textAlign = "center"; ctx.fillText("FOUNDATION MODEL", cx, 20);
      ctx.textAlign = "right"; ctx.fillText("TASKS", W - pad, 20);
      ctx.textAlign = "left";
      label(out < 1 ? "pretrain on many tissues" : "pretrain once, reuse across tasks");
    },
    grn(t) {
      // Transcription factors (large) send signals to target genes; one regulon lights up at a time.
      const cx = W / 2, cy = H * .46, R = Math.min(W, H) * .34;
      const tfs = [[-.42, -.28], [.4, -.34], [.02, .3]].map(([x, y]) => [cx + x * R * 1.5, cy + y * R * 1.4]);
      const tg = [];
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + .3, rr = R * (1.02 + .1 * field(i, 2)); tg.push([cx + Math.cos(a) * rr * 1.35, cy + Math.sin(a) * rr * .95]); }
      const E = [];
      tfs.forEach((_, a) => { for (let k = 0; k < 6; k++) E.push([a, (a * 5 + k * 2 + (k > 2 ? 1 : 0)) % 14]); });
      const act = Math.floor(t / 2200) % 3;
      E.forEach(([a, b], k) => {
        const [ax, ay] = tfs[a], [bx, by] = tg[b], on = a === act;
        ctx.strokeStyle = on ? "rgba(199,160,226,.55)" : "rgba(255,255,255,.12)"; ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        if (on) { const q = ((t / 1300) + k * .23) % 1; pdot(ax + (bx - ax) * q, ay + (by - ay) * q, 2.6, PAL.b, Math.sin(q * Math.PI)); }
      });
      const lit = new Set(E.filter(([a]) => a === act).map(([, b]) => b));
      tg.forEach(([x, y], k) => { const on = lit.has(k); pdot(x, y, on ? 6.5 + 1.5 * Math.sin(t / 400 + k) : 5, on ? PAL.d : "rgba(143,208,160,.35)"); });
      tfs.forEach(([x, y], a) => { const on = a === act; pdot(x, y, on ? 22 : 16, PAL.c, on ? .22 : .1); pdot(x, y, 10, PAL.c, on ? 1 : .55); });
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.textAlign = "center";
      tfs.forEach(([x, y]) => ctx.fillText("TF", x, y + 4)); ctx.textAlign = "left";
      label("one transcription factor and its target genes");
    },
    traj(t) {
      // Cells flow along a branching pseudotime path from early to two late states.
      const pad = Math.max(22, W * .07), y0 = H * .44, x0 = pad + 10, xb = W * .46, x1 = W - pad - 10, spread = H * .26;
      const pth = (q, br) => q < .45
        ? [x0 + (xb - x0) * q / .45, y0 + Math.sin(q * 7) * 8]
        : [xb + (x1 - xb) * (q - .45) / .55, y0 + Math.sin(.45 * 7) * 8 + br * spread * ((q - .45) / .55) ** 1.4];
      ctx.lineCap = "round";
      [-1, 1].forEach(br => { ctx.lineWidth = 18; ctx.beginPath(); for (let q = 0; q <= 1.0001; q += .02) { const [x, y] = pth(q, br); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.stroke(); });
      for (let i = 0; i < 70; i++) {
        const q = ((t / 8000) + i / 70) % 1, br = i % 2 ? 1 : -1, [x, y] = pth(q, br);
        const j = field(i, 3) * 8, col = q < .45 ? mix("#8fb8e8", "#8fd0a0", q / .45) : mix("#8fd0a0", br > 0 ? "#f2bd6b" : "#c7a0e2", (q - .45) / .55);
        pdot(x + j * .3, y + j, 3.6, col, .92);
      }
      ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"; ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.textAlign = "left"; ctx.fillText("early", x0 - 6, y0 + 32);
      ctx.textAlign = "right"; ctx.fillText("state A", x1 + 8, y0 - spread - 4); ctx.fillText("state B", x1 + 8, y0 + spread + 34);
      ctx.textAlign = "left";
      // pseudotime axis
      const ay = H - 44; ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1 - 6, ay - 4); ctx.lineTo(x1, ay); ctx.lineTo(x1 - 6, ay + 4); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"; ctx.textAlign = "right"; ctx.fillText("pseudotime", x1, ay - 8); ctx.textAlign = "left";
      label("cells move from early to late states");
    },
    uq(t) {
      const sp = hexSpots(13), r = W / 13 * .26;
      for (const [x, y] of sp) {
        if (!inTissue(x, y)) { dot(x, y, r * .5, PAL.dim); continue; }
        const u = (field(x * 1.4, y * 1.4, 3) + 1) / 2, br = 1 + .12 * Math.sin(t / 500 + x * 9);
        dot(x, y, r * (1 + u * 1.4) * br, "rgba(199,160,226,.18)");
        dot(x, y, r * .8, ramp((field(x, y, 1) + 1) / 2));
      }
      label("prediction with its uncertainty");
    },
    network(t) {
      const N = 16, nodes = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2 + field(i, 1) * .4, rr = .26 + .12 * field(i, 2, 1);
        nodes.push([.5 + Math.cos(a) * rr * (H / W) * 1.3, .5 + Math.sin(a) * rr]);
      }
      const edges = [];
      for (let i = 0; i < N; i++) { edges.push([i, (i + 3) % N]); if (i % 3 === 0) edges.push([i, (i + 7) % N]); }
      ctx.lineWidth = 1;
      for (const [a, b] of edges) { ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.moveTo(nodes[a][0] * W, nodes[a][1] * H); ctx.lineTo(nodes[b][0] * W, nodes[b][1] * H); ctx.stroke(); }
      edges.forEach(([a, b], k) => {
        const q = ((t / 1800) + k * .37) % 1;
        dot(nodes[a][0] + (nodes[b][0] - nodes[a][0]) * q, nodes[a][1] + (nodes[b][1] - nodes[a][1]) * q, 2.4, PAL.b);
      });
      nodes.forEach(([x, y], i) => dot(x, y, 6 + 3 * ((i * 7) % 3), [PAL.a, PAL.c, PAL.d][i % 3]));
      label("signals passing between cells and genes");
    },
  };
  function pdot(x, y, r, col, a = 1) { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, Math.max(r, .5), 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  // Points on a sphere (Fibonacci), coloured by the nearest of four cluster centres.
  const SPHERE = (() => {
    const N = 340, out = [], ga = Math.PI * (3 - Math.sqrt(5));
    const ctr = [[.7, .5, .5, PAL.a], [-.6, .6, -.4, PAL.c], [-.4, -.7, .6, PAL.d], [.5, -.5, -.7, PAL.b]];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i + .5) / N * 2, rr = Math.sqrt(1 - y * y), th = i * ga, x = Math.cos(th) * rr, z = Math.sin(th) * rr;
      let best = ctr[0], bd = -9;
      for (const c of ctr) { const d = (x * c[0] + y * c[1] + z * c[2]) / Math.hypot(c[0], c[1], c[2]); if (d > bd) { bd = d; best = c; } }
      out.push([x, y, z, best[3]]);
    }
    return out;
  })();
  function dot(x, y, r, col, alpha = 1) { ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(x * W, y * H, Math.max(r, .5), 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
  function ring(x, y, r, col) { ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); }
  function label(s) { ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillText(s, 28, H - 14); }

  function frame(now) {
    if (W) {
      ctx.clearRect(0, 0, W, H);
      DRAW[mode](reduced ? 4000 : now - modeStart);
    }
  }
  let raf = 0;
  function loop(now) { frame(now); raf = (visible && !reduced) ? requestAnimationFrame(loop) : 0; }
  function setTask(i, fromUser) {
    current = i;
    const t = C.tasks[i], info = TASK_INFO[t] || ["network", ""];
    mode = info[0]; modeStart = performance.now();
    $("inset-title").textContent = t;
    $("inset-text").textContent = info[1];
    list.querySelectorAll(".ht").forEach(b => b.classList.toggle("on", +b.dataset.i === i));
    if (reduced || !raf) frame(performance.now());
    if (fromUser) lastUser = performance.now();
  }
  let lastUser = 0;
  list.addEventListener("pointerover", e => { const b = e.target.closest(".ht"); if (b) { hover = true; setTask(+b.dataset.i, true); } });
  list.addEventListener("pointerleave", () => { hover = false; });
  list.addEventListener("focusin", e => { const b = e.target.closest(".ht"); if (b) setTask(+b.dataset.i, true); });
  // Auto-advance through the tasks while idle.
  if (!reduced) setInterval(() => {
    if (!visible || hover || document.hidden || performance.now() - lastUser < 6000) return;
    setTask((current + 1) % C.tasks.length, false);
  }, 4800);
  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible && !raf && !reduced) raf = requestAnimationFrame(loop);
  }).observe(canvas);
  new ResizeObserver(() => { resize(); frame(performance.now()); }).observe(canvas);
  resize();
  setTask(1, false);
  if (!reduced) raf = requestAnimationFrame(loop);
  requestAnimationFrame(() => document.documentElement.classList.add("hero-in"));

  // ---------------- Timeline ----------------
  const tl = $("tl-chart");
  const tip = document.createElement("div");
  tip.className = "tl-tip"; tip.hidden = true; tl.appendChild(tip);
  const yrs = C.data.map(m => m.year).filter(Boolean);
  const Y0 = Math.min(...yrs), Y1 = Math.max(...yrs);
  const years = []; for (let y = Y0; y <= Y1; y++) years.push(y);
  const PORDER = { stat: 0, hyb: 1, dl: 2 };

  function drawTimeline() {
    const width = tl.clientWidth;
    if (!width) return;
    const narrow = width < 700;
    const labelW = narrow ? 0 : 300, padR = 8, cellW = (width - labelW - padR) / years.length;
    const gap = narrow ? 9 : 15, r = narrow ? 3.4 : 5.6;
    const perRow = Math.max(1, Math.floor((cellW - 4) / gap));
    let y = 0, svg = "", pts = [];
    const rowTop = [];
    C.tasks.forEach((task, ti) => {
      const ms = C.data.filter(m => m.categories.includes(task) && m.year);
      const byYear = years.map(yr => ms.filter(m => m.year === yr).sort((a, b) => PORDER[C.paradigmClass[a.paradigm]] - PORDER[C.paradigmClass[b.paradigm]]));
      const stack = Math.max(1, ...byYear.map(l => Math.ceil(l.length / perRow)));
      const labelH = narrow ? 20 : 0;
      const h = Math.max(narrow ? 18 : 40, stack * gap + 16) + labelH;
      rowTop.push(y);
      svg += `<line class="tl-rule" x1="0" x2="${width}" y1="${y + h}" y2="${y + h}"/>`;
      svg += narrow
        ? `<text class="tl-cat" x="0" y="${y + 14}">${esc(task)} <tspan class="tl-catn">${ms.length}</tspan></text>`
        : `<text class="tl-cat" x="0" y="${y + h / 2 + 4}">${esc(task)}<tspan class="tl-catn" dx="8">${ms.length}</tspan></text>`;
      byYear.forEach((l, yi) => l.forEach((m, k) => {
        const col = k % perRow, row = Math.floor(k / perRow);
        const n = Math.min(perRow, l.length - row * perRow);
        const cx = labelW + yi * cellW + cellW / 2 + (col - (n - 1) / 2) * gap;
        const cy = y + labelH + (h - labelH) / 2 + (row - (stack - 1) / 2) * gap;
        pts.push(`<circle class="tl-pt p-${C.paradigmClass[m.paradigm] || "x"}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" tabindex="0" role="button"
          data-id="${esc(m.id)}" data-yi="${yi}" style="--yi:${yi}" aria-label="${esc(m.method)}, ${m.year}, ${esc(m.paradigm)}. Open in catalog."></circle>`);
      }));
      y += h;
    });
    const axisY = y + 22;
    const ticks = years.map((yr, yi) => `<text class="tl-year" x="${labelW + yi * cellW + cellW / 2}" y="${axisY}" text-anchor="middle">${narrow ? "’" + String(yr).slice(2) : yr}</text>`).join("");
    const cols = years.map((yr, yi) => yi % 2 ? "" : `<rect class="tl-band" x="${labelW + yi * cellW}" y="0" width="${cellW}" height="${y}"/>`).join("");
    tl.querySelector("svg")?.remove();
    tl.insertAdjacentHTML("afterbegin", `<svg width="${width}" height="${axisY + 8}" viewBox="0 0 ${width} ${axisY + 8}" role="group" aria-label="Methods by year and task">${cols}${svg}${pts.join("")}${ticks}</svg>`);
  }

  // Data-derived note: the shift in paradigm over time.
  (() => {
    const share = list => list.length ? Math.round(100 * list.filter(m => m.paradigm !== "Statistical / classical ML").length / list.length) : 0;
    const early = C.data.filter(m => m.year && m.year <= 2021), late = C.data.filter(m => m.year && m.year >= 2024);
    $("tl-note").textContent = `${share(early)}% of catalogued methods published up to 2021 use deep learning (alone or hybrid); for methods published since 2024 it is ${share(late)}%. Years follow the cited publication.`;
  })();

  function showTip(el) {
    const m = C.data.find(x => x.id === el.dataset.id);
    if (!m) return;
    tip.innerHTML = `<b>${esc(m.method)}</b><span>${esc(m.first_author)} ${m.year} · ${esc(m.paradigm)}</span><span>${esc(m.task)}</span>`;
    tip.hidden = false;
    const box = tl.getBoundingClientRect(), r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left - box.left + r.width / 2, 110), box.width - 110);
    tip.style.left = x + "px"; tip.style.top = (r.top - box.top - 10) + "px";
  }
  tl.addEventListener("pointerover", e => { const c = e.target.closest(".tl-pt"); if (c) showTip(c); });
  tl.addEventListener("pointerout", e => { if (e.target.closest(".tl-pt")) tip.hidden = true; });
  tl.addEventListener("focusin", e => { const c = e.target.closest(".tl-pt"); if (c) showTip(c); });
  tl.addEventListener("focusout", () => { tip.hidden = true; });
  tl.addEventListener("click", e => { const c = e.target.closest(".tl-pt"); if (c) C.openMethod(c.dataset.id); });
  tl.addEventListener("keydown", e => { const c = e.target.closest(".tl-pt"); if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); C.openMethod(c.dataset.id); } });

  new ResizeObserver(() => drawTimeline()).observe(tl);
  drawTimeline();
  new IntersectionObserver((es, ob) => {
    if (es[0].isIntersecting) { $("timeline").classList.add("tl-in"); ob.disconnect(); }
  }, { threshold: .25 }).observe($("timeline"));
})();
