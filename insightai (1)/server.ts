import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini client on the server with fallback to empty string to prevent startup crashes
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "placeholder_api_key",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Helper to query Gemini with retry, backoff, and model fallback options
  async function generateContentWithRetryAndFallback(baseParams: any) {
    const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const params = { ...baseParams, model: modelName };
      const delays = [1000, 2000, 4000]; // Precise retry interval timings as requested
      const maxAttempts = delays.length + 1; // Try up to 4 times (1st execution + 3 retries)

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[Gemini API] Attempting generateContent with model: ${modelName} (Attempt ${attempt}/${maxAttempts})`);
          const response = await ai.models.generateContent(params);
          return response;
        } catch (err: any) {
          lastError = err;
          console.error(`[Gemini API] Error using model ${modelName} on attempt ${attempt}:`, err.message || err);
          
          // If it's a client or missing credentials error, do not retry or swap models
          const errStr = String(err.message || "").toLowerCase();
          const isAuthError = errStr.includes("api_key") || 
                              errStr.includes("api key") || 
                              errStr.includes("unauthorized") || 
                              errStr.includes("invalid") || 
                              errStr.includes("not found") || 
                              errStr.includes("forbidden") ||
                              err.status === 400 || 
                              err.status === 403 || 
                              err.status === 401;
                              
          if (isAuthError) {
            throw err;
          }

          // Delay before next attempt using requested discrete intervals
          if (attempt < maxAttempts) {
            const nextDelay = delays[attempt - 1];
            console.log(`[Gemini API] Waiting ${nextDelay}ms before retry state...`);
            await new Promise((resolve) => setTimeout(resolve, nextDelay));
          }
        }
      }
    }

    throw lastError || new Error("Failed to generate content with Gemini API.");
  }

  // Robust Error Handling for Gemini API
  function handleGeminiError(error: any, res: express.Response) {
    // Log actual errors internally
    console.error("[INTERNAL GEMINI ERROR LOG]:", error);

    const errStr = String(error.message || error || "").toLowerCase();
    
    // Check for 503 / Service Unavailable / High demand / Busy etc.
    const is503 = error.status === 503 ||
                  error.code === 503 ||
                  errStr.includes("503") ||
                  errStr.includes("unavailable") ||
                  errStr.includes("high demand") ||
                  errStr.includes("overloaded") ||
                  errStr.includes("busy") ||
                  errStr.includes("temp");

    if (is503) {
      return res.status(503).json({
        error: "AI services are temporarily busy. Please try again in a few moments."
      });
    }

    // Check for 429 / Rate Limit
    const is429 = error.status === 429 ||
                  error.code === 429 ||
                  errStr.includes("429") ||
                  errStr.includes("resource_exhausted") ||
                  errStr.includes("rate limit") ||
                  errStr.includes("request limit") ||
                  errStr.includes("too many requests") ||
                  errStr.includes("quota");

    if (is429) {
      return res.status(429).json({
        error: "Request limit reached. Please wait before sending another request."
      });
    }

    // Check for missing/invalid auth key
    const isAuth = errStr.includes("api_key") ||
                    errStr.includes("api key") ||
                    errStr.includes("unauthorized") ||
                    errStr.includes("invalid") ||
                    errStr.includes("forbidden") ||
                    error.status === 400 ||
                    error.status === 401 ||
                    error.status === 403 ||
                    error.code === 400 ||
                    error.code === 401 ||
                    error.code === 403;

    if (isAuth) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is missing or invalid. Please configure your API Key in Settings to continue."
      });
    }

    // Default Fallback is 500 error
    return res.status(500).json({
      error: "An unexpected AI processing issue occurred. Please try again."
    });
  }

  // API Route for automated elite analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY is missing. Please configure your API Key in Settings to generate the Elite AI report." 
        });
      }

      const { summaryData, userQuery } = req.body;
      if (!summaryData) {
        return res.status(400).json({ error: "Missing required summaryData." });
      }

      // We will perform Gemini API call with system instruction based on "Elite Data Analyst" requirements
      const prompt = `
You are an Elite Data Analyst. Your purpose is to transform raw data into actionable insights.
You do not behave like a chatbot. You behave like a professional analyst presenting findings to decision-makers.

Here is the structured metadata and statistical summary of the uploaded dataset:
${JSON.stringify(summaryData, null, 2)}

${userQuery ? `The user also specifically asked or prompt-directed: "${userQuery}"` : ""}

Analyze this dataset thoroughly and generate a comprehensive professional report following EXACTLY these sections with elegant markdown structure:

==================================================
STEP 1: UNDERSTAND THE DATA
==================================================
Briefly explain the dataset based on columns, data types, and possible business or real-world context.

==================================================
STEP 2: DATA QUALITY CHECK
==================================================
Provide:
- Data Quality Score: (0-100)
- Issues Found (e.g. outline columns with missing values or duplicates, or incorrect ranges)
- Severity: High / Medium / Low
- Recommended Fixes

==================================================
STEP 3: DATA OVERVIEW
==================================================
Summarize:
- Total Records
- Total Features
- Numerical Columns
- Categorical Columns
- Date Columns (if present)

==================================================
STEP 4: KEY OBSERVATIONS
==================================================
Generate the most important findings. For every observation provide:
### Observation
### Evidence
### Why It Matters
### Confidence Level (High/Medium/Low)
(Generate only meaningful observations. Avoid obvious statements.)

==================================================
STEP 5: TREND ANALYSIS
==================================================
Identify:
- Growth trends, declining trends, seasonal patterns, repeating patterns, or significant changes.
For every trend explain:
- What changed, magnitude of change, possible explanation, and business impact.

==================================================
STEP 6: TOP PERFORMERS
==================================================
Identify best categories, best products, best groups, best regions, or best entities and explain why they are performing well.

==================================================
STEP 7: UNDERPERFORMERS
==================================================
Identify weak categories, weak products, weak groups, weak regions, or weak entities and explain possible reasons.

==================================================
STEP 8: CORRELATION ANALYSIS
==================================================
Detect relationships between variables. Provide:
### Variables
### Relationship Strength (Strong / Moderate / Weak)
### Direction (Positive / Negative / Neutral)
### Interpretation
(Correlation does not imply causation.)

==================================================
STEP 9: OUTLIER FORENSICS
==================================================
Detect unusual records. For each anomaly provide:
### Anomaly
### Evidence
### Severity (High/Medium/Low)
### Possible Cause
### Business Impact
### Recommended Action

==================================================
STEP 10: CHART RECOMMENDATIONS
==================================================
Recommend visualizations. For each recommendation provide:
### Chart Type
### Columns
### Why This Chart
### Expected Insight

==================================================
STEP 11: KEY INSIGHT
==================================================
Help answer what happened, why it happened, and what should be done next with clear supporting evidence.

==================================================
STEP 12: DATA STORY
==================================================
Create a narrative. Structure:
### What Happened
### Why It Happened
### Key Turning Points
### Risks
### Opportunities
### Recommended Actions
(The story should be understandable to non-technical users.)

==================================================
STEP 13: RECOMMENDATIONS (ACTIONABLE)
==================================================
Provide:
### Immediate Actions
### Short-Term Actions
### Long-Term Actions
(Every recommendation must be supported by data.)

==================================================
STEP 14: EXECUTIVE SUMMARY
==================================================
Summarize the most important findings, biggest risks, biggest opportunities, and what should happen next. Max 10 bullet points.

RULES:
- Think like a real elite analyst.
- Keep the writing clear, professional, executive-ready.
- Never hallucinate data. Make calculations based strictly on the provided stats.
- State limitations clearly.
- Keep section formatting identical to the headers above.
`;

      const response = await generateContentWithRetryAndFallback({
        contents: prompt,
      });

      const report = response.text || "No analysis generated.";
      res.json({ report });
    } catch (error: any) {
      return handleGeminiError(error, res);
    }
  });

  // API Route for dataset-aware chat
  app.post("/api/chat", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY is missing. Please configure your API Key in Settings to chat with your dataset." 
        });
      }

      const { messages, summaryData } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Missing or invalid messages." });
      }

      const datasetContextString = summaryData ? JSON.stringify(summaryData, null, 2) : "No dataset uploaded yet.";

      const systemInstruction = `You are an Elite Data Analyst. Your purpose is to transform raw data of the uploaded dataset into actionable insights.
Behave like a professional analyst presenting findings to decision-makers. Speak objectively with professional composure.

Here is the structured metadata and statistical summary of the uploaded dataset:
${datasetContextString}

IMPORTANT RULES:
- Never hallucinate data. Only use information available in the dataset context.
- Support claims with evidence from the dataset.
- Explain what the numbers and statistics mean for business or practice.
- Do not make up any values.
- Keep your conversational reply in clean markdown format inside the JSON attribute 'reply'.

You must return a raw JSON object matching this structure:
{
  "reply": "Your detailed conversational markdown answering the user request...",
  "keyFinding": "A single sentence highlighting the central insight or key finding of this response.",
  "confidenceLevel": "High", // "High" or "Medium" or "Low" 
  "recommendedAction": "A single concrete recommendation for next actions or data adjustments."
}`;

      // Convert messages to Gemini format: each message can be { role: "user" | "model", parts: [{ text: "..." }] }
      const contents = messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Call Gemini API
      const response = await generateContentWithRetryAndFallback({
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: "Conversational text of your reply, formatted nicely in markdown."
              },
              keyFinding: {
                type: Type.STRING,
                description: "A short, concise key finding summarizing the most important point of your answer."
              },
              confidenceLevel: {
                type: Type.STRING,
                description: "Confidence level: High, Medium, or Low"
              },
              recommendedAction: {
                type: Type.STRING,
                description: "Actionable recommendation based on the finding."
              }
            },
            required: ["reply", "keyFinding", "confidenceLevel", "recommendedAction"]
          }
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      return handleGeminiError(error, res);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
