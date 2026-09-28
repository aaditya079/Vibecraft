// Fast "lite" models first (big models are often overloaded); falls through on 503/404.
const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"].filter(Boolean);
// Attendance Advisor AI layer. The app computes exact numbers; the model only phrases advice.
// Set GEMINI_API_KEY (or ANTHROPIC_API_KEY) in Vercel env vars.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = req.body || {};
  const mode = body.mode;
  // cap inputs so a bad client can't send huge prompts
  const question = String(body.question || "").slice(0, 500);
  const computed = String(body.computed || "").slice(0, 3000);
  let context = {};
  try { context = JSON.stringify(body.context || {}).length <= 6000 ? body.context || {} : { note: "context too large" }; } catch {}
  if (mode === "parse") return parseRooms(question, res);
  const system = "You are a college Attendance Advisor. COMPUTED is the exact answer from the student's dashboard. Reply in AT MOST 2 short sentences (under 35 words total): the verdict, then the single most important number or action. Copy numbers exactly from COMPUTED; never invent or recalculate. No lists, no greetings.";
  const prompt = `QUESTION: ${question}\n\nCOMPUTED (exact, trust this): ${computed}\n\nCONTEXT: ${JSON.stringify(context)}`;
  try {
    if (process.env.GEMINI_API_KEY) {
      // try newest models first; fall back if one is retired
      const models = GEMINI_MODELS;
      let lastErr = "";
      for (const m of models) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
          method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });
        const j = await r.json();
        const reply = j.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
        if (reply) return res.json({ reply, model: m });
        lastErr = j.error?.message || "empty";
      }
      return res.status(502).json({ error: lastErr });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, system, messages: [{ role: "user", content: prompt }] }),
      });
      const j = await r.json();
      return res.json({ reply: j.content?.[0]?.text || "" });
    }
    return res.status(503).json({ error: "no key" });
  } catch (e) { return res.status(500).json({ error: String(e) }); }
}

// Round 2: turn a free-text room request into structured filters (JSON) with Gemini.
async function parseRooms(q, res) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "no key" });
  const now = new Date(Date.now() + 5.5 * 3600e3); // IST
  const sys = `Extract room-search filters from a college student's request. Current IST time: ${now.toISOString().slice(0, 16)} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][now.getUTCDay()]}).
Return ONLY JSON with keys: floor (0=ground,1=first,...; null if not said), ac (true/false/null), type ("Lab"|"Seminar / CDC"|"Classroom"|"Workshop"|null),
people (integer; "me and my team" = 5, "me and a friend" = 2; null if unknown), duration (minutes; "rest of the day" = "eod"; null if not said),
start (minutes after midnight, 24h; null means now), day ("tomorrow" or 3-letter weekday lowercase like "wed"; null = today), quiet (true if they want quiet/study).`;
  const models = GEMINI_MODELS;
  for (const m of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text: String(q || "").slice(0, 500) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 } }),
      });
      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
      if (txt) { try { return res.json({ filters: JSON.parse(txt.replace(/^```json|```$/g, "")), model: m }); } catch {} }
    } catch {}
  }
  return res.status(502).json({ error: "parse failed" });
}
