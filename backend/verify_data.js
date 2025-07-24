const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./app.db');

// Helper function to wrap db.all in a Promise for async/await
const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database query error:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const verify = async () => {
    console.log('--- Verifying Database Content ---');
    try {
        const contacts = await dbAll("SELECT id, firstName FROM contacts");

        if (contacts.length === 0) {
            console.log('No contacts found in the database.');
            return;
        }

        console.log(`Found ${contacts.length} contacts. Checking details...`);
        console.log('------------------------------------');

        for (const contact of contacts) {
            const notes = await dbAll("SELECT id FROM notes WHERE contactId = ?", [contact.id]);
            const tags = await dbAll("SELECT t.name FROM tags t JOIN contact_tags ct ON t.id = ct.tag_id WHERE ct.contact_id = ?", [contact.id]);
            
            console.log(`- Contact: ${contact.firstName} (ID: ${contact.id})`);
            console.log(`  - Notes Found: ${notes.length}`);
            console.log(`  - Tags Found: ${tags.length} (${tags.map(t => t.name).join(', ')})`);
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        db.close();
        console.log('------------------------------------');
        console.log('--- Verification Complete ---');
    }
};

verify();
