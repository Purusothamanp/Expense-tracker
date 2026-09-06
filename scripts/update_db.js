const db = require('../config/db');

async function updateSchema() {
    try {
        console.log("Ensuring email column...");
        try {
            await db.execute('ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER username');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log("Email column already exists.");
            else console.error("Email column error:", err.message);
        }

        console.log("Ensuring role column...");
        try {
            await db.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'");
            console.log("Role column added.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log("Role column already exists.");
            else console.error("Role column error:", err.message);
        }

        console.log("Setting default admin...");
        await db.execute("UPDATE users SET role = 'admin' WHERE username = 'purusothaman' OR id = 1");
        
        const [users] = await db.execute('SELECT id, username, email, role FROM users');
        console.log("Updated Users in DB:", users);
        console.log("Schema update completed successfully.");
    } catch (err) {
        console.error("Error updating schema:", err);
    } finally {
        process.exit(0);
    }
}

updateSchema();
