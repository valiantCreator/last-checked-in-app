const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./app.db');
const backupData = JSON.parse(fs.readFileSync('my_data.json'));

// Helper function to wrap db.run in a Promise for async/await
const dbRun = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                console.error('Database run error:', err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};

// Helper function to wrap db.get in a Promise
const dbGet = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                console.error('Database get error:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};


const restore = async () => {
    console.log('Starting restore...');
    try {
        for (const item of backupData) {
            const contactSQL = `INSERT INTO contacts 
                (firstName, checkinFrequency, lastCheckin, howWeMet, keyFacts, birthday, is_archived, snooze_until) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const contactParams = [
                item.firstName, 
                item.checkinFrequency, 
                item.lastCheckin, 
                item.howWeMet || '', 
                item.keyFacts || '', 
                item.birthday || '',
                item.is_archived || 0,
                item.snooze_until || null
            ];

            const contactResult = await dbRun(contactSQL, contactParams);
            const newContactId = contactResult.lastID;
            console.log(`Restored contact: ${item.firstName} with new ID: ${newContactId}`);

            // Restore notes for the contact
            if (item.notes && item.notes.length > 0) {
                for (const note of item.notes) {
                    const noteSQL = `INSERT INTO notes 
                        (content, createdAt, modifiedAt, contactId) 
                        VALUES (?, ?, ?, ?)`;
                    const noteParams = [note.content, note.createdAt, note.modifiedAt || null, newContactId];
                    await dbRun(noteSQL, noteParams);
                }
                console.log(`  - Restored ${item.notes.length} notes.`);
            }

            // Restore tags for the contact
            if (item.tags && item.tags.length > 0) {
                for (const tag of item.tags) {
                    // Find or create the tag
                    const findOrCreateTagSql = "INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name=excluded.name RETURNING id";
                    const tagRow = await dbGet(findOrCreateTagSql, [tag.name]);
                    const tagId = tagRow.id;

                    // Associate the tag with the contact
                    const associateSql = "INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING";
                    await dbRun(associateSql, [newContactId, tagId]);
                }
                console.log(`  - Restored ${item.tags.length} tags.`);
            }
        }
        console.log('---');
        console.log('Restore complete.');
        console.log('---');
    } catch (err) {
        console.error('Restore failed:', err);
    } finally {
        db.close();
    }
};

restore();
