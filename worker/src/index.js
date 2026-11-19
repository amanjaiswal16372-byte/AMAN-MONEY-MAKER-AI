export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...cors,
          "Content-Type": "application/json"
        }
      });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method === "GET") {
      return json({
        status: "ONLINE",
        name: "AMAN MONEY MAKER AI",
        brain: "Gemini"
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "API Key not configured" }, 500);
    }

    try {
      const body = await request.json();
      const task = String(body.task || "").slice(0, 4000);

      if (!task.trim()) {
        return json({ error: "Please enter a task" }, 400);
      }

      const prompt = `
You are AMAN MONEY MAKER AI.

Help run a legitimate digital services business.

Services:
- Small business websites
- Digital catalogues
- Social media posters
- Product listings
- Website maintenance

Rules:
1. Never invent customers or payments.
2. Never promise guaranteed income.
3. Never contact anyone automatically.
4. Give practical, affordable solutions.
5. Respond in simple Hindi or Hinglish.

USER TASK:
${task}
`;

      const model = env.GEMINI_MODEL || "gemini-2.5-flash";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1200
            }
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return json({
          error: "Gemini API Error",
          details: result.error?.message || "Request failed"
        }, response.status);
      }

      const answer = result.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n");

      if (!answer) {
        return json({ error: "AI returned no text" }, 502);
      }

      return json({
        success: true,
        answer,
        model
      });

    } catch (error) {
      return json({
        error: "Server Error",
        details: error.message
      }, 500);
    }
  }
};
