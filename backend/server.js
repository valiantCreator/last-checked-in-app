// This line loads the secret database URL from the .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');
const { Pool } = require('pg'); // Import the PostgreSQL client

// --- NEW: Import security packages ---
const rateLimit = require('express-rate-limit');
const { z } = require('zod'); // Zod for validation

// --- Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Firebase Admin Setup ---
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- NEW: Rate Limiting Middleware ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many API requests from this IP, please try again after 15 minutes.' },
});

app.use('/api/', apiLimiter);


// --- NEW: Zod Validation Schemas ---
const contactSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }).max(255),
    checkinFrequency: z.number().int().positive({ message: "Frequency must be a positive number" }),
    howWeMet: z.string().optional().nullable(),
    keyFacts: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    lastCheckin: z.string().datetime({ message: "Invalid date format for last check-in" }).optional(),
});

const noteSchema = z.object({
    content: z.string().min(1, { message: "Note content cannot be empty" }),
});

const tagSchema = z.object({
    tagName: z.string().min(1, { message: "Tag name is required" }),
});

const snoozeSchema = z.object({
    snooze_days: z.number().int().positive({ message: "Snooze days must be a positive number" }),
});

const batchActionSchema = z.object({
    contactIds: z.array(z.number().int().positive()).min(1, { message: "At least one contact ID is required." }),
    snooze_days: z.number().int().positive().optional(),
});

