// ═════════════ ROUND 2 · PHASE 2 — 3D BUILDING MAP, COUNTDOWN, SQUAD SHARE ═════════════
const MAP = { sel: null, focus: null, offset: 0, ovr: null, claim: null, tick: null };
try { MAP.claim = JSON.parse(localStorage.getItem("vc_claim")) || null; } catch {}

// live clock for the map (follows "Simulate a different date" if set, and keeps ticking)
function mapNow() {
  if (S.nowOverride !== MAP.ovr) { MAP.ovr = S.nowOverride; MAP.offset = S.nowOverride ? new Date(S.nowOverride) - Date.now() : 0; }
  return new Date(Date.now() + MAP.offset);
}
const secOfDay = d => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
const clock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + pad(m) : m) + ":" + pad(x); };

// full live status of a room at this second
function liveStatus(room) {
  const n = mapNow(), date = ymd(n), sNow = secOfDay(n), mNow = Math.floor(sNow / 60);
  const { occ, closed } = occupancy(date);
  const list = occ[room] || [];
  if (closed) return { state: "free", closed, untilSec: null, date };
  const cur = list.find(b => b.start * 60 <= sNow && b.end * 60 > sNow);
  if (cur) {
    let freeAt = cur.end; for (const b of list) if (b.start >= cur.start && b.start <= freeAt + 10 && b.end > freeAt) freeAt = b.end;
    return { state: "busy", by: cur, freeAtSec: freeAt * 60, secsLeft: freeAt * 60 - sNow, date };
  }
  const next = list.find(b => b.start * 60 > sNow);
  if (!next) return { state: "free", untilSec: null, afterHours: mNow >= DAY_END || mNow < DAY_START, date };
  const secsLeft = next.start * 60 - sNow;
  return { state: secsLeft <= 30 * 60 ? "soon" : "free", next, untilSec: next.start * 60, secsLeft, date };
}

function mapFloors() {
  const floors = {};
  ALL_ROOMS.forEach(r => (floors[floorOf(r)] ||= []).push(r));
  return Object.keys(floors).map(Number).sort((a, b) => a - b).map(f => ({ f, rooms: floors[f] }));
}

function renderMap() {
  const box = $("#map3d"); if (!box) return;
  const floors = mapFloors(), n = mapNow();
  const counts = { free: 0, soon: 0, busy: 0 };
  box.style.setProperty("--floors", floors.length);
  box.style.setProperty("--s", Math.min(1, (box.clientWidth || 560) / 600).toFixed(3));
  box.innerHTML = `<div class="tower">${floors.map(({ f, rooms }, i) => {
    const dim = MAP.focus != null && MAP.focus !== f;
    return `<div class="slab${dim ? " dim" : ""}${MAP.focus === f ? " focus" : ""}" style="--i:${i}" data-floor="${f}">
      <div class="slabtop"><span class="flabel">${f === 0 ? "G" : f}</span>
      <div class="corridor"></div>
      ${rooms.map((r, j) => { const st = liveStatus(r); counts[st.state]++;
        const row = j % 2, col = Math.floor(j / 2);
        const claimed = MAP.claim && MAP.claim.room === r && MAP.claim.date === ymd(n);
        return `<button class="room ${st.state}${MAP.sel === r ? " sel" : ""}${claimed ? " claimed" : ""}" style="--r:${row};--c:${col}" data-room="${r}" title="${r}">
          <span class="rlab">${r.replace("IST ", "")}</span>${claimed ? '<i class="pin"></i>' : ""}</button>`; }).join("")}
      </div></div>`; }).join("")}</div>`;
  $("#mapstats").innerHTML = `<span class="lg free"></span>${counts.free} free <span class="lg soon"></span>${counts.soon} class within 30 min <span class="lg busy"></span>${counts.busy} in use
    <span class="muted"> · ${n.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${n.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>`;
  $("#mapfloors").innerHTML = `<button class="${MAP.focus == null ? "on" : ""}" data-focus="">All</button>` +
    floors.map(({ f }) => `<button class="${MAP.focus === f ? "on" : ""}" data-focus="${f}">${f === 0 ? "G" : f}</button>`).join("");
}

