// backend/routes/settings.js

const express = require("express");
const { z } = require("zod");

const createSettingsRouter = (pool, validate, authMiddleware) => {
  const router = express.Router();

  // Gemini COMMENT: Define the validation schema for settings updates.
  // We only accept an integer between 0 and 23 representing the UTC hour.
  const settingsSchema = z.object({
    notificationHourUtc: z
      .number()
      .int()
      .min(0, { message: "Hour must be between 0 and 23." })
      .max(23, { message: "Hour must be between 0 and 23." }),
  });

  // Gemini COMMENT: Protect all settings routes with the global authentication middleware.
  router.use(authMiddleware);

  // GET /api/settings
  // Fetches the current user's notification settings.
  router.get("/", async (req, res) => {
    try {
      // Gemini COMMENT: Select the notification preference from the users table.
      const result = await pool.query(
        "SELECT notification_hour_utc FROM users WHERE id = $1",
        [req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found." });
      }

      // Gemini COMMENT: Return the integer hour (0-23).
      res.json({
        notificationHourUtc: result.rows[0].notification_hour_utc,
      });
    } catch (err) {
      console.error("Error fetching settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/settings
  // Updates the user's notification settings.
  router.put("/", validate(settingsSchema), async (req, res) => {
    const { notificationHourUtc } = req.body;
    try {
      // Gemini COMMENT: Update the user's preference in the database.
      await pool.query(
        "UPDATE users SET notification_hour_utc = $1 WHERE id = $2",
        [notificationHourUtc, req.userId]
      );

      res.json({
        message: "Settings updated successfully.",
        notificationHourUtc,
      });
    } catch (err) {
      console.error("Error updating settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = createSettingsRouter;
