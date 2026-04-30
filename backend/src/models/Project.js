const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: { type: String, default: "unknown" },
  },
  { timestamps: true },
);

const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);
module.exports = Project;
