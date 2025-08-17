// This line loads the secret database URL from the .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');
const { Pool } = require('pg'); // Import the PostgreSQL client

// --- NEW: Import security and auth packages ---
const rateLimit = require('express-rate-limit');
const { z } = require('zod'); // Zod for validation
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// --- Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Note: The SSL config below might be necessary for Render, but often not for local dev.
    // If you have connection issues locally, you might need to comment this part out.
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

// --- Rate Limiting Middleware ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many API requests from this IP, please try again after 15 minutes.' },
});

app.use('/api/', apiLimiter);


// --- Zod Validation Schemas ---
// NEW: Schema for validating email/password for signup and login
const authSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

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

// --- Validation Middleware Factory ---
// (This is a good pattern, I'm keeping it exactly as is)
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (e) {
        res.status(400).json({ error: "Invalid request data", details: e.errors });
    }
};

// =================================================================
// --- AUTHENTICATION ENDPOINTS ---
// These endpoints handle user creation and login. They are the
// entry point for users into the application.
// =================================================================

// POST /api/auth/signup --- Register a new user
app.post('/api/auth/signup', validate(authSchema), async (req, res) => {
    const { email, password } = req.body;

    try {
        // Step 1: Check if a user with this email already exists in the database.
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            // If we find a user, we return a 409 Conflict error.
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        // Step 2: Hash the user's password using bcrypt.
        // We never store the plain-text password. 10 salt rounds is the standard.
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Step 3: Insert the new user into the 'users' table with the hashed password.
        const newUserResult = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, passwordHash]
        );

        // Step 4: Return the newly created user's data (without the password hash).
        res.status(201).json(newUserResult.rows[0]);

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Internal server error during user registration.' });
    }
});

