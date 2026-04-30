const mongoose = require("mongoose");

const ExecutionSchema = new mongoose.Schema(
  {
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestCase",
      required: true,
    },
    status: {
      type: String,
      enum: ["Untested", "Passed", "Failed", "Blocked"],
      default: "Untested",
    },
    actualResult: { type: String, default: "" },
    evidence: { type: String, default: "" },
  },
  { _id: false },
);

const TestRunSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    assignedTo: { type: String, default: "" },
    moduleId: { type: String, default: "" },
    executions: { type: [ExecutionSchema], default: [] },
  },
  { timestamps: true },
);

const TestRun =
  mongoose.models.TestRun || mongoose.model("TestRun", TestRunSchema);
module.exports = TestRun;
