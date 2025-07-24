const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
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

const backupData = async () => {
    console.log('Starting backup...');
    try {
        const contacts = await dbAll("SELECT * FROM contacts");
        const fullData = [];

        for (const contact of contacts) {
            // Fetch all notes for the current contact
            const notes = await dbAll("SELECT * FROM notes WHERE contactId = ?", [contact.id]);
            
            // Fetch all tags for the current contact
            const tags = await dbAll(`
                SELECT t.id, t.name 
                FROM tags t
                JOIN contact_tags ct ON t.id = ct.tag_id
                WHERE ct.contact_id = ?
            `, [contact.id]);

            // Combine all data into one object
            fullData.push({ 
                ...contact, 
                notes: notes || [], 
                tags: tags || [] 
            });
        }
        
        // Write the data to my_data.json
        fs.writeFileSync('my_data.json', JSON.stringify(fullData, null, 2));

        console.log('---');
        console.log(`Backup complete. ${fullData.length} contacts and their data have been saved to my_data.json`);
        console.log('---');

    } catch (err) {
        console.error('Backup failed:', err);
    } finally {
        db.close();
    }
};

backupData();
