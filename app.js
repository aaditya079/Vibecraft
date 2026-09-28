// ═════════════ ENGINE ═════════════
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = s => parseYmd(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const LEAVE = { skip: "Skip", medical: "Medical leave", od: "On-Duty (OD)" };
// OD = counted present. Skip / Medical = counted absent (medical may be condoned later by HOD).

function sessions(sec, from, to, holidays) {
  const hol = new Set(holidays.map(h => h.date));
  const out = [];
  for (let d = parseYmd(from); d <= parseYmd(to); d.setDate(d.getDate() + 1)) {
    const row = sec.grid[DAYS[d.getDay()]], key = ymd(d);
    if (!row || hol.has(key)) continue;
    row.forEach((s, i) => { if (s) out.push({ date: key, period: i + 1, subj: s, end: sec.periods[i][1] }); });
  }
  return out;
}
const isPast = (c, now) => new Date(`${c.date}T${c.end}:00`) <= now;
const EPS = 1e-9; // attended can be fractional in % mode (e.g. 80% of 3 hrs = 2.4) so the shown % equals what the student typed
const need = (A, H, R, t) => Math.max(0, Math.ceil((t * (H + R) - 100 * A) / 100 - EPS));
const pct = (A, H) => (H ? (A / H) * 100 : 100);

function analyse({ sec, now, planDate, holidays, inputs, leaves }) {
  const all = sessions(sec, SEMESTER.start, SEMESTER.end, holidays);
  const past = all.filter(c => isPast(c, now)), future = all.filter(c => !isPast(c, now));
  const res = {};
  for (const k of Object.keys(sec.subjects)) {
    const heldTT = past.filter(c => c.subj === k).length;
    const inp = inputs[k] || {};
    const exact = inp.mode === "exact";
    const entered = exact ? inp.att !== "" && inp.att != null : inp.pct !== "" && inp.pct != null;
    const H = exact && inp.held !== "" && inp.held != null ? +inp.held : heldTT;
    let A = Math.max(0, Math.min(H, exact ? Math.floor(+(inp.att || 0)) : (Math.min(100, Math.max(0, +inp.pct || 0)) / 100) * H));
    // OD simulator: past OD days are credited back as present
    const odPast = past.filter(c => c.subj === k && leaves[c.date] === "od").length;
    const A0 = A; A = Math.min(H, A + odPast);
    const fut = future.filter(c => c.subj === k);
    const futP = fut.filter(c => c.date <= planDate);
    const R = futP.length, RS = fut.length;
    const cur = pct(A, H);
    const maxPct = pct(A + RS, H + RS);
    const streak = t => (cur >= t - EPS ? 0 : Math.ceil((t * H - 100 * A) / (100 - t) - EPS));
    const s75 = streak(75), s90 = streak(90);
    const reach = n => (n === 0 ? null : fut[n - 1] ? fut[n - 1].date : "never");
    const absent = c => leaves[c.date] === "skip" || leaves[c.date] === "medical";
    const missP = futP.filter(absent).length, missS = fut.filter(absent).length;
    const odFut = fut.filter(c => leaves[c.date] === "od").length;
    res[k] = { k, entered, H, A, A0, odPast, odFut, heldTT, cur, R, RS, fut,
      n75: need(A, H, R, 75), n90: need(A, H, R, 90), maxPct, irreversible: maxPct < 75,
      s75, s90, reach75: reach(s75), reach90: reach(s90),
      bunk: cur >= 75 - EPS ? Math.floor((100 * A - 75 * H) / 75 + EPS) : 0,
      missP, missS, projPlan: pct(A + R - missP, H + R), projEnd: pct(A + RS - missS, H + RS) };
  }
  const rs = Object.values(res).filter(r => r.entered), sum = f => rs.reduce((a, r) => a + f(r), 0);
  const H = sum(r => r.H), A = sum(r => r.A), R = sum(r => r.R), RS = sum(r => r.RS);
  // overall projection timeline (for the line chart)
  const byDate = {};
  future.forEach(c => (byDate[c.date] ||= []).push(c));
  let a1 = A, a2 = A, h = H; const line = [{ date: ymd(now), all: pct(A, H), plan: pct(A, H) }];
  for (const d of Object.keys(byDate).sort()) {
    const n = byDate[d].length, lv = leaves[d];
    h += n; a1 += n; a2 += lv === "skip" || lv === "medical" ? 0 : n;
    line.push({ date: d, all: pct(a1, h), plan: pct(a2, h) });
  }
  return { res, overall: { H, A, R, RS, cur: pct(A, H), projEnd: pct(A + RS - sum(r => r.missS), H + RS),
    missS: sum(r => r.missS) }, future, all, past, line };
}

// ═════════════ STATE ═════════════
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem("vc_" + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("vc_" + k, JSON.stringify(v)); } catch {} } };
const S = {
  secId: store.get("sec", "II-BME"),
  planDate: store.get("plan", SEMESTER.end),
  holidays: store.get("hol", DEFAULT_HOLIDAYS),
  inputs: store.get("inp", {}),
  leaves: (x => (Array.isArray(x) ? Object.fromEntries(x.map(d => [d, "skip"])) : x))(store.get("lv", {})),
  nowOverride: store.get("now", ""),
};
const save = () => { store.set("sec", S.secId); store.set("plan", S.planDate); store.set("hol", S.holidays);
  store.set("inp", S.inputs); store.set("lv", S.leaves); store.set("now", S.nowOverride); };
