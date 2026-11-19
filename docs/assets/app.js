/* Spatial Omics Methods Catalog: "I have" selection guide, task chart filter, table. */
(() => {
  "use strict";

  // ---- Site configuration: fill in on release ----
  const CONFIG = {
    repoUrl: "https://github.com/liranmao/spatial-omics-methods-catalog",
    archiveDoi: "",  // e.g. "10.5281/zenodo.1234567"
    paperDoi: "",    // AOAS DOI once published
  };

  // Edition (set in <head> from the URL): the paper edition keeps only methods discussed in the review.
  const ALL = (window.CATALOG && window.CATALOG.methods) || [];
  const CATALOG_ASOF = (window.CATALOG && window.CATALOG.citations_as_of) || "";
  const EDITION = document.documentElement.dataset.edition === "living" ? "living" : "review";
  // Keep an explicit ?edition= (local previews) in the URL when filters change.
  const EDITION_PARAM = new URLSearchParams(location.search).get("edition") || "";
  const DATA = EDITION === "review" ? ALL.filter(m => m.source === "review") : ALL;

  // Input requirements (tags come from build_site.py). The first seven get matrix columns.
  const REQS = [
    { tag: "ST expression", short: "ST", label: "ST expression counts" },
    { tag: "Spatial coordinates / graph", short: "XY", label: "Spatial coordinates" },
    { tag: "H&E image", short: "H&E", label: "H&E image" },
    { tag: "scRNA-seq reference", short: "scRNA", label: "scRNA-seq reference" },
    { tag: "Multi-omics (ATAC / protein)", short: "Omics", label: "Other omics (ATAC, protein)" },
    { tag: "Multiple slices / samples", short: "Slices", label: "Multiple slices or samples" },
    { tag: "Annotations / covariates", short: "Labels", label: "Cell labels or covariates" },
    { tag: "Clinical outcomes", label: "Clinical outcomes" },
    { tag: "Expression / perturbation (non-spatial)", label: "Perturbation data" },
  ];
  const COLS = REQS.filter(r => r.short);
  const LABEL = Object.fromEntries(REQS.map(r => [r.tag, r.label]));
  const PARADIGMS = [
    { key: "Statistical / classical ML", short: "Statistical", cls: "stat" },
    { key: "Hybrid", short: "Hybrid", cls: "hyb" },
    { key: "Deep learning", short: "Deep learning", cls: "dl" },
  ];
  const PCLS = Object.fromEntries(PARADIGMS.map(p => [p.key, p.cls]));
  const TASKS = [...new Set([...DATA.map(m => m.categories[0]), ...DATA.flatMap(m => m.categories)])];
  DATA.forEach((m, i) => {
    m._i = i;
    m._hay = [m.method, m.task, m.subtype, m.input, m.core_method, m.title, m.first_author, m.journal,
      m.categories.join(" "), m.model_tags.join(" "), m.year].join(" ").toLowerCase();
  });

  const state = { have: new Set(), task: "", paradigm: "", lang: "", model: "", q: "", sort: "", open: new Set() };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const terms = () => state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  function hl(text) {
    const t = terms();
    const out = esc(text);
    if (!t.length) return out;
    const re = new RegExp("(" + t.map(x => esc(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return out.replace(re, "<mark>$1</mark>");
  }

  // ---- Filtering
  const missing = m => m.input_tags.filter(t => !state.have.has(t));
  function passes(m, skip = "") {
    const t = terms();
    if (t.length && !t.every(x => m._hay.includes(x))) return false;
    if (skip !== "task" && state.task && !m.categories.includes(state.task)) return false;
    if (skip !== "paradigm" && state.paradigm && m.paradigm !== state.paradigm) return false;
    if (skip !== "lang" && state.lang && !m.languages.includes(state.lang)) return false;
    if (skip !== "model" && state.model && !m.model_tags.includes(state.model)) return false;
    return true;
  }

  // ---- Controls
  function renderHave() {
    if (!$("have")) return; // "I have" filter removed from the page
    const counts = new Map();
    DATA.forEach(m => m.input_tags.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    $("have").innerHTML = REQS.filter(r => counts.has(r.tag)).map(r =>
      `<button type="button" class="toggle" data-have="${esc(r.tag)}" aria-pressed="${state.have.has(r.tag)}">` +
      `<span class="box" aria-hidden="true"></span>${esc(r.label)}</button>`).join("");
    $("have-hint").textContent = state.have.size
      ? "Methods you can run with this data come first; the rest show what is missing."
      : "Select the data you hold. Methods you can run come first.";
  }

  function renderTasks() {
    const pool = DATA.filter(m => passes(m, "task"));
    const max = Math.max(...TASKS.map(c => DATA.filter(m => m.categories.includes(c)).length));
    const row = (key, label, list, isAll) => {
      const by = cls => list.filter(m => PCLS[m.paradigm] === cls).length;
      const runnable = list.filter(m => !missing(m).length).length;
      const cnt = state.have.size ? `${runnable}<span class="muted">/${list.length}</span>` : list.length;
      const scale = isAll ? DATA.length : max;
      const segs = ["stat", "hyb", "dl"].map(c => `<span class="b-${c}" style="width:${(by(c) / scale) * 100}%"></span>`).join("");
      const on = isAll ? !state.task : state.task === key;
      return `<button type="button" class="trow${isAll ? " all" : ""}" data-task="${esc(key)}" aria-pressed="${on}" ${!list.length && !on ? "disabled" : ""}
        aria-label="${esc(label)}: ${list.length} methods${state.have.size ? `, ${runnable} runnable with your data` : ""}">
        <span class="lbl">${esc(label)}</span><span class="bar" aria-hidden="true">${segs}</span><span class="cnt">${cnt}</span></button>`;
    };
    $("tasks-summary").innerHTML = state.task ? `Task: ${esc(state.task)}` : `All tasks <span class="muted">(${pool.length})</span>`;
    $("tasks").innerHTML = row("", "All tasks", pool, true) +
      TASKS.map(c => row(c, c, pool.filter(m => m.categories.includes(c)), false)).join("");
  }

  function renderToolbar() {
    const pool = DATA.filter(m => passes(m, "paradigm"));
    $("paradigm").innerHTML = [{ key: "", short: "All" }, ...PARADIGMS].map(p => {
      const n = p.key ? pool.filter(m => m.paradigm === p.key).length : pool.length;
      return `<button type="button" data-paradigm="${esc(p.key)}" aria-pressed="${state.paradigm === p.key}" title="${n} methods">` +
        `${esc(p.short)}</button>`;
    }).join("");
    $("reset").hidden = !(state.have.size || state.task || state.paradigm || state.lang || state.model || state.q);
  }

  function fillSelects() {
    const freq = get => {
      const c = new Map();
      DATA.forEach(m => get(m).forEach(v => c.set(v, (c.get(v) || 0) + 1)));
      return [...c].sort((a, b) => b[1] - a[1]);
    };
    $("lang").insertAdjacentHTML("beforeend", freq(m => m.languages).map(([v, n]) => `<option value="${esc(v)}">${esc(v)} (${n})</option>`).join(""));
    $("model").insertAdjacentHTML("beforeend", freq(m => m.model_tags).map(([v, n]) => `<option value="${esc(v)}">${esc(v)} (${n})</option>`).join(""));
    $("req-labels").insertAdjacentHTML("beforeend",
      COLS.map(c => `<th scope="col" class="rq" data-rq="${esc(c.tag)}"><abbr title="${esc(c.label)}">${esc(c.short)}</abbr></th>`).join("") +
      `<th></th><th class="cite-h"></th><th></th>`);
  }

  // ---- Table
  function refLine(m) {
    if (!m.year) return `<div class="mref">Citation pending</div>`;
    return `<div class="mref">${esc(m.first_author)} ${m.year}${m.journal ? `, <i>${esc(m.journal)}</i>` : ""}<span class="lg"> · ${esc(m.languages.join(", "))}${m.citations != null ? ` · ${fmtN(m.citations)} citations` : ""}</span></div>`;
  }
  function row(m) {
    const miss = state.have.size ? missing(m) : [];
    const dots = COLS.map(c => {
      const need = m.input_tags.includes(c.tag);
      const cls = !need ? "no" : !state.have.size ? "need" : state.have.has(c.tag) ? "met" : "lack";
      const word = !need ? "not required" : cls === "lack" ? "required, missing" : "required";
      return `<td class="req"><span class="dot ${cls}" role="img" aria-label="${esc(c.label)}: ${word}"></span></td>`;
    }).join("");
    const reqsM = m.input_tags.map(t => `<span class="chip-r"><span class="dot ${state.have.size && !state.have.has(t) ? "lack" : "need"}" aria-hidden="true"></span>${esc(LABEL[t] || t)}</span>`).join("");
    const open = state.open.has(m.id);
    const paper = m.paper_url ? `<a href="${esc(m.paper_url)}" target="_blank" rel="noopener">Paper<svg aria-hidden="true"><use href="#i-ext"/></svg></a>` : "";
    const code = m.code_url ? `<a href="${esc(m.code_url)}" target="_blank" rel="noopener">Code<svg aria-hidden="true"><use href="#i-ext"/></svg></a>` : "";
    let html = `<tr class="m-row${miss.length ? " dim" : ""}${open ? " open" : ""}" style="view-transition-name:m-${esc(m.id)}">
      <td class="m"><button type="button" class="mname" aria-expanded="${open}" aria-controls="d-${esc(m.id)}" data-open="${esc(m.id)}">${hl(m.method)}<svg aria-hidden="true"><use href="#i-chev"/></svg></button>${m.source === "added" ? `<span class="badge-new" title="Added after the review${m.added_on ? ` (${esc(m.added_on)})` : ""}">New</span>` : ""}${refLine(m)}
        ${miss.length ? `<span class="missing-note">Needs ${esc(miss.map(t => (LABEL[t] || t).replace(/^([A-Z])(?=[a-z])/, c => c.toLowerCase())).join(", "))}</span>` : ""}</td>
      <td class="task">${m.subtype ? `<span class="sub">${hl(m.subtype)}</span>` : ""}${hl(m.task)}</td>
      <td class="core"><span class="ct"><span class="pd p-${PCLS[m.paradigm] || "x"}" title="${esc(m.paradigm)}"></span>${hl(m.core_method)}</span></td>
      ${dots}
      <td class="reqs-m">${reqsM}</td>
      <td class="yr">${m.year || "–"}<span class="sub">${esc(m.languages.join(", "))}</span>${m.citations != null ? `<span class="sub cite-sub">${fmtN(m.citations)} cited</span>` : ""}</td>
      <td class="cite">${m.citations != null ? fmtN(m.citations) : "–"}</td>
      <td class="links">${paper}${code}${!paper && !code ? `<span class="none">–</span>` : ""}</td>
    </tr>`;
    if (open) {
      html += `<tr class="detail" id="d-${esc(m.id)}"><td colspan="13"><dl class="detail-body">
        <div class="wide"><dt>Paper</dt><dd>${m.title ? esc(m.title) : "Citation pending"}${m.journal ? `. <i>${esc(m.journal)}</i>` : ""}${m.year ? `, ${m.year}` : ""}.
          ${m.doi ? ` <a href="https://doi.org/${esc(m.doi)}" target="_blank" rel="noopener">doi:${esc(m.doi)}</a>` : ""}</dd></div>
        <div><dt>Input (as published)</dt><dd>${esc(m.input)}</dd></div>
        <div><dt>Cited by</dt><dd>${m.citations != null ? `${fmtN(m.citations)}${CATALOG_ASOF ? ` (as of ${esc(CATALOG_ASOF)})` : ""}` : "Not available"}</dd></div>
        <div><dt>Model family</dt><dd>${esc(m.paradigm)}${m.model_tags.length ? `: ${esc(m.model_tags.join(", "))}` : ""}</dd></div>
        <div><dt>Listed under</dt><dd>${esc(m.categories.join("; "))} · ${esc(m.language)}</dd></div>
        <div><dt>Source</dt><dd>${m.source === "review" ? "Discussed in the review" : `Added after the review${m.added_on ? ` on ${esc(m.added_on)}` : ""}`}</dd></div>
      </dl></td></tr>`;
    }
    return html;
  }

  const fmtN = n => Number(n).toLocaleString("en-US");
  function sorted(list) {
    const s = [...list];
    const [key, dir] = (state.sort || "").split("-");
    if (key === "method") s.sort((a, b) => a.method.localeCompare(b.method, undefined, { sensitivity: "base" }) * (dir === "desc" ? -1 : 1));
    else if (key === "citations") s.sort((a, b) => (a.citations == null) - (b.citations == null) || ((a.citations ?? 0) - (b.citations ?? 0)) * (dir === "asc" ? 1 : -1) || a._i - b._i);
    else if (key === "year") s.sort((a, b) => ((a.year || 0) - (b.year || 0)) * (dir === "asc" ? 1 : -1) || a._i - b._i);
    else s.sort((a, b) => a._i - b._i);
    return s;
  }
  const grp = (title, n, cls = "") => `<tr class="grp ${cls}"><td colspan="13"><h3>${esc(title)}<span class="gn">${n}</span></h3></td></tr>`;

  function renderTable() {
    const hits = DATA.filter(m => passes(m));
    let html = "";
    if (state.have.size) {
      const ok = sorted(hits.filter(m => !missing(m).length));
      const no = sorted(hits.filter(m => missing(m).length)).sort((a, b) => state.sort ? 0 : missing(a).length - missing(b).length);
      if (ok.length) html += grp("Runnable with your data", ok.length) + ok.map(row).join("");
      if (no.length) html += grp("Needs data you don’t have", no.length, "missing") + no.map(row).join("");
      $("status").innerHTML = `<b>${ok.length}</b> of ${plural(hits.length, "matching method")} can run with your data.`;
    } else if (!state.sort && !state.task) {
      for (const c of TASKS) {
        const g = hits.filter(m => m.categories[0] === c || (m.categories.includes(c) && m.categories[0] !== c));
        if (g.length) html += grp(c, g.length) + g.map(row).join("");
      }
      $("status").innerHTML = hits.length === DATA.length ? `Showing all <b>${DATA.length}</b> methods.` : `Showing <b>${hits.length}</b> of ${DATA.length} methods.`;
    } else {
      html = sorted(hits).map(row).join("");
      $("status").innerHTML = `Showing <b>${hits.length}</b> of ${DATA.length} methods${state.task ? ` in ${esc(state.task.toLowerCase())}` : ""}.`;
    }
    $("rows").innerHTML = html;
    $("grid").hidden = !hits.length;
    $("empty").hidden = !!hits.length;
    if (!hits.length) renderEmpty();
    document.querySelectorAll("#req-labels .rq").forEach(th => th.classList.toggle("have-on", state.have.has(th.dataset.rq)));
    document.querySelectorAll("th[aria-sort]").forEach(th => {
      const [key, dir] = (state.sort || "").split("-");
      const k = [...th.querySelectorAll(".sortbtn")].map(b => b.dataset.sort).find(s => s === key) || th.querySelector(".sortbtn").dataset.sort;
      th.setAttribute("aria-sort", key === k ? (dir === "asc" ? "ascending" : "descending") : "none");
      th.querySelectorAll(".sortbtn").forEach(b => b.classList.toggle("on", b.dataset.sort === key));
    });
  }

  // Empty state names the filter that is blocking results and what removing it would show.
  function renderEmpty() {
    const opts = [
      ["q", state.q && `search “${state.q}”`],
      ["task", state.task && `task “${state.task}”`],
      ["paradigm", state.paradigm && `“${state.paradigm}”`],
      ["lang", state.lang && `language ${state.lang}`],
      ["model", state.model && `model family “${state.model}”`],
    ].filter(o => o[1]).map(([k, label]) => {
      const saved = state[k]; state[k] = "";
      const n = DATA.filter(m => passes(m)).length; state[k] = saved;
      return { k, label, n };
    }).filter(o => o.n).sort((a, b) => b.n - a.n);
    $("empty-why").innerHTML = opts.length
      ? opts.slice(0, 3).map(o => `<button type="button" data-drop="${o.k}">Remove ${esc(o.label)}</button> (${plural(o.n, "method")})`).join(" · ")
      : `<button type="button" data-drop="all">Clear all filters</button>`;
  }

  function render(animate = false) {
    const run = () => { renderHave(); renderTasks(); renderToolbar(); renderTable(); writeUrl(); };
    if (animate && document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) { const vt = document.startViewTransition(run); [vt.ready, vt.finished, vt.updateCallbackDone].forEach(p => p.catch(() => {})); }
    else run();
  }

  // ---- URL state
  function writeUrl() {
    const p = new URLSearchParams();
    state.have.forEach(v => p.append("have", v));
    if (EDITION_PARAM) p.set("edition", EDITION_PARAM);
    for (const k of ["task", "paradigm", "lang", "model", "q", "sort"]) if (state[k]) p.set(k, state[k]);
    const qs = p.toString();
    try { history.replaceState(null, "", (qs ? `?${qs}` : location.pathname) + location.hash); } catch (_) { /* file:// */ }
  }
  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.have = new Set();
    for (const k of ["task", "paradigm", "lang", "model", "q", "sort"]) state[k] = p.get(k) || "";
    $("q").value = state.q; $("lang").value = state.lang; $("model").value = state.model;
  }
  function clearAll() {
    state.have.clear(); state.task = state.paradigm = state.lang = state.model = state.q = "";
    $("q").value = ""; $("lang").value = ""; $("model").value = "";
    render(true);
  }

  // ---- Events
  document.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.have !== undefined) { const t = b.dataset.have; state.have.has(t) ? state.have.delete(t) : state.have.add(t); render(true); }
    else if (b.dataset.task !== undefined) { state.task = state.task === b.dataset.task ? "" : b.dataset.task; render(true); }
    else if (b.dataset.paradigm !== undefined) { state.paradigm = b.dataset.paradigm; render(true); }
    else if (b.dataset.open !== undefined) { const id = b.dataset.open; state.open.has(id) ? state.open.delete(id) : state.open.add(id); renderTable(); document.querySelector(`[data-open="${CSS.escape(id)}"]`)?.focus(); }
    else if (b.dataset.sort !== undefined) {
      const k = b.dataset.sort, [key, dir] = state.sort.split("-");
      const first = k === "year" || k === "citations" ? "desc" : "asc", second = first === "asc" ? "desc" : "asc";
      state.sort = key !== k ? `${k}-${first}` : dir === first ? `${k}-${second}` : "";
      render(true);
    }
    else if (b.dataset.drop) {
      if (b.dataset.drop === "all") return clearAll();
      state[b.dataset.drop] = "";
      if (b.dataset.drop === "q") $("q").value = "";
      if (b.dataset.drop === "lang") $("lang").value = "";
      if (b.dataset.drop === "model") $("model").value = "";
      render(true);
    }
  });
  let timer;
  $("q").addEventListener("input", e => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120); });
  $("lang").addEventListener("change", e => { state.lang = e.target.value; render(true); });
  $("model").addEventListener("change", e => { state.model = e.target.value; render(true); });
  $("reset").addEventListener("click", clearAll);
  $("copy-cite").addEventListener("click", async e => {
    const btn = e.currentTarget;
    try { const c = $("citation").cloneNode(true); c.querySelectorAll("sup").forEach(x => x.remove()); await navigator.clipboard.writeText(c.textContent.replace(/\s+/g, " ").trim()); btn.textContent = "Copied"; }
    catch (_) { btn.textContent = "Copy failed: select the text"; }
    setTimeout(() => { btn.textContent = "Copy citation"; }, 2000);
  });

  // ---- Static text and release config
  const nReview = ALL.filter(m => m.source === "review").length, nAdded = ALL.length - nReview;
  document.querySelectorAll(".n-total").forEach(el => { el.textContent = DATA.length; });
  document.querySelectorAll(".n-review").forEach(el => { el.textContent = nReview; });
  document.querySelectorAll(".n-all").forEach(el => { el.textContent = ALL.length; });
  document.querySelectorAll(".n-added").forEach(el => { el.textContent = nAdded; });
  document.querySelectorAll(".n-added-wrap").forEach(el => { el.hidden = !nAdded; });
  document.querySelectorAll(".edition a").forEach(a => {
    if (a.dataset.ed === EDITION) a.setAttribute("aria-current", "page");
    a.querySelector(".edn")?.remove();
    a.insertAdjacentHTML("beforeend", ` <span class="edn">${a.dataset.ed === "review" ? nReview : ALL.length}</span>`);
  });
  $("updated").textContent = (window.CATALOG && window.CATALOG.updated) || "";
  if (CATALOG_ASOF && $("cites-asof")) $("cites-asof").textContent = `, as of ${CATALOG_ASOF}`;
  if (CONFIG.repoUrl) {
    const issue = CONFIG.repoUrl.replace(/\/$/, "") + "/issues/new";
    $("suggest").href = issue; $("suggest").removeAttribute("aria-disabled"); $("suggest").target = "_blank";
    $("suggest-top").href = issue; $("suggest-note").remove();
  }
  if (CONFIG.archiveDoi) $("archive").innerHTML = `Archived snapshot: <a href="https://doi.org/${esc(CONFIG.archiveDoi)}">doi:${esc(CONFIG.archiveDoi)}</a>`;
  if (CONFIG.paperDoi) { const pl = $("paper-link"); if (pl) { pl.href = `https://doi.org/${CONFIG.paperDoi}`; pl.target = "_blank"; pl.rel = "noopener"; } }
  if (CONFIG.paperDoi) $("citation").insertAdjacentHTML("beforeend", ` <a href="https://doi.org/${esc(CONFIG.paperDoi)}">doi:${esc(CONFIG.paperDoi)}</a>`);
  $("suggest").addEventListener("click", e => { if ($("suggest").getAttribute("aria-disabled") === "true") e.preventDefault(); });

  // Edition links (top bar, nav switch, About). On the live site the paper edition is the root and the living edition
  // is /dev/; on a local preview the same page switches with ?edition=. Filters and scroll position carry over.
  const LOCAL = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const BASE = location.pathname.replace(/index\.html$/, "").replace(/dev\/$/, "");
  const editionUrl = ed => {
    const p = new URLSearchParams(location.search);
    p.delete("edition");
    if (LOCAL) p.set("edition", ed);
    const qs = p.toString();
    return (LOCAL ? location.pathname : BASE + (ed === "living" ? "dev/" : "")) + (qs ? `?${qs}` : "");
  };
  document.querySelectorAll("a[data-ed]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      if (a.dataset.ed === EDITION) return;
      try { sessionStorage.setItem("edition-scroll", String(scrollY)); } catch (_) { /* storage blocked */ }
      location.href = editionUrl(a.dataset.ed);
    });
  });
  document.title = EDITION === "living" ? "Spatial Omics Methods Catalog · Living edition" : "Spatial Omics Methods Catalog · Paper edition";

  fillSelects();
  readUrl();
  const phone = matchMedia("(max-width: 820px)");
  const syncTasks = () => { $("tasks-d").open = !phone.matches; };
  syncTasks(); phone.addEventListener("change", syncTasks);
  render();
  // Hooks for the hero and timeline screens
  window.Catalog = {
    data: DATA, tasks: TASKS, paradigmClass: PCLS,
    setTask(task) {
      state.task = task || "";
      render();
      $("start").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    openMethod(id) {
      const m = DATA.find(x => x.id === id);
      if (!m) return;
      if (!passes(m)) { state.task = state.paradigm = state.lang = state.model = state.q = ""; $("q").value = $("lang").value = $("model").value = ""; }
      state.open.add(id);
      render();
      const btn = document.querySelector(`[data-open="${CSS.escape(id)}"]`);
      if (btn) { btn.closest("tr").scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); btn.focus({ preventScroll: true }); }
    },
  };
  try {
    const y = sessionStorage.getItem("edition-scroll");
    if (y !== null) {
      sessionStorage.removeItem("edition-scroll");
      const go = () => scrollTo({ top: +y, behavior: "instant" });
      go(); addEventListener("load", () => { go(); setTimeout(go, 60); }, { once: true });
    }
  } catch (_) { /* storage blocked */ }
  const h1 = document.querySelector(".grid thead tr:first-child");
  if (h1) document.documentElement.style.setProperty("--h1", h1.getBoundingClientRect().height + "px");
})();
