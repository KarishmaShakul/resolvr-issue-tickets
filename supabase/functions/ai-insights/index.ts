import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw { status: 500, message: "LOVABLE_API_KEY not configured" };

    const { stats, categoryBreakdown, recentTrends } = await req.json();

    const system = `You are an IT operations analyst. Analyze the provided ticket statistics and generate concise, actionable insights. Focus on patterns, recommendations, and areas of concern. Keep each insight to 1-2 sentences.`;

    const user = `Ticket Statistics:
- Total tickets: ${stats.total}
- Open: ${stats.open}
- In Progress: ${stats.inProgress}
- Resolved: ${stats.resolved}
- Resolution rate: ${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%

Category Breakdown:
${categoryBreakdown}

Recent Trends:
${recentTrends}

Generate 3-4 actionable insights about this data.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_insights",
          description: "Return analytics insights.",
          parameters: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short insight title." },
                    description: { type: "string", description: "Detailed observation and recommendation." },
                    type: { type: "string", enum: ["info", "warning", "success"], description: "Insight severity." },
                  },
                  required: ["title", "description", "type"],
                  additionalProperties: false,
                },
              },
            },
            required: ["insights"],
            additionalProperties: false,
          },
        },
      },
    ];

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 429) throw { status: 429, message: "Rate limit exceeded." };
      if (status === 402) throw { status: 402, message: "AI credits exhausted." };
      throw { status: 500, message: `AI gateway error: ${status}` };
    }

    const json = await res.json();
    const choices = json.choices as { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    const toolCall = choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { insights: [] };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    console.error("ai-insights error:", err.message);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: err.status ?? 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
