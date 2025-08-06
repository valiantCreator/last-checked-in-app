// This line loads the secret database URL from the .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');
const { Pool } = require('pg'); // Import the PostgreSQL client

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
        // --- NEW: Add the is_pinned column if it doesn't exist ---
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
// --- API Endpoints (PostgreSQL Version) ---
// =================================================================
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

app.post('/api/contacts', async (req, res) => {
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

app.put('/api/contacts/:id', async (req, res) => {
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

// --- NEW: Endpoint to toggle the pinned status of a contact ---
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

app.put('/api/contacts/:id/snooze', async (req, res) => {
    const { snooze_days } = req.body;
    if (!snooze_days) return res.status(400).json({ error: 'snooze_days is required' });
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

app.post('/api/contacts/:id/tags', async (req, res) => {
    const { tagName } = req.body;
    const contactId = req.params.id;
    if (!tagName) return res.status(400).json({ error: 'tagName is required' });
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

app.post('/api/contacts/:id/notes', async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content cannot be empty' });
    const createdAt = new Date();
    try {
        const result = await pool.query('INSERT INTO notes (content, "createdAt", "contactId") VALUES ($1, $2, $3) RETURNING *', [content, createdAt, req.params.id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notes/:noteId', async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content cannot be empty' });
    const modifiedAt = new Date();
    try {
        await pool.query('UPDATE notes SET content = $1, "modifiedAt" = $2 WHERE id = $3', [content, modifiedAt, req.params.noteId]);
        res.json({ message: 'Note updated successfully', modifiedAt: modifiedAt.toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/devices/token', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required' });
    try {
        await pool.query('INSERT INTO devices (fcm_token) VALUES ($1) ON CONFLICT (fcm_token) DO NOTHING', [token]);
        res.status(201).json({ message: 'Token saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/:id/test-overdue', async (req, res) => {
  const { id } = req.params;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: 'FCM token is required.' });
  }

  try {
    const client = await pool.connect();
    const freqResult = await client.query('SELECT "firstName", "checkinFrequency" FROM contacts WHERE id = $1', [id]);
    const { firstName, checkinFrequency } = freqResult.rows[0];
    const contactName = firstName || 'A contact';

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - (checkinFrequency + 1));
    await client.query('UPDATE contacts SET "lastCheckin" = $1 WHERE id = $2', [overdueDate, id]);
    
    client.release();

    const message = {
      data: {
        title: 'Overdue Test Successful!',
        body: `You have a new overdue notification for ${contactName}.`,
      },
      token: fcmToken
    };
    await admin.messaging().send(message);

    res.json({ message: 'Contact made overdue and test notification sent successfully.' });
  } catch (error) {
    console.error('Error in test-overdue endpoint:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// --- SCHEDULED JOB ---
cron.schedule('0 9 * * *', async () => {
    console.log('Running daily check for overdue contacts...');
    try {
        const contactsResult = await pool.query("SELECT * FROM contacts WHERE is_archived = 0");
        const allContacts = contactsResult.rows;

        const devicesResult = await pool.query("SELECT fcm_token FROM devices");
        const allDeviceTokens = devicesResult.rows.map(row => row.fcm_token);

        if (allDeviceTokens.length === 0) {
            console.log('No devices registered for notifications.');
            return;
        }

        const overdueContacts = allContacts.filter(contact => {
            const now = new Date();
            if (contact.snooze_until && new Date(contact.snooze_until) > now) return false;
            const lastCheckin = new Date(contact.lastCheckin);
            const dueDate = new Date(lastCheckin.setDate(lastCheckin.getDate() + contact.checkinFrequency));
            return dueDate < now;
        });

        if (overdueContacts.length > 0) {
            console.log(`Found ${overdueContacts.length} overdue contacts. Sending notifications.`);
            const message = {
                notification: {
                    title: 'Check-in Reminder!',
                    body: `You have ${overdueContacts.length} people to check in with today.`
                },
                tokens: allDeviceTokens,
            };

            await admin.messaging().sendEachForMulticast(message);
        } else {
            console.log('No overdue contacts found today.');
        }
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
    createTables();
});
