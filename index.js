import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const requiredEnv = ["EMAIL_USER", "EMAIL_PASS", "MAIL_FROM", "MAIL_TO"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS.replace(/\s/g, ""),
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "https://emboss.netlify.app"
    ],
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/send-mail", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({
      success: false,
      error: "Name, email, and message are required.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid email address.",
    });
  }

  const mailOptions = {
    from: `"Emboss Clothing" <${process.env.MAIL_FROM}>`,
    to: process.env.MAIL_TO,
    replyTo: email.trim(),
    subject: `New Quote Request from ${name.trim()}`,
    text: [
      "New contact form submission from the Emboss Clothing website.",
      "",
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Phone: ${phone?.trim() || "Not provided"}`,
      "",
      "Message:",
      message.trim(),
    ].join("\n"),
    html: `
      <h2>New Quote Request</h2>
      <p>A visitor submitted the contact form on the Emboss Clothing website.</p>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name.trim())}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(email.trim())}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone?.trim() || "Not provided")}</td></tr>
      </table>
      <h3>Project Details</h3>
      <p style="white-space: pre-wrap;">${escapeHtml(message.trim())}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: "Email sent successfully." });
  } catch (error) {
    console.error("Failed to send email:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send email. Please try again later.",
    });
  }
});

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.listen(PORT, () => {
  console.log(`Mailer API running on http://localhost:${PORT}`);
});
