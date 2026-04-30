const { streamText, generateText } = require("ai");
const { extractTextFromBuffer } = require("../lib/parser");
const dbConnect = require("../db");
const Project = require("../models/Project");
const TestCase = require("../models/TestCase");
const {
  DISCOVERY_SYSTEM_PROMPT,
  getScriptGenerationPrompt,
} = require("../lib/prompts");
const {
  getNextGroqClient,
  safeParseJSON,
  processModuleExpansion,
  delay,
} = require("../services/aiService");

exports.generateProject = async (req, res) => {
  try {
    const instructions = req.body.instructions?.trim() || "";
    let text = "";

    if (req.file) {
      text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    }

    if (!text && !instructions) {
      return res
        .status(400)
        .json({ error: "No file or instructions provided" });
    }

    const groq = getNextGroqClient();

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no");

    let resolveFinish;
    const onFinishPromise = new Promise((resolve) => {
      resolveFinish = resolve;
    });

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: DISCOVERY_SYSTEM_PROMPT,
      prompt: `REQUIREMENTS:\n${text}\n\nUSER INSTRUCTIONS:\n${instructions}`,
      temperature: 0.2,
      maxOutputTokens: 8192,
      onFinish: async ({ text: discoveryOutput }) => {
        try {
          const discoveryData = safeParseJSON(discoveryOutput);
          if (
            !discoveryData ||
            !discoveryData.modules ||
            discoveryData.modules.length === 0 ||
            discoveryData.project.name === "Unknown Project"
          ) {
            res.write(
              '\n{"signal": "error", "message": "Insufficient data to generate a project."}\n',
            );
            return;
          }

          const { project, modules } = discoveryData;
          await dbConnect();
          const newProject = await Project.create({
            projectName: project.name,
            description: project.description,
            createdBy: req.session.id,
          });

          const projectId = newProject._id.toString();
          res.write(`\nSIGNAL:PROJECT_ID:${projectId}\n`);
          res.write(`\nSIGNAL:PROJECT_NAME:${project.name}\n`);

          const modulesToProcess = [...modules];
          let hasSentUseCases = false;
          let hasSentTestCases = false;
          let hasSentBugs = false;
          let nextAvailableModuleIndex = 1;

          while (modulesToProcess.length > 0) {
            const moduleName = modulesToProcess.shift();
            if (!moduleName) break;

            if (!hasSentUseCases) {
              res.write('\n{"signal": "useCases"}\n');
              hasSentUseCases = true;
            }

            const success = await processModuleExpansion({
              moduleName,
              moduleIndex: nextAvailableModuleIndex,
              projectId,
              projectName: project.name,
              sourceText: text,
              projectDesc: project.description,
            });

            if (success) {
              nextAvailableModuleIndex++;
              if (!hasSentTestCases) {
                res.write('\n{"signal": "testCases"}\n');
                hasSentTestCases = true;
              }
              if (!hasSentBugs) {
                res.write('\n{"signal": "bugReports"}\n');
                hasSentBugs = true;
              }
            }
            await delay(500);
          }
          console.log("[generate] Generation complete.");
        } catch (err) {
          console.error("[generate] onFinish Error:", err);
          res.write(`\n{"signal": "error", "message": "${err.message}"}\n`);
        } finally {
          resolveFinish();
        }
      },
    });

    const stream = result.toTextStreamResponse();
    const reader = stream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        await onFinishPromise;
        res.end();
        return;
      }
      res.write(value);
      await pump();
    };
    await pump();
  } catch (error) {
    console.error("[generate] API Error:", error);
    let message = error.message || "Internal Server Error";
    if (!res.headersSent) {
      return res
        .status(error.status === 429 ? 429 : 500)
        .json({ error: message });
    } else {
      res.write(`\n{"signal": "error", "message": "${message}"}\n`);
      res.end();
    }
  }
};

exports.generateScript = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { framework = "Playwright", language = "TypeScript" } = req.body;

    const testCase = await TestCase.findById(testCaseId);
    if (!testCase)
      return res.status(404).json({ error: "Test case not found" });

    const groq = getNextGroqClient();
    const model = groq("llama-3.3-70b-versatile");

    const prompt = `TEST CASE DETAILS:
Title: ${testCase.title}
Description: ${testCase.description}
Preconditions: ${testCase.preconditions}
Steps: ${testCase.steps}
Expected Result: ${testCase.expectedResult}

Generate the ${framework} automation script in ${language}.`;

    const { text: script } = await generateText({
      model,
      system: getScriptGenerationPrompt(framework, language),
      prompt: prompt,
      temperature: 0.3,
    });

    res.json({ script: script.trim() });
  } catch (error) {
    console.error("[generate-script] API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

exports.saveScript = async (req, res) => {
  try {
    const { testCaseId } = req.params;
    const { script, framework, language } = req.body;

    const testCase = await TestCase.findByIdAndUpdate(
      testCaseId,
      {
        automationScript: script,
        automationFramework: framework,
        automationLanguage: language,
      },
      { new: true },
    );

    if (!testCase)
      return res.status(404).json({ error: "Test case not found" });
    res.json({ message: "Script saved successfully", testCase });
  } catch (error) {
    console.error("[save-script] API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
