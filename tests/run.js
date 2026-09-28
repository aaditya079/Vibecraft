// Run:  node tests/run.js
// Loads the real app code (data.js, app.js, rooms.js) in a sandbox and checks the maths
// against brute-force simulation, plus timetable/room sanity checks.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const store = {};
const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Set, isFinite, setInterval() {}, setTimeout() {}, clearInterval() {},
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] },
  document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: { dataset: {} } },
  matchMedia: () => ({ matches: false }), location: { protocol: "file:", host: "" }, innerWidth: 1200,
};
vm.createContext(ctx);
for (const f of ["data.js", "app.js", "rooms.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/^(const|let) /gm, "var "), ctx, { filename: f });

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log("  ✗ " + msg); } };
const section = t => console.log("\n" + t);
const { need, analyse, SECTIONS, SEMESTER, DEFAULT_HOLIDAYS } = ctx;

// ── 1. "classes needed" formula vs brute force ──
section("1. Classes needed to reach a target (vs brute force)");
let rnd = 42; const rand = n => ((rnd = (rnd * 1103515245 + 12345) % 2 ** 31) % n);
for (let i = 0; i < 20000; i++) {
  const H = rand(80), A = rand(H + 1), R = rand(120), t = [75, 90][rand(2)];
  let brute = null; for (let x = 0; x <= R; x++) if ((A + x) * 100 >= t * (H + R)) { brute = x; break; }
  const n = need(A, H, R, t);
  if (brute === null) ok(n > R, `impossible case should need > R (A=${A},H=${H},R=${R},t=${t})`);
  else ok(n === brute, `need(${A},${H},${R},${t}) = ${n}, brute = ${brute}`);
}

// ── 2. Per-subject engine: % input, streak, safe skips, irreversible ──
section("2. Engine on real timetables (II BME, Mon 28 Sep 2026 10:00)");
const sec = SECTIONS.find(s => s.id === "II-BME");
const nowD = new Date("2026-09-28T10:00:00");
const run = inputs => analyse({ sec, now: nowD, planDate: SEMESTER.end, holidays: DEFAULT_HOLIDAYS, inputs, leaves: {} });
for (const p of [0, 12.5, 50, 74.9, 75, 80, 90, 100]) {
  const r = run({ A: { mode: "pct", pct: String(p) } }).res.A;
  ok(Math.abs(r.cur - p) < 1e-9, `entered ${p}% but engine shows ${r.cur}%`);
  // streak: attending `s75` classes in a row reaches 75%, s75-1 does not
  if (r.s75 > 0) { ok((r.A + r.s75) * 100 >= 75 * (r.H + r.s75) - 1e-9, `streak ${r.s75} reaches 75 (p=${p})`);
    ok((r.A + r.s75 - 1) * 100 < 75 * (r.H + r.s75 - 1), `streak ${r.s75} is minimal (p=${p})`); }
  // safe skips: skipping `bunk` keeps ≥75%, one more doesn't
  if (p >= 75) { ok(r.A * 100 >= 75 * (r.H + r.bunk) - 1e-9, `bunk ${r.bunk} keeps ≥75 (p=${p})`);
    ok(r.A * 100 < 75 * (r.H + r.bunk + 1), `bunk ${r.bunk} is maximal (p=${p})`); }
  // irreversible iff even perfect attendance stays under 75
  ok(r.irreversible === ((r.A + r.RS) * 100 < 75 * (r.H + r.RS)), `irreversible flag correct (p=${p})`);
}
const exact = run({ A: { mode: "exact", att: "3", held: "20" } }).res.A;
ok(exact.A === 3 && exact.H === 20 && Math.abs(exact.cur - 15) < 1e-9, "Count mode uses typed numbers");
ok(run({ A: { mode: "exact", att: "30", held: "20" } }).res.A.A === 20, "attended > held is clamped");
ok(run({ A: { mode: "pct", pct: "150" } }).res.A.cur === 100, "% above 100 is clamped");

// ── 3. Timetable facts ──
section("3. Timetable facts");
const held = sec => analyse({ sec, now: nowD, planDate: SEMESTER.end, holidays: DEFAULT_HOLIDAYS, inputs: {}, leaves: {} });
const all = ctx.sessions(sec, SEMESTER.start, SEMESTER.end, DEFAULT_HOLIDAYS);
ok(!all.some(c => ["2026-09-04", "2026-09-14", "2026-10-02", "2026-10-19", "2026-10-20"].includes(c.date)), "no classes on holidays");
ok(!all.some(c => [0, 6].includes(new Date(c.date + "T12:00").getDay())), "no classes on weekends");
ok(all[0].date === "2026-08-31", "first class is Mon 31 Aug (semester starts Sat 29 Aug)");
ok(all.at(-1).date === "2026-11-27", "last class is Fri 27 Nov");
const weekly = s => { const c = {}; for (const d of Object.values(s.grid)) for (const x of d) if (x) c[x] = (c[x] || 0) + 1; return c; };
ok(JSON.stringify(weekly(sec)) === JSON.stringify({ E: 3, C: 5, I: 2, D: 5, B: 3, A: 4, H: 3, G: 3, F: 1 }), "II BME weekly hours match the PDF");
ok(SECTIONS.length === 15, "15 sections loaded");
for (const s of SECTIONS) for (const d of Object.values(s.grid)) for (const x of d) if (x) ok(!!s.subjects[x], `${s.id}: slot ${x} has a subject`);

// ── 4. Free-room engine ──
section("4. Free rooms");
ctx.S.nowOverride = "2026-09-28T13:50";
const occ = ctx.occupancy("2026-09-28").occ;
const s710 = ctx.roomStatus(occ["IST 710"], 13 * 60 + 50, 60);
ok(s710.state === "free" && s710.freeUntil === 15 * 60 + 20, "IST 710 free 1:50 PM until 3:20 PM (I ECE-A Biology)");
const s602 = ctx.roomStatus(occ["IST 602"], 10 * 60, 60);
ok(s602.state === "busy", "IST 602 busy at 10 AM Monday");
ok(Object.values(ctx.occupancy("2026-10-02").occ).every(l => l.length === 0), "Gandhi Jayanthi: every room free");
for (const s of SECTIONS) { const m = ctx.ROOM_MAP[s.id]; ok(!!m && !!m.home, `${s.id} has a home room`); }
for (const r of Object.keys(occ)) for (const b of occ[r]) ok(b.end > b.start, `${r}: booking has positive length`);

section("5. Natural-language room parser");
const q = ctx.parseRoomQuery("I need an AC room on the ground floor for me and my team for the next 2 hours");
ok(q.floor === 0 && q.ac === true && q.people === 5 && q.duration === 120, "judges' example sentence");
const q2 = ctx.parseRoomQuery("any lab free at 2pm for 90 minutes");
ok(q2.type === "Lab" && q2.start === 14 * 60 && q2.duration === 90, "lab at 2pm for 90 minutes");
const q3 = ctx.parseRoomQuery("non-AC room on 3rd floor tomorrow at 10am for 3 hours, group of 8");
ok(q3.ac === false && q3.floor === 3 && q3.day === "tomorrow" && q3.start === 600 && q3.duration === 180 && q3.people === 8, "non-AC / 3rd floor / tomorrow 10am / 3h / 8");

console.log(`\n${fail ? "FAILED" : "ALL PASSED"} — ${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
