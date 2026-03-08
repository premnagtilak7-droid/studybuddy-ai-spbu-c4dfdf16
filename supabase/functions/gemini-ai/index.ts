import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOUBT_SYSTEM_PROMPT = `You are an expert SPPU 2024 pattern engineering tutor. Answer with: clear explanation, step-by-step if numerical, key formula, and one memory tip. Be concise and student friendly.

Format your responses using markdown with headers, bullet points, and code blocks for formulas.
When solving numerical problems, show each step clearly with proper formulas and mention marks allocation when relevant.`;

const STUDYPLAN_SYSTEM_PROMPT = `You are SPPU 2024 pattern exam planner. Create day-by-day study table with: Date, Subject, Topics to Cover, Hours, Revision Flag. Prioritize subjects with more topics or nearest exam date. Add revision days before exam.

Return the plan using the tool provided.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Also try Lovable API key as fallback
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (type === "doubt") {
      return await handleDoubt(body, GEMINI_API_KEY, LOVABLE_API_KEY);
    } else if (type === "studyplan") {
      return await handleStudyPlan(body, GEMINI_API_KEY, LOVABLE_API_KEY);
    } else {
      return new Response(JSON.stringify({ error: "Invalid type. Use 'doubt' or 'studyplan'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("gemini-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleDoubt(
  body: { messages: any[]; language?: string; questionType?: string; subject?: string },
  geminiKey: string,
  lovableKey?: string | null,
) {
  const { messages, language, questionType, subject } = body;

  let systemPrompt = DOUBT_SYSTEM_PROMPT;
  if (questionType) {
    systemPrompt += `\n\nThe student is asking a "${questionType}" type question. Tailor your answer accordingly:
- Concept: Give a clear conceptual explanation with real-world analogy
- Numerical: Show step-by-step solution with formulas and marks breakdown
- Formula: List the formula, define each variable, and show a quick example
- Definition: Give a textbook-quality definition with key points to remember`;
  }
  if (subject) {
    systemPrompt += `\n\nThe question is about the subject: ${subject}. Focus your expertise on this subject.`;
  }
  if (language === "marathi") {
    systemPrompt += "\n\nRespond entirely in Marathi (मराठी). Keep technical terms and formulas in English.";
  } else if (language === "hindi") {
    systemPrompt += "\n\nRespond entirely in Hindi (हिन्दी). Keep technical terms and formulas in English.";
  }

  // Use Lovable AI Gateway (works with Gemini models)
  const apiKey = lovableKey || geminiKey;
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    return handleAIError(response);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function handleStudyPlan(
  body: { subjects: any[]; dailyHours?: number; difficulty?: string },
  geminiKey: string,
  lovableKey?: string | null,
) {
  const { subjects, dailyHours = 4, difficulty = "balanced" } = body;

  const difficultyPrompts: Record<string, string> = {
    relaxed: "Keep the schedule light with plenty of breaks and revision days. Max 2-3 topics per day.",
    balanced: "Create a balanced schedule with moderate workload. 3-4 topics per day with regular revision.",
    intensive: "Create an intensive schedule maximizing coverage. 4-6 topics per day with focused revision before exams.",
  };

  const userPrompt = `Create a study plan for these subjects:

${JSON.stringify(subjects, null, 2)}

Parameters:
- Today: ${new Date().toISOString().slice(0, 10)}
- Daily study hours available: ${dailyHours}
- Difficulty: ${difficulty} — ${difficultyPrompts[difficulty] || difficultyPrompts.balanced}

Create an optimal day-by-day plan.`;

  const apiKey = lovableKey || geminiKey;
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: STUDYPLAN_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_study_plan",
            description: "Return the generated day-by-day study plan.",
            parameters: {
              type: "object",
              properties: {
                plan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", description: "YYYY-MM-DD" },
                      day: { type: "string", description: "Day name" },
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            subject: { type: "string" },
                            topic: { type: "string" },
                            hours: { type: "number" },
                            isRevision: { type: "boolean" },
                          },
                          required: ["subject", "topic", "hours"],
                          additionalProperties: false,
                        },
                      },
                      note: { type: "string" },
                    },
                    required: ["date", "day", "tasks"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["plan"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_study_plan" } },
    }),
  });

  if (!response.ok) {
    return handleAIError(response);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    return new Response(JSON.stringify({ error: "No plan generated" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const plan = JSON.parse(toolCall.function.arguments);
  return new Response(JSON.stringify(plan), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAIError(response: Response) {
  if (response.status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (response.status === 402) {
    return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your Lovable workspace." }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const t = await response.text();
  console.error("AI gateway error:", response.status, t);
  return new Response(JSON.stringify({ error: "AI service error" }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
