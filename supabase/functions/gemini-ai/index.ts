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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const handlers: Record<string, (b: any, k: string) => Promise<Response>> = {
      doubt: handleDoubt,
      studyplan: handleStudyPlan,
      mocktest: handleMockTest,
      answercheck: handleAnswerCheck,
      formulasheet: handleFormulaSheet,
      exampredict: handleExamPredict,
      performance: handlePerformance,
    };

    const handler = handlers[type];
    if (!handler) {
      return new Response(JSON.stringify({ error: "Invalid type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await handler(body, LOVABLE_API_KEY);
  } catch (e) {
    console.error("gemini-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any, stream = false, model?: string) {
  const body: any = {
    model: model || "google/gemini-3-flash-preview",
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

async function callGeminiMultimodal(apiKey: string, systemPrompt: string, prompt: string, imageData: string, imageMimeType = "image/png") {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageData}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return handleAIError(response);
  return response;
}

function extractJsonFromToolCall(data: any): any {
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    const args = toolCall.function?.arguments;
    if (typeof args === "string") return JSON.parse(args);
    if (typeof args === "object") return args;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (content) {
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonStart = cleaned.search(/[\{\[]/);
    const jsonEnd = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (jsonStart !== -1 && jsonEnd !== -1) return JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
  }
  return null;
}

function normalizeStudyPlan(result: any) {
  const plan = Array.isArray(result?.plan) ? result.plan : Array.isArray(result?.dailyPlan) ? result.dailyPlan : [];
  return {
    plan: plan.map((day: any) => ({
      date: String(day?.date || ""),
      day: String(day?.day || ""),
      note: String(day?.note || "Stay consistent and complete every task before moving ahead."),
      tasks: Array.isArray(day?.tasks) ? day.tasks.map((task: any) => ({
        subject: String(task?.subject || "General Study"),
        topic: String(task?.topic || "Revision"),
        hours: Number(task?.hours) || 1,
        isRevision: Boolean(task?.isRevision),
        detail: String(task?.detail || task?.description || "Understand the concept, make short notes, solve practice questions, and mark doubts."),
        method: String(task?.method || "Read → Notes → Practice → Quick recap"),
        outcome: String(task?.outcome || "Clear concept notes and solved practice examples."),
        priority: ["high", "medium", "low"].includes(task?.priority) ? task.priority : "medium",
      })) : [],
    })).filter((day: any) => day.date && day.tasks.length > 0),
  };
}

function getStudentContext(educationType?: string, examName?: string): string {
  if (educationType === "competitive_exam" && examName) {
    const examContexts: Record<string, string> = {
      JEE: "JEE Main & Advanced level. Focus on concepts, problem-solving approach, and tricks. Cover both JEE Main and Advanced level depth.",
      NEET: "NEET UG exam level. Focus on NCERT-based concepts with clinical applications where relevant.",
      UPSC: "UPSC Civil Services level. Provide comprehensive answers with multiple perspectives, current affairs relevance, and answer writing framework.",
      CAT: "CAT/MBA entrance level. Focus on shortcuts, time-saving techniques, and logical reasoning approaches.",
      GATE: "GATE exam level. Focus on in-depth technical concepts with numerical problem-solving.",
      SSC: "SSC/Government exam level. Focus on quick solving techniques and commonly asked patterns.",
      Banking: "Banking exam level. Focus on quick solving techniques, shortcuts, and common patterns.",
    };
    return examContexts[examName] || `${examName} exam preparation`;
  } else if (educationType === "school") {
    return "School level. Explain concepts simply with relatable examples. Follow NCERT/board exam patterns.";
  } else if (educationType === "undergraduate" || educationType === "postgraduate") {
    return "University level. Provide detailed academic explanations suitable for semester exams.";
  } else if (educationType === "professional") {
    return "Professional certification level. Focus on practical applications and industry standards.";
  } else if (educationType === "self_learning") {
    return "Self-learning context. Explain from basics with clear progression to advanced concepts.";
  }
  return "General academic level. Provide clear, well-structured explanations.";
}

// ─── DOUBT ───
async function handleDoubt(body: any, apiKey: string) {
  const { messages, language, questionType, subject, educationType, examName, imageData, imageMimeType } = body;
  
  const context = getStudentContext(educationType, examName);

  let sys = `You are an expert tutor. ${context}\n\nAnswer with: clear explanation, step-by-step if numerical, key formula, and one memory tip. Be concise and student friendly.\n\nFormat your responses using markdown with headers, bullet points, and code blocks for formulas. Use normal Markdown math text; do not output raw dollar-sign LaTeX delimiters like $$ or escaped symbols such as \$V.\nWhen solving numerical problems, show each step clearly with proper formulas.\nIf an image is provided, first read the image content carefully, identify the exact diagram/text/topic shown, and base the answer on that image plus the user's doubt. Do not guess unrelated topics.\n\nIMPORTANT: Always provide a complete, non-empty response.`;
  if (questionType) sys += `\n\nThe student is asking a "${questionType}" type question.`;
  if (subject) sys += `\n\nThe question is about: ${subject}.`;
  if (language === "marathi") sys += "\n\nRespond in Marathi. Keep technical terms in English.";
  else if (language === "hindi") sys += "\n\nRespond in Hindi. Keep technical terms in English.";

  if (imageData) {
    const userText = messages?.map((m: any) => m?.content).filter(Boolean).join("\n\n") || "Please analyze this image and explain it.";
    const response = await callGeminiMultimodal(apiKey, sys, userText, imageData, imageMimeType);
    if (response instanceof Response && response.headers.get("Content-Type")?.includes("application/json") && response.status !== 200) return response;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "AI could not analyze the image. Please try a clearer image." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }

  const response = await callAI(apiKey, [{ role: "system", content: sys }, ...messages], undefined, undefined, true);
  if (response instanceof Response && response.headers.get("Content-Type")?.includes("application/json")) return response;
  return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

// ─── STUDY PLAN ───
async function handleStudyPlan(body: any, apiKey: string) {
  const { subjects, dailyHours = 4, difficulty = "balanced", educationType, examName } = body;
  
  let context = getStudentContext(educationType, examName);
  if (educationType === "competitive_exam" && examName) {
    context += " Prioritize high-weightage topics and include revision cycles.";
  } else if (educationType === "school") {
    context += " Follow the textbook chapter sequence.";
  }
  
  const today = new Date().toISOString().slice(0, 10);
  // Compute horizon: latest examDate or +30 days
  let lastDate = today;
  for (const s of (subjects || [])) {
    if (s?.examDate && s.examDate > lastDate) lastDate = s.examDate;
  }

  const sys = `You are an expert study planner. ${context}

STRICT RULES (must follow):
1. Output a day-by-day plan from TODAY (${today}) until the LAST exam date (${lastDate}). Include EVERY day in between — do not skip days.
2. Each day's total task hours must equal ${dailyHours} (±0.5). Difficulty "${difficulty}": light = fewer tasks/shorter, intense = more tasks.
3. For each subject, schedule ALL its remaining topics BEFORE its examDate. Earlier examDate = scheduled first.
4. The 1-2 days BEFORE each subject's examDate must be revision tasks for that subject (isRevision: true).
5. Subjects with more remaining topics get more days.
6. Use REAL date strings (YYYY-MM-DD), correct day-of-week names.
7. Topic strings must come from the provided topics list — do not invent topics.
8. Every task must include proper details: detail, method, outcome, and priority.
9. You MUST call create_study_plan with a non-empty plan array covering the full date range.
10. Keep task detail practical for students: what to read, what to write/practice, expected output, and quick revision action.`;
  const user = `Create the study plan.\nSubjects (name, topics[], examDate): ${JSON.stringify(subjects)}\nToday: ${today}\nLast exam date: ${lastDate}\nDaily hours: ${dailyHours}\nDifficulty: ${difficulty}`;

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
                tasks: { type: "array", items: { type: "object", properties: { subject: { type: "string" }, topic: { type: "string" }, hours: { type: "number" }, isRevision: { type: "boolean" }, detail: { type: "string" }, method: { type: "string" }, outcome: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] } }, required: ["subject", "topic", "hours", "detail", "method", "outcome", "priority"], additionalProperties: false } },
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
  
  try {
    const text = await response.text();
    const data = JSON.parse(text);
    if (data?.error) {
      return new Response(text, { status: response.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = normalizeStudyPlan(extractJsonFromToolCall(data));
    if (!result.plan.length) {
      return new Response(JSON.stringify({ error: "AI returned an empty plan. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

// ─── MOCK TEST (Exam-type aware) ───
async function handleMockTest(body: any, apiKey: string) {
  const { subject, topic, numQuestions = 10, questionType = "mixed", educationType, examName, classLevel, board } = body;

  let sys = "";
  let negativeMarking = false;
  
  if (educationType === "competitive_exam") {
    switch (examName) {
      case "JEE":
        sys = `You are a JEE Main & Advanced question paper setter. Generate ${questionType === "theory" ? "numerical/subjective" : "MCQ"} questions for ${subject}${topic ? " - " + topic : ""}. Each MCQ must have exactly 4 options with one correct answer. Questions should be at JEE level difficulty with conceptual depth and numerical problem-solving. Include negative marking info (-1 for wrong MCQ). Provide detailed step-by-step explanation for each answer.`;
        negativeMarking = true;
        break;
      case "NEET":
        sys = `You are a NEET question paper setter. Generate MCQ questions for ${subject}${topic ? " - " + topic : ""}. Each question must have exactly 4 options with one correct answer. Focus on NCERT-based concepts and application-based questions. Include negative marking (-1 for wrong). Provide explanation referencing NCERT concepts.`;
        negativeMarking = true;
        break;
      case "UPSC":
        sys = `You are a UPSC Civil Services examiner. Generate ${questionType === "mcq" ? "Prelims-style MCQ" : "Mains-style descriptive"} questions for ${subject}${topic ? " - " + topic : ""}. For MCQs: 4 options, one correct, with explanation. For descriptive: provide answer framework with introduction, body points, conclusion structure, and word limit suggestion (150/250 words). Include relevant current affairs connections.`;
        break;
      case "CAT":
        sys = `You are a CAT exam question setter. Generate ${subject === "VARC" || subject.includes("Verbal") ? "Reading Comprehension and Verbal Ability" : subject === "DILR" || subject.includes("Logical") ? "Data Interpretation and Logical Reasoning" : "Quantitative Aptitude"} questions${topic ? " on " + topic : ""}. Questions should be at CAT difficulty level. For quant: include shortcut methods. For VARC: include passage-based questions. For DILR: include set-based questions. Time estimate per question should be mentioned.`;
        break;
      case "SSC":
      case "Banking":
        sys = `You are an ${examName} exam question setter. Generate section-wise practice questions for ${subject}${topic ? " - " + topic : ""}. Include questions at ${examName} exam difficulty level with 4 options for MCQ. Focus on frequently asked patterns and quick solving techniques. Provide shortcuts and tricks in explanations.`;
        break;
      case "GATE":
        sys = `You are a GATE exam question setter. Generate ${questionType === "mcq" ? "MCQ" : questionType === "theory" ? "Numerical Answer Type (NAT)" : "MCQ and NAT"} questions for ${subject}${topic ? " - " + topic : ""}. Questions should test deep conceptual understanding and numerical problem-solving at GATE level. Include negative marking for MCQs (-1/3 for 1-mark, -2/3 for 2-mark questions).`;
        negativeMarking = true;
        break;
      default:
        sys = `You are an expert examiner for ${examName}. Generate practice questions for ${subject}${topic ? " - " + topic : ""}. Include appropriate difficulty level and detailed explanations.`;
    }
  } else if (educationType === "school") {
    sys = `You are a school exam paper setter for Class ${classLevel || "10"} (${board || "CBSE"} board). Generate ${questionType} questions for ${subject}${topic ? " - " + topic : ""}. Questions should match ${board || "CBSE"} board exam pattern and difficulty. Include chapter-wise questions with marking scheme. For MCQs: 4 options with explanation. For theory: include expected answer with key points and marks allocation.`;
  } else {
    sys = `You are an expert examiner. Generate ${questionType} questions for ${subject}${topic ? " - " + topic : ""}. For MCQ include 4 options with one correct answer and explanation. For theory include model answer. Questions should be appropriate for the student's level.`;
  }
  
  sys += ` Return using the tool provided. IMPORTANT: You MUST return questions.

CRITICAL RULES FOR MCQ QUESTIONS (follow strictly — accuracy is paramount):
1. "options" must be an array of 4 plain answer strings WITHOUT any "A)", "B)", "1.", or letter/number prefix. Just the answer text.
2. SOLVE the question fully BEFORE writing options. Compute the actual answer from first principles. Then make that computed value option A, B, C, or D — and copy that EXACT string into "correctAnswer".
3. "correctAnswer" MUST be the EXACT verbatim string of one of the items in "options" — character-for-character identical, same casing, same punctuation, same units, same fractions. Do NOT return a letter like "A" or "B". Do NOT return "A) ...". Do NOT paraphrase.
4. SELF-VERIFY before finalizing each question: Re-read your "explanation" — does the final numeric/factual answer in the explanation EXACTLY match "correctAnswer"? If not, FIX correctAnswer to match the explanation's conclusion. Never let them disagree.
5. "explanation" must show the full working/derivation step-by-step, end with a clear sentence like "Therefore the answer is X", and that X must equal correctAnswer exactly.
6. The other 3 options should be plausible distractors (common wrong answers from typical mistakes), but you must be 100% sure they are WRONG.
7. If you are not certain about the answer to a question, do NOT include that question — generate a different one you can verify.`;

  const questionSchema: any = {
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
      negativeMarks: { type: "number" },
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      timeEstimate: { type: "string" },
      section: { type: "string" },
    },
    required: ["id", "type", "question", "marks"], additionalProperties: false,
  };

  const tools = [{
    type: "function",
    function: {
      name: "generate_mock_test",
      description: "Return generated test questions with analysis metadata.",
      parameters: {
        type: "object",
        properties: {
          questions: { type: "array", items: questionSchema },
          testMeta: {
            type: "object",
            properties: {
              totalMarks: { type: "number" },
              duration: { type: "string" },
              negativeMarking: { type: "boolean" },
              examPattern: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        required: ["questions"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [
    { role: "system", content: sys },
    { role: "user", content: `Generate exactly ${numQuestions} ${questionType} questions. Solve each one fully before writing the options. Verify correctAnswer matches the explanation's conclusion exactly.${negativeMarking ? " Include negative marking values." : ""}` },
  ], tools, { type: "function", function: { name: "generate_mock_test" } }, false, "google/gemini-2.5-flash");

  try {
    const data = await response.json();
    const result = extractJsonFromToolCall(data);
    if (!result || !result.questions) {
      return new Response(JSON.stringify({ error: "No questions generated. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

// ─── ANSWER CHECK ───
async function handleAnswerCheck(body: any, apiKey: string) {
  const { question, answer, subject, educationType, examName } = body;
  
  const context = getStudentContext(educationType, examName);
  
  const sys = `You are an expert examiner. ${context} Grade the student's answer out of 10 with detailed feedback. Return using the tool provided.`;

  const tools = [{
    type: "function",
    function: {
      name: "grade_answer",
      description: "Return grading result.",
      parameters: {
        type: "object",
        properties: {
          score: { type: "number" },
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

  try {
    const data = await response.json();
    const result = extractJsonFromToolCall(data);
    if (!result || result.score === undefined) {
      return new Response(JSON.stringify({ error: "Grading failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

// ─── FORMULA SHEET ───
async function handleFormulaSheet(body: any, apiKey: string) {
  const { subject, units, educationType, examName } = body;
  
  const context = getStudentContext(educationType, examName);
  
  const sys = `You are a formula reference generator for ${context}. Generate a comprehensive formula sheet. Return using the tool provided.`;

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

  try {
    const data = await response.json();
    const result = extractJsonFromToolCall(data);
    if (!result || !result.sections) {
      return new Response(JSON.stringify({ error: "Formula generation failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

// ─── EXAM PREDICTOR ───
async function handleExamPredict(body: any, apiKey: string) {
  const { subject, examDate, completedTopics, educationType, examName } = body;
  
  const context = getStudentContext(educationType, examName);
  
  const sys = `You are an exam analyst. ${context} Predict important topics and likely question types. Return using the tool provided.`;

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

  try {
    const data = await response.json();
    const result = extractJsonFromToolCall(data);
    if (!result || !result.importantTopics) {
      return new Response(JSON.stringify({ error: "Prediction failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}

// ─── PERFORMANCE ANALYSIS ───
async function handlePerformance(body: any, apiKey: string) {
  const { tests, educationType, examName } = body;
  
  const context = getStudentContext(educationType, examName);
  
  const sys = `You are an expert academic performance analyst. ${context} Analyze the student's mock test results and provide detailed insights. Return using the tool provided.`;

  const tools = [{
    type: "function",
    function: {
      name: "analyze_performance",
      description: "Return performance analysis.",
      parameters: {
        type: "object",
        properties: {
          overallScore: { type: "number", description: "Overall average percentage" },
          subjectWise: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                avgScore: { type: "number" },
                totalTests: { type: "number" },
                trend: { type: "string", enum: ["improving", "declining", "stable"] },
              },
              required: ["subject", "avgScore", "totalTests", "trend"], additionalProperties: false,
            },
          },
          weakTopics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                topic: { type: "string" },
                score: { type: "number" },
                suggestion: { type: "string" },
              },
              required: ["subject", "topic", "score", "suggestion"], additionalProperties: false,
            },
          },
          predictedScore: { type: "string", description: "Predicted exam performance based on current data" },
          recommendations: { type: "array", items: { type: "string" } },
          comparisonToIdeal: { type: "number", description: "How close to ideal preparation (0-100)" },
        },
        required: ["overallScore", "subjectWise", "weakTopics", "predictedScore", "recommendations", "comparisonToIdeal"], additionalProperties: false,
      },
    },
  }];

  const response = await callAI(apiKey, [
    { role: "system", content: sys },
    { role: "user", content: `Analyze these mock test results and provide insights:\n\n${JSON.stringify(tests, null, 2)}\n\nProvide subject-wise analysis, identify weak topics, predict performance, and give actionable recommendations.` },
  ], tools, { type: "function", function: { name: "analyze_performance" } });

  try {
    const data = await response.json();
    const result = extractJsonFromToolCall(data);
    if (!result || !result.recommendations) {
      return new Response(JSON.stringify({ error: "Analysis failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
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
  return new Response(JSON.stringify({ error: "AI service error. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}