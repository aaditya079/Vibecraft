// ═════════════ ROUND 2 · FREE CLASS LOCATOR ═════════════
// Room of every timetable cell, read from the 10 timetable PDFs.
// home = the section's venue; subj = rooms for a slot letter; cell = "Day+period" overrides.
// "a|b" = both rooms used (lab batches split). "" = room not printed in the timetable (skipped).
const ROOM_MAP = {
  "I-ECE-A": { home: "IST 602", subj: {}, cell: { Mon6: "", Mon7: "", Mon8: "IST 710", Mon9: "IST 710", Tue6: "IST 20|IST 21", Tue7: "IST 20|IST 21", Tue8: "IST 20|IST 21", Tue9: "IST 20|IST 21",
    Wed6: "IST 618", Wed7: "IST 618", Wed8: "IST 108", Wed9: "IST 108", Thu6: "IST 510", Thu7: "IST 510", Thu8: "IST 201", Thu9: "IST 201", Fri7: "IST 626", Fri8: "IST 626", Fri9: "IST 626" } },
  "I-ECE-B": { home: "IST 602", subj: {}, cell: { Mon1: "IST 609", Mon2: "IST 710", Mon3: "", Mon4: "", Tue1: "IST 20|IST 21", Tue2: "IST 20|IST 21", Tue3: "IST 20|IST 21", Tue4: "IST 20|IST 21",
    Wed1: "IST 710", Wed2: "IST 617", Wed3: "IST 510", Wed4: "IST 510", Wed5: "IST 618", Thu1: "IST 201", Thu2: "IST 201", Thu3: "IST 626", Thu4: "IST 710", Fri1: "IST 617", Fri2: "IST 617", Fri4: "IST 626", Fri5: "IST 626", Fri6: "IST 626" } },
  "I-EEE": { home: "IST 602", subj: {}, cell: { Mon1: "IST 609", Mon2: "IST 520", Mon3: "", Mon4: "", Tue1: "IST 20|IST 21", Tue2: "IST 20|IST 21", Tue3: "IST 20|IST 21", Tue4: "IST 20|IST 21",
    Wed1: "IST 520", Wed2: "IST 617", Wed3: "IST 510", Wed4: "IST 510", Wed5: "IST 618", Thu1: "IST 201", Thu2: "IST 201", Thu3: "IST 626", Thu4: "IST 710", Fri1: "IST 617", Fri2: "IST 617", Fri4: "IST 626", Fri5: "IST 626", Fri6: "IST 626" } },
  "I-ECE-DS": { home: "IST 502", subj: {}, cell: { Mon1: "IST 710", Mon2: "", Mon3: "IST 617", Mon4: "IST 617", Tue1: "", Tue2: "", Tue3: "IST 201", Tue4: "IST 201", Wed1: "IST 510", Wed2: "IST 510", Wed3: "IST 710",
    Wed5: "IST 617", Wed6: "IST 617", Thu1: "IST 710", Thu2: "IST 510", Thu3: "IST 710", Fri1: "IST 626", Fri2: "IST 626", Fri3: "IST 626", Fri6: "IST 20|IST 21", Fri7: "IST 20|IST 21", Fri8: "IST 20|IST 21", Fri9: "IST 20|IST 21" } },
  "I-BT-B": { home: "IST 702", subj: {}, cell: { Mon1: "IST 520", Mon2: "", Mon3: "", Mon4: "IST 710", Tue1: "IST 710", Tue2: "IST 710", Tue3: "IST 520", Tue4: "IST 710",
    Wed1: "IST 20|IST 21", Wed2: "IST 20|IST 21", Wed3: "IST 20|IST 21", Wed4: "IST 20|IST 21", Thu1: "", Thu2: "", Thu3: "IST 710", Thu4: "IST 510", Fri8: "", Fri9: "" } },
  "I-BME": { home: "IST 702", subj: {}, cell: { Mon2: "", Mon3: "", Mon4: "IST 520", Tue1: "IST 710", Tue2: "IST 710",
    Wed1: "IST 20|IST 21", Wed2: "IST 20|IST 21", Wed3: "IST 20|IST 21", Wed4: "IST 20|IST 21", Thu1: "", Thu2: "", Thu3: "IST 710", Thu4: "IST 520", Fri8: "", Fri9: "" } },
  "II-BME": { home: "IST 602", subj: { H: "TB 106" }, cell: { Mon6: "IST 107|IST 309", Mon7: "IST 107|IST 309", Thu8: "IST 107|IST 309", Thu9: "IST 107|IST 309" } },
  "II-ECE-DS-A": { home: "IST 416", subj: { G: "IST 602", H: "TB 106", L: "IST 309|IST 107" }, cell: {} },
  "II-ECE-DS-B": { home: "IST 411", subj: { G: "IST 401", H: "TB 106", L: "IST 309|IST 107" }, cell: {} },
  "III-BME": { home: "IST 211", subj: { G: "IST 625", I: "IST 108" }, cell: { Mon3: "IST 107", Mon4: "IST 107", Tue1: "IST 108", Tue2: "IST 108" } },
  "III-ECE-A": { home: "IST 518", subj: { G: "IST 625", L: "IST 108|IST 309" }, cell: {} },
  "III-ECE-B": { home: "IST 518", subj: { G: "IST 625", L: "IST 108|IST 309" }, cell: {} },
  "III-ECE-DS": { home: "IST 519", subj: { G: "IST 625", L: "IST 108|IST 107" }, cell: {} },
  "IV-ECE-A": { home: "IST 225", subj: {}, cell: { Wed2: "IST 108" } },
  "IV-ECE-B": { home: "IST 227", subj: {}, cell: { Thu3: "IST 108" } },
};

