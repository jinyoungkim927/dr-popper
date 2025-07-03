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

    const prompt = `You are an experienced medical examiner evaluating a student during a clinical viva examination. 
Be rigorous but fair. Medical accuracy and patient safety are paramount.

SUBSECTION: ${subsection}
EXPECTED KEY POINTS: ${expectedPoints}

STUDENT'S RESPONSE:
${transcript}

GRADING CRITERIA:
1. Medical accuracy and completeness (40%)
2. Clinical reasoning and systematic approach (30%)  
3. Recognition of red flags/urgent conditions (20%)
4. Patient safety considerations (10%)

SPECIFIC EVALUATION TASKS:
- Identify ANY factually incorrect statements
- List critical points that were NOT mentioned but should have been
- Note any dangerous omissions or unsafe recommendations
- Highlight good points if any

Evaluate the response and provide:
1. Score (0-100): Be strict. 100% requires exceptional performance
   - 90-100: Excellent, consultant level
   - 80-89: Very good, safe independent practice
   - 70-79: Good, minor gaps
   - 60-69: Adequate, significant gaps
   - Below 60: Unsafe/incomplete
   
2. isComplete: true only if ALL major points addressed adequately

3. feedback: SPECIFIC feedback (max 50 words) mentioning:
   - Most critical missing information (e.g., "Failed to mention X-ray for pneumonia diagnosis")
   - Any incorrect statements (e.g., "Incorrectly stated drug X for condition Y")
   - Or key safety concerns (e.g., "Did not check for contraindications")
   Be SPECIFIC - name the actual medical facts/tests/treatments missing or wrong

Respond ONLY with JSON:
{
  "score": <number>,
  "isComplete": <boolean>,
  "feedback": "<specific feedback with actual medical details>"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",  // Faster model for real-time grading
        messages: [
          {
            role: "system",
            content: "You are a strict medical examiner. Grade rigorously as lives depend on medical accuracy. Always provide SPECIFIC feedback mentioning actual medical terms, tests, or treatments that were missing or incorrect. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,  // Lower temperature for more consistent grading
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
    const { sessionData, studentName, sessionDate, transcript } = req.body;

    // Generate analysis if transcript is provided
    let analysis = null;
    if (transcript && transcript.length > 100) {
      try {
        const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: "You are an experienced medical educator analyzing a student's clinical viva examination. Provide constructive feedback based on the transcript."
              },
              {
                role: "user",
                content: `Analyze this medical examination transcript and provide feedback.
                
TRANSCRIPT:
${transcript.substring(0, 8000)}

Please provide ONLY factual medical feedback:
1. Summary of Discussion:
   - What medical conditions/topics were discussed (30 words max)

2. Key Knowledge Gaps or Incorrect Statements:
   - ONLY list factually incorrect medical statements
   - ONLY list critical medical knowledge that was missing
   - Max 3 bullet points

3. Critical Information That Was Missing:
   - ONLY major medical facts/tests/treatments not mentioned
   - ONLY items that could impact patient safety
   - Max 3 bullet points  

4. Specific Topics to Review:
   - ONLY medical topics requiring further study
   - Max 3 bullet points

DO NOT comment on:
- Communication style or manner
- Use of filler words
- Professional behavior
- Confidence levels
- Any non-medical aspects

Keep total response under 200 words. Focus ONLY on medical accuracy and critical omissions.`
              }
            ],
            temperature: 0.3,
            max_tokens: 800
          }),
        });

        const analysisData = await analysisResponse.json();
        analysis = analysisData.choices[0].message.content;
      } catch (error) {
        console.error('Analysis generation error:', error);
        // Continue without analysis if it fails
      }
    }

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
      recommendations: sessionData.recommendations || [],
      transcript: sessionData.transcript || transcript,
      analysis: analysis
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

// Parse case questions endpoint
app.post("/api/parse-case-questions", async (req, res) => {
  try {
    const { caseContent } = req.body;

    const prompt = `Extract all the questions from this medical case protocol. Return ONLY the questions as a JSON array of strings, nothing else.

CASE CONTENT:
${caseContent}

Look for numbered questions (e.g., "1.", "2.") and extract the complete question text. Include the full question until you reach the next question number or a clear section break.

Return format:
["Question 1 text here?", "Question 2 text here?", ...]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a medical case parser. Extract questions from case protocols. Return ONLY a JSON array of question strings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    const data = await response.json();
    const questions = JSON.parse(data.choices[0].message.content);

    res.json({ questions });
  } catch (error) {
    console.error('Question parsing error:', error);
    res.status(500).json({ error: 'Failed to parse questions' });
  }
});

// Load case protocol endpoint
app.get('/api/case-protocol/:caseNumber', async (req, res) => {
  try {
    const caseNumber = parseInt(req.params.caseNumber);
    if (caseNumber < 1 || caseNumber > 45) {
      return res.status(400).json({ error: 'Invalid case number. Must be between 1 and 45.' });
    }

    const caseFile = path.join(__dirname, 'cases', `case_protocol_${caseNumber}.txt`);

    if (!fs.existsSync(caseFile)) {
      return res.status(404).json({ error: `Case protocol ${caseNumber} not found` });
    }

    const caseContent = await fs.promises.readFile(caseFile, 'utf-8');

    // Get case category from cases_reference.json
    const casesReference = JSON.parse(await fs.promises.readFile(path.join(__dirname, 'cases_reference.json'), 'utf-8'));
    const caseTitle = casesReference.case_titles[caseNumber] || `Case Protocol ${caseNumber}`;

    // Find which category this case belongs to
    let category = 'Unknown';
    for (const [system, cases] of Object.entries(casesReference.cases_by_system)) {
      if (cases.includes(String(caseNumber))) {
        category = system.charAt(0).toUpperCase() + system.slice(1);
        break;
      }
    }

    // Parse questions from content using GPT-4
    let parsedQuestions = [];
    try {
      const parseResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a medical case parser. Extract questions from case protocols. Return ONLY a JSON array of question strings."
            },
            {
              role: "user",
              content: `Extract all the questions from this medical case protocol. Return ONLY the questions as a JSON array of strings, nothing else.

CASE CONTENT:
${caseContent}

Look for numbered questions (e.g., "1.", "2.") and extract the complete question text. Include the full question until you reach the next question number or a clear section break.

Return format:
["Question 1 text here?", "Question 2 text here?", ...]`
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        }),
      });

      const parseData = await parseResponse.json();
      parsedQuestions = JSON.parse(parseData.choices[0].message.content);
    } catch (error) {
      console.error('Failed to parse questions:', error);
      // Fallback to empty array if parsing fails
    }

    res.json({
      caseNumber,
      title: caseTitle,
      category,
      content: caseContent,
      parsedQuestions
    });
  } catch (error) {
    console.error('Error loading case protocol:', error);
    res.status(500).json({ error: 'Failed to load case protocol' });
  }
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
