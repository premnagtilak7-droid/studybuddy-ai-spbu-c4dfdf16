import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert study planner for SPPU Engineering students (2024 Pattern).

Given a list of subjects with their remaining topics and exam dates, create a day-by-day study schedule from today until the last exam date.

RULES:
1. Distribute topics evenly across available days.
2. Prioritize subjects with MORE remaining topics — they need more days.
3. Prioritize subjects with EARLIER exam dates — they should be scheduled first.
4. Each day should have 2-4 topics maximum to avoid overwhelm.
5. Include revision days before each exam (at least 1 day before each exam should be revision for that subject).
6. Mark weekends as lighter study days (1-2 topics).
7. Return the plan as a structured JSON using the tool provided.
8. Each day entry should have: date (YYYY-MM-DD), day name, and an array of tasks with subject name, topic name, and estimated hours.
9. IMPORTANT: You MUST call the create_study_plan tool with a non-empty plan array.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subjects } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Create a study plan for these subjects:\n\n${JSON.stringify(subjects, null, 2)}\n\nToday is ${new Date().toISOString().slice(0, 10)}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
                        day: { type: "string", description: "Day name e.g. Monday" },
                        tasks: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              subject: { type: "string" },
                              topic: { type: "string" },
                              hours: { type: "number" },
                            },
                            required: ["subject", "topic", "hours"],
                            additionalProperties: false,
                          },
                        },
                        note: { type: "string", description: "Optional note like 'Revision day' or 'Light day'" },
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your Lovable workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let plan: any = null;
    
    if (toolCall) {
      const args = toolCall.function?.arguments;
      if (typeof args === "string") {
        plan = JSON.parse(args);
      } else if (typeof args === "object") {
        plan = args;
      }
    }
    
    // Fallback: try content
    if (!plan) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonStart = cleaned.search(/[\{\[]/);
        const jsonEnd = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
        if (jsonStart !== -1 && jsonEnd !== -1) {
          plan = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
        }
      }
    }

    if (!plan || !plan.plan || !Array.isArray(plan.plan) || plan.plan.length === 0) {
      console.error("Empty plan from AI:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI returned an empty plan. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("study-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});