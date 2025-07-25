// This script connects to the remote PostgreSQL database using the URL in your .env file
// and restores the data from your my_data.json backup.

require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

// Initialize the connection pool. It will automatically use the DATABASE_URL from your .env file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for connecting to Render's free tier database
  }
});

// Read the backup data from the JSON file
const backupData = JSON.parse(fs.readFileSync('my_data.json'));

const restore = async () => {
    // Get a single connection from the pool. We'll use this for all our queries to ensure they happen in a single transaction.
    const client = await pool.connect();
    console.log('Starting restore...');
    try {
        // BEGIN starts a transaction. This is a safety measure. If any single query fails,
        // the entire operation will be cancelled (rolled back), preventing partial data insertion.
        await client.query('BEGIN');

        // Loop through each contact object in our backup data
        for (const item of backupData) {
            // SQL query to insert a contact. Note the use of $1, $2, etc. for parameters.
            // RETURNING id tells PostgreSQL to give us back the new ID it generated for this contact.
            const contactRes = await client.query(
                `INSERT INTO contacts ("firstName", "checkinFrequency", "lastCheckin", "howWeMet", "keyFacts", "birthday", "is_archived", "snooze_until") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [
                    item.firstName, 
                    item.checkinFrequency, 
                    item.lastCheckin, 
                    item.howWeMet || '', 
                    item.keyFacts || '', 
                    item.birthday || '', 
                    item.is_archived || false, 
                    item.snooze_until || null
                ]
            );
            const newContactId = contactRes.rows[0].id;
            console.log(`Restored contact: ${item.firstName} with new ID: ${newContactId}`);

            // If the contact has notes, loop through and insert them
            if (item.notes && item.notes.length > 0) {
                for (const note of item.notes) {
                    await client.query(
                        `INSERT INTO notes (content, "createdAt", "modifiedAt", "contactId") VALUES ($1, $2, $3, $4)`,
                        [note.content, note.createdAt, note.modifiedAt || null, newContactId]
                    );
                }
                console.log(`  - Restored ${item.notes.length} notes.`);
            }

            // If the contact has tags, loop through and insert them
            if (item.tags && item.tags.length > 0) {
                for (const tag of item.tags) {
                    // This is an "UPSERT" query. It tries to insert a new tag.
                    // If a tag with that name already exists (ON CONFLICT), it does nothing but still returns the ID.
                    const tagRes = await client.query(
                        `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
                        [tag.name]
                    );
                    const tagId = tagRes.rows[0].id;
                    
                    // Create the link in the join table
                    await client.query(
                        `INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [newContactId, tagId]
                    );
                }
                console.log(`  - Restored ${item.tags.length} tags.`);
            }
        }
        // If all queries were successful, COMMIT the transaction to make the changes permanent.
        await client.query('COMMIT');
        console.log('---');
        console.log('Restore complete.');
        console.log('---');
    } catch (err) {
        // If any error occurred, ROLLBACK the transaction, undoing all changes from this run.
        await client.query('ROLLBACK');
        console.error('Restore failed:', err);
    } finally {
        // Release the database client back to the pool and close the connection.
        client.release();
        pool.end();
    }
};

restore();
