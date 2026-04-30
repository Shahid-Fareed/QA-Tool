const { generateText } = require("ai");
const dbConnect = require("../db");
const ChatSession = require("../models/ChatSession");
const { ASSISTANT_SYSTEM_PROMPT } = require("../lib/prompts");
const { getNextGroqClient, fetchWithRetry } = require("../services/aiService");

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
      }),
    );

    let aiResponse = text.trim();
    let action = "none";
    let triggerInfo = null;

    try {
      const jsonStart = aiResponse.indexOf("{");
      const jsonEnd = aiResponse.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = aiResponse.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(potentialJson);
        if (parsed.action === "generate") {
          action = "generate";
          triggerInfo = {
            moduleName: parsed.moduleName,
            projectInfo: parsed.projectInfo,
          };
          aiResponse =
            parsed.text || `Starting generation for ${parsed.moduleName}...`;
        }
      }
    } catch (err) {}

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
        ? firstUserMsg.text.substring(0, 40) + (firstUserMsg.text.length > 40 ? "..." : "")
        : "New Conversation";
      session = new ChatSession({ userId, title, messages: [] });
    }

    // Append each message, preserving projectId if present
    for (const msg of messages) {
      session.messages.push({
        role: msg.role,
        text: msg.text,
        projectId: msg.projectId || null,
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
