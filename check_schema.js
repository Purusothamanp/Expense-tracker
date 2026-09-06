const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log('Connected to Railway Database!');

        const [rows] = await connection.query('SELECT * FROM users;');
        console.log(rows);
        
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();
