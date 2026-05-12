const mongoose = require("mongoose");

const TestCaseSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    projectName: { type: String, default: "" },
    moduleId: { type: String, required: true },
    customId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    preconditions: { type: String, default: "" },
    steps: { type: String, default: "" },
    expectedResult: { type: String, default: "" },
    priority: { type: String, default: "Medium" },
    status: { type: String, default: "Pending" },
    linkedUseCase: { type: String, default: "" },
    isManual: { type: Boolean, default: false },
    capturedVia: { type: String, default: "" },
    automationScript: { type: String, default: "" },
    automationFramework: { type: String, default: "" },
    automationLanguage: { type: String, default: "" },
  },
  { timestamps: true },
);

const TestCase =
  mongoose.models.TestCase || mongoose.model("TestCase", TestCaseSchema);
module.exports = TestCase;