const sec = () => SECTIONS.find(s => s.id === S.secId);
// All times are college time (IST, UTC+5:30) whatever timezone the viewer's device is set to.
const istNow = () => { const d = new Date(); return new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60000); };
const now = () => (S.nowOverride ? new Date(S.nowOverride) : istNow());
const secInputs = () => (S.inputs[S.secId] ||= {});
const run = (leaves = S.leaves) => analyse({ sec: sec(), now: now(), planDate: S.planDate, holidays: S.holidays, inputs: secInputs(), leaves });

// ═════════════ UI ═════════════
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hrs = x => (Math.abs(x - Math.round(x)) < 1e-6 ? String(Math.round(x)) : "~" + Math.round(x));
const p1 = x => (Math.round(x * 10) / 10).toFixed(1);
const short = n => n.replace(/\(.*?\)/g, "").split(/\s+/).filter(w => w.length > 2 && !/^(and|for|the|its)$/i.test(w)).map(w => w[0]).join("").toUpperCase().slice(0, 5);
const col = p => (p < 75 ? "var(--red)" : p < 90 ? "var(--amber)" : "var(--green)");
function status(r) {
  if (r.irreversible) return ["irr", "Irreversible detention"];
  if (r.cur < 75) return ["bad", "Detention zone"];
  if (r.cur < 90) return ["ok", "Safe"];
  return ["top", "90%+"];
}

