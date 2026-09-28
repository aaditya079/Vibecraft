// ═════════════ ALERT CENTRE — attendance + room alerts, toasts, browser notifications ═════════════
const AL = { fired: new Set(), open: false };

function collectAlerts() {
  const out = [];
  const s = sec(), a = run();
  const today = ymd(now()), nowMin = now().getHours() * 60 + now().getMinutes();
  for (const r of Object.values(a.res)) {
    if (!r.entered) continue;
    const name = s.subjects[r.k].name.replace(/\s*\(.*?\)/g, "");
    const next = r.fut[0];
    const startM = next ? toMin(s.periods[next.period - 1][0]) : 0;
    const nextTxt = !next ? null : next.date === today && startM <= nowMin ? `the one happening now (till ${hhmm(toMin(next.end))})`
      : next.date === today ? `today at ${hhmm(startM)}` : `${fmt(next.date)}, ${hhmm(startM)}`;
    if (r.irreversible) out.push({ lvl: 3, k: r.k, title: `${name}: irreversible detention`, body: `Max possible is ${p1(r.maxPct)}% even attending all ${r.RS} classes left. Talk to your HOD about condonation.` });
    else if (r.cur < 75) out.push({ lvl: 2, k: r.k, title: `${name} is below 75% (${p1(r.cur)}%)`, body: `Attend the next ${r.s75} classes in a row to get back${r.reach75 && r.reach75 !== "never" ? ` (by ${fmt(r.reach75)})` : ""}.${nextTxt ? ` Next class: ${nextTxt}.` : ""}` });
    else if (r.bunk === 0) out.push({ lvl: 1, k: r.k, title: `${name}: no skips left`, body: `You're at ${p1(r.cur)}% — missing even one class drops you below 75%.${nextTxt ? ` Don't miss ${nextTxt}.` : ""}` });
    if (r.missS && r.projEnd < 75 && !r.irreversible) out.push({ lvl: 2, k: r.k, title: `${name}: your leave plan puts you in detention`, body: `With the leave you planned you'd finish at ${p1(r.projEnd)}%. Remove some leave days or swap them for OD.` });
  }
  // room alerts (claimed room)
  if (typeof MAP !== "undefined" && MAP.claim && MAP.claim.date === ymd(mapNow())) {
    const st = liveStatus(MAP.claim.room);
    if (st.state === "busy") out.push({ lvl: 3, room: MAP.claim.room, title: `${MAP.claim.room}: a class has started`, body: `${st.by.sec} · ${st.by.subj} is using the room now. Find another free room.` });
    else if (st.untilSec != null && st.secsLeft <= 15 * 60) out.push({ lvl: 2, room: MAP.claim.room, title: `${MAP.claim.room}: class in ${Math.ceil(st.secsLeft / 60)} min`, body: `${st.next.sec} · ${st.next.subj} starts at ${hhmm(st.untilSec / 60)}. Start packing up.` });
  }
  return out.sort((x, y) => y.lvl - x.lvl);
}

function renderAlerts() {
  const list = collectAlerts();
  const badge = $("#albadge"), n = list.filter(x => x.lvl >= 2).length;
  badge.textContent = list.length; badge.hidden = !list.length;
  badge.className = n ? "hot" : "";
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  $("#alpanel").innerHTML = `<div class="alhead"><b>Alerts</b><span class="muted">${list.length ? list.length + " active" : "All clear"}</span></div>
    ${list.length ? list.map((x, i) => `<button class="alitem l${x.lvl}" data-al="${i}"><i></i><span><b>${esc(x.title)}</b><small>${esc(x.body)}</small></span></button>`).join("")
      : `<p class="muted" style="padding:6px 4px">No warnings. Enter your attendance and any risks will show up here.</p>`}
    ${perm === "default" ? `<button class="pri small" id="alperm" style="width:100%;margin-top:8px">Enable phone / desktop notifications</button>`
      : perm === "granted" ? `<p class="muted" style="font-size:12px;margin:8px 4px 0">Notifications on — you'll get a heads-up before a class starts in your claimed room.</p>` : ""}`;
  AL.list = list;
  // pop a toast + notification once for each new high-priority alert
  for (const x of list) {
    const key = x.title.replace(/\d+ min/, "");
    if (x.lvl >= 2 && !AL.fired.has(key)) { AL.fired.add(key); if (AL.ready) toast(x); }
  }
  AL.ready = true;
}

function toast(x) {
  const t = document.createElement("div");
  t.className = "toast l" + x.lvl;
  t.innerHTML = `<b>${esc(x.title)}</b><small>${esc(x.body)}</small>`;
  t.onclick = () => { t.remove(); openAlert(x); };
  $("#toasts").appendChild(t);
  setTimeout(() => t.classList.add("out"), 6500); setTimeout(() => t.remove(), 7000);
  try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(x.title, { body: x.body }); } catch {}
}

function openAlert(x) {
  $("#alpanel").hidden = true;
  if (x.room) { document.querySelector('[data-tab="rooms"]').click(); MAP.sel = x.room; renderMap(); renderPanel(); $("#mapsec").scrollIntoView({ behavior: "smooth" }); return; }
  document.querySelector('[data-tab="att"]').click();
  const row = document.querySelector(`[data-res="${x.k}"]`);
  if (row) { row.closest(".inrow").scrollIntoView({ behavior: "smooth", block: "center" }); row.closest(".inrow").classList.add("flash"); setTimeout(() => row.closest(".inrow")?.classList.remove("flash"), 1600); }
}

function initAlerts() {
  $("#albtn").onclick = e => { e.stopPropagation(); $("#alpanel").hidden = !$("#alpanel").hidden; renderAlerts(); };
  document.addEventListener("click", e => { if (!e.target.closest("#alpanel,#albtn")) $("#alpanel").hidden = true; });
  $("#alpanel").addEventListener("click", async e => {
    if (e.target.id === "alperm") { try { await Notification.requestPermission(); } catch {} renderAlerts(); return; }
    const b = e.target.closest("[data-al]"); if (b) openAlert(AL.list[+b.dataset.al]);
  });
  renderAlerts();
  // recheck whenever inputs change and every 20 s (for room countdowns)
  document.addEventListener("input", () => setTimeout(renderAlerts, 50));
  document.addEventListener("change", () => setTimeout(renderAlerts, 50));
  document.addEventListener("click", e => { if (e.target.closest("[data-claim],[data-release],#fillall,#reset,[data-sim],#simapply,#nowreset,[data-leave],#lvadd")) setTimeout(renderAlerts, 80); });
  setInterval(renderAlerts, 20000);
}
