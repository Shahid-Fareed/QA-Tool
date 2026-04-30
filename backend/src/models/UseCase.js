const mongoose = require("mongoose");

const UseCaseSchema = new mongoose.Schema(
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
    actors: { type: String, default: "" },
    description: { type: String, default: "" },
    mainFlow: { type: String, default: "" },
    alternativeFlows: { type: String, default: "" },
    priority: { type: String, default: "Medium" },
    isManual: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const UseCase =
  mongoose.models.UseCase || mongoose.model("UseCase", UseCaseSchema);
module.exports = UseCase;