function renderSectionPicker() {
  const groups = {};
  SECTIONS.forEach(s => (groups[s.year] ||= []).push(s));
  $("#section").innerHTML = Object.entries(groups).map(([y, list]) =>
    `<optgroup label="${y}">${list.map(s => `<option value="${s.id}" ${s.id === S.secId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</optgroup>`).join("");
}

function renderInputs() {
  const s = sec(), inp = secInputs(), a = run();
  $("#secinfo").textContent = `${s.semester} · Venue ${s.venue} · ${Object.keys(s.subjects).length} courses`;
  $("#inputs").innerHTML = Object.entries(s.subjects).map(([k, sub]) => {
    const i = inp[k] || {}, exact = i.mode === "exact", r = a.res[k];
    return `<div class="inrow">
      <div class="subj"><b>${esc(sub.name)}</b><small>${sub.code} · ${esc(sub.faculty || "")}</small></div>
      <div class="ctl">
        <div class="seg"><button data-k="${k}" data-mode="pct" class="${exact ? "" : "on"}">%</button><button data-k="${k}" data-mode="exact" class="${exact ? "on" : ""}">Count</button></div>
        ${exact
          ? `<input type="number" min="0" data-k="${k}" data-f="att" value="${i.att ?? ""}" placeholder="attended"> / <input type="number" min="0" data-k="${k}" data-f="held" value="${i.held ?? ""}" placeholder="${r.heldTT}">`
          : `<input type="number" min="0" max="100" step="0.1" data-k="${k}" data-f="pct" value="${i.pct ?? ""}" placeholder="e.g. 80"> <span class="muted">% of ${r.heldTT} held</span>`}
      </div></div>`;
  }).join("");
}

function renderResults() {
  const s = sec(), a = run(), allRs = Object.values(a.res), rs = allRs.filter(r => r.entered);
  const filled = Object.values(a.res).some(r => r.entered);
  const irr = rs.filter(r => r.irreversible), o = a.overall;
  const planTxt = S.planDate === SEMESTER.end ? "semester end" : fmt(S.planDate);

  $("#alert").innerHTML = filled && irr.length ? `<div class="irr-banner">
      <div class="siren">!</div><div><h2>Irreversible detention</h2>
      <p>Even if you attend <b>every single remaining class</b>, you cannot reach 75% in:
      <b>${irr.map(r => esc(s.subjects[r.k].name) + ` (max ${p1(r.maxPct)}%)`).join(", ")}</b>. Talk to your faculty advisor / HOD now about condonation.</p></div></div>` : "";

  $("#summary").innerHTML = `
    <div class="stat"><span>Today</span><b>${now().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b><small>${now().toLocaleDateString("en-IN", { weekday: "long" })}, ${now().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small></div>
    <div class="stat"><span>Classes left (sem)</span><b>${o.RS}</b><small>till ${fmt(SEMESTER.end)}</small></div>
    <div class="stat"><span>Classes left till plan date</span><b>${o.R}</b><small>${planTxt}</small></div>
    <div class="stat"><span>Overall attendance</span><b style="color:${col(o.cur)}">${filled ? p1(o.cur) + "%" : "—"}</b><small>${hrs(o.A)}/${o.H} hours</small></div>`;

  const pending = allRs.filter(r => !r.entered);
  $("#results").innerHTML = (filled ? "" : `<p class="muted">Enter your attendance above to see your plan.</p>`) + rs.map(r => {
    const sub = s.subjects[r.k], [cls, lbl] = status(r);
    const line = (t, n, streak, reach) => {
      if (n > r.R) return `<li class="x">Can't reach ${t}% by ${planTxt} (needs ${n}, only ${r.R} left)</li>`;
      return `<li>Attend <b>${n}</b> of ${r.R} → ${t}% by ${planTxt}${n < r.R ? ` <span class="muted">(can skip ${r.R - n})</span>` : ""}</li>` +
        (streak ? `<li class="muted">Back to ${t}% after ${streak} class${streak === 1 ? "" : "es"} in a row${reach && reach !== "never" ? ` · ~${fmt(reach)}` : ""}</li>` : "");
    };
    return `<div class="card ${cls}">
      <div class="chead"><div><b>${esc(sub.name)}</b><small>${sub.code}</small></div><span class="pill ${cls}">${lbl}</span></div>
      <div class="big"><b>${p1(r.cur)}%</b><span>${hrs(r.A)}/${r.H} attended${r.odPast ? ` (incl. ${r.odPast} OD)` : ""} · ${r.RS} left in sem</span></div>
      <div class="bar"><i style="width:${Math.min(100, r.cur)}%;background:${col(r.cur)}"></i><em style="left:75%"></em><em style="left:90%"></em></div>
      ${r.irreversible
        ? `<p class="irrtxt">Max possible: ${p1(r.maxPct)}% even at 100% from now. 75% is mathematically out of reach.</p>`
        : `<ul>${line(75, r.n75, r.s75, r.reach75)}${line(90, r.n90, r.s90, r.reach90)}
           ${r.cur >= 75 ? `<li>Safe to skip <b>${r.bunk}</b> in a row right now and stay ≥75%</li>` : ""}
           ${r.missS || r.odFut ? `<li>With your leave plan: <b style="color:${col(r.projEnd)}">${p1(r.projEnd)}%</b> at sem end <span class="muted">(${r.missS} absent, ${r.odFut} OD hrs)</span></li>` : ""}</ul>`}
    </div>`;
  }).join("") + (filled && pending.length ? `<div class="card"><b>Not entered yet</b><p class="muted">${pending.map(r => esc(s.subjects[r.k].name)).join(", ")} — add their % above to include them.</p></div>` : "");

  renderCharts(a, filled);
  renderUpcoming(a);
  renderLeaveList();
}

// ═════════════ CHARTS (inline SVG) ═════════════
function renderCharts(a, filled) {
  const s = sec(), o = a.overall, rs = Object.values(a.res).filter(r => r.entered);
  if (!filled) { $("#charts").innerHTML = `<p class="muted">Enter your attendance above to see charts.</p>`; return; }
  // 1. gauge
  const arc = (p, r) => { const t = Math.PI * (1 - Math.min(100, p) / 100); return `${100 + r * Math.cos(t)} ${100 - r * Math.sin(t)}`; };
  const tick = p => { const t = Math.PI * (1 - p / 100); return `<line x1="${100 + 62 * Math.cos(t)}" y1="${100 - 62 * Math.sin(t)}" x2="${100 + 92 * Math.cos(t)}" y2="${100 - 92 * Math.sin(t)}" stroke="currentColor" stroke-width="2" opacity=".6"/><text x="${100 + 102 * Math.cos(t)}" y="${100 - 102 * Math.sin(t)}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".7">${p}</text>`; };
  const gauge = `<svg viewBox="-14 0 228 118" class="gauge">
    <path d="M 22 100 A 78 78 0 0 1 178 100" fill="none" stroke="var(--line)" stroke-width="16" stroke-linecap="round"/>
    <path d="M 22 100 A 78 78 0 0 1 ${arc(o.cur, 78)}" fill="none" stroke="${col(o.cur)}" stroke-width="16" stroke-linecap="round"/>
    ${tick(75)}${tick(90)}
    <text x="100" y="88" text-anchor="middle" font-size="26" font-weight="700" fill="currentColor" font-family="JetBrains Mono">${p1(o.cur)}%</text>
    <text x="100" y="106" text-anchor="middle" font-size="9" fill="currentColor" opacity=".7">now → ${p1(o.projEnd)}% at sem end</text></svg>`;
  // 2. per-subject bars: current (bar) vs projected end (dot)
  const W = 520, rowH = 26, left = 70, bw = W - left - 20, H2 = rs.length * rowH + 30;
  const x = p => left + (bw * Math.max(0, Math.min(100, p))) / 100;
  const bars = `<svg viewBox="0 0 ${W} ${H2}" class="bars">
    ${[0, 25, 50, 75, 90, 100].map(p => `<line x1="${x(p)}" y1="4" x2="${x(p)}" y2="${H2 - 22}" stroke="${p === 75 ? "var(--red)" : p === 90 ? "var(--green)" : "var(--line)"}" stroke-dasharray="${p === 75 || p === 90 ? "4 3" : ""}"/><text x="${x(p)}" y="${H2 - 8}" font-size="10" text-anchor="middle" fill="currentColor" opacity=".6">${p}%</text>`).join("")}
    ${rs.map((r, i) => { const y = 8 + i * rowH; return `<g><title>${esc(s.subjects[r.k].name)}: now ${p1(r.cur)}%, projected ${p1(r.projEnd)}%</title>
      <text x="${left - 6}" y="${y + 13}" font-size="11" text-anchor="end" fill="currentColor">${esc(short(s.subjects[r.k].name))}</text>
      <rect x="${left}" y="${y + 3}" width="${Math.max(2, x(r.cur) - left)}" height="12" rx="6" fill="${r.cur < 75 ? "var(--red)" : "var(--acc)"}" opacity="${r.cur < 90 ? .75 : 1}"/>
      <circle cx="${x(r.projEnd)}" cy="${y + 9}" r="4.5" fill="var(--card)" stroke="currentColor" stroke-width="1.5"/></g>`; }).join("")}</svg>`;
  // 3. projection line over time
  const L = a.line, LW = 960, LH = 240, pl = 34, pb = 22;
  const lo = Math.max(0, Math.floor(Math.min(...L.map(p => Math.min(p.all, p.plan)), 70) / 10) * 10);
  const tx = i => pl + ((LW - pl - 10) * i) / Math.max(1, L.length - 1), ty = p => 8 + ((LH - pb - 8) * (100 - p)) / (100 - lo);
  const path = key => L.map((p, i) => `${i ? "L" : "M"}${tx(i).toFixed(1)} ${ty(p[key]).toFixed(1)}`).join(" ");
  const months = L.map((p, i) => [p, i]).filter(([p], i) => i === 0 || p.date.slice(5, 7) !== L[i - 1].date.slice(5, 7));
  const lineSvg = `<svg viewBox="0 0 ${LW} ${LH}" class="linec">
    ${[lo, 75, 90, 100].map(p => `<line x1="${pl}" x2="${LW - 10}" y1="${ty(p)}" y2="${ty(p)}" stroke="${p === 75 ? "var(--red)" : p === 90 ? "var(--green)" : "var(--line)"}" stroke-dasharray="${p === 75 || p === 90 ? "4 3" : ""}"/><text x="${pl - 4}" y="${ty(p) + 3}" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">${p}</text>`).join("")}
    ${months.map(([p, i]) => `<text x="${tx(i)}" y="${LH - 6}" font-size="10" fill="currentColor" opacity=".6">${parseYmd(p.date).toLocaleDateString("en-IN", { month: "short" })}</text>`).join("")}
    <path d="${path("all")}" fill="none" stroke="var(--acc)" stroke-width="2.5"/>
    ${o.missS ? `<path d="${path("plan")}" fill="none" stroke="var(--amber)" stroke-width="2.5" stroke-dasharray="6 4"/>` : ""}</svg>
    <div class="legend"><span><i style="background:var(--acc)"></i>Attend every class</span>${o.missS ? `<span><i style="background:var(--amber)"></i>With your leave plan</span>` : ""}<span><i style="background:var(--red)"></i>75% line</span></div>`;
  const zones = { top: 0, ok: 0, bad: 0, irr: 0 }; rs.forEach(r => zones[status(r)[0]]++);
  $("#charts").innerHTML = `
    <div class="chartbox"><h4>Overall health</h4>${gauge}
      <div class="zones"><span class="pill top">${zones.top} at 90%+</span><span class="pill ok">${zones.ok} safe</span><span class="pill bad">${zones.bad} danger</span><span class="pill irr">${zones.irr} irreversible</span></div></div>
    <div class="chartbox"><h4>By subject <span class="muted" style="font-weight:400">— bar is now, dot is projected at semester end</span></h4>${bars}</div>
    <div class="chartbox wide"><h4>Projected overall attendance to 29 Nov</h4>${lineSvg}</div>`;
}

// ═════════════ OD / LEAVE SIMULATOR ═════════════
function renderUpcoming(a) {
  const s = sec(), byDay = {};
  a.future.filter(c => c.date <= S.planDate).forEach(c => (byDay[c.date] ||= []).push(c));
  const days = Object.keys(byDay).slice(0, 30);
  $("#upcoming").innerHTML = days.length ? days.map(d => {
    const lv = S.leaves[d] || "";
    const list = byDay[d].sort((x, y) => x.period - y.period);
    return `<div class="day lv-${lv}"><b>${fmt(d)}</b><span>${list.map(c => `<i title="${esc(s.subjects[c.subj].name)}">P${c.period} ${esc(short(s.subjects[c.subj].name))}</i>`).join("")}</span>
      <select data-leave="${d}"><option value="">Attend</option>${Object.entries(LEAVE).map(([k, v]) => `<option value="${k}" ${lv === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>`;
  }).join("") + (Object.keys(byDay).length > 30 ? `<p class="muted">+ ${Object.keys(byDay).length - 30} more class days — use the range form for later dates</p>` : "")
    : `<p class="muted">No classes left before the plan date.</p>`;
}
function renderLeaveList() {
  const e = Object.entries(S.leaves).sort();
  $("#leavelist").innerHTML = e.length ? e.map(([d, t]) => `<span class="chip lv-${t}">${fmt(d)} · ${LEAVE[t]} <button data-dellv="${d}">×</button></span>`).join("") + ` <button id="clearlv">Clear all</button>`
    : `<span class="muted">No leave / OD days added yet.</span>`;
}
function addLeaveRange(from, to, type) {
  const added = [];
  for (let d = from; d <= to; d = addDays(d, 1)) { const wd = parseYmd(d).getDay(); if (wd && wd < 6) { S.leaves[d] = type; added.push(d); } }
  save(); renderResults(); return added;
}

function renderTT() {
  const s = sec();
  $("#tt").innerHTML = `<table><tr><th></th>${s.periods.map((p, i) => `<th>P${i + 1}<small>${p[0]}</small></th>`).join("")}</tr>
    ${["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => `<tr><th>${d}</th>${s.grid[d].map(c => (c ? `<td title="${esc(s.subjects[c].name)}">${esc(short(s.subjects[c].name))}</td>` : `<td class="e"></td>`)).join("")}</tr>`).join("")}</table>
    <p class="muted" style="margin-top:6px">${Object.values(s.subjects).map(x => `<b>${short(x.name)}</b> ${esc(x.name)}`).join(" · ")}</p>`;
}
function renderHolidays() {
  $("#hols").innerHTML = S.holidays.map((h, i) => `<span class="chip">${fmt(h.date)} · ${esc(h.name)} <button data-delhol="${i}">×</button></span>`).join("");
}
function renderAll() {
  renderSectionPicker(); renderInputs(); renderResults(); renderTT(); renderHolidays();
  $("#plan").value = S.planDate; $("#plan").max = SEMESTER.end;
  $("#plan").min = ymd(now()) < SEMESTER.start ? SEMESTER.start : ymd(now());
  $("#nowov").value = S.nowOverride;
}

// ═════════════ ATTENDANCE ADVISOR (chatbot) ═════════════
const NUM = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3 };
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const ALIASES = { chem: "chemistry", maths: "mathematics calculus transforms probability discrete", math: "mathematics calculus transforms probability discrete",
  ml: "machine learning", dbms: "database", coa: "computer organization", dld: "digital logic", ssd: "solid state", emt: "electromagnetic", pps: "programming",
  bio: "biology", physics: "physics", lab: "laboratory lab", mpmc: "microcontroller microprocessor", vlsi: "vlsi", uhv: "human values", ethics: "ethics",
  cdc: "verbal aptitude analytical", aptitude: "aptitude", german: "german", japanese: "japanese", workshop: "workshop", dsp: "signal processing", nss: "nss", yoga: "yoga" };

