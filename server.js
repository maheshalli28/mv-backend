// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import customerRoute from "./routes/customerRoute.js";

// Load env vars silently
dotenv.config({ quiet: true, override: true });

// Initialize app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to Local MongoDB"))
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