// Room facts NOT in the timetables (AC, capacity, type) — sensible defaults, editable in the UI.
const ROOM_DEFAULTS = (() => {
  const d = {};
  const add = (names, type, ac, cap, label) => names.forEach(n => (d[n] = { type, ac, cap, label: label || "" }));
  add(["IST 107", "IST 108", "IST 309", "IST 617", "IST 618"], "Lab", true, 36);
  add(["IST 510", "IST 609", "IST 625", "TB 106"], "Seminar / CDC", true, 60);
  add(["IST 20", "IST 21"], "Workshop", false, 60);
  add(["IST 201", "IST 211", "IST 225", "IST 227", "IST 401", "IST 411", "IST 416", "IST 502", "IST 518", "IST 519", "IST 520", "IST 602", "IST 626", "IST 702", "IST 710"], "Classroom", false, 65);
  d["IST 107"].label = "Microprocessor lab"; d["IST 108"].label = "Electronics lab"; d["IST 618"].label = "PPS lab"; d["IST 617"].label = "PCB / PPS lab"; d["TB 106"].label = "CDC room";
  return d;
})();

const RS = {
  info: (() => { try { return { ...ROOM_DEFAULTS, ...(JSON.parse(localStorage.getItem("vc_rooms")) || {}) }; } catch { return { ...ROOM_DEFAULTS }; } })(),
  date: null, time: null, dur: 60, acOnly: false, labOnly: false, oneIsGround: false,
};
const saveRooms = () => { try { localStorage.setItem("vc_rooms", JSON.stringify(RS.info)); } catch {} };
const ALL_ROOMS = Object.keys(ROOM_DEFAULTS).sort((a, b) => floorOf(a) - floorOf(b) || a.localeCompare(b, undefined, { numeric: true }));