function renderPanel() {
  const p = $("#mappanel"); if (!p) return;
  const r = MAP.sel;
  if (!r) { p.innerHTML = `<div class="pempty"><b>Tap a room</b><p class="muted">Green rooms are free right now. Tap one to see exactly how long it stays free, claim it, and call your squad.</p>${claimBanner()}</div>`; return; }
  const st = liveStatus(r), info = RS.info[r], n = mapNow();
  const claimed = MAP.claim && MAP.claim.room === r && MAP.claim.date === ymd(n);
  let big, sub, cls;
  if (st.closed) { cls = "free"; big = "Free all day"; sub = `No classes (${st.closed})`; }
  else if (st.state === "busy") { cls = "busy"; big = clock(st.secsLeft); sub = `In use by <b>${esc(st.by.sec)}</b> · ${esc(st.by.subj)}<br>Frees up at ${hhmm(st.freeAtSec / 60)}`; }
  else if (st.untilSec == null) { cls = "free"; big = st.afterHours ? "Free" : "Free today"; sub = st.afterHours ? "Outside class hours — no more classes today" : "No more classes in this room today"; }
  else { cls = st.state; big = clock(st.secsLeft); sub = `until the next class at <b>${hhmm(st.untilSec / 60)}</b><br>${esc(st.next.sec)} · ${esc(st.next.subj)}`; }
  const label = st.state === "busy" ? "Class ends in" : st.untilSec == null ? "" : "Free for";
  p.innerHTML = `<div class="phead"><div><h3>${r}</h3><div class="muted">${floorName(floorOf(r))} · ${building(r)}${info.label ? " · " + esc(info.label) : ""}</div></div><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="rmeta"><span>${info.ac ? "AC" : "Non-AC"}</span><span>${esc(info.type)}</span><span>~${info.cap} seats</span></div>
    <div class="count ${cls}"><small>${label}</small><b id="cdown">${big}</b><p>${sub}</p></div>
    ${st.state === "busy" ? `<p class="muted">This room is taken right now. Pick a green one.</p>` :
      claimed ? `<div class="claimed-box"><b>You've claimed ${r}</b><p class="muted">Tell your friends where you are:</p>
        <a class="wa" href="${waLink(r, st)}" target="_blank" rel="noopener">${WA_ICON} Call the squad on WhatsApp</a>
        <div class="row" style="margin-top:8px"><button data-share>More apps…</button><button data-copy>Copy message</button><button data-release>Release room</button></div>
        <p class="msgprev">${esc(squadMsg(r, st))}</p></div>`
      : `<button class="pri big" data-claim>Claim this room</button>${st.state === "soon" ? `<p class="muted" style="margin-top:6px">Heads up: a class starts here in under 30 minutes.</p>` : ""}`}`;
}

function squadMsg(room, st) {
  const where = `${room} (${floorName(floorOf(room)).toLowerCase()})`;
  const until = st.untilSec == null ? "It's free for the rest of the day." : `It's free until ${hhmm(st.untilSec / 60)}.`;
  return `📍 Heading to ${where}. ${until} Come fast!`;
}
const waLink = (room, st) => "https://wa.me/?text=" + encodeURIComponent(squadMsg(room, st));
const WA_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';

function claimBanner() {
  const c = MAP.claim; if (!c || c.date !== ymd(mapNow())) return "";
  const st = liveStatus(c.room);
  return `<div class="claimed-box" style="margin-top:12px"><b>Your room: ${c.room}</b><p class="muted">${st.state === "busy" ? "A class has started here — time to move." : st.untilSec == null ? "Free for the rest of the day." : `Free for ${clock(st.secsLeft)} more`}</p>
    <a class="wa" href="${waLink(c.room, st)}" target="_blank" rel="noopener">${WA_ICON} Call the squad</a> <button data-open="${c.room}" style="margin-top:6px">Show on map</button></div>`;
}

function tickPanel() {
  const el = $("#cdown"); if (!el || !MAP.sel) { if (!MAP.sel) renderPanel(); return; }
  const st = liveStatus(MAP.sel);
  if (st.closed || (st.state !== "busy" && st.untilSec == null)) return;
  el.textContent = clock(st.secsLeft);
  if (st.secsLeft <= 1) { renderMap(); renderPanel(); }
}

function initMap() {
  renderMap(); renderPanel();
  $("#map3d").addEventListener("click", e => {
    const b = e.target.closest("[data-room]"); if (!b) return;
    MAP.sel = b.dataset.room; renderMap(); renderPanel();
    if (innerWidth < 900) $("#mappanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#mapfloors").addEventListener("click", e => { const b = e.target.closest("[data-focus]"); if (!b) return;
    MAP.focus = b.dataset.focus === "" ? null : +b.dataset.focus; renderMap(); });
  $("#maptilt").onclick = () => { $("#mapwrap").classList.toggle("flat"); $("#maptilt").textContent = $("#mapwrap").classList.contains("flat") ? "3D view" : "Top view"; };
  $("#mappanel").addEventListener("click", async e => {
    const t = e.target.closest("button,a"); if (!t) return;
    const r = MAP.sel;
    if (t.hasAttribute("data-close")) { MAP.sel = null; renderMap(); renderPanel(); }
    if (t.hasAttribute("data-claim")) { MAP.claim = { room: r, date: ymd(mapNow()), at: Date.now() }; try { localStorage.setItem("vc_claim", JSON.stringify(MAP.claim)); } catch {} renderMap(); renderPanel(); }
    if (t.hasAttribute("data-release")) { MAP.claim = null; try { localStorage.removeItem("vc_claim"); } catch {} renderMap(); renderPanel(); }
    if (t.hasAttribute("data-copy")) { try { await navigator.clipboard.writeText(squadMsg(r, liveStatus(r))); t.textContent = "Copied"; } catch { t.textContent = "Copy failed"; } }
    if (t.hasAttribute("data-share")) { const text = squadMsg(r, liveStatus(r)); if (navigator.share) navigator.share({ text }).catch(() => {}); else location.href = waLink(r, liveStatus(r)); }
    if (t.dataset.open) { MAP.sel = t.dataset.open; renderMap(); renderPanel(); }
  });
  // search results → open on map
  $("#rresult").addEventListener("click", e => { const c = e.target.closest("[data-maproom]"); if (!c) return;
    MAP.sel = c.dataset.maproom; MAP.focus = floorOf(MAP.sel); renderMap(); renderPanel(); $("#mapsec").scrollIntoView({ behavior: "smooth" }); });
  clearInterval(MAP.tick);
  let n = 0;
  MAP.tick = setInterval(() => { if ($("#tab-rooms").hidden) return; tickPanel(); if (++n % 20 === 0) { renderMap(); if (!MAP.sel) renderPanel(); } }, 1000);
}
