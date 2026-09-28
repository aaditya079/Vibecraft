// Attendance Advisor AI layer. The app computes exact numbers; the model only phrases advice.
// Set GEMINI_API_KEY (or ANTHROPIC_API_KEY) in Vercel env vars.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { question, context, computed } = req.body || {};
  const system = "You are a friendly college Attendance Advisor. Answer in 2-4 short sentences. Use ONLY the numbers in COMPUTED/CONTEXT; never invent or recalculate numbers. Give a clear verdict and one practical tip.";
  const prompt = `CONTEXT: ${JSON.stringify(context)}\nCOMPUTED: ${computed}\nQUESTION: ${question}`;
  try {
    if (process.env.GEMINI_API_KEY) {
      // try newest models first; fall back if one is retired
      const models = [process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean);
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