const tokenSchema = z.object({
    token: z.string().min(1, { message: "FCM token is required" }),
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


// --- Function to Create Tables on Server Startup ---
const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                "firstName" VARCHAR(255) NOT NULL,
                "checkinFrequency" INTEGER NOT NULL,
                "lastCheckin" TIMESTAMPTZ NOT NULL,
                "howWeMet" TEXT,
                "keyFacts" TEXT,
                birthday TEXT,
                is_archived BOOLEAN DEFAULT FALSE,
                snooze_until TIMESTAMPTZ,
                is_pinned BOOLEAN DEFAULT FALSE
            );
        `);
        const columns = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name='contacts' AND column_name='is_pinned';
        `);
        if (columns.rows.length === 0) {
            await client.query('ALTER TABLE contacts ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;');
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                "createdAt" TIMESTAMPTZ NOT NULL,
                "modifiedAt" TIMESTAMPTZ,
                "contactId" INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS tags (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS contact_tags (
                contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (contact_id, tag_id)
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS devices (
                id SERIAL PRIMARY KEY,
                fcm_token TEXT NOT NULL UNIQUE
            );
        `);
        console.log("Tables are successfully created or already exist.");
    } catch (err) {
        console.error("Error creating tables:", err);
    } finally {
        client.release();
    }
};

// =================================================================
// --- API Endpoints ---
// =================================================================

// --- Batch Action Endpoints ---
app.post('/api/contacts/batch-archive', validate(batchActionSchema), async (req, res) => {
    const { contactIds } = req.body;
    try {
        await pool.query('UPDATE contacts SET is_archived = TRUE WHERE id = ANY($1::int[])', [contactIds]);
        res.json({ message: `${contactIds.length} contacts archived successfully.` });
    } catch (err) {
        console.error('Error batch archiving contacts:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/batch-delete', validate(batchActionSchema), async (req, res) => {
    const { contactIds } = req.body;
    try {
        await pool.query('DELETE FROM contacts WHERE id = ANY($1::int[])', [contactIds]);
        res.json({ message: `${contactIds.length} contacts deleted successfully.` });
    } catch (err) {
        console.error('Error batch deleting contacts:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/batch-snooze', validate(batchActionSchema), async (req, res) => {
    const { contactIds, snooze_days } = req.body;
    if (!snooze_days) {
        return res.status(400).json({ error: "snooze_days is required for batch snooze." });
    }
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + snooze_days);

    try {
        await pool.query('UPDATE contacts SET snooze_until = $1 WHERE id = ANY($2::int[])', [snoozeUntil, contactIds]);
        res.json({ message: `${contactIds.length} contacts snoozed successfully.` });
    } catch (err) {
        console.error('Error batch snoozing contacts:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- NEW: Endpoint to batch restore contacts ---
app.post('/api/contacts/batch-restore', validate(batchActionSchema), async (req, res) => {
    const { contactIds } = req.body;
    try {
        await pool.query('UPDATE contacts SET is_archived = FALSE WHERE id = ANY($1::int[])', [contactIds]);
        res.json({ message: `${contactIds.length} contacts restored successfully.` });
    } catch (err) {
        console.error('Error batch restoring contacts:', err);
        res.status(500).json({ error: err.message });
    }
});


// --- Existing Endpoints ---
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ results: { contacts: [], notes: [] } });
    const searchTerm = `%${q}%`;
    try {
        const contactsResult = await pool.query('SELECT * FROM contacts WHERE "firstName" ILIKE $1 AND is_archived = FALSE', [searchTerm]);
        const notesResult = await pool.query(`
            SELECT n.*, c."firstName" as "contactFirstName"
            FROM notes n
            JOIN contacts c ON n."contactId" = c.id
            WHERE n.content ILIKE $1 AND c.is_archived = FALSE
        `, [searchTerm]);
        res.json({ results: { contacts: contactsResult.rows, notes: notesResult.rows } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contacts', async (req, res) => {
    try {
        const contactsResult = await pool.query('SELECT * FROM contacts WHERE is_archived = FALSE ORDER BY "lastCheckin"');
        const contacts = contactsResult.rows;
        for (const contact of contacts) {
            const tagsResult = await pool.query(
                `SELECT t.id, t.name FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = $1`,
                [contact.id]
            );
            contact.tags = tagsResult.rows || [];
        }
        res.json({ contacts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contacts/archived', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contacts WHERE is_archived = TRUE ORDER BY "firstName"');
        res.json({ contacts: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contacts/archived/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM contacts WHERE is_archived = TRUE');
        const count = parseInt(result.rows[0].count, 10);
        res.json({ count });
    } catch (err) {
        console.error('Error getting archived count:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts', validate(contactSchema), async (req, res) => {
    const { firstName, checkinFrequency, howWeMet, keyFacts, birthday, lastCheckin } = req.body;
    const startDate = lastCheckin ? new Date(lastCheckin) : new Date();
    try {
        const result = await pool.query(
            `INSERT INTO contacts ("firstName", "checkinFrequency", "lastCheckin", "howWeMet", "keyFacts", birthday)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [firstName, checkinFrequency, startDate, howWeMet, keyFacts, birthday]
        );
        res.status(201).json({ ...result.rows[0], tags: [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:id', validate(contactSchema), async (req, res) => {
    const { firstName, checkinFrequency, howWeMet, keyFacts, birthday, lastCheckin } = req.body;
    try {
        await pool.query(
            `UPDATE contacts SET
                "firstName" = $1,
                "checkinFrequency" = $2,
                "howWeMet" = $3,
                "keyFacts" = $4,
                birthday = $5,
                "lastCheckin" = $6
             WHERE id = $7`,
            [firstName, checkinFrequency, howWeMet, keyFacts, birthday, lastCheckin, req.params.id]
        );
        res.json({ message: 'Contact updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:id/pin', async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE contacts SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        res.json({ contact: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:id/archive', async (req, res) => {
    try {
        await pool.query('UPDATE contacts SET is_archived = TRUE WHERE id = $1', [req.params.id]);
        res.json({ message: 'Contact archived successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:id/restore', async (req, res) => {
    try {
        await pool.query('UPDATE contacts SET is_archived = FALSE WHERE id = $1', [req.params.id]);
        res.json({ message: 'Contact restored successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/:id/checkin', async (req, res) => {
    const lastCheckin = new Date();
    try {
        await pool.query('UPDATE contacts SET "lastCheckin" = $1, snooze_until = NULL WHERE id = $2', [lastCheckin, req.params.id]);
        res.json({ message: 'Checked in successfully', lastCheckin: lastCheckin.toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contacts/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:id/snooze', validate(snoozeSchema), async (req, res) => {
    const { snooze_days } = req.body;
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + parseInt(snooze_days, 10));
    try {
        await pool.query('UPDATE contacts SET snooze_until = $1 WHERE id = $2', [snoozeUntil, req.params.id]);
        res.json({ message: 'Contact snoozed successfully', snooze_until: snoozeUntil.toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tags', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tags ORDER BY name');
        res.json({ tags: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/:id/tags', validate(tagSchema), async (req, res) => {
    const { tagName } = req.body;
    const contactId = req.params.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const tagRes = await client.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id', [tagName.trim()]);
        const tagId = tagRes.rows[0].id;
        await client.query('INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [contactId, tagId]);
        await client.query('COMMIT');
        res.status(201).json({ id: tagId, name: tagName.trim() });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/contacts/:contactId/tags/:tagId', async (req, res) => {
    const { contactId, tagId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM contact_tags WHERE contact_id = $1 AND tag_id = $2', [contactId, tagId]);
        
        const usageResult = await client.query('SELECT COUNT(*) FROM contact_tags WHERE tag_id = $1', [tagId]);
        const usageCount = parseInt(usageResult.rows[0].count, 10);

        if (usageCount === 0) {
            await client.query('DELETE FROM tags WHERE id = $1', [tagId]);
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Tag removed successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/contacts/:id/notes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes WHERE "contactId" = $1 ORDER BY "createdAt" DESC', [req.params.id]);
        res.json({ notes: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/:id/notes', validate(noteSchema), async (req, res) => {
    const { content } = req.body;
    const createdAt = new Date();
    try {
        const result = await pool.query('INSERT INTO notes (content, "createdAt", "contactId") VALUES ($1, $2, $3) RETURNING *', [content, createdAt, req.params.id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notes/:noteId', validate(noteSchema), async (req, res) => {
    const { content } = req.body;
    const modifiedAt = new Date();
    try {
        await pool.query('UPDATE notes SET content = $1, "modifiedAt" = $2 WHERE id = $3', [content, modifiedAt, req.params.noteId]);
        res.json({ message: 'Note updated successfully', modifiedAt: modifiedAt.toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/devices/token', validate(tokenSchema), async (req, res) => {
    const { token } = req.body;
    try {
        await pool.query('INSERT INTO devices (fcm_token) VALUES ($1) ON CONFLICT (fcm_token) DO NOTHING', [token]);
        res.status(201).json({ message: 'Token saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- SCHEDULED JOB ---
cron.schedule('0 9 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running daily check for overdue contacts...`);

    try {
        // Step 1: Get all overdue contacts in a single, efficient query.
        // This query correctly calculates the due date and filters out archived/snoozed contacts.
        const overdueResult = await pool.query(`
            SELECT id, "firstName"
            FROM contacts
            WHERE
                is_archived = FALSE
                AND (snooze_until IS NULL OR snooze_until < NOW())
                AND ("lastCheckin" + "checkinFrequency" * INTERVAL '1 day') < NOW()
        `);

        const overdueContacts = overdueResult.rows;
        const overdueCount = overdueContacts.length;

        // Step 2: If no overdue contacts, log it and stop.
        if (overdueCount === 0) {
            console.log(`[${new Date().toISOString()}] No overdue contacts found. Job finished.`);
            return;
        }

        console.log(`[${new Date().toISOString()}] Found ${overdueCount} overdue contacts.`);

        // Step 3: Get all registered device FCM tokens.
        const devicesResult = await pool.query("SELECT fcm_token FROM devices");
        const allDeviceTokens = devicesResult.rows.map(row => row.fcm_token);

        if (allDeviceTokens.length === 0) {
            console.log(`[${new Date().toISOString()}] Found overdue contacts, but no devices are registered for notifications. Job finished.`);
            return;
        }

        // Step 4: Construct the dynamic notification message.
        let notificationBody;
        if (overdueCount === 1) {
            notificationBody = `You have an overdue check-in for ${overdueContacts[0].firstName}.`;
        } else {
            notificationBody = `You have ${overdueCount} overdue check-ins.`;
        }
        
        console.log(`[${new Date().toISOString()}] Preparing to send notification: "${notificationBody}" to ${allDeviceTokens.length} device(s).`);

        // Step 5: Create the payload and send the notification to all devices.
        const message = {
            notification: {
                title: 'Check-in Reminder',
                body: notificationBody,
            },
            data: {
                app_url: '/' // Directs the user to the home page on notification click
            },
            tokens: allDeviceTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[${new Date().toISOString()}] Successfully sent message to ${response.successCount} devices.`);
        
        if (response.failureCount > 0) {
            console.warn(`[${new Date().toISOString()}] Failed to send message to ${response.failureCount} devices.`);
            // Optional: Advanced error handling to remove invalid tokens
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedTokens.push(allDeviceTokens[idx]);
              }
            });
            console.log(`[${new Date().toISOString()}] List of failed tokens:`, failedTokens);
            // To automatically clean up your database, you could add:
            await pool.query('DELETE FROM devices WHERE fcm_token = ANY($1::text[])', [failedTokens]);
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] FATAL ERROR during scheduled job:`, error);
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
    createTables();
});