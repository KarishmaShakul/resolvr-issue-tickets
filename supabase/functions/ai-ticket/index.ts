import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const CATEGORIES = [
  "technical",
  "network",
  "hardware",
  "software",
  "access",
  "hr",
  "facilities",
  "other",
];

const PRIORITIES = ["low", "medium", "high", "critical"];

async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  tools?: unknown[],
  toolChoice?: unknown,
) {
  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again later." };
    if (status === 402) throw { status: 402, message: "AI credits exhausted. Please add funds." };
    throw { status: 500, message: `AI gateway error: ${status}` };
  }

  const json = await res.json();
  return json;
}

function extractToolArgs(json: Record<string, unknown>): Record<string, unknown> | null {
  const choices = json.choices as { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  const toolCall = choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return null;
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw { status: 500, message: "LOVABLE_API_KEY not configured" };

    const { action, title, description, existingTickets, ticketCategory } = await req.json();

    let result: unknown;

    switch (action) {
      case "classify": {
        const system = `You are an IT helpdesk AI assistant. Analyze the ticket title and description to determine the best category and priority. Be precise.`;
        const user = `Title: ${title}\nDescription: ${description}`;
        const tools = [
          {
            type: "function",
            function: {
              name: "classify_ticket",
              description: "Classify a support ticket by category and priority.",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: CATEGORIES,
                    description: "The best fitting category.",
                  },
                  category_confidence: {
                    type: "number",
                    description: "Confidence 0-1 for category.",
                  },
                  priority: {
                    type: "string",
                    enum: PRIORITIES,
                    description: "Suggested priority level.",
                  },
                  priority_confidence: {
                    type: "number",
                    description: "Confidence 0-1 for priority.",
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of why this classification was chosen.",
                  },
                },
                required: ["category", "category_confidence", "priority", "priority_confidence", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ];
        const json = await callAI(apiKey, system, user, tools, {
          type: "function",
          function: { name: "classify_ticket" },
        });
        result = extractToolArgs(json);
        break;
      }

      case "duplicates": {
        if (!existingTickets || existingTickets.length === 0) {
          result = { duplicates: [] };
          break;
        }
        const ticketList = existingTickets
          .slice(0, 20)
          .map(
            (t: { id: string; title: string; status: string }, i: number) =>
              `${i + 1}. [${t.id}] ${t.title} (${t.status})`,
          )
          .join("\n");

        const system = `You are a duplicate ticket detector. Compare the new ticket against existing tickets and identify potential duplicates. Only flag tickets that are truly about the same issue.`;
        const user = `New ticket:\nTitle: ${title}\nDescription: ${description}\n\nExisting tickets:\n${ticketList}`;
        const tools = [
          {
            type: "function",
            function: {
              name: "find_duplicates",
              description: "Return list of potential duplicate tickets.",
              parameters: {
                type: "object",
                properties: {
                  duplicates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "The ticket ID." },
                        title: { type: "string" },
                        similarity: { type: "number", description: "Similarity score 0-1." },
                        reason: { type: "string" },
                      },
                      required: ["id", "title", "similarity", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["duplicates"],
                additionalProperties: false,
              },
            },
          },
        ];
        const json = await callAI(apiKey, system, user, tools, {
          type: "function",
          function: { name: "find_duplicates" },
        });
        result = extractToolArgs(json);
        break;
      }

      case "solutions": {
        const system = `You are an experienced IT support specialist. Given a support ticket, provide practical solution suggestions based on common IT knowledge. Provide 2-4 actionable solutions ranked by likelihood of resolving the issue.`;
        const user = `Title: ${title}\nDescription: ${description}\nCategory: ${ticketCategory ?? "unknown"}`;
        const tools = [
          {
            type: "function",
            function: {
              name: "suggest_solutions",
              description: "Return ranked solution suggestions.",
              parameters: {
                type: "object",
                properties: {
                  solutions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short solution title." },
                        description: { type: "string", description: "Step-by-step solution." },
                        confidence: { type: "number", description: "Confidence 0-1." },
                      },
                      required: ["title", "description", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["solutions"],
                additionalProperties: false,
              },
            },
          },
        ];
        const json = await callAI(apiKey, system, user, tools, {
          type: "function",
          function: { name: "suggest_solutions" },
        });
        result = extractToolArgs(json);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    const status = err.status ?? 500;
    const message = err.message ?? "Unknown error";
    console.error("ai-ticket error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
