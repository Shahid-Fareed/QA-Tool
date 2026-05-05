const { generateText } = require("ai");
const dbConnect = require("../db");
const ChatSession = require("../models/ChatSession");
const {
  ASSISTANT_SYSTEM_PROMPT,
  INLINE_GENERATION_PROMPT,
} = require("../lib/prompts");
const { getNextGroqClient, fetchWithRetry, safeParseJSON } = require("../services/aiService");

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds a markdown table from inline-generation JSON rows.
 * Returns the table string, ready to be sent as a chat message.
 */
function buildMarkdownTable(parsed) {
  const { type, subject, rows } = parsed;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return `No data was generated for "${subject}".`;
  }

  if (type === "testcase") {
    const header =
      `| Test Case ID | Module | Title | Preconditions | Steps | Expected Result | Priority |\n` +
      `|---|---|---|---|---|---|---|\n`;
    const body = rows
      .map(
        (r) =>
          `| ${r.id || ""} | ${r.module || ""} | ${r.title || ""} | ${r.preconditions || ""} | ${r.steps || ""} | ${r.expectedResult || ""} | ${r.priority || ""} |`
      )
      .join("\n");
    return `### Test Cases — ${subject}\n\n${header}${body}`;
  }

  if (type === "bugreport") {
    const header =
      `| Bug ID | Module | Title | Description | Steps to Reproduce | Expected Result | Actual Result | Severity |\n` +
      `|---|---|---|---|---|---|---|---|\n`;
    const body = rows
      .map(
        (r) =>
          `| ${r.id || ""} | ${r.module || ""} | ${r.title || ""} | ${r.description || ""} | ${r.stepsToReproduce || ""} | ${r.expectedResult || ""} | ${r.actualResult || ""} | ${r.severity || ""} |`
      )
      .join("\n");
    return `### Bug Reports — ${subject}\n\n${header}${body}`;
  }

  if (type === "usecase") {
    const header =
      `| Use Case ID | Module | Use Case Name | Actor | Description | Preconditions | Main Flow | Alternate Flow |\n` +
      `|---|---|---|---|---|---|---|---|\n`;
    const body = rows
      .map(
        (r) =>
          `| ${r.id || ""} | ${r.module || ""} | ${r.name || ""} | ${r.actor || ""} | ${r.description || ""} | ${r.preconditions || ""} | ${r.mainFlow || ""} | ${r.alternateFlow || ""} |`
      )
      .join("\n");
    return `### Use Cases — ${subject}\n\n${header}${body}`;
  }

  return `Generated data for "${subject}" (unknown type).`;
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

    const chatHistory = session.messages.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    }));

    const groq = getNextGroqClient();
    const { text } = await fetchWithRetry(() =>
      generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: ASSISTANT_SYSTEM_PROMPT,
        messages: [...chatHistory, { role: "user", content: message }],
      })
    );

    let aiResponse = text.trim();
    let action = "none";
    let triggerInfo = null;

    // ── Try to detect a JSON trigger ──────────────────────────────────────
    try {
      const jsonStart = aiResponse.indexOf("{");
      const jsonEnd = aiResponse.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = aiResponse.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(potentialJson);

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

          const inlineText =
            parsed.text || `Generating ${artifactType} table for ${subject}...`;

          // Call AI a second time to get the structured table data
          const groq2 = getNextGroqClient();
          const { text: tableText } = await fetchWithRetry(() =>
            generateText({
              model: groq2("llama-3.3-70b-versatile"),
              system: INLINE_GENERATION_PROMPT(artifactType, subject),
              prompt: `Generate a ${artifactType} table for: ${subject}`,
              temperature: 0.3,
              maxOutputTokens: 8192,
            })
          );

          // Parse the structured JSON and convert to a markdown table
          const tableJson = safeParseJSON(tableText);
          if (tableJson && tableJson.rows) {
            aiResponse = buildMarkdownTable(tableJson);
          } else {
            aiResponse = `I could not generate a table for "${subject}". Please try again with a more specific description.`;
          }
        }
      }
    } catch (err) {
      // If JSON parsing fails, treat as plain text response — no-op
    }

    session.messages.push({ role: "user", text: message });
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
      { new: true }
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
    await dbConnect();
    const history = await ChatSession.find({ userId })
      .select("_id title lastMessageAt")
      .sort({ lastMessageAt: -1 })
      .limit(20);
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
