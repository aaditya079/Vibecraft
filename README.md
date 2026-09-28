# Campus Planner — Attendance & Free Rooms

One web app, two tools, built on the 10 official timetables (SRMIST Trichy, School of EEE, odd semester 2026-27):

| Tab | What it does |
|---|---|
| **Attendance** | Pick your section, enter your current %, and see classes left, how many you must attend for 75% / 90%, how many you can skip, charts, an OD / medical-leave simulator, an **Irreversible Detention** alert, and an AI Attendance Advisor chat. |
| **Free rooms** | Floor-by-floor grid of empty rooms, an AI search bar ("AC room on the ground floor for my team for 2 hours"), a 3D building map with live countdowns, and "Call the squad" on WhatsApp. |

Live: deployed on Vercel (static site + one serverless function in `api/chat.js`).

## How the numbers are calculated

All times are college time (IST), whatever timezone the device is set to.

- **Classes in the semester** — every timetable period from Sat 29 Aug to Sun 29 Nov 2026, skipping weekends and holidays. Holidays are the Tamil Nadu govt holidays that fall on weekdays in the semester (4 Sep, 14 Sep, 2 Oct, 19 Oct, 20 Oct) and can be edited in the app.
- **Held so far** — periods whose end time has already passed. Today's finished periods count; the rest of today counts as "left".
- **Attended** — in % mode, `attended = % × held`. This is kept as an exact fraction so the % shown is exactly what you typed. In Count mode, your whole numbers are used as they are.
- **Classes needed for target t** — `max(0, ⌈t·(held + left) − attended⌉)`. If that is more than the classes left, the target is flagged as unreachable.
- **Irreversible detention** — `(attended + left) / (held + left) < 75%`: even attending every remaining class can't reach 75%.
- **Classes in a row to recover** — `⌈(t·held − attended) / (1 − t)⌉`. It also shows the date of that class.
- **Safe skips right now** — `⌊attended / 0.75 − held⌋`.
- **OD** counts as present. **Medical leave** and **Skip** count as absent. Past OD days are added back to attendance.

The AI (Gemini) never does the maths. The app computes every number itself, and the model only rewrites the result in plain words or turns a free-text room request into filters. If the AI is down, both features still work fully.

## Data and assumptions

- **Timetables** — all 15 sections were transcribed from the PDFs into `data.js`. The I-year PDF contains 6 sections. Lab cells are credited to the course that owns them, e.g. "DLMS/EEC lab" or "B-Proj".
- **Rooms** — `rooms.js` maps every timetable cell to a room: the section's venue for regular slots, plus the rooms printed for labs, CDC, workshop and NSS. That gives 26 rooms. A few I-year sessions don't print a room (Chemistry lab, Yoga, one CDC and one PPS-lab slot), so those sessions are not counted.
- **Floor** — the first digit of the room number; IST 20/21 are the ground floor. A toggle in the app treats 1xx rooms as ground floor instead.
- **AC, seats, room type** — these are not in the timetables. The defaults (labs and CDC rooms have AC, classrooms and workshops don't) are estimates and can be edited in the app.
- **Source quirks, kept as printed** — CDC slots (G/H) have 3 periods a week where the credits say 2. I-year German/Japanese has two 3-period blocks, likely split between language batches.
- **I-year timetables** — the I-year PDF is labelled 2024-25. It is used as given.

## Tests

```
node tests/run.js
```

Runs 20,000+ checks on the real code:
- the "classes needed", "classes in a row" and "safe skips" formulas are checked against brute-force simulation;
- % input round-trips exactly;
- no classes are scheduled on holidays or weekends, and the first and last class dates are right;
- weekly hours match the PDF;
- room status is checked against known cases (e.g. IST 710 is free on Mon 1:50 PM until 3:20 PM);
- the room-request parser handles the judges' example sentence.

## Files

- `index.html` — layout and styles (Apple-style, light and dark mode)
- `data.js` — timetables, semester dates, holidays
- `app.js` — attendance engine, charts, leave simulator, Advisor chat
- `rooms.js` — room map, free-room engine, AI search, floor grid
- `map3d.js` — 3D building map, live countdown, claim and WhatsApp share
- `api/chat.js` — Vercel function that calls Gemini (set `GEMINI_API_KEY`); tries fast models first and falls back automatically
- `tests/run.js` — test suite
