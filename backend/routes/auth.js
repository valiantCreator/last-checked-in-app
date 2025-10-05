// backend/routes/auth.js

const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Mailjet = require("node-mailjet");

// Gemini COMMENT: Note that pool and validate are passed in from server.js.
// This is a form of dependency injection that keeps our routes decoupled from the main server setup.
const createAuthRouter = (pool, validate) => {
  const router = express.Router();

  const mailjet = Mailjet.apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
  );

  const authSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, { message: "Reset token is required." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
  });

  const emailSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
  });

  // POST /api/auth/signup --- Register a new user
  router.post("/signup", validate(authSchema), async (req, res) => {
    const { email, password } = req.body;
    try {
      const userCheck = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (userCheck.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "A user with this email already exists." });
      }
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const newUserResult = await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        [email, passwordHash]
      );
      res.status(201).json(newUserResult.rows[0]);
    } catch (error) {
      console.error("Signup Error:", error);
      res
        .status(500)
        .json({ error: "Internal server error during user registration." });
    }
  });

  // POST /api/auth/login --- Authenticate a user and return a JWT
  router.post("/login", validate(authSchema), async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
      const payload = { userId: user.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.status(200).json({ token });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ error: "Internal server error during login." });
    }
  });

  // POST /api/auth/forgot-password --- Request a password reset link
  router.post("/forgot-password", validate(emailSchema), async (req, res) => {
    const { email } = req.body;
    try {
      const result = await pool.query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);
      const user = result.rows[0];

      if (!user) {
        // Security best practice: don't reveal if a user exists or not.
        return res.status(200).json({
          message:
            "If a user with that email exists, a password reset link has been sent.",
        });
      }

      const payload = { userId: user.id };
      const resetToken = jwt.sign(payload, process.env.RESET_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      const request = mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL,
              Name: "Last Checked In",
            },
            To: [{ Email: email }],
            Subject: "Password Reset Request",
            HTMLPart: `
                <h1>Password Reset for Last Checked In</h1>
                <p>Hello,</p>
                <p>A password reset was requested for your account. Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>If you did not request a password reset, please ignore this email.</p>
                <p>This link is valid for 1 hour.</p>
              `,
          },
        ],
      });

      await request;

      res.status(200).json({
        message:
          "If a user with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("Forgot Password Error:", error);
      res.status(500).json({
        error: "Internal server error during password reset request.",
      });
    }
  });

  // POST /api/auth/reset-password --- Reset the user's password
  router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    async (req, res) => {
      const { token, password } = req.body;
      try {
        const decodedPayload = jwt.verify(
          token,
          process.env.RESET_TOKEN_SECRET
        );
        const userId = decodedPayload.userId;

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
          passwordHash,
          userId,
        ]);

        res.status(200).json({ message: "Password reset successfully." });
      } catch (error) {
        console.error("Reset Password Error:", error);
        if (
          error.name === "TokenExpiredError" ||
          error.name === "JsonWebTokenError"
        ) {
          return res
            .status(400)
            .json({ error: "Invalid or expired password reset token." });
        }
        res
          .status(500)
          .json({ error: "Internal server error during password reset." });
      }
    }
  );

  return router;
};

module.exports = createAuthRouter;
