const mongoose = require("mongoose");

const RoleTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a template name"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    permissions: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const RoleTemplate =
  mongoose.models.RoleTemplate ||
  mongoose.model("RoleTemplate", RoleTemplateSchema);

module.exports = RoleTemplate;