function findSubjects(q) {
  const s = sec(), words = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const hits = [];
  for (const [k, sub] of Object.entries(s.subjects)) {
    const name = sub.name.toLowerCase(), sh = short(sub.name).toLowerCase(), code = sub.code.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (w.length < 3 && !ALIASES[w]) continue;
      if (/^(the|and|for|will|my|if|what|how|many|can|take|leave|days?|sick|from|starting|tomorrow|today|next|drop|below|attendance|class|classes|week|attend|skip|bunk|miss|safe|with|are|all|this|that|get|need|reach|above|still|go|goes|fall|off|medical|od|duty|on|when|should|would|does|subject|subjects|percent|much|left|more|after|before)$/.test(w)) continue;
      if (w === sh || w === code) score += 5;
      else if (ALIASES[w] && ALIASES[w].split(" ").some(a => name.includes(a))) score += 3;
      else if (w.length >= 4 && name.split(/\W+/).some(n => n.startsWith(w) || w.startsWith(n) && n.length >= 4)) score += 2;
    }
    if (score) hits.push([score, k]);
  }
  if (!hits.length) return [];
  const best = Math.max(...hits.map(h => h[0]));
  return hits.filter(h => h[0] === best).map(h => h[1]);
}

function parseDate(q) {
  const t = ymd(now()), low = q.toLowerCase();
  if (/day after tomorrow/.test(low)) return addDays(t, 2);
  if (/tomorrow|tmrw|tmr/.test(low)) return addDays(t, 1);
  if (/\btoday\b/.test(low)) return t;
  const dn = low.match(/(next |this |on |from )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*/);
  if (dn) { const target = DAYS.findIndex(d => d.toLowerCase() === dn[2]); let d = parseYmd(t), n = 0;
    do { d.setDate(d.getDate() + 1); n++; } while (d.getDay() !== target); if (dn[1] === "next " && n < 7 && false) d.setDate(d.getDate() + 7); return ymd(d); }
  let m = low.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)/) ;
  if (m) return ymd(new Date(2026, MONTHS[m[2]], +m[1]));
  m = low.match(/(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s*(\d{1,2})/);
  if (m) return ymd(new Date(2026, MONTHS[m[1]], +m[2]));
  m = low.match(/\b(\d{1,2})[\/\-.](\d{1,2})\b/);
  if (m) return ymd(new Date(2026, +m[2] - 1, +m[1]));
  if (/next week/.test(low)) { let d = parseYmd(t); do d.setDate(d.getDate() + 1); while (d.getDay() !== 1); return ymd(d); }
  return null;
}
function parseDays(q) {
  const low = q.toLowerCase();
  let m = low.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|couple|few)\s*(?:of\s*)?-?\s*(day|week)s?/);
  if (m) { const n = NUM[m[1]] ?? +m[1]; return m[2] === "week" ? n * 7 : n; }
  if (/\bweek\b/.test(low)) return 7;
  return null;
}

