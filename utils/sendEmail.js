import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", // or use 'smtp.mailtrap.io' for testing
  auth: {
    user: process.env.EMAIL_USER,  // Your email (set in .env)
    pass: process.env.EMAIL_PASS,  // App password or real password
  },
});

export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `"MV ASSOCIATES" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};
