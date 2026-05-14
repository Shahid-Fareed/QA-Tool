const { generateText } = require("ai");
const dbConnect = require("../db");
const ChatSession = require("../models/ChatSession");
const { extractTextFromBuffer } = require("../lib/parser");
const {
  ASSISTANT_SYSTEM_PROMPT,
  INLINE_GENERATION_PROMPT,
} = require("../lib/prompts");
const {
  getNextGroqClient,
  fetchWithRetry,
  safeParseJSON,
} = require("../services/aiService");

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds a markdown table from inline-generation JSON rows.
 * Returns the table string, ready to be sent as a chat message.
 */
function buildMarkdownTable(parsed, userConstraints = "none") {
  const { type, subject, rows } = parsed;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return `No data was generated for "${subject}".`;
  }

  let constraintPrefix = "";
  if (userConstraints && userConstraints.toLowerCase() !== "none") {
    const lower = userConstraints.toLowerCase();
    if (lower.includes("negative")) constraintPrefix = "Negative ";
    else if (lower.includes("positive")) constraintPrefix = "Positive ";
    else if (lower.includes("edge")) constraintPrefix = "Edge Case ";
    else if (lower.includes("security")) constraintPrefix = "Security ";
  }

  const subjectSuffix =
    subject && subject.toLowerCase() !== "none" && subject.trim() !== ""
      ? ` — ${subject}`
      : "";

  if (type === "testcase") {
    const header =
      `| Test Case ID | Module | Title | Preconditions | Steps | Expected Result | Priority |\n` +
      `|---|---|---|---|---|---|---|\n`;
    const body = rows
      .map(
        (r) =>
          `| ${r.id || ""} | ${r.module || ""} | ${r.title || ""} | ${r.preconditions || ""} | ${r.steps || ""} | ${r.expectedResult || ""} | ${r.priority || ""} |`,
      )
      .join("\n");
    return `### ${constraintPrefix}Test Cases${subjectSuffix}\n\n${header}${body}`;
  }

  if (type === "bugreport") {
    const header =
      `| Bug ID | Module | Title | Description | Steps to Reproduce | Expected Result | Actual Result | Severity |\n` +
      `|---|---|---|---|---|---|---|---|\n`;
    const body = rows
      .map(
        (r) =>
          `| ${r.id || ""} | ${r.module || ""} | ${r.title || ""} | ${r.description || ""} | ${r.stepsToReproduce || ""} | ${r.expectedResult || ""} | ${r.actualResult || ""} | ${r.severity || ""} |`,
      )
      .join("\n");
    return `### ${constraintPrefix}Bug Reports${subjectSuffix}\n\n${header}${body}`;
  }

  if (type === "usecase") {
    const header =
      `| Use Case ID | Module | Use Case Name | Actor | Description | Preconditions | Main Flow | Alternate Flow |\n` +
      `|---|---|---|---|---|---|---|---|\n`;
    const body = rows
      .map(
        (r) =>
          `| ${r.id || ""} | ${r.module || ""} | ${r.name || ""} | ${r.actor || ""} | ${r.description || ""} | ${r.preconditions || ""} | ${r.mainFlow || ""} | ${r.alternateFlow || ""} |`,
      )
      .join("\n");
    return `### ${constraintPrefix}Use Cases${subjectSuffix}\n\n${header}${body}`;
  }

  return `Generated data for "${subject}" (unknown type).`;
}

/**
 * Reverse-engineers the markdown table back into structured JSON objects
 * so the LLM can manipulate raw data instead of error-prone markdown syntax.
 */
function parseMarkdownTableToJson(md, type) {
  if (!md) return null;
  const lines = md
    .split("\n")
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim());

  if (lines.length < 3) return null;

  // Skip header [0] and delimiter [1]
  const dataLines = lines.slice(2);

  const parseRow = (line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

  const rows = dataLines
    .map((line) => {
      const cells = parseRow(line);
      if (!cells || cells.length === 0) return null;

      if (type === "testcase") {
        return {
          id: cells[0] || "",
          module: cells[1] || "",
          title: cells[2] || "",
          preconditions: cells[3] || "",
          steps: cells[4] || "",
          expectedResult: cells[5] || "",
          priority: cells[6] || "",
        };
      }

      if (type === "bugreport") {
        return {
          id: cells[0] || "",
          module: cells[1] || "",
          title: cells[2] || "",
          description: cells[3] || "",
          stepsToReproduce: cells[4] || "",
          expectedResult: cells[5] || "",
          actualResult: cells[6] || "",
          severity: cells[7] || "",
        };
      }

      if (type === "usecase") {
        return {
          id: cells[0] || "",
          module: cells[1] || "",
          name: cells[2] || "",
          actor: cells[3] || "",
          description: cells[4] || "",
          preconditions: cells[5] || "",
          mainFlow: cells[6] || "",
          alternateFlow: cells[7] || "",
        };
      }

      return null;
    })
    .filter(Boolean);

  return rows;
}

