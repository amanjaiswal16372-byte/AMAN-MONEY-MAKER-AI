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
        brain: "Gemini",
        models: [
          "gemini-3.8-flash",
          "gemini-3.5-flash-lite"
        ]
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return json({
        error: "API Key not configured"
      }, 500);
    }

    try {
      const body = await request.json();
      const task = String(body.task || "").slice(0, 4000);

      if (!task.trim()) {
        return json({
          error: "Please enter a task"
        }, 400);
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
4. Give practical and affordable solutions.
5. Respond in simple Hindi or Hinglish.
6. Give clear step-by-step instructions.

USER TASK:
${task}
`;

      const models = [
        env.GEMINI_MODEL || "gemini-3.8-flash",
        "gemini-3.5-flash-lite"
      ];

      let lastError = "All Gemini models failed";

      for (const model of [...new Set(models)]) {
        try {
          const controller = new AbortController();

          const timeout = setTimeout(() => {
            controller.abort();
          }, 20000);

          let response;

          try {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
              {
                method: "POST",
                signal: controller.signal,
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: prompt }
                      ]
                    }
                  ],
                  generationConfig: {
                    maxOutputTokens: 1200
                  }
                })
              }
            );
          } finally {
            clearTimeout(timeout);
          }

          const raw = await response.text();

          let result;

          try {
            result = JSON.parse(raw);
          } catch {
            lastError = "Gemini returned an invalid response";
            continue;
          }

          if (!response.ok) {
            lastError =
              result.error?.message ||
              `Gemini HTTP Error ${response.status}`;

            continue;
          }

          const answer = result.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("\n");

          if (!answer) {
            lastError = "AI returned no text";
            continue;
          }

          return json({
            success: true,
            answer,
            model
          });
        } catch (error) {
          lastError =
            error.name === "AbortError"
              ? `${model} timed out`
              : error.message;
        }
      }

      return json({
        success: false,
        error: "All Gemini models are currently unavailable",
        details: lastError
      }, 502);

    } catch (error) {
      return json({
        success: false,
        error: "Server Error",
        details: error.message
      }, 500);
    }
  }
};
