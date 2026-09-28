// Optional Vercel serverless function: set ANTHROPIC_API_KEY in Vercel env vars to enable AI-phrased replies.
// The browser already computes exact numbers; the model only turns them into friendly advice.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "no key" });
  const { question, context, computed } = req.body || {};
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 300,
      system: "You are a friendly college Attendance Advisor. Answer in 2-4 short sentences. Use ONLY the numbers in COMPUTED/CONTEXT; never invent or recalculate numbers. Give a clear verdict and one practical tip.",
      messages: [{ role: "user", content: `CONTEXT: ${JSON.stringify(context)}\nCOMPUTED: ${computed}\nQUESTION: ${question}` }],
    }),
  });
  if (!r.ok) return res.status(502).json({ error: "llm" });
  const j = await r.json();
  res.json({ reply: j.content?.[0]?.text || "" });
}
