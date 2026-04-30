const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema(
  {
    name: { type: String },
    type: { type: String },
    url: { type: String },
  },
  { _id: false },
);

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system", "ai"],
      required: true,
    },
    content: {
      type: String,
      required: false,
    },
    attachments: [AttachmentSchema],
    customRules: { type: String },
  },
  { _id: false },
);

const CodeAuditSessionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },
    title: {
      type: String,
      default: "New Architectural Review",
    },
    messages: [MessageSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("CodeAuditSession", CodeAuditSessionSchema);