// ─── Controllers ────────────────────────────────────────────────────────────

exports.chat = async (req, res) => {
  try {
    const { message, sessionId: incomingSessionId } = req.body;
    const userId = req.session.userId || req.session.id;

    if (!message) return res.status(400).json({ error: "Message is required" });

    await dbConnect();
    let session;
    if (incomingSessionId) {
      session = await ChatSession.findOne({ _id: incomingSessionId, userId });
    }

    if (!session) {
      session = new ChatSession({
        userId,
        title: message.substring(0, 30) + (message.length > 30 ? "..." : ""),
        messages: [],
      });
    }

    const fs = require("fs");
    const path = require("path");
    const debugLogPath = path.join(__dirname, "../../scratch/debug_chat.txt");
    const logMsg = `[${new Date().toISOString()}] Incoming request. SessionID: ${incomingSessionId}\nBody: ${JSON.stringify(req.body)}\nFile: ${req.file ? JSON.stringify({ originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype }) : "No file"}\n`;
    fs.appendFileSync(debugLogPath, logMsg);

    let fileContext = null;
    if (req.file) {
      const isImage = req.file.mimetype.startsWith("image/");
      if (!isImage) {
        try {
          const extractedText = await extractTextFromBuffer(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
          );
          fs.appendFileSync(debugLogPath, `Extracted Text Length: ${extractedText ? extractedText.length : 0}\n`);
          if (extractedText && extractedText.trim()) {
            fileContext = extractedText.trim();
          }
        } catch (err) {
          fs.appendFileSync(debugLogPath, `Extraction Error: ${err.message}\n`);
          console.error("[Assistant Chat File Extraction Error]:", err);
        }
      } else {
        fileContext = `[Image Attached: ${req.file.originalname}]`;
      }
    }

    const chatHistory = session.messages.map((m) => {
      let content = m.text;
      // Augment content with historical file attachments if present in metadata
      if (m.data && m.data.fileContext) {
        content = `[File Attachment Context]\nContent:\n${m.data.fileContext}\n\n---\n\nUser Request:\n${m.text}`;
      }
      return {
        role: m.role === "ai" ? "assistant" : "user",
        content,
      };
    });

    let finalPromptContent = message;
    if (fileContext) {
      finalPromptContent = `[File Attachment Context]\nContent:\n${fileContext}\n\n---\n\nUser Request:\n${message}`;
    }

    const groq = getNextGroqClient();

    const { text } = await fetchWithRetry(() =>
      generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: ASSISTANT_SYSTEM_PROMPT,
        messages: [
          ...chatHistory,
          { role: "user", content: finalPromptContent },
        ],
      }),
    );

    let aiResponse = text.trim();
    let action = "none";
    let triggerInfo = null;

    // ── Try to detect a JSON trigger ──────────────────────────────────────
    const parsed = safeParseJSON(aiResponse);
    if (parsed) {
      try {
        // ── Path A: Full project generation (file-based) ──────────────────
        if (parsed.action === "generate") {
          action = "generate";
          triggerInfo = {
            moduleName: parsed.moduleName,
            projectInfo: parsed.projectInfo,
          };
          aiResponse =
            parsed.text || `Starting generation for ${parsed.moduleName}...`;
        }

        // ── Path B: Inline table generation (text-only) ───────────────────
        else if (parsed.action === "inline-generate") {
          action = "inline-generate";
          const artifactType = parsed.artifactType || "testcase";
          const subject = parsed.subject || "Module";
          const userConstraints = parsed.userConstraints || "none";

          const inlineText =
            parsed.text || `Generating ${artifactType} table for ${subject}...`;

          const isRevision =
            parsed.isRevision === true || parsed.isRevision === "true";

          // Call AI a second time to get the structured table data
          try {
            // NEW: Attempt to find most recent markdown table in history to enable revision/edit support
            let previousTable = null;
            if (isRevision) {
              for (let i = chatHistory.length - 1; i >= 0; i--) {
                if (
                  chatHistory[i].role === "assistant" &&
                  chatHistory[i].content.includes("|")
                ) {
                  previousTable = chatHistory[i].content;
                  break;
                }
              }
            }

            // Convert Markdown to clean JSON objects for the LLM prompt, preventing format leakage
            const parsedRows = parseMarkdownTableToJson(
              previousTable,
              artifactType,
            );
            const dataToInject = parsedRows
              ? JSON.stringify(parsedRows, null, 2)
              : null;

            const groq2 = getNextGroqClient();
            const { text: tableText } = await fetchWithRetry(() =>
              generateText({
                model: groq2("llama-3.3-70b-versatile"),
                system: INLINE_GENERATION_PROMPT(
                  artifactType,
                  subject,
                  userConstraints,
                  dataToInject,
                ),
                prompt: `Generate a ${artifactType} table for: ${subject}. User specific instructions: ${userConstraints}`,
                temperature: isRevision ? 0.2 : 0.7, // Higher temperature for fresh results to promote diversity
                maxOutputTokens: 8192,
              }),
            );

            // Parse the structured JSON and convert to a markdown table
            const tableJson = safeParseJSON(tableText);
            if (tableJson && tableJson.rows) {
              const tableMarkdown = buildMarkdownTable(
                tableJson,
                userConstraints,
              );
              aiResponse = `${inlineText}\n\n${tableMarkdown}`;
            } else {
              aiResponse = `I could not generate a table for "${subject}". Please try again with a more specific description.`;
            }
          } catch (innerErr) {
            console.error(
              "[inline-generate] Failed on second AI call:",
              innerErr,
            );
            aiResponse = `Failed to generate inline table for ${subject}. Server error.`;
          }
        }
      } catch (err) {
        console.error(
          "[assistant action parser] Failed during execution:",
          err,
        );
        // Revert to plain string if it partially modified
      }
    }

    session.messages.push({
      role: "user",
      text: message,
      data: fileContext ? { fileContext } : undefined,
    });
    session.messages.push({ role: "ai", text: aiResponse });
    session.lastMessageAt = new Date();
    await session.save();

    return res.json({
      text: aiResponse,
      sessionId: session._id,
      action,
      triggerInfo,
      messages: session.messages,
    });
  } catch (err) {
    console.error("[assistant chat] Error:", err);
    res
      .status(err.status === 429 ? 429 : 500)
      .json({ error: err.message || "Internal Server Error" });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.userId || req.session.id;
    await dbConnect();
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.renameSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.session.userId || req.session.id;
    await dbConnect();
    const session = await ChatSession.findOneAndUpdate(
      { _id: sessionId, userId },
      { title },
      { new: true },
    );
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.userId || req.session.id;
    await dbConnect();
    const session = await ChatSession.findOneAndDelete({
      _id: sessionId,
      userId,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json({ message: "Session deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.id;
    const history = await ChatSession.find({ userId })
      .select("_id title lastMessageAt")
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.appendMessages = async (req, res) => {
  try {
    const { sessionId: incomingSessionId, messages } = req.body;
    const userId = req.session.userId || req.session.id;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages are required" });
    }

    await dbConnect();
    let session;

    if (incomingSessionId) {
      session = await ChatSession.findOne({ _id: incomingSessionId, userId });
    }

    if (!session) {
      // Create a new session — use the first user message text as the title
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.text.substring(0, 40) +
          (firstUserMsg.text.length > 40 ? "..." : "")
        : "New Conversation";
      session = new ChatSession({ userId, title, messages: [] });
    }

    // Append each message, preserving projectId if present
    for (const msg of messages) {
      session.messages.push({
        role: msg.role,
        text: msg.text,
        projectId: msg.projectId || null,
        isReport: msg.isReport || false,
        type: msg.type || "text",
      });
    }

    session.lastMessageAt = new Date();
    await session.save();

    return res.json({ sessionId: session._id });
  } catch (err) {
    console.error("[appendMessages] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Exports raw table artifacts into a specified project.
 * Handles deduplication by Title and generates new sequential custom IDs.
 */
exports.exportArtifacts = async (req, res) => {
  try {
    const { projectId, artifactType, items } = req.body;
    if (!projectId || !artifactType || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    await dbConnect();
    // Late require models to prevent initialization sync issues
    const mongoose = require("mongoose");
    const Project = require("../models/Project");
    const TestCase = require("../models/TestCase");
    const UseCase = require("../models/UseCase");
    const BugReport = require("../models/BugReport");

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Selected project not found" });
    }

    let Model;
    let idPrefix;
    if (artifactType === "testcase") {
      Model = TestCase;
      idPrefix = "TC-";
    } else if (artifactType === "usecase") {
      Model = UseCase;
      idPrefix = "UC-";
    } else if (artifactType === "bugreport") {
      Model = BugReport;
      idPrefix = "BUG-";
    } else {
      return res.status(400).json({ error: "Invalid artifact type specified" });
    }

    // 1. Fetch existing items in this project to perform de-duplication by title
    const existing = await Model.find({ projectId }).select("title").lean();
    const existingTitles = new Set(
      existing.map((x) => (x.title || "").toLowerCase().trim()),
    );

    const skippedItems = [];
    const toInsert = [];
    // 3. Calculate existing module numbering & sub-item counts chronologically.
    const existingModules = await Model.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: "$moduleId",
          firstCreated: { $min: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { firstCreated: 1 } },
    ]);

    const moduleToNum = {};
    const moduleCounts = {};
    existingModules.forEach((mod, i) => {
      const mName = (mod._id || "Unspecified").trim();
      moduleToNum[mName] = i + 1;
      moduleCounts[mName] = mod.count || 0;
    });

    for (const raw of items) {
      const title = (raw.title || "").trim();
      if (!title) continue; // Skip blank items

      const modName = (raw.module || "Unspecified").trim();

      if (existingTitles.has(title.toLowerCase())) {
        skippedItems.push({
          module: modName,
          title: title,
        });
        continue;
      }

      // Dynamically register new modules into the next incremental sequence index
      if (!moduleToNum[modName]) {
        moduleToNum[modName] = Object.keys(moduleToNum).length + 1;
        moduleCounts[modName] = 0;
      }

      const moduleIdx = moduleToNum[modName];
      const itemNum = ++moduleCounts[modName];

      // 4. Construct core shared fields with dotted module suffix (e.g., TC-1.01)
      const doc = {
        projectId,
        projectName: project.projectName,
        moduleId: modName,
        title,
        customId: `${idPrefix}${moduleIdx}.${String(itemNum).padStart(2, "0")}`,
        isManual: true,
        capturedVia: "chat",
      };

      // 3. Map distinct model fields
      if (artifactType === "testcase") {
        doc.description = raw.description || title;
        doc.preconditions = raw.preconditions || "";
        doc.steps = raw.steps || raw.stepsToReproduce || "";
        doc.expectedResult = raw.expectedResult || "";
        doc.priority = raw.priority || "Medium";
        doc.status = raw.status || "Pending";
      } else if (artifactType === "usecase") {
        doc.actors = raw.actor || raw.actors || "";
        doc.description = raw.description || "";
        doc.mainFlow = raw.mainFlow || "";
        doc.alternativeFlows = raw.alternativeFlows || raw.alternateFlow || "";
        doc.priority = raw.priority || "Medium";
      } else if (artifactType === "bugreport") {
        // If separate description, expected, steps are provided, synthesize into description if fields are omitted
        let fullDesc = raw.description || "";
        if (raw.stepsToReproduce) {
          fullDesc += `\n\n**Steps to Reproduce:**\n${raw.stepsToReproduce}`;
        }
        if (raw.expectedResult) {
          fullDesc += `\n\n**Expected Result:**\n${raw.expectedResult}`;
        }
        if (raw.actualResult) {
          fullDesc += `\n\n**Actual Result:**\n${raw.actualResult}`;
        }
        doc.description = fullDesc.trim();
        doc.severity = raw.severity || "Medium";
        doc.priority = raw.priority || "Medium";
      }

      toInsert.push(doc);
    }

    // Bulk insertion
    if (toInsert.length > 0) {
      await Model.insertMany(toInsert);
    }

    return res.json({
      success: true,
      insertedCount: toInsert.length,
      skippedCount: skippedItems.length,
      skippedDetails: skippedItems,
      message: `Successfully exported ${toInsert.length} items.`,
    });
  } catch (err) {
    console.error("[exportArtifacts] Error during bulk write:", err);
    return res
      .status(500)
      .json({ error: "Failed to write data to project database." });
  }
};
