import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Add JSON parsing middleware
app.use(express.json());

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Grading endpoint
app.post("/api/grade", async (req, res) => {
  try {
    const { userResponse, context, criteria } = req.body;

    const prompt = `You are a medical examiner grading a student's response. 
Grade the following response on a scale of 0-10 based on these weighted criteria:
- Accuracy (${criteria.accuracy * 100}%): Correctness of facts and diagnosis
- Clinical Reasoning (${criteria.clinicalReasoning * 100}%): Logical thinking process
- Critical Features (${criteria.criticalFeatures * 100}%): Recognition of important/dangerous signs
- Safety (${criteria.safety * 100}%): Patient safety awareness

Context: ${context}
Student Response: ${userResponse}

Provide only a numerical score from 0-10, nothing else.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a medical examiner. Provide only numerical scores."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      }),
    });

    const data = await response.json();
    const score = parseFloat(data.choices[0].message.content.trim());

    res.json({ score: isNaN(score) ? 0 : score });
  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({ error: 'Failed to grade response' });
  }
});

// Live grading endpoint for subsection completion
app.post("/api/grade-subsection", async (req, res) => {
  try {
    const { transcript, subsection, expectedPoints } = req.body;

    const prompt = `You are grading a medical student's response to a specific subsection of a case.
Subsection: ${subsection}
Expected points to cover: ${expectedPoints}

Student's response transcript:
${transcript}

Evaluate the student's response and provide:
1. A percentage score (0-100) based on completeness and accuracy
2. Whether the subsection is sufficiently completed (true/false)
3. Brief feedback (max 50 words)

Format your response as JSON:
{
  "score": <number>,
  "isComplete": <boolean>,
  "feedback": "<string>"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a medical examiner. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    res.json(result);
  } catch (error) {
    console.error('Subsection grading error:', error);
    res.status(500).json({ error: 'Failed to grade subsection' });
  }
});

// Case validation endpoint
app.post("/api/validate-case-completion", async (req, res) => {
  try {
    const { caseId, userResponses, questionsAnswered } = req.body;

    const prompt = `Evaluate if a medical case has been sufficiently completed.
Case ID: ${caseId}
Questions answered: ${questionsAnswered.join(', ')}
Total responses: ${userResponses.length}

Determine if the student has:
1. Addressed all major aspects of the case
2. Demonstrated sufficient understanding
3. Provided safe and appropriate responses

Return JSON with:
{
  "canComplete": <boolean>,
  "reason": "<brief explanation>",
  "completionPercentage": <number 0-100>
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a medical examiner. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    res.json(result);
  } catch (error) {
    console.error('Case validation error:', error);
    res.status(500).json({ error: 'Failed to validate case completion' });
  }
});

// PDF report generation endpoint
app.post("/api/generate-report", async (req, res) => {
  try {
    const { sessionData, studentName, sessionDate } = req.body;

    // Format the report data
    const reportData = {
      studentName: studentName || 'Student',
      sessionDate: sessionDate || new Date().toISOString(),
      totalCases: sessionData.cases.length,
      averageScore: sessionData.averageScore,
      grade: sessionData.grade,
      cases: sessionData.cases.map(c => ({
        id: c.id,
        title: c.title,
        score: c.score,
        subsections: c.subsections || [],
        duration: c.duration,
        feedback: c.feedback
      })),
      weakAreas: sessionData.weakAreas || [],
      recommendations: sessionData.recommendations || []
    };

    res.json({
      success: true,
      reportData: reportData
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Serve case protocol files
app.get('/api/cases/:filename', (req, res) => {
  const filename = req.params.filename;
  const casePath = path.join(__dirname, 'cases', filename);

  // Security check - only allow .txt files
  if (!filename.endsWith('.txt') || filename.includes('..')) {
    return res.status(400).send('Invalid file request');
  }

  fs.readFile(casePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading case file:', err);
      return res.status(404).send('Case not found');
    }
    res.send(data);
  });
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
