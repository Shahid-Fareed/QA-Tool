const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
    },
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    employeeId: {
      type: String,
      trim: true,
      default: undefined,
    },
    role: {
      type: String,
      enum: ["company_admin", "team_lead", "manager", "hr", "employee"],
      default: "employee",
    },
    customPermissions: {
      type: [String],
      default: [],
    },
    id: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
module.exports = User;
