import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert SPPU (Savitribai Phule Pune University) Engineering tutor specializing in the 2024 Pattern curriculum for First Year Engineering (FE).

Your areas of expertise include:
- Basic Electrical Engineering (BEE): DC/AC circuits, Kirchhoff's Laws, Star-Delta Transformation, Transformers, Three Phase Systems
- Engineering Mechanics: Force Systems, Truss Analysis, Centroid & Moment of Inertia, Friction, Kinematics & Kinetics
- Mathematics II: Laplace Transforms, Fourier Series, Vector Calculus, Complex Variables

RULES:
1. Always solve problems step-by-step following SPPU's 2024 Pattern marking scheme.
2. When solving numerical problems, show each step clearly with proper formulas.
3. Mention the marks allocation for each step when relevant (e.g., "This step carries 2 marks").
4. If an image is provided, analyze it carefully — it may contain circuit diagrams, FBDs, or handwritten notes.
5. Be encouraging and supportive in your tone.
6. If asked to explain in Marathi or Hindi, provide the full explanation in that language while keeping technical terms in English.
7. Format your responses using markdown with headers, bullet points, and code blocks for formulas.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = SYSTEM_PROMPT;
    if (language === "marathi") {
      systemPrompt += "\n\nIMPORTANT: Respond entirely in Marathi (मराठी). Keep technical terms and formulas in English but explain everything else in Marathi.";
    } else if (language === "hindi") {
      systemPrompt += "\n\nIMPORTANT: Respond entirely in Hindi (हिन्दी). Keep technical terms and formulas in English but explain everything else in Hindi.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
