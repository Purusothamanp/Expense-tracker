const db = require('../config/db');

async function updateSchema() {
    try {
        console.log("Adding email column to users table...");
        await db.execute('ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER username');
        console.log("Schema updated successfully.");
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Email column already exists.");
        } else {
            console.error("Error updating schema:", err);
        }
    } finally {
        process.exit();
    }
}

updateSchema();
