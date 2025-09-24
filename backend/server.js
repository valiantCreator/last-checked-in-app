// backend/server.js

// This line loads the secret database URL from the .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");
const { Pool } = require("pg"); // Import the PostgreSQL client
const nodemailer = require("nodemailer"); // NEW: Import nodemailer

// --- NEW: Import security and auth packages ---
const rateLimit = require("express-rate-limit");
const { z } = require("zod"); // Zod for validation
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// --- Firebase Admin Setup ---
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3001;

// Gemini DEV COMMENT: This is the fix for the rate limiter warning.
// It tells Express to trust the 'X-Forwarded-For' header set by Render's proxy.
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

// --- NEW: Rate Limiting Middleware ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many API requests from this IP, please try again after 15 minutes.",
  },
});

app.use("/api/", apiLimiter);

// --- NEW: Health check endpoint for keep-alive service ---
// This is a lightweight, public endpoint that an external service can ping
// to prevent the server from sleeping (cold starts) on free hosting tiers.
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is awake." });
});

// --- NEW: Nodemailer Transporter ---
// This is the object that knows how to send emails. It's configured once.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST,
  port: process.env.EMAIL_SERVICE_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVICE_USER,
    pass: process.env.EMAIL_SERVICE_PASS,
  },
});

// --- NEW: Zod Validation Schemas ---
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

const contactSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }).max(255),
  checkinFrequency: z
    .number()
    .int()
    .positive({ message: "Frequency must be a positive number" }),
  howWeMet: z.string().optional().nullable(),
  keyFacts: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  lastCheckin: z
    .string()
    .datetime({ message: "Invalid date format for last check-in" })
    .optional(),
});

const noteSchema = z.object({
  content: z.string().min(1, { message: "Note content cannot be empty" }),
});

const tagSchema = z.object({
  tagName: z.string().min(1, { message: "Tag name is required" }),
});

const snoozeDurationSchema = z.object({
  snooze_days: z.number().int().positive({
    message: "Snooze duration must be a positive number of days.",
  }),
});

const batchActionSchema = z.object({
  contactIds: z
    .array(z.number().int().positive())
    .min(1, { message: "At least one contact ID is required." }),
  snooze_days: z.number().int().positive().optional(),
});

const tokenSchema = z.object({
  token: z.string().min(1, { message: "FCM token is required" }),
});

const emailSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// --- NEW: Validation Middleware Factory ---
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (e) {
    res.status(400).json({ error: "Invalid request data", details: e.errors });
  }
};

// =================================================================
// --- AUTHENTICATION ENDPOINTS (Publicly Accessible) ---
// =================================================================

