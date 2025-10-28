// backend/routes/contacts.js

const express = require("express");
const { z } = require("zod");

// Gemini COMMENT: This router handles all logic for contacts, tags, and notes.
const createContactsRouter = (pool, validate, authMiddleware) => {
  const router = express.Router();

  // Zod schemas specific to this router's domain.
  const contactSchema = z.object({
    firstName: z
      .string()
      .min(1, { message: "First name is required" })
      .max(255),
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

  // Gemini COMMENT: REFACTOR - The Zod schema now accepts 'tomorrow' as a valid unit.
  const granularSnoozeSchema = z.object({
    value: z
      .number()
      .int()
      .positive({ message: "Snooze value must be a positive number." }),
    unit: z.enum(["days", "hours", "tomorrow"], {
      errorMap: () => ({
        message: "Invalid time unit. Must be 'days', 'hours', or 'tomorrow'.",
      }),
    }),
  });

  const batchActionSchema = z.object({
    contactIds: z
      .array(z.number().int().positive())
      .min(1, { message: "At least one contact ID is required." }),
    snooze: granularSnoozeSchema.optional(),
  });

  // Gemini COMMENT: All routes in this file are protected by the authMiddleware.
  router.use(authMiddleware);

  // --- Batch Action Endpoints ---
  router.post(
    "/batch-archive",
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

  router.post(
    "/batch-delete",
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

  router.post(
    "/batch-snooze",
    validate(batchActionSchema),
    async (req, res) => {
      const { contactIds, snooze } = req.body;
      if (!snooze) {
        return res
          .status(400)
          .json({ error: "snooze object is required for batch snooze." });
      }
      try {
        // Gemini COMMENT: REFACTOR - Conditional logic to handle the 'tomorrow' case.
        let snoozeUntilUpdate;
        if (snooze.unit === "tomorrow") {
          // Set snooze_until to 9 AM UTC on the next day.
          snoozeUntilUpdate =
            "date_trunc('day', NOW() + interval '1 day') + interval '9 hours'";
        } else {
          // Use a parameterized interval for other units ('days', 'hours').
          const interval = `${snooze.value} ${snooze.unit}`;
          snoozeUntilUpdate = `(
            GREATEST(
                NOW(),
                COALESCE(snooze_until, last_checkin + (checkin_frequency * INTERVAL '1 day'))
            ) + ('${interval}'::interval)
          )`;
        }

        const query = `
          UPDATE contacts
          SET snooze_until = ${snoozeUntilUpdate}
          WHERE id = ANY($1::int[]) AND user_id = $2;
        `;
        await pool.query(query, [contactIds, req.userId]);

        res.json({
          message: `${contactIds.length} contacts snoozed successfully.`,
        });
      } catch (err) {
        console.error("Error batch snoozing contacts:", err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  router.post(
    "/batch-restore",
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

  router.post(
    "/batch-checkin",
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

  // --- Main Contact Endpoints ---

  // GET /api/contacts (DEPRECATED)
  router.get("/", async (req, res) => {
    try {
      const contactsResult = await pool.query(
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
      );
      res.json({ contacts: contactsResult.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/contacts
  router.post("/", validate(contactSchema), async (req, res) => {
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
  });

  // GET /api/contacts/archived
  router.get("/archived", async (req, res) => {
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

  // GET /api/contacts/archived/count (DEPRECATED)
  router.get("/archived/count", async (req, res) => {
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

  // --- Single Contact Endpoints ---

  // PUT /api/contacts/:id
  router.put("/:id", validate(contactSchema), async (req, res) => {
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
  });

  // DELETE /api/contacts/:id
  router.delete("/:id", async (req, res) => {
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

  // PUT /api/contacts/:id/pin
  router.put("/:id/pin", async (req, res) => {
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

  // PUT /api/contacts/:id/archive
  router.put("/:id/archive", async (req, res) => {
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

  // PUT /api/contacts/:id/restore
  router.put("/:id/restore", async (req, res) => {
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

  // POST /api/contacts/:id/checkin
  router.post("/:id/checkin", async (req, res) => {
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

  // PUT /api/contacts/:id/snooze
  router.put(
    "/:id/snooze",
    validate(granularSnoozeSchema),
    async (req, res) => {
      const { value, unit } = req.body;
      try {
        // Gemini COMMENT: REFACTOR - Conditional logic to handle the 'tomorrow' case.
        let snoozeUntilUpdate;
        let queryParams = [req.params.id, req.userId];

        if (unit === "tomorrow") {
          // Sets snooze_until to 9 AM UTC on the next day.
          snoozeUntilUpdate =
            "date_trunc('day', NOW() + interval '1 day') + interval '9 hours'";
        } else {
          // Use a parameterized interval for other units ('days', 'hours').
          const interval = `${value} ${unit}`;
          snoozeUntilUpdate = `(
            GREATEST(
                NOW(),
                COALESCE(snooze_until, last_checkin + (checkin_frequency * INTERVAL '1 day'))
            ) + ($1::interval)
          )`;
          // Prepend the interval to the query parameters for this case.
          queryParams.unshift(interval);
        }

        const query = `
          UPDATE contacts
          SET snooze_until = ${snoozeUntilUpdate}
          WHERE id = $${queryParams.length - 1} AND user_id = $${
          queryParams.length
        }
          RETURNING snooze_until;
        `;

        const result = await pool.query(query, queryParams);

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

  // --- Tag Endpoints ---

  // POST /api/contacts/:id/tags
  router.post("/:id/tags", validate(tagSchema), async (req, res) => {
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
  });

  // DELETE /api/contacts/:contactId/tags/:tagId
  router.delete("/:contactId/tags/:tagId", async (req, res) => {
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
  });

  // --- Note Endpoints ---

  // GET /api/contacts/:id/notes
  router.get("/:id/notes", async (req, res) => {
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

  // POST /api/contacts/:id/notes
  router.post("/:id/notes", validate(noteSchema), async (req, res) => {
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
  });

  // PUT /api/notes/:noteId (Note: This route is separate because it acts on a note ID directly)
  router.put("/notes/:noteId", validate(noteSchema), async (req, res) => {
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
  });

  return router;
};

module.exports = createContactsRouter;
