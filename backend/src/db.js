const mongoose = require("mongoose");

let isConnected = false;
let isConnecting = false;

async function dbConnect() {
  if (isConnected) return;
  if (isConnecting) return;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  isConnecting = true;
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected");
  } catch (err) {
    isConnected = false;
    console.error("❌ MongoDB connection error:", err);
    throw err;
  } finally {
    isConnecting = false;
  }
}

module.exports = dbConnect;
