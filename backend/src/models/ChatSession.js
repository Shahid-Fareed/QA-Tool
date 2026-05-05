const mongoose = require("mongoose");

const ChatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    title: { type: String, default: "New Conversation" },
    messages: [
      {
        role: { type: String, enum: ["user", "ai"], required: true },
        text: { type: String, required: true },
        projectId: { type: String, default: null }, // Link to generated project
        isReport: { type: Boolean, default: false }, // Flag for QA Analysis Reports
        type: { type: String, default: "text" }, // text, analysis, error
        data: { type: mongoose.Schema.Types.Mixed }, // project metadata if generated
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const ChatSession =
  mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionSchema);
module.exports = ChatSession;