// POST /api/auth/login --- Authenticate a user and return a JWT
app.post('/api/auth/login', validate(authSchema), async (req, res) => {
    const { email, password } = req.body;

    try {
        // Step 1: Find the user in the database by their email.
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        // Step 2: If no user is found, or if the password doesn't match, send a generic error.
        // We use bcrypt.compare to securely check the password without ever decrypting the hash.
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            // CRITICAL: Send a vague error message to prevent attackers from guessing valid emails.
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Step 3: If credentials are correct, create a JWT payload.
        // The payload contains the user's ID, which we'll use to identify them in future requests.
        const payload = {
            userId: user.id,
        };

        // Step 4: Sign the token with the secret key from your .env file.
        // The token is set to expire in 7 days.
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Step 5: Send the token to the client. The client will store this and send it back
        // with every subsequent request to prove they are logged in.
        res.status(200).json({ token });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// =================================================================
// --- NEW: AUTHENTICATION MIDDLEWARE ---
// This function will act as a gatekeeper for our protected routes.
// It checks for a valid JWT in the request headers.
// =================================================================
const authMiddleware = (req, res, next) => {
    // 1. Get the token from the 'Authorization' header.
    // The header is expected to be in the format: "Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token part

    // 2. If no token is provided, deny access.
    if (token == null) {
        // 401 Unauthorized - a token is required for this route.
        return res.status(401).json({ error: 'No token provided. Access denied.' });
    }

    // 3. Verify the token's validity using the secret key.
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
        if (err) {
            // 403 Forbidden - The token is invalid (expired, tampered, wrong signature, etc.)
            return res.status(403).json({ error: 'Invalid token.' });
        }

        // 4. If the token is valid, attach the decoded user ID to the request object.
        // This is the most important part. Now, any protected route that uses this
        // middleware will know which user is making the request.
        req.userId = decodedPayload.userId;

        // 5. Pass control to the next middleware or to the actual route handler.
        next();
    });
};

// =================================================================
// --- API Endpoints ---
// NOTE: All endpoints below this line are NOT YET PROTECTED.
// They are still accessible by anyone. We will fix this in Phase 2.
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

// NEW BATCH ENDPOINT: For checking in with multiple contacts at once.
app.post('/api/contacts/batch-checkin', validate(batchActionSchema), async (req, res) => {
    const { contactIds } = req.body;
    const lastCheckin = new Date();
    try {
        // Update all specified contacts with the new check-in date and clear any snoozes.
        await pool.query('UPDATE contacts SET last_checkin = $1, snooze_until = NULL WHERE id = ANY($2::int[])', [lastCheckin, contactIds]);
        res.json({ message: `${contactIds.length} contacts checked in successfully.` });
    } catch (err) {
        console.error('Error batch checking in with contacts:', err);
        res.status(500).json({ error: err.message });
    }
});


// --- Existing Endpoints ---
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ results: { contacts: [], notes: [] } });
    const searchTerm = `%${q}%`;
    try {
        const contactsResult = await pool.query('SELECT * FROM contacts WHERE name ILIKE $1 AND is_archived = FALSE', [searchTerm]);
        const notesResult = await pool.query(`
            SELECT n.*, c.name as "contactFirstName"
            FROM notes n
            JOIN contacts c ON n.contact_id = c.id
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
        const contactsResult = await pool.query('SELECT * FROM contacts WHERE is_archived = FALSE ORDER BY last_checkin');
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
        const result = await pool.query('SELECT * FROM contacts WHERE is_archived = TRUE ORDER BY name');
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
    // Note: Mapped firstName to name to match the new schema
    const { firstName: name, checkinFrequency, howWeMet, keyFacts, birthday, lastCheckin } = req.body;
    const startDate = lastCheckin ? new Date(lastCheckin) : new Date();
    try {
        const result = await pool.query(
            `INSERT INTO contacts (name, checkin_frequency, last_checkin, how_we_met, key_facts, birthday)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, checkinFrequency, startDate, howWeMet, keyFacts, birthday]
        );
        res.status(201).json({ ...result.rows[0], tags: [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:id', validate(contactSchema), async (req, res) => {
    // Note: Mapped firstName to name to match the new schema
    const { firstName: name, checkinFrequency, howWeMet, keyFacts, birthday, lastCheckin } = req.body;
    try {
        await pool.query(
            `UPDATE contacts SET
                name = $1,
                checkin_frequency = $2,
                how_we_met = $3,
                key_facts = $4,
                birthday = $5,
                last_checkin = $6
             WHERE id = $7`,
            [name, checkinFrequency, howWeMet, keyFacts, birthday, lastCheckin, req.params.id]
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
        await pool.query('UPDATE contacts SET last_checkin = $1, snooze_until = NULL WHERE id = $2', [lastCheckin, req.params.id]);
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
        // This logic needs to be updated for user-scoping in Phase 2
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
        const result = await pool.query('SELECT * FROM notes WHERE contact_id = $1 ORDER BY created_at DESC', [req.params.id]);
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
        const result = await pool.query('INSERT INTO notes (content, created_at, contact_id) VALUES ($1, $2, $3) RETURNING *', [content, createdAt, req.params.id]);
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
        await pool.query('UPDATE notes SET content = $1, modified_at = $2 WHERE id = $3', [content, modifiedAt, req.params.noteId]);
        res.json({ message: 'Note updated successfully', modifiedAt: modifiedAt.toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Find and replace this entire endpoint in server.js

app.post('/api/devices/token', authMiddleware, validate(tokenSchema), async (req, res) => {
    // This endpoint is now protected. The 'authMiddleware' runs first.
    // If the user is properly logged in, we'll have access to their ID via `req.userId`.
    const { token } = req.body;
    const userId = req.userId; // Get the user ID from the middleware

    try {
        // UPDATED QUERY: We now insert both the user_id and the token.
        // ON CONFLICT is important: if a token already exists, we simply update
        // its user_id to the currently logged-in user.
        const query = `
            INSERT INTO devices (user_id, token) 
            VALUES ($1, $2) 
            ON CONFLICT (token) 
            DO UPDATE SET user_id = EXCLUDED.user_id;
        `;
        await pool.query(query, [userId, token]);
        res.status(201).json({ message: 'Token saved successfully' });
    } catch (err) {
        console.error('Error saving device token:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- SCHEDULED JOB ---
// NOTE: This cron job is still global. It will message ALL users about ALL overdue
// contacts. We will fix this in Phase 2.
cron.schedule('0 9 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running daily check for overdue contacts...`);

    try {
        // Step 1: Get all overdue contacts in a single, efficient query.
        const overdueResult = await pool.query(`
            SELECT id, name
            FROM contacts
            WHERE
                is_archived = FALSE
                AND (snooze_until IS NULL OR CAST(snooze_until AS DATE) < CURRENT_DATE)
                AND CAST((last_checkin + checkin_frequency * INTERVAL '1 day') AS DATE) <= CURRENT_DATE
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
        const devicesResult = await pool.query("SELECT token FROM devices");
        const allDeviceTokens = devicesResult.rows.map(row => row.token);

        if (allDeviceTokens.length === 0) {
            console.log(`[${new Date().toISOString()}] Found overdue contacts, but no devices are registered for notifications. Job finished.`);
            return;
        }

        // Step 4: Construct the dynamic notification message.
        let notificationBody;
        if (overdueCount === 1) {
            notificationBody = `You have an overdue check-in for ${overdueContacts[0].name}.`;
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
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedTokens.push(allDeviceTokens[idx]);
              }
            });
            console.log(`[${new Date().toISOString()}] List of failed tokens:`, failedTokens);
            // Self-cleaning: remove invalid tokens from the database.
            await pool.query('DELETE FROM devices WHERE token = ANY($1::text[])', [failedTokens]);
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] FATAL ERROR during scheduled job:`, error);
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
    // The createTables() function has been removed as the database schema is now managed directly.
});