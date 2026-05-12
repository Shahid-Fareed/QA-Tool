const { createGroq } = require("@ai-sdk/groq");
const { generateText } = require("ai");
const UseCase = require("../models/UseCase");
const TestCase = require("../models/TestCase");
const BugReport = require("../models/BugReport");
const { COMBINED_MODULE_PROMPT } = require("../lib/prompts");

function getNextGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not found in .env");
  return createGroq({ apiKey });
}

const ensureString = (val) => {
  if (Array.isArray(val)) return val.join("\n");
  if (val === null || val === undefined) return "";
  return String(val);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(apiCall, maxRetries = 5, baseDelayMs = 3000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      const errorMsg = (error?.message || "").toLowerCase();
      if (
        error?.status === 429 ||
        errorMsg.includes("429") ||
        errorMsg.includes("quota")
      ) {
        attempt++;
        const backoffTime = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[429 Rate Limit] Retrying in ${backoffTime / 1000}s (Attempt ${attempt}/${maxRetries})...`,
        );
        await delay(backoffTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached due to rate limiting.");
}

function safeParseJSON(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    
    let jsonString = text.substring(start, end + 1);
    
    // Strip out dangerous control characters that break JSON.parse (except valid spaces like \n \r \t)
    // eslint-disable-next-line no-control-regex
    jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
       if (c === '\n' || c === '\r' || c === '\t') return c;
       return '';
    });

    return JSON.parse(jsonString);
  } catch (e) {
    console.error("[JSON Parse Error]:", e.message);
    return null;
  }
}

async function processModuleExpansion({
  moduleName,
  moduleIndex,
  projectId,
  projectName,
  sourceText,
  projectDesc,
}) {
  try {
    const groq = getNextGroqClient();
    const model = groq("llama-3.3-70b-versatile");
    const contextPrompt = `Project Context: ${projectDesc}\n\nTARGET MODULE: ${moduleName}\n\nRequirements Scope:\n${sourceText.substring(0, 15000)}`;

    const { text: rawOutput } = await fetchWithRetry(() =>
      generateText({
        model,
        system: COMBINED_MODULE_PROMPT(moduleIndex),
        prompt: contextPrompt,
        temperature: 0.4,
        maxOutputTokens: 8192,
      }),
    );

    const parsedData = safeParseJSON(rawOutput);

    if (
      !parsedData ||
      !Array.isArray(parsedData.useCases) ||
      !Array.isArray(parsedData.testCases) ||
      !Array.isArray(parsedData.bugReports)
    ) {
      console.error(
        `[generate] Invalid AI response structure for ${moduleName}`,
      );
      return;
    }

    const inserts = [];
    if (parsedData.useCases.length) {
      inserts.push(
        UseCase.insertMany(
          parsedData.useCases.map((uc) => ({
            ...uc,
            description: ensureString(uc.description),
            mainFlow: ensureString(uc.mainFlow),
            alternativeFlows: ensureString(uc.alternativeFlows),
            projectId,
            projectName,
            moduleId: moduleName,
            isManual: false,
          })),
        ),
      );
    }
    if (parsedData.testCases.length) {
      inserts.push(
        TestCase.insertMany(
          parsedData.testCases.map((tc) => ({
            ...tc,
            description: ensureString(tc.description),
            preconditions: ensureString(tc.preconditions),
            steps: ensureString(tc.steps),
            expectedResult: ensureString(tc.expectedResult),
            projectId,
            projectName,
            moduleId: moduleName,
            isManual: false,
          })),
        ),
      );
    }
    if (parsedData.bugReports.length) {
      inserts.push(
        BugReport.insertMany(
          parsedData.bugReports.map((bug) => ({
            ...bug,
            description: ensureString(bug.description),
            potentialImpact: ensureString(bug.potentialImpact),
            projectId,
            projectName,
            moduleId: moduleName,
            status: null,
            assigneeName: "Unassigned",
            isManual: false,
          })),
        ),
      );
    }
    await Promise.all(inserts);
    console.log(`[generate] Finished Module ${moduleIndex}: ${moduleName}`);
    return true;
  } catch (err) {
    console.error(`[generate] ERROR in ${moduleName}:`, err);
    return false;
  }
}

module.exports = {
  getNextGroqClient,
  fetchWithRetry,
  safeParseJSON,
  processModuleExpansion,
  delay,
};
