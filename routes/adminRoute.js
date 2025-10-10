import express from "express";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// Admin registration (for initial setup)
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });
    const admin = new Admin({ username, email, password });
    await admin.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, admin: { username: admin.username, email: admin.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Forgot password - send OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const adminEmail = "mvassociates.org@gmail.com";
    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otp = otp;
    admin.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await admin.save();
    await sendEmail(adminEmail, "Your OTP for password reset", `Your OTP is: <b>${otp}</b>`);
    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

// Verify OTP and reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || admin.otp !== otp || Date.now() > admin.otpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    admin.password = newPassword;
    admin.otp = undefined;
    admin.otpExpires = undefined;
    await admin.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

export default router;
