const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const admin = require('firebase-admin');
const cron = require('node-cron');

// --- Firebase Admin Setup ---
// Make sure you have the serviceAccountKey.json file in your backend folder
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./app.db');
const dbAll = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});

// =================================================================
// --- SEARCH API ---
// =================================================================
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.json({ results: { contacts: [], notes: [] } });
    }
    const searchTerm = `%${q}%`;
    try {
        const contacts = await dbAll("SELECT * FROM contacts WHERE firstName LIKE ? AND is_archived = 0", [searchTerm]);
        const notes = await dbAll(`
            SELECT n.*, c.firstName as contactFirstName 
            FROM notes n 
            JOIN contacts c ON n.contactId = c.id 
            WHERE n.content LIKE ? AND c.is_archived = 0
        `, [searchTerm]);

        res.json({ results: { contacts, notes } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// =================================================================
// --- CONTACTS API ---
// =================================================================
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await dbAll("SELECT * FROM contacts WHERE is_archived = 0");
        for (const contact of contacts) {
            const tags = await dbAll(`SELECT t.id, t.name FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = ?`, [contact.id]);
            contact.tags = tags || [];
        }
        res.json({ contacts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/contacts/archived', async (req, res) => {
    try {
        const contacts = await dbAll("SELECT * FROM contacts WHERE is_archived = 1 ORDER BY firstName");
        res.json({ contacts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/contacts', (req, res) => {
    const { firstName, checkinFrequency, howWeMet, keyFacts, birthday } = req.body;
    const lastCheckin = new Date().toISOString();
    const sql = `INSERT INTO contacts (firstName, checkinFrequency, lastCheckin, howWeMet, keyFacts, birthday) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [firstName, checkinFrequency, lastCheckin, howWeMet, keyFacts, birthday], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, firstName, checkinFrequency, lastCheckin, howWeMet, keyFacts, birthday, tags: [] });
    });
});
app.put('/api/contacts/:id', (req, res) => {
    const { firstName, checkinFrequency, howWeMet, keyFacts, birthday } = req.body;
    const sql = `UPDATE contacts SET firstName = ?, checkinFrequency = ?, howWeMet = ?, keyFacts = ?, birthday = ? WHERE id = ?`;
    db.run(sql, [firstName, checkinFrequency, howWeMet, keyFacts, birthday, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Contact updated successfully' });
    });
});
app.put('/api/contacts/:id/archive', (req, res) => {
    db.run("UPDATE contacts SET is_archived = 1 WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Contact archived successfully' });
    });
});
app.put('/api/contacts/:id/restore', (req, res) => {
    db.run("UPDATE contacts SET is_archived = 0 WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Contact restored successfully' });
    });
});
app.post('/api/contacts/:id/checkin', (req, res) => {
    const lastCheckin = new Date().toISOString();
    db.run("UPDATE contacts SET lastCheckin = ?, snooze_until = NULL WHERE id = ?", [lastCheckin, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Checked in successfully', lastCheckin });
    });
});
app.delete('/api/contacts/:id', (req, res) => {
    db.run("DELETE FROM contacts WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Deleted successfully' });
    });
});
app.put('/api/contacts/:id/snooze', (req, res) => {
    const { snooze_days } = req.body;
    if (!snooze_days) return res.status(400).json({ error: 'snooze_days is required' });
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + parseInt(snooze_days, 10));
    db.run("UPDATE contacts SET snooze_until = ? WHERE id = ?", [snoozeUntil.toISOString(), req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Contact snoozed successfully', snooze_until: snoozeUntil.toISOString() });
    });
});
app.put('/api/contacts/:id/make-overdue', (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newLastCheckin = thirtyDaysAgo.toISOString();
    db.run("UPDATE contacts SET lastCheckin = ? WHERE id = ?", [newLastCheckin, req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Contact made overdue', lastCheckin: newLastCheckin });
    });
});

// =================================================================
// --- TAGS API ---
// =================================================================
app.get('/api/tags', async (req, res) => {
    try {
        const tags = await dbAll("SELECT * FROM tags ORDER BY name");
        res.json({ tags });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/contacts/:id/tags', (req, res) => {
    const { tagName } = req.body;
    const contactId = req.params.id;
    if (!tagName) return res.status(400).json({ error: 'tagName is required' });
    const findOrCreateTagSql = "INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name=excluded.name RETURNING id";
    db.get(findOrCreateTagSql, [tagName.trim()], function(err, row) {
        if (err) return res.status(500).json({ error: err.message });
        const tagId = row.id;
        const associateSql = "INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING";
        db.run(associateSql, [contactId, tagId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: tagId, name: tagName.trim() });
        });
    });
});
app.delete('/api/contacts/:contactId/tags/:tagId', (req, res) => {
    const { contactId, tagId } = req.params;
    const sql = "DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?";
    db.run(sql, [contactId, tagId], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Tag removed successfully' });
    });
});

// =================================================================
// --- NOTES API ---
// =================================================================
app.get('/api/contacts/:id/notes', (req, res) => {
    const sql = "SELECT * FROM notes WHERE contactId = ? ORDER BY createdAt DESC";
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ notes: rows });
    });
});
app.post('/api/contacts/:id/notes', (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content cannot be empty' });
    const createdAt = new Date().toISOString();
    const contactId = req.params.id;
    const sql = "INSERT INTO notes (content, createdAt, contactId) VALUES (?, ?, ?)";
    db.run(sql, [content, createdAt, contactId], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, content, createdAt, contactId });
    });
});
app.put('/api/notes/:noteId', (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content cannot be empty' });
    const modifiedAt = new Date().toISOString();
    const sql = "UPDATE notes SET content = ?, modifiedAt = ? WHERE id = ?";
    db.run(sql, [content, modifiedAt, req.params.noteId], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Note updated successfully', modifiedAt: modifiedAt });
    });
});

// =================================================================
// --- DEVICES API ---
// =================================================================
app.post('/api/devices/token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required' });
    const sql = "INSERT INTO devices (fcm_token) VALUES (?) ON CONFLICT(fcm_token) DO NOTHING";
    db.run(sql, [token], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Token saved successfully' });
    });
});

// =================================================================
// --- SCHEDULED JOB ---
// =================================================================
cron.schedule('0 9 * * *', async () => {
    console.log('Running daily check for overdue contacts...');
    try {
        const allContacts = await dbAll("SELECT * FROM contacts WHERE is_archived = 0");
        const allDeviceTokens = (await dbAll("SELECT fcm_token FROM devices")).map(row => row.fcm_token);

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

app.listen(PORT, () => console.log(`Backend server is running on http://localhost:${PORT}`));
