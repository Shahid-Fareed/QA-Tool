const mongoose = require("mongoose");

const statusConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    color: { type: String, required: true }, // CSS class or Hex code
    resourceType: {
      type: String,
      enum: ["bugs", "test-cases"],
      default: "bugs",
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StatusConfig", statusConfigSchema);