function floorOf(room) {
  const m = room.match(/(\d+)/); const n = m ? +m[1] : 0;
  const f = n < 100 ? 0 : Math.floor(n / 100);
  return RS && RS.oneIsGround ? Math.max(0, f - 1) : f;
}
const floorName = f => (f === 0 ? "Ground floor" : ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"][f] + " floor");
const building = r => (r.startsWith("TB") ? "TB block" : "IST block");
const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const hhmm = m => { let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${pad(mm)} ${ap}`; };
const DAY_START = 9 * 60, DAY_END = 17 * 60 + 5;

function roomsFor(secId, day, p, subj) {
  const m = ROOM_MAP[secId]; if (!m) return [];
  const key = day + p;
  const v = key in m.cell ? m.cell[key] : subj in m.subj ? m.subj[subj] : m.home;
  return v ? v.split("|") : [];
}

// All bookings on a date, per room
function occupancy(date) {
  const occ = {}; ALL_ROOMS.forEach(r => (occ[r] = []));
  const dayName = DAYS[parseYmd(date).getDay()];
  if (S.holidays.some(h => h.date === date)) return { occ, closed: "holiday" };
  if (dayName === "Sat" || dayName === "Sun") return { occ, closed: "weekend" };
  for (const sec of SECTIONS) {
    const row = sec.grid[dayName]; if (!row) continue;
    row.forEach((subj, i) => {
      if (!subj) return;
      for (const room of roomsFor(sec.id, dayName, i + 1, subj)) {
        (occ[room] ||= []).push({ start: toMin(sec.periods[i][0]), end: toMin(sec.periods[i][1]), sec: sec.name, subj: sec.subjects[subj].name });
      }
    });
  }
  for (const r in occ) occ[r].sort((a, b) => a.start - b.start);
  return { occ, closed: null };
}

// Status of one room for the window [t, t+dur)
function roomStatus(list, t, dur) {
  const end = t + dur;
  const clash = list.filter(b => b.start < end && b.end > t);
  const now = list.find(b => b.start <= t && b.end > t);
  if (now) { // busy now → when does it free up (chain back-to-back bookings, <=10 min gaps)
    let freeAt = now.end;
    for (const b of list) if (b.start >= now.start && b.start <= freeAt + 10 && b.end > freeAt) freeAt = b.end;
    return { state: "busy", by: now, freeAt };
  }
  const next = list.find(b => b.start >= t);
  const freeUntil = next ? next.start : null; // null = rest of the day
  return { state: clash.length ? "partial" : "free", freeUntil, next, freeFor: (freeUntil ?? DAY_END) - t };
}

// ── Natural-language request → filters (on-device parser; the Gemini API refines it when available) ──
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, couple: 2, few: 3, half: 0.5 };
function parseRoomQuery(q) {
  const low = " " + q.toLowerCase() + " ";
  const f = { floor: null, ac: null, type: null, people: null, duration: null, start: null, day: null, quiet: /quiet|silent|peace|study|focus/.test(low) };
  // floor
  const fl = low.match(/\b(ground|first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|top)\s*floor|floor\s*(\d)/);
  if (fl) { const w = fl[1] || fl[2]; const map = { ground: 0, first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, fifth: 5, "5th": 5, sixth: 6, "6th": 6, seventh: 7, "7th": 7 };
    f.floor = w === "top" ? Math.max(...ALL_ROOMS.map(floorOf)) : map[w] ?? +w; }
  // AC
  if (/\bnon[- ]?a\.?c\b|without (an )?a\.?c|no a\.?c\b/.test(low)) f.ac = false;
  else if (/\ba\.?c\b|a\/c|air[- ]?con/.test(low)) f.ac = true;
  // type
  if (/\blab\b|laboratory|computer|system/.test(low)) f.type = "Lab";
  else if (/seminar|hall|auditorium|presentation|projector/.test(low)) f.type = "Seminar / CDC";
  else if (/workshop/.test(low)) f.type = "Workshop";
  else if (/classroom|class room/.test(low)) f.type = "Classroom";
  // group size
  let m = low.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(people|persons|ppl|of us|members|students|friends|guys|folks)/) || low.match(/group of\s*(\d+|\w+)/) || low.match(/team of\s*(\d+|\w+)/);
  if (m) f.people = WORDNUM[m[1]] ?? +m[1];
  else if (/my (team|group|project group|gang|squad)|me and my (team|group)|our team/.test(low)) f.people = 5;
  else if (/me and my (friend|buddy|partner)|two of us/.test(low)) f.people = 2;
  else if (/\b(alone|just me|myself|only me)\b/.test(low)) f.people = 1;
  // duration
  m = low.match(/(\d+(?:\.\d+)?|one|two|three|four|five|an?|half an?)\s*(?:-\s*)?(hours?|hrs?|h)\b/);
  if (m) f.duration = Math.round((WORDNUM[m[1]] ?? (m[1].startsWith("half") ? 0.5 : +m[1])) * 60);
  m = low.match(/(\d+)\s*(min|mins|minutes)\b/); if (m) f.duration = +m[1];
  if (/half an hour/.test(low)) f.duration = 30;
  if (/rest of the day|whole day|all day|till evening|until evening/.test(low)) f.duration = "eod";
  // start time
  const tm = low.match(/\b(?:at|from|by|around|after)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/) || low.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm)?\b/) || low.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (tm && !/(hours?|hrs?|min)/.test(low.slice(low.indexOf(tm[0]) + tm[0].length, low.indexOf(tm[0]) + tm[0].length + 6))) {
    let h = +tm[1], mi = tm[2] && /^\d{2}$/.test(tm[2]) ? +tm[2] : 0; const ap = tm[3] || (tm[2] && /am|pm/.test(tm[2]) ? tm[2] : null);
    if (ap === "pm" && h < 12) h += 12; if (!ap && h >= 1 && h <= 7) h += 12; if (ap === "am" && h === 12) h = 0;
    if (h >= 0 && h < 24) f.start = h * 60 + mi;
  }
  if (f.start == null) { if (/after lunch/.test(low)) f.start = 13 * 60 + 30; else if (/\bmorning\b/.test(low)) f.start = 9 * 60; else if (/\bafternoon\b/.test(low)) f.start = 13 * 60 + 30; }
  const until = low.match(/\b(?:till|until|upto|up to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (until) { let h = +until[1]; const mi = +(until[2] || 0); if (until[3] === "pm" && h < 12) h += 12; if (!until[3] && h <= 7) h += 12; f.until = h * 60 + mi; }
  // day
  if (/tomorrow|tmrw/.test(low)) f.day = "tomorrow";
  const dn = low.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/); if (dn) f.day = dn[1];
  return f;
}

async function llmParse(q) {
  if (!/^https?:/.test(location.protocol) || /claude\.ai|claudeusercontent/.test(location.host)) return null;
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch("/api/chat", { method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "parse", question: q }) });
    if (!r.ok) return null; const j = await r.json(); return j.filters || null;
  } catch { return null; }
}

function resolveDate(dayWord) {
  const base = ymd(now());
  if (!dayWord) return base;
  if (dayWord === "tomorrow") return addDays(base, 1);
  const target = DAYS.findIndex(d => d.toLowerCase() === dayWord.slice(0, 3)); if (target < 0) return base;
  let d = parseYmd(base); while (d.getDay() !== target) d.setDate(d.getDate() + 1); return ymd(d);
}
const nowMin = () => { const n = now(); return n.getHours() * 60 + n.getMinutes(); };

function findRooms(f) {
  const date = resolveDate(f.day);
  let t = f.start ?? (date === ymd(now()) ? nowMin() : DAY_START);
  if (date === ymd(now()) && t < nowMin() && f.start == null) t = nowMin();
  let dur = f.duration === "eod" ? Math.max(30, DAY_END - t) : f.until ? f.until - t : f.duration || 60;
  if (dur <= 0) dur = 60;
  const { occ, closed } = occupancy(date);
  const rows = ALL_ROOMS.map(r => ({ room: r, info: RS.info[r], floor: floorOf(r), st: roomStatus(occ[r], t, dur) }));
  const need = [];
  const ok = (x, relax = {}) => x.st.state === "free" &&
    (relax.floor || f.floor == null || x.floor === f.floor) &&
    (relax.ac || f.ac == null || x.info.ac === f.ac) &&
    (relax.type || !f.type || x.info.type === f.type) &&
    (!f.people || x.info.cap >= f.people) &&
    !(f.quiet && !f.type && x.info.type === "Workshop");
  const rank = (a, b) => (f.floor != null ? Math.abs(a.floor - f.floor) - Math.abs(b.floor - f.floor) : 0) || (b.st.freeFor - a.st.freeFor) || a.floor - b.floor;
  let exact = rows.filter(x => ok(x)).sort(rank), relaxed = [], relaxedWhat = [];
  if (!exact.length) {
    for (const combo of [{ floor: 1 }, { ac: 1 }, { type: 1 }, { floor: 1, ac: 1 }, { floor: 1, type: 1 }, { ac: 1, type: 1 }, { floor: 1, ac: 1, type: 1 }]) {
      if (Object.keys(combo).some(k => (k === "floor" ? f.floor == null : k === "ac" ? f.ac == null : !f.type))) continue;
      relaxed = rows.filter(x => ok(x, combo)).sort(rank);
      if (relaxed.length) { relaxedWhat = Object.keys(combo); break; }
    }
  }
  // what exists on the asked floor (to explain misses)
  const onFloor = f.floor != null ? rows.filter(x => x.floor === f.floor) : [];
  return { date, t, dur, closed, exact, relaxed, relaxedWhat, onFloor, rows };
}

// ── UI ──
function chip(txt) { return `<span class="qchip">${txt}</span>`; }
function describeFilters(f, r) {
  const c = [];
  c.push(chip(`${r.date === ymd(now()) ? "Today" : fmt(r.date)}, ${hhmm(r.t)} – ${hhmm(r.t + r.dur)}`));
  if (f.floor != null) c.push(chip(floorName(f.floor)));
  if (f.ac != null) c.push(chip(f.ac ? "AC" : "Non-AC"));
  if (f.type) c.push(chip(f.type));
  if (f.people) c.push(chip(`${f.people} ${f.people === 1 ? "person" : "people"}`));
  if (f.quiet) c.push(chip("Quiet · longest free first"));
  return c.join("");
}
function roomCard(x, r) {
  const i = x.info, fu = x.st.freeUntil;
  return `<div class="rcard" data-maproom="${x.room}"><div class="rtop"><b>${x.room}</b><span class="pill ok">Free</span></div>
    <div class="muted">${floorName(x.floor)} · ${building(x.room)}${i.label ? " · " + esc(i.label) : ""}</div>
    <div class="rmeta"><span>${i.ac ? "AC" : "Non-AC"}</span><span>${esc(i.type)}</span><span>~${i.cap} seats</span></div>
    <div class="rfree">Free ${fu == null ? "for the rest of the day" : "until " + hhmm(fu)}${fu != null && x.st.next ? `<small>Next: ${esc(x.st.next.sec)} · ${esc(x.st.next.subj)}</small>` : ""}</div><div class="onmap">Open on map · claim · share →</div></div>`;
}

async function runRoomSearch(q) {
  if (!q.trim()) return;
  const out = $("#rresult");
  out.innerHTML = `<p class="muted">Reading your request…</p>`;
  let f = parseRoomQuery(q), by = "on-device parser";
  const ai = await llmParse(q);
  if (ai && typeof ai === "object") { // AI fills or corrects fields
    for (const k of ["floor", "ac", "type", "people", "duration", "start", "day", "until", "quiet"]) if (ai[k] !== undefined && ai[k] !== null && ai[k] !== "") f[k] = ai[k];
    by = "Gemini";
  }
  const r = findRooms(f);
  const head = `<div class="qchips">${describeFilters(f, r)}<span class="muted" style="margin-left:4px">understood by ${by}</span></div>`;
  if (r.closed) { out.innerHTML = head + `<div class="rnote">No classes on ${fmt(r.date)} (${r.closed}) — every room in the timetables is free, if the building is open.</div>`; return; }
  let body = "";
  if (r.exact.length) {
    body += `<p class="rsum"><b>${r.exact.length} room${r.exact.length > 1 ? "s" : ""}</b> free for the whole ${fmtDur(r.dur)} and matching everything you asked for.</p>`;
    body += `<div class="rcards">${r.exact.slice(0, 6).map(x => roomCard(x, r)).join("")}</div>`;
  } else {
    const why = [];
    if (f.floor != null) {
      const fl = r.onFloor, freeFl = fl.filter(x => x.st.state === "free");
      if (!fl.length) why.push(`there are no rooms on the ${floorName(f.floor).toLowerCase()} in these timetables`);
      else if (f.ac != null && !fl.some(x => x.info.ac === f.ac)) why.push(`the ${floorName(f.floor).toLowerCase()} only has ${fl.map(x => x.room).join(", ")} — none ${f.ac ? "with" : "without"} AC`);
      else if (!freeFl.length) why.push(`every room on the ${floorName(f.floor).toLowerCase()} has a class in that window`);
    }
    body += `<p class="rsum"><b>No exact match.</b> ${why.length ? "Reason: " + why.join("; ") + "." : "Nothing fits every condition for that whole window."}</p>`;
    if (r.relaxed.length) {
      body += `<p class="muted">Closest options (relaxing ${r.relaxedWhat.map(k => (k === "floor" ? "the floor" : k === "ac" ? "AC" : "room type")).join(" and ")}):</p>`;
      body += `<div class="rcards">${r.relaxed.slice(0, 6).map(x => roomCard(x, r)).join("")}</div>`;
    } else body += `<p class="muted">Try a shorter duration or another time.</p>`;
  }
  out.innerHTML = head + body;
  // sync the grid to the searched window
  RS.date = r.date; RS.time = r.t; RS.dur = r.dur; renderGrid();
}
const fmtDur = m => (m % 60 === 0 ? `${m / 60} hour${m === 60 ? "" : "s"}` : m > 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

function renderGrid() {
  const date = RS.date || ymd(now());
  const t = RS.time ?? Math.max(DAY_START, Math.min(nowMin(), DAY_END - 30));
  const dur = RS.dur || 60;
  $("#rdate").value = date; $("#rtime").value = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; $("#rdur").value = String(dur);
  $("#racOnly").checked = RS.acOnly; $("#rlabOnly").checked = RS.labOnly;
  const { occ, closed } = occupancy(date);
  const floors = {};
  let freeCount = 0, total = 0;
  for (const room of ALL_ROOMS) {
    const info = RS.info[room];
    if (RS.acOnly && !info.ac) continue; if (RS.labOnly && info.type !== "Lab") continue;
    const st = roomStatus(occ[room], t, dur); total++; if (st.state === "free") freeCount++;
    (floors[floorOf(room)] ||= []).push({ room, info, st });
  }
  $("#rgridsum").innerHTML = closed ? `No classes on ${fmt(date)} (${closed}) — all rooms free.`
    : `<b>${freeCount}</b> of ${total} rooms free from <b>${hhmm(t)}</b> to <b>${hhmm(t + dur)}</b> on ${date === ymd(now()) ? "today" : fmt(date)}.`;
  $("#rgrid").innerHTML = Object.keys(floors).sort((a, b) => a - b).map(fl => {
    const list = floors[fl], nFree = list.filter(x => x.st.state === "free").length;
    return `<div class="floor"><div class="floorhead"><b>${floorName(+fl)}</b><span class="muted">${nFree} of ${list.length} free</span></div>
      <div class="tiles">${list.map(({ room, info, st }) => {
        const cls = closed ? "free" : st.state;
        const sub = closed ? "Free all day" : st.state === "free" ? (st.freeUntil == null ? "Free rest of day" : `Free till ${hhmm(st.freeUntil)}`)
          : st.state === "partial" ? `Free ${st.freeFor} min, then ${esc(st.next.sec)}` : `${esc(st.by.sec)} · till ${hhmm(st.freeAt)}`;
        const tip = st.by ? `${st.by.sec} — ${st.by.subj}` : st.next ? `Next: ${st.next.sec} — ${st.next.subj} at ${hhmm(st.next.start)}` : "";
        return `<div class="tile ${cls}" title="${esc(tip)}"><div class="tname">${room}${info.ac ? '<span class="ac">AC</span>' : ""}</div><div class="tsub">${sub}</div></div>`;
      }).join("")}</div></div>`;
  }).join("");
}

function renderRoomEditor() {
  $("#redit").innerHTML = `<table class="redit"><tr><th>Room</th><th>Floor</th><th>Type</th><th>AC</th><th>Seats</th></tr>${ALL_ROOMS.map(r => { const i = RS.info[r];
    return `<tr><td>${r}</td><td>${floorName(floorOf(r)).replace(" floor", "")}</td>
    <td><select data-rt="${r}">${["Classroom", "Lab", "Seminar / CDC", "Workshop"].map(t => `<option ${t === i.type ? "selected" : ""}>${t}</option>`).join("")}</select></td>
    <td><input type="checkbox" data-rac="${r}" ${i.ac ? "checked" : ""}></td><td><input type="number" data-rcap="${r}" value="${i.cap}" style="width:70px"></td></tr>`; }).join("")}</table>`;
}

function initRooms() {
  renderGrid(); renderRoomEditor(); initMap();
  $("#rsearch").onsubmit = e => { e.preventDefault(); runRoomSearch($("#rq").value); };
  document.querySelectorAll("[data-rq]").forEach(b => (b.onclick = () => { $("#rq").value = b.dataset.rq; runRoomSearch(b.dataset.rq); }));
  $("#rdate").onchange = e => { RS.date = e.target.value; renderGrid(); };
  $("#rtime").onchange = e => { const [h, m] = e.target.value.split(":").map(Number); RS.time = h * 60 + m; renderGrid(); };
  $("#rdur").onchange = e => { RS.dur = +e.target.value; renderGrid(); };
  $("#rnow").onclick = () => { RS.date = null; RS.time = null; renderGrid(); };
  $("#racOnly").onchange = e => { RS.acOnly = e.target.checked; renderGrid(); };
  $("#rlabOnly").onchange = e => { RS.labOnly = e.target.checked; renderGrid(); };
  $("#rground").onchange = e => { RS.oneIsGround = e.target.checked; renderGrid(); renderRoomEditor(); };
  $("#redit").addEventListener("change", e => {
    const el = e.target, r = el.dataset.rt || el.dataset.rac || el.dataset.rcap; if (!r) return;
    if (el.dataset.rt) RS.info[r] = { ...RS.info[r], type: el.value };
    if (el.dataset.rac) RS.info[r] = { ...RS.info[r], ac: el.checked };
    if (el.dataset.rcap) RS.info[r] = { ...RS.info[r], cap: +el.value };
    saveRooms(); renderGrid();
  });
  $("#rreset").onclick = () => { RS.info = { ...ROOM_DEFAULTS }; saveRooms(); renderRoomEditor(); renderGrid(); };
  setInterval(() => { if (RS.time == null && !$("#tab-rooms").hidden) renderGrid(); }, 60000);
}
