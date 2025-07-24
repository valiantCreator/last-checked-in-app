const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./app.db', (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
        return;
    }
    console.log('Connected to the app.db SQLite database.');
});

db.serialize(() => {
    // Contacts table with all columns including snooze and archive
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        checkinFrequency INTEGER NOT NULL,
        lastCheckin TEXT NOT NULL,
        howWeMet TEXT,
        keyFacts TEXT,
        birthday TEXT,
        is_archived INTEGER DEFAULT 0,
        snooze_until TEXT 
    )`, (err) => {
        if (err) console.error("Error creating contacts table:", err.message);
        else console.log("The 'contacts' table is ready.");
    });

    // Notes table
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        modifiedAt TEXT, 
        contactId INTEGER NOT NULL,
        FOREIGN KEY (contactId) REFERENCES contacts (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) console.error("Error creating notes table:", err.message);
    });

    // Tags table
    db.run(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`, (err) => {
        if (err) console.error("Error creating tags table:", err.message);
    });

    // Join Table for Contacts and Tags
    db.run(`CREATE TABLE IF NOT EXISTS contact_tags (
        contact_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
        PRIMARY KEY (contact_id, tag_id)
    )`, (err) => {
        if (err) console.error("Error creating contact_tags table:", err.message);
    });

    // New devices table to store FCM tokens
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fcm_token TEXT NOT NULL UNIQUE
    )`, (err) => {
        if (err) console.error("Error creating devices table:", err.message);
        else console.log("The 'devices' table is ready.");
    });
});

db.close((err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Closed the database connection.');
});