// POST /api/auth/signup --- Register a new user
app.post("/api/auth/signup", validate(authSchema), async (req, res) => {
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
app.post("/api/auth/login", validate(authSchema), async (req, res) => {
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

// NEW ENDPOINT: Request a password reset link
app.post(
  "/api/auth/forgot-password",
  validate(emailSchema),
  async (req, res) => {
    const { email } = req.body;
    try {
      const result = await pool.query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);
      const user = result.rows[0];

      // CRITICAL: We always return a 200 OK to prevent attackers from guessing which emails are in our database.
      if (!user) {
        return res.status(200).json({
          message:
            "If a user with that email exists, a password reset link has been sent.",
        });
      }

      // Generate a secure, short-lived JWT for the password reset.
      const payload = { userId: user.id };
      const resetToken = jwt.sign(payload, process.env.RESET_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      // Construct the password reset URL for the frontend.
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      const mailOptions = {
        from: `"Last Checked In" <${process.env.EMAIL_SERVICE_USER}>`,
        to: email,
        subject: "Password Reset Request",
        html: `
        <h1>Password Reset for Last Checked In</h1>
        <p>Hello,</p>
        <p>A password reset was requested for your account. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>This link is valid for 1 hour.</p>
      `,
      };

      await transporter.sendMail(mailOptions);
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
  }
);

// NEW ENDPOINT: Reset the user's password
app.post(
  "/api/auth/reset-password",
  validate(resetPasswordSchema),
  async (req, res) => {
    const { token, password } = req.body;
    try {
      // Verify the reset token using the dedicated secret.
      const decodedPayload = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
      const userId = decodedPayload.userId;

      // Hash the new password before storing it.
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update the user's password in the database.
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        passwordHash,
        userId,
      ]);

      res.status(200).json({ message: "Password reset successfully." });
    } catch (error) {
      console.error("Reset Password Error:", error);
      // If the token is invalid or expired, return a 400 Bad Request.
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

// =================================================================
// --- AUTHENTICATION MIDDLEWARE ---
// This function acts as a gatekeeper for our protected routes.
// =================================================================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ error: "No token provided. Access denied." });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
    if (err) {
      // Gemini FIX: Changed status from 403 to 401. This is an authentication failure, not an authorization failure.
      // Also improved the error message for clarity.
      return res
        .status(401)
        .json({ error: "Invalid or expired token. Access denied." });
    }
    req.userId = decodedPayload.userId;
    next();
  });
};

// =================================================================
// --- API Endpoints (ALL PROTECTED AND SCOPED FROM THIS POINT ON) ---
// =================================================================

// --- Batch Action Endpoints ---
app.post(
  "/api/contacts/batch-archive",
  authMiddleware,
  validate(batchActionSchema),
  async (req, res) => {
    const { contactIds } = req.body;
    try {
      await pool.query(
        "UPDATE contacts SET is_archived = TRUE WHERE id = ANY($1::int[]) AND user_id = $2",
        [contactIds, req.userId]
      );
      res.json({
        message: `${contactIds.length} contacts archived successfully.`,
      });
    } catch (err) {
      console.error("Error batch archiving contacts:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/contacts/batch-delete",
  authMiddleware,
  validate(batchActionSchema),
  async (req, res) => {
    const { contactIds } = req.body;
    try {
      await pool.query(
        "DELETE FROM contacts WHERE id = ANY($1::int[]) AND user_id = $2",
        [contactIds, req.userId]
      );
      res.json({
        message: `${contactIds.length} contacts deleted successfully.`,
      });
    } catch (err) {
      console.error("Error batch deleting contacts:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/contacts/batch-snooze",
  authMiddleware,
  validate(batchActionSchema),
  async (req, res) => {
    const { contactIds, snooze_days } = req.body;
    if (!snooze_days) {
      return res
        .status(400)
        .json({ error: "snooze_days is required for batch snooze." });
    }
    try {
      const query = `
        UPDATE contacts
        SET snooze_until = (
            GREATEST(
                NOW(),
                COALESCE(snooze_until, last_checkin + (checkin_frequency * INTERVAL '1 day'))
            ) + ($1 * INTERVAL '1 day')
        )
        WHERE id = ANY($2::int[]) AND user_id = $3;
      `;
      await pool.query(query, [snooze_days, contactIds, req.userId]);
      res.json({
        message: `${contactIds.length} contacts snoozed successfully.`,
      });
    } catch (err) {
      console.error("Error batch snoozing contacts:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/contacts/batch-restore",
  authMiddleware,
  validate(batchActionSchema),
  async (req, res) => {
    const { contactIds } = req.body;
    try {
      await pool.query(
        "UPDATE contacts SET is_archived = FALSE WHERE id = ANY($1::int[]) AND user_id = $2",
        [contactIds, req.userId]
      );
      res.json({
        message: `${contactIds.length} contacts restored successfully.`,
      });
    } catch (err) {
      console.error("Error batch restoring contacts:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/contacts/batch-checkin",
  authMiddleware,
  validate(batchActionSchema),
  async (req, res) => {
    const { contactIds } = req.body;
    const lastCheckin = new Date();
    try {
      await pool.query(
        "UPDATE contacts SET last_checkin = $1, snooze_until = NULL WHERE id = ANY($2::int[]) AND user_id = $3",
        [lastCheckin, contactIds, req.userId]
      );
      res.json({
        message: `${contactIds.length} contacts checked in successfully.`,
      });
    } catch (err) {
      console.error("Error batch checking in with contacts:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// --- Existing Endpoints ---
app.get("/api/search", authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ results: { contacts: [], notes: [] } });
  const searchTerm = `%${q}%`;
  try {
    const contactsResult = await pool.query(
      "SELECT * FROM contacts WHERE name ILIKE $1 AND is_archived = FALSE AND user_id = $2",
      [searchTerm, req.userId]
    );
    const notesResult = await pool.query(
      `
        SELECT n.*, c.name as "contactFirstName"
        FROM notes n
        JOIN contacts c ON n.contact_id = c.id
        WHERE n.content ILIKE $1 AND c.is_archived = FALSE AND n.user_id = $2
      `,
      [searchTerm, req.userId]
    );
    res.json({
      results: { contacts: contactsResult.rows, notes: notesResult.rows },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contacts", authMiddleware, async (req, res) => {
  try {
    const contactsResult = await pool.query(
      "SELECT * FROM contacts WHERE is_archived = FALSE AND user_id = $1 ORDER BY last_checkin",
      [req.userId]
    );
    const contacts = contactsResult.rows;
    for (const contact of contacts) {
      const tagsResult = await pool.query(
        `SELECT t.id, t.name FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = $1 AND t.user_id = $2`,
        [contact.id, req.userId]
      );
      contact.tags = tagsResult.rows || [];
    }
    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contacts/archived", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contacts WHERE is_archived = TRUE AND user_id = $1 ORDER BY name",
      [req.userId]
    );
    res.json({ contacts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contacts/archived/count", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM contacts WHERE is_archived = TRUE AND user_id = $1",
      [req.userId]
    );
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (err) {
    console.error("Error getting archived count:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/contacts",
  authMiddleware,
  validate(contactSchema),
  async (req, res) => {
    const {
      firstName: name,
      checkinFrequency,
      howWeMet,
      keyFacts,
      birthday,
      lastCheckin,
    } = req.body;
    const startDate = lastCheckin ? new Date(lastCheckin) : new Date();
    try {
      const result = await pool.query(
        `INSERT INTO contacts (name, checkin_frequency, last_checkin, how_we_met, key_facts, birthday, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          name,
          checkinFrequency,
          startDate,
          howWeMet,
          keyFacts,
          birthday,
          req.userId,
        ]
      );
      res.status(201).json({ ...result.rows[0], tags: [] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.put(
  "/api/contacts/:id",
  authMiddleware,
  validate(contactSchema),
  async (req, res) => {
    const {
      firstName: name,
      checkinFrequency,
      howWeMet,
      keyFacts,
      birthday,
      lastCheckin,
    } = req.body;
    try {
      const updateQuery = `
        UPDATE contacts
        SET
          name = $1,
          checkin_frequency = $2,
          how_we_met = $3,
          key_facts = $4,
          birthday = $5,
          last_checkin = $6,
          snooze_until = NULL
        WHERE id = $7 AND user_id = $8
      `;
      await pool.query(updateQuery, [
        name,
        checkinFrequency,
        howWeMet,
        keyFacts,
        birthday,
        lastCheckin,
        req.params.id,
        req.userId,
      ]);
      res.json({ message: "Contact updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.put("/api/contacts/:id/pin", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE contacts SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.userId]
    );
    res.json({ contact: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/contacts/:id/archive", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE contacts SET is_archived = TRUE WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ message: "Contact archived successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/contacts/:id/restore", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE contacts SET is_archived = FALSE WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.json({ message: "Contact restored successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contacts/:id/checkin", authMiddleware, async (req, res) => {
  const lastCheckin = new Date();
  try {
    await pool.query(
      "UPDATE contacts SET last_checkin = $1, snooze_until = NULL WHERE id = $2 AND user_id = $3",
      [lastCheckin, req.params.id, req.userId]
    );
    res.json({
      message: "Checked in successfully",
      lastCheckin: lastCheckin.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contacts/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM contacts WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.userId,
    ]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put(
  "/api/contacts/:id/snooze",
  authMiddleware,
  validate(snoozeDurationSchema),
  async (req, res) => {
    const { snooze_days } = req.body;
    try {
      const query = `
        UPDATE contacts
        SET snooze_until = (
            GREATEST(
                NOW(),
                COALESCE(snooze_until, last_checkin + (checkin_frequency * INTERVAL '1 day'))
            ) + ($1 * INTERVAL '1 day')
        )
        WHERE id = $2 AND user_id = $3
        RETURNING snooze_until;
      `;
      const result = await pool.query(query, [
        snooze_days,
        req.params.id,
        req.userId,
      ]);
      res.json({
        message: "Contact snoozed successfully",
        snooze_until: result.rows[0].snooze_until,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/api/tags", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tags WHERE user_id = $1 ORDER BY name",
      [req.userId]
    );
    res.json({ tags: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/contacts/:id/tags",
  authMiddleware,
  validate(tagSchema),
  async (req, res) => {
    const { tagName } = req.body;
    const contactId = req.params.id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const contactCheck = await client.query(
        "SELECT id FROM contacts WHERE id = $1 AND user_id = $2",
        [contactId, req.userId]
      );
      if (contactCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "Contact not found or access denied." });
      }
      const tagRes = await client.query(
        "INSERT INTO tags (name, user_id) VALUES ($1, $2) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [tagName.trim(), req.userId]
      );
      const tagId = tagRes.rows[0].id;
      await client.query(
        "INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [contactId, tagId]
      );
      await client.query("COMMIT");
      res.status(201).json({ id: tagId, name: tagName.trim() });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

app.delete(
  "/api/contacts/:contactId/tags/:tagId",
  authMiddleware,
  async (req, res) => {
    const { contactId, tagId } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const deleteQuery = `
          DELETE FROM contact_tags
          USING contacts
          WHERE contact_tags.contact_id = contacts.id
          AND contact_tags.contact_id = $1
          AND contact_tags.tag_id = $2
          AND contacts.user_id = $3
        `;
      await client.query(deleteQuery, [contactId, tagId, req.userId]);
      const usageResult = await client.query(
        "SELECT 1 FROM contact_tags ct JOIN tags t ON ct.tag_id = t.id WHERE t.id = $1 AND t.user_id = $2 LIMIT 1",
        [tagId, req.userId]
      );
      if (usageResult.rows.length === 0) {
        await client.query("DELETE FROM tags WHERE id = $1 AND user_id = $2", [
          tagId,
          req.userId,
        ]);
      }
      await client.query("COMMIT");
      res.json({ message: "Tag removed successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

app.get("/api/contacts/:id/notes", authMiddleware, async (req, res) => {
  try {
    const query = `
          SELECT n.* FROM notes n
          JOIN contacts c ON n.contact_id = c.id
          WHERE n.contact_id = $1 AND c.user_id = $2
          ORDER BY n.created_at DESC
        `;
    const result = await pool.query(query, [req.params.id, req.userId]);
    res.json({ notes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/contacts/:id/notes",
  authMiddleware,
  validate(noteSchema),
  async (req, res) => {
    const { content } = req.body;
    const createdAt = new Date();
    try {
      const result = await pool.query(
        "INSERT INTO notes (content, created_at, contact_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
        [content, createdAt, req.params.id, req.userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.put(
  "/api/notes/:noteId",
  authMiddleware,
  validate(noteSchema),
  async (req, res) => {
    const { content } = req.body;
    const modifiedAt = new Date();
    try {
      await pool.query(
        "UPDATE notes SET content = $1, modified_at = $2 WHERE id = $3 AND user_id = $4",
        [content, modifiedAt, req.params.noteId, req.userId]
      );
      res.json({
        message: "Note updated successfully",
        modifiedAt: modifiedAt.toISOString(),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/devices/token",
  authMiddleware,
  validate(tokenSchema),
  async (req, res) => {
    const { token } = req.body;
    const userId = req.userId;
    try {
      const query = `
        INSERT INTO devices (user_id, token) VALUES ($1, $2)
        ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id;
      `;
      await pool.query(query, [userId, token]);
      res.status(201).json({ message: "Token saved successfully" });
    } catch (err) {
      console.error("Error saving device token:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// --- SCHEDULED JOB (OVERHAULED FOR MULTI-USER) ---
cron.schedule("0 9 * * *", async () => {
  console.log(
    `[${new Date().toISOString()}] Running daily check for overdue contacts...`
  );
  const client = await pool.connect();
  try {
    const usersResult = await client.query(
      "SELECT DISTINCT user_id FROM devices"
    );
    const userIds = usersResult.rows.map((row) => row.user_id);
    if (userIds.length === 0) {
      console.log(
        `[${new Date().toISOString()}] No users with registered devices. Job finished.`
      );
      return;
    }
    for (const userId of userIds) {
      console.log(
        `[${new Date().toISOString()}] Processing notifications for user: ${userId}`
      );
      const overdueResult = await client.query(
        `
            SELECT id, name FROM contacts
            WHERE user_id = $1
              AND is_archived = FALSE
              AND (snooze_until IS NULL OR CAST(snooze_until AS DATE) < CURRENT_DATE)
              AND CAST((last_checkin + checkin_frequency * INTERVAL '1 day') AS DATE) <= CURRENT_DATE
        `,
        [userId]
      );
      const overdueContacts = overdueResult.rows;
      if (overdueContacts.length === 0) {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has no overdue contacts.`
        );
        continue;
      }
      const devicesResult = await client.query(
        "SELECT token FROM devices WHERE user_id = $1",
        [userId]
      );
      const userDeviceTokens = devicesResult.rows.map((row) => row.token);
      if (userDeviceTokens.length === 0) {
        console.log(
          `[${new Date().toISOString()}] User ${userId} has overdue contacts but no registered devices.`
        );
        continue;
      }
      let notificationBody;
      if (overdueContacts.length === 1) {
        notificationBody = `You have an overdue check-in for ${overdueContacts[0].name}.`;
      } else {
        notificationBody = `You have ${overdueContacts.length} overdue check-ins.`;
      }
      const message = {
        notification: { title: "Check-in Reminder", body: notificationBody },
        data: { app_url: "/" },
        tokens: userDeviceTokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `[${new Date().toISOString()}] User ${userId}: Successfully sent to ${
          response.successCount
        } of ${userDeviceTokens.length} devices.`
      );
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(userDeviceTokens[idx]);
          }
        });
        console.warn(
          `[${new Date().toISOString()}] User ${userId}: Failed to send to ${
            failedTokens.length
          } devices. Cleaning them up.`
        );
        await client.query(
          "DELETE FROM devices WHERE token = ANY($1::text[])",
          [failedTokens]
        );
      }
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] FATAL ERROR during scheduled job:`,
      error
    );
  } finally {
    client.release();
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
