// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import customerRoute from "./routes/customerRoute.js";

// Load env vars silently
dotenv.config({ quiet: true, override: true });

// Initialize app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(compression()); // Compress responses for faster loading
app.use(cors());
app.use(express.json());

// MongoDB Connection with optimized settings
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  // bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false, // Disable mongoose buffering
})
  .then(() => console.log("✅ Connected to MongoDB with optimized settings"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Default route
app.get("/", (req, res) => {
  res.send("✅ Server running");
});

// Routes
import adminRoute from "./routes/adminRoute.js";
app.use("/api/customers", customerRoute);
app.use("/api/admin", adminRoute);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