function advisor(q) {
  const s = sec(), low = q.toLowerCase(), a = run();
  const filled = Object.values(a.res).some(r => r.entered);
  if (!filled) return { text: `First enter your current attendance % in step 3 — I read your dashboard to answer. (Section: <b>${esc(s.name)}</b>)` };
  const subs = findSubjects(q);
  const mentioned = /chem|math|lab|physics|german|japanese|biology|[a-z]{4,}/i.test(q);
  const hi = /^\s*(hi+|hello+|hey+|yo+|hl+o+|helo+|yohoo+|sup|vanakkam|namaste|good (morning|evening|afternoon))\b/i.test(q) && q.trim().split(/\s+/).length <= 3;
  if (hi) return { text: `Hi. I'm watching your <b>${esc(s.name)}</b> dashboard (overall <b style="color:${col(a.overall.cur)}">${p1(a.overall.cur)}%</b>). Ask me things like:<ul><li>"If I take a 3-day sick leave starting tomorrow, will my ${esc(s.subjects[Object.keys(s.subjects)[1]].name)} drop below 75%?"</li><li>"How many classes can I bunk?"</li><li>"When will I reach 90%?"</li><li>"2 days OD from 5 Oct"</li><li>"How am I doing?"</li></ul>` };
  const skippedSubs = subs.filter(k => !a.res[k].entered);
  const targetKs = (subs.length ? subs : Object.keys(s.subjects)).filter(k => a.res[k].entered);
  if (!targetKs.length) return { text: `You haven't entered your % for ${skippedSubs.map(k => `<b>${esc(s.subjects[k].name)}</b>`).join(", ") || "those subjects"} yet — add it in step 3 and ask again.` };
  const nm = k => `<b>${esc(s.subjects[k].name)}</b>`;
  const notFound = !subs.length && /\b(chem|chemistry|physics|german|japanese|biology|maths?|lab|ml|dbms|vlsi)\b/i.test(low)
    ? `<p class="muted">I couldn't find "${esc(low.match(/\b(chem\w*|physics|german|japanese|biology|maths?|lab|ml|dbms|vlsi)\b/i)[0])}" in ${esc(s.name)} — showing all your subjects. Your subjects: ${Object.values(s.subjects).map(x => short(x.name)).join(", ")}.</p>` : "";
  const type = /sick|medical|ill|fever|hospital|ml\b/.test(low) ? "medical" : /\bod\b|on[- ]duty|symposium|hackathon|event|sports/.test(low) ? "od" : "skip";
  const days = parseDays(q), start = parseDate(q);

  // ── Intent 1: leave scenario ──
  if (days || (start && /leave|skip|bunk|miss|absent|off|od|duty|sick|go home|trip/.test(low))) {
    const from = start || addDays(ymd(now()), 1), n = days || 1, to = addDays(from, n - 1);
    const lv = { ...S.leaves }; for (let d = from; d <= to; d = addDays(d, 1)) lv[d] = type;
    const base = run(), sim = run(lv);
    const dayList = []; for (let d = from; d <= to; d = addDays(d, 1)) dayList.push(d);
    const rows = targetKs.map(k => {
      const r = base.res[k], rr = sim.res[k];
      const before = r.fut.filter(c => c.date < from).length, missed = r.fut.filter(c => c.date >= from && c.date <= to).length;
      const Hn = r.H + before + missed, An = r.A + before + (type === "od" ? missed : 0), after = pct(An, Hn);
      const drop = after < 75, drop90 = after < 90 && pct(r.A + before, r.H + before) >= 90;
      const rec = drop ? Math.ceil((75 * Hn - 100 * An) / 25) : 0;
      const recDate = rec ? rr.fut.filter(c => c.date > to)[rec - 1]?.date : null;
      return { k, missed, after, drop, drop90, rec, recDate, end: rr.projEnd, now: r.cur, irr: rr.irreversible || rr.maxPct < 75 };
    }).filter(x => subs.length || x.missed);
    const bad = rows.filter(x => x.drop);
    const head = `<b>${n}-day ${LEAVE[type].toLowerCase()}</b>: ${fmt(from)}${n > 1 ? ` → ${fmt(to)}` : ""}` +
      (type === "od" ? ` <span class="muted">(OD is counted as present)</span>` : type === "medical" ? ` <span class="muted">(counted absent unless the HOD condones it)</span>` : "");
    if (!rows.length) return { text: `${head}<p>You have no classes${subs.length ? " of " + nm(subs[0]) : ""} on those days (weekend/holiday) — no impact.</p>`, leave: { from, to, type } };
    const body = rows.map(x => `<li>${nm(x.k)}: ${type === "od" ? "on OD for" : "miss"} <b>${x.missed}</b> hr → now <b>${p1(x.now)}%</b>, right after the leave <b style="color:${col(x.after)}">${p1(x.after)}%</b>
      ${x.drop ? `<br><span class="warn">Drops below 75%.</span> ${x.irr ? `<b class="warn">Cannot recover this semester!</b>` : `Attend the next <b>${x.rec}</b> classes in a row to get back${x.recDate ? ` (~${fmt(x.recDate)})` : ""}.`}` : x.drop90 ? `<br><span class="muted">Falls under 90%.</span>` : ""}
      <br><span class="muted">Sem-end if you attend everything else: ${p1(x.end)}%</span></li>`).join("");
    const verdict = bad.length ? `<p class="warn"><b>Verdict:</b> risky — ${bad.length} subject(s) fall into the detention zone.${type === "medical" ? " Get a medical certificate and apply for condonation." : ""}</p>`
      : `<p class="good"><b>Verdict:</b> safe — you stay above 75% everywhere${subs.length ? "" : " this leave touches"}.</p>`;
    return { text: `${head}${notFound}<ul>${body}</ul>${verdict}`, leave: { from, to, type } };
  }
  // ── Intent 2: how many can I skip ──
  if (/skip|bunk|miss|leave|absent|off/.test(low)) {
    return { text: `${notFound}<p>Classes you can skip and still stay ≥75%:</p><ul>${targetKs.map(k => { const r = a.res[k];
      return r.irreversible ? `<li>${nm(k)}: <span class="warn">none — ${p1(r.cur)}% and 75% is out of reach this semester (max ${p1(r.maxPct)}%)</span>. Attend everything &amp; talk to your HOD.</li>`
        : r.cur < 75 ? `<li>${nm(k)}: <span class="warn">none — you're at ${p1(r.cur)}%</span>. Attend ${r.s75} in a row first.</li>`
        : `<li>${nm(k)}: <b>${r.bunk}</b> right now · <b>${Math.max(0, r.R - r.n75)}</b> of ${r.R} until ${S.planDate === SEMESTER.end ? "sem end" : fmt(S.planDate)}</li>`; }).join("")}</ul>` };
  }
  // ── Intent 3: when will I reach / how many to attend ──
  if (/need|attend|how many|reach|get to|recover|90|75/.test(low)) {
    const t = /90/.test(low) ? 90 : 75;
    return { text: `${notFound}<p>To reach/keep <b>${t}%</b> by semester end:</p><ul>${targetKs.map(k => { const r = a.res[k], n = need(r.A, r.H, r.RS, t), st = t === 90 ? r.s90 : r.s75, rd = t === 90 ? r.reach90 : r.reach75;
      if (r.maxPct < t) return `<li>${nm(k)} (${p1(r.cur)}%): <span class="warn">can't reach ${t}% this semester — max ${p1(r.maxPct)}% even attending all ${r.RS} left</span></li>`;
      return `<li>${nm(k)} (${p1(r.cur)}%): attend <b>${n}</b> of ${r.RS} left${n < r.RS ? ` (can skip ${r.RS - n})` : " — every single one!"}${st ? ` · ${st} in a row gets you there${rd && rd !== "never" ? ` by ~${fmt(rd)}` : ""}` : " · already there"}</li>`; }).join("")}</ul>` };
  }
  // ── Intent 4: status / overview ──
  const rs = targetKs.map(k => a.res[k]);
  const worst = [...rs].sort((x, y) => x.cur - y.cur);
  return { text: `${notFound}<p>Overall: <b style="color:${col(a.overall.cur)}">${p1(a.overall.cur)}%</b> · ${a.overall.RS} classes left this semester.</p>
    <ul>${worst.map(r => `<li>${nm(r.k)}: <b style="color:${col(r.cur)}">${p1(r.cur)}%</b> — ${status(r)[1]}${r.irreversible ? "" : ""}</li>`).join("")}</ul>
    <p class="muted">Try: "If I take a 3-day sick leave starting tomorrow, will my ${esc(s.subjects[worst[0].k].name)} drop below 75%?" · "How many classes can I bunk?" · "When will I reach 90%?" · "2 days OD from 5 Oct"</p>` };
}

async function askLLM(q, localHtml) { // optional: Vercel /api/chat with ANTHROPIC_API_KEY rewrites the computed answer
  if (!/^https?:/.test(location.protocol) || /claude\.ai|claudeusercontent/.test(location.host)) return null;
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 7000);
    const a = run(), s = sec();
    const ctx = { section: s.name, today: ymd(now()), semesterEnd: SEMESTER.end,
      subjects: Object.values(a.res).map(r => ({ name: s.subjects[r.k].name, attended: r.A, held: r.H, percent: +p1(r.cur), classesLeft: r.RS, needFor75: r.n75, needFor90: r.n90, safeSkipsNow: r.bunk, irreversible: r.irreversible })) };
    const r = await fetch("/api/chat", { method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: q, context: ctx, computed: localHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") }) });
    if (!r.ok) return null; const j = await r.json(); return j.reply || null;
  } catch { return null; }
}

function chatMsg(html, who, leave) {
  const el = document.createElement("div"); el.className = "msg " + who; el.innerHTML = html;
  if (leave) { const b = document.createElement("button"); b.className = "pri small"; b.textContent = "Add to leave plan";
    b.onclick = () => { addLeaveRange(leave.from, leave.to, leave.type); b.textContent = "Added to leave plan"; b.disabled = true; }; el.appendChild(b); }
  $("#chatlog").appendChild(el); $("#chatlog").scrollTop = 1e9; return el;
}
async function onAsk(q) {
  if (!q.trim()) return;
  chatMsg(esc(q), "me");
  const r = advisor(q);
  const el = chatMsg(r.text, "bot", r.leave);
  const llm = await askLLM(q, r.text);
  if (llm) { const p = document.createElement("div"); p.className = "ai"; p.innerHTML = "" + esc(llm).replace(/\n/g, "<br>"); el.insertBefore(p, el.firstChild); }
}

// ═════════════ EVENTS ═════════════
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const isDark = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
const paintThemeBtn = () => { $("#themebtn").innerHTML = isDark() ? SUN : MOON; };
document.addEventListener("DOMContentLoaded", () => {
  renderAll(); paintThemeBtn();
  document.querySelectorAll("[data-tab]").forEach(b => (b.onclick = () => {
    document.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("on", x === b));
    $("#tab-att").hidden = b.dataset.tab !== "att"; $("#tab-rooms").hidden = b.dataset.tab !== "rooms";
    $("#fab").hidden = b.dataset.tab !== "att";
    $("#ptitle").textContent = b.dataset.tab === "att" ? "Attendance Planner" : "Free Rooms";
    $("#psub").textContent = b.dataset.tab === "att" ? "Know exactly which classes you can miss — and which you can’t." : "Find an empty classroom that stays empty — straight from every section's timetable."; if (b.dataset.tab !== "att") $("#chat").classList.remove("open");
    try { localStorage.setItem("vc_tab", b.dataset.tab); } catch {}
    if (b.dataset.tab === "rooms") { renderGrid(); renderMap(); renderPanel(); }
  }));
  setTimeout(() => { initRooms(); try { const t = localStorage.getItem("vc_tab"); if (t === "rooms") document.querySelector('[data-tab="rooms"]').click(); } catch {} }, 0);
  $("#themebtn").onclick = () => { const t = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("vc_theme", t); } catch {} paintThemeBtn(); renderResults(); };
  $("#section").onchange = e => { S.secId = e.target.value; S.leaves = {}; save(); renderAll(); };
  $("#plan").onchange = e => { S.planDate = e.target.value || SEMESTER.end; save(); renderResults(); };
  document.querySelectorAll("[data-plan]").forEach(b => (b.onclick = () => {
    const v = b.dataset.plan;
    S.planDate = v === "end" ? SEMESTER.end : (d => (d > SEMESTER.end ? SEMESTER.end : d))(addDays(ymd(now()), +v));
    save(); renderAll();
  }));
  $("#inputs").addEventListener("input", e => { const k = e.target.dataset.k, f = e.target.dataset.f; if (!k || !f) return;
    // validation: % must be 0–100, counts must be whole, attended ≤ held
    const v = e.target.value, n = +v, row = secInputs()[k] || {};
    let bad = v !== "" && (!isFinite(n) || n < 0 || (f === "pct" && n > 100) || (f !== "pct" && !Number.isInteger(n)));
    if (!bad && f === "att" && v !== "" && row.held !== "" && row.held != null && n > +row.held) bad = true;
    if (!bad && f === "held" && v !== "" && row.att !== "" && row.att != null && +row.att > n) bad = true;
    e.target.classList.toggle("bad", bad);
    e.target.title = bad ? (f === "pct" ? "Enter a percentage between 0 and 100" : "Use whole numbers, and attended can't exceed held") : "";
    (secInputs()[k] ||= {})[f] = e.target.value; save(); renderResults(); });
  $("#inputs").addEventListener("click", e => { const k = e.target.dataset.k, m = e.target.dataset.mode; if (!k || !m) return;
    (secInputs()[k] ||= {}).mode = m; save(); renderInputs(); renderResults(); });
  $("#fillall").onclick = () => { const v = $("#allpct").value; if (v === "") return;
    Object.keys(sec().subjects).forEach(k => (secInputs()[k] = { mode: "pct", pct: v })); save(); renderInputs(); renderResults(); };
  $("#reset").onclick = () => { S.inputs[S.secId] = {}; S.leaves = {}; save(); renderAll(); };
  $("#upcoming").addEventListener("change", e => { const d = e.target.dataset.leave; if (!d) return;
    if (e.target.value) S.leaves[d] = e.target.value; else delete S.leaves[d]; save(); renderResults(); });
  $("#leavelist").addEventListener("click", e => {
    if (e.target.id === "clearlv") { S.leaves = {}; save(); renderResults(); return; }
    const d = e.target.dataset.dellv; if (d) { delete S.leaves[d]; save(); renderResults(); } });
  $("#lvadd").onclick = () => { const f = $("#lvfrom").value, t = $("#lvto").value || f; if (!f) return; addLeaveRange(f, t < f ? f : t, $("#lvtype").value); };
  $("#hols").addEventListener("click", e => { const i = e.target.dataset.delhol; if (i == null) return; S.holidays.splice(+i, 1); save(); renderAll(); });
  $("#addhol").onclick = () => { const d = $("#holdate").value; if (!d) return; S.holidays.push({ date: d, name: $("#holname").value || "Holiday" }); save(); renderAll(); };
  $("#nowov").onchange = e => { S.nowOverride = e.target.value; save(); renderAll(); };
  $("#nowreset").onclick = () => { S.nowOverride = ""; save(); renderAll(); };
  // chat
  $("#fab").onclick = () => { $("#chat").classList.toggle("open"); if (!$("#chatlog").children.length)
    chatMsg(`Hi — I'm your Attendance Advisor. I read your live dashboard (${esc(sec().name)}) and do the math for you.<br><span class="muted">Ask e.g. "If I take a 3-day sick leave starting tomorrow, will my attendance drop below 75%?"</span>`, "bot");
    $("#chatin").focus(); };
  $("#chatx").onclick = () => $("#chat").classList.remove("open");
  $("#chatform").onsubmit = e => { e.preventDefault(); const q = $("#chatin").value; $("#chatin").value = ""; onAsk(q); };
  document.querySelectorAll("[data-q]").forEach(b => (b.onclick = () => onAsk(b.dataset.q)));
  setInterval(() => { if (!S.nowOverride) renderResults(); }, 60000);
});
