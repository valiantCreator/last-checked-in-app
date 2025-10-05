// backend/routes/index.js

const express = require("express");
const { z } = require("zod");
const Mailjet = require("node-mailjet");

// Gemini COMMENT: This router handles general, app-wide endpoints.
const createIndexRouter = (pool, validate, authMiddleware) => {
  const router = express.Router();

  const mailjet = Mailjet.apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
  );

  const feedbackSchema = z.object({
    content: z
      .string()
      .min(10, { message: "Feedback must be at least 10 characters." })
      .max(5000, { message: "Feedback cannot exceed 5000 characters." }),
  });

  const tokenSchema = z.object({
    token: z.string().min(1, { message: "FCM token is required" }),
  });

  // Health check endpoint (public)
  router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is awake." });
  });

  // All subsequent routes are protected
  router.use(authMiddleware);

  // GET /api/dashboard-data
  router.get("/dashboard-data", async (req, res) => {
    try {
      const [contactsResult, archivedCountResult, tagsResult] =
        await Promise.all([
          pool.query(
            `
              SELECT
                c.*,
                COALESCE(
                  (
                    SELECT JSON_AGG(t.* ORDER BY t.name)
                    FROM tags t
                    JOIN contact_tags ct ON t.id = ct.tag_id
                    WHERE ct.contact_id = c.id
                  ),
                  '[]'::json
                ) as tags
              FROM contacts c
              WHERE c.is_archived = FALSE AND c.user_id = $1
              ORDER BY c.last_checkin;
            `,
            [req.userId]
          ),
          pool.query(
            "SELECT COUNT(*) FROM contacts WHERE is_archived = TRUE AND user_id = $1",
            [req.userId]
          ),
          pool.query("SELECT * FROM tags WHERE user_id = $1 ORDER BY name", [
            req.userId,
          ]),
        ]);

      const contacts = contactsResult.rows;
      const archivedCount = parseInt(archivedCountResult.rows[0].count, 10);
      const tags = tagsResult.rows;

      res.json({
        contacts,
        archivedCount,
        tags,
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/feedback
  router.post("/feedback", validate(feedbackSchema), async (req, res) => {
    const { content } = req.body;
    const userId = req.userId;
    try {
      const userResult = await pool.query(
        "SELECT email FROM users WHERE id = $1",
        [userId]
      );
      const userEmail = userResult.rows[0]?.email || "Unknown Email";

      const request = mailjet.post("send", { version: "v3.1" }).request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL,
              Name: "Last Checked In Feedback",
            },
            To: [{ Email: process.env.FEEDBACK_RECIPIENT_EMAIL }],
            Subject: `New Feedback from User: ${userEmail}`,
            HTMLPart: `
              <h1>New Feedback Received</h1>
              <p><strong>From User ID:</strong> ${userId}</p>
              <p><strong>From User Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
              <hr>
              <h2>Feedback Content:</h2>
              <p style="white-space: pre-wrap;">${content}</p>
            `,
          },
        ],
      });

      await request;
      res.status(200).json({ message: "Feedback received successfully." });
    } catch (error) {
      console.error("Error processing feedback:", error);
      res
        .status(500)
        .json({ error: "Internal server error while processing feedback." });
    }
  });

  // POST /api/devices/token
  router.post("/devices/token", validate(tokenSchema), async (req, res) => {
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
  });

  // GET /api/search
  router.get("/search", async (req, res) => {
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

  // GET /api/tags (DEPRECATED)
  router.get("/tags", async (req, res) => {
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

  return router;
};

module.exports = createIndexRouter;
