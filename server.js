// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import customerRoute from "./routes/customerRoute.js";
import adminRoute from "./routes/adminRoute.js";

// Load environment variables
dotenv.config({ quiet: true, override: true });

// Initialize app
const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // or use your frontend domain, e.g. "https://mvassociates.org"
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Middleware
app.use(compression()); // Compress responses
app.use(cors());
app.use(express.json());

// ✅ Attach io to every request (for real-time events)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ MongoDB Connection (optimized)
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10, 
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Default route
app.get("/", (req, res) => {
  res.send("✅ MV Associates API Server Running");
});

// Routes
app.use("/api/customers", customerRoute);
app.use("/api/admin", adminRoute);

// ✅ Handle unexpected routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ✅ Log when admin connects to real-time
io.on("connection", (socket) => {
  console.log("🟢 Admin/Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});
