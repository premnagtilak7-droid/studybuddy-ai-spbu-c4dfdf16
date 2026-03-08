import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const apiKey = LOVABLE_API_KEY || GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key configured");

    const handlers: Record<string, (b: any, k: string) => Promise<Response>> = {
      doubt: handleDoubt,
      studyplan: handleStudyPlan,
      mocktest: handleMockTest,
      answercheck: handleAnswerCheck,
      formulasheet: handleFormulaSheet,
      exampredict: handleExamPredict,
    };

    const handler = handlers[type];
    if (!handler) {
      return new Response(JSON.stringify({ error: "Invalid type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await handler(body, apiKey);
  } catch (e) {
    console.error("gemini-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any, stream = false) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
    stream,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return handleAIError(response);
  return response;
}

// ─── DOUBT ───
async function handleDoubt(body: any, apiKey: string) {
  const { messages, language, questionType, subject } = body;
  let sys = `You are an expert SPPU 2024 pattern engineering tutor. Answer with: clear explanation, step-by-step if numerical, key formula, and one memory tip. Be concise and student friendly.\n\nFormat your responses using markdown with headers, bullet points, and code blocks for formulas.\nWhen solving numerical problems, show each step clearly with proper formulas and mention marks allocation when relevant.`;
  if (questionType) sys += `\n\nThe student is asking a "${questionType}" type question.`;
  if (subject) sys += `\n\nThe question is about: ${subject}.`;
  if (language === "marathi") sys += "\n\nRespond in Marathi. Keep technical terms in English.";
  else if (language === "hindi") sys += "\n\nRespond in Hindi. Keep technical terms in English.";

  const response = await callAI(apiKey, [{ role: "system", content: sys }, ...messages], undefined, undefined, true);
  if (response instanceof Response && response.headers.get("Content-Type")?.includes("application/json")) return response;
  return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

// ─── STUDY PLAN ───
async function handleStudyPlan(body: any, apiKey: string) {
  const { subjects, dailyHours = 4, difficulty = "balanced" } = body;
  const sys = `You are SPPU 2024 pattern exam planner. Create day-by-day study table. Return the plan using the tool provided.`;
  const user = `Create a study plan for: ${JSON.stringify(subjects)}\nToday: ${new Date().toISOString().slice(0, 10)}\nDaily hours: ${dailyHours}\nDifficulty: ${difficulty}`;

  const tools = [{
    type: "function",
    function: {
      name: "create_study_plan",
      description: "Return the generated study plan.",
      parameters: {
        type: "object",
        properties: {
          plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" }, day: { type: "string" },
                tasks: { type: "array", items: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" }, hours: { type: "number" }, isRevision: { type: "boolean" } }, required: ["subject", "topic", "hours"], additionalProperties: false } },
                note: { type: "string" },
              },
              required: ["date", "day", "tasks"], additionalProperties: false,
            },
          },
        },
        required: ["plan"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [{ role: "system", content: sys }, { role: "user", content: user }], tools, { type: "function", function: { name: "create_study_plan" } });
  if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
    return new Response(JSON.stringify({ error: "Unexpected stream" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return new Response(JSON.stringify({ error: "No plan generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── MOCK TEST ───
async function handleMockTest(body: any, apiKey: string) {
  const { subject, topic, numQuestions = 10, questionType = "mixed" } = body;
  const sys = `You are an SPPU 2024 pattern examiner. Generate ${questionType} questions for ${subject}${topic ? " - " + topic : ""}. For MCQ include 4 options with one correct answer and explanation. For theory include model answer. Return using the tool provided.`;

  const tools = [{
    type: "function",
    function: {
      name: "generate_mock_test",
      description: "Return generated test questions.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                type: { type: "string", enum: ["mcq", "theory"] },
                question: { type: "string" },
                marks: { type: "number" },
                options: { type: "array", items: { type: "string" } },
                correctAnswer: { type: "string" },
                explanation: { type: "string" },
                modelAnswer: { type: "string" },
              },
              required: ["id", "type", "question", "marks"], additionalProperties: false,
            },
          },
        },
        required: ["questions"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [
    { role: "system", content: sys },
    { role: "user", content: `Generate exactly ${numQuestions} ${questionType} questions.` },
  ], tools, { type: "function", function: { name: "generate_mock_test" } });

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return new Response(JSON.stringify({ error: "No questions generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── ANSWER CHECK ───
async function handleAnswerCheck(body: any, apiKey: string) {
  const { question, answer, subject } = body;
  const sys = `You are an SPPU 2024 pattern examiner. Grade the student's answer out of 10 with detailed feedback. Return using the tool provided.`;

  const tools = [{
    type: "function",
    function: {
      name: "grade_answer",
      description: "Return grading result.",
      parameters: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score out of 10" },
          maxScore: { type: "number" },
          correctPoints: { type: "array", items: { type: "string" } },
          missingPoints: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          overallFeedback: { type: "string" },
          modelAnswer: { type: "string" },
        },
        required: ["score", "maxScore", "correctPoints", "missingPoints", "improvements", "overallFeedback"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [
    { role: "system", content: sys },
    { role: "user", content: `Subject: ${subject || "General"}\n\nQuestion: ${question}\n\nStudent's Answer: ${answer}` },
  ], tools, { type: "function", function: { name: "grade_answer" } });

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return new Response(JSON.stringify({ error: "Grading failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── FORMULA SHEET ───
async function handleFormulaSheet(body: any, apiKey: string) {
  const { subject, units } = body;
  const sys = `You are an SPPU 2024 pattern formula reference generator. Generate a comprehensive formula sheet. Return using the tool provided.`;

  const tools = [{
    type: "function",
    function: {
      name: "generate_formula_sheet",
      description: "Return formula sheet data.",
      parameters: {
        type: "object",
        properties: {
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                unitName: { type: "string" },
                formulas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      formula: { type: "string" },
                      variables: { type: "string" },
                      example: { type: "string" },
                    },
                    required: ["name", "formula", "variables"], additionalProperties: false,
                  },
                },
              },
              required: ["unitName", "formulas"], additionalProperties: false,
            },
          },
        },
        required: ["sections"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [
    { role: "system", content: sys },
    { role: "user", content: `Subject: ${subject}\nUnits: ${(units || []).join(", ")}\n\nGenerate all important formulas.` },
  ], tools, { type: "function", function: { name: "generate_formula_sheet" } });

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return new Response(JSON.stringify({ error: "Formula generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ─── EXAM PREDICTOR ───
async function handleExamPredict(body: any, apiKey: string) {
  const { subject, examDate, completedTopics } = body;
  const sys = `You are an SPPU 2024 pattern exam analyst. Predict important topics and likely question types. Return using the tool provided.`;

  const tools = [{
    type: "function",
    function: {
      name: "predict_exam",
      description: "Return exam predictions.",
      parameters: {
        type: "object",
        properties: {
          importantTopics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                importance: { type: "string", enum: ["critical", "high", "medium", "low"] },
                reason: { type: "string" },
                likelyMarks: { type: "number" },
                questionType: { type: "string" },
              },
              required: ["topic", "importance", "reason"], additionalProperties: false,
            },
          },
          studyStrategy: { type: "string" },
          timeAllocation: { type: "string" },
        },
        required: ["importantTopics", "studyStrategy"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [
    { role: "system", content: sys },
    { role: "user", content: `Subject: ${subject}\nExam Date: ${examDate}\nCompleted Topics: ${(completedTopics || []).join(", ") || "None specified"}\n\nPredict the most important topics.` },
  ], tools, { type: "function", function: { name: "predict_exam" } });

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return new Response(JSON.stringify({ error: "Prediction failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleAIError(response: Response) {
  if (response.status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (response.status === 402) {
    return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const t = await response.text();
  console.error("AI gateway error:", response.status, t);
  return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
