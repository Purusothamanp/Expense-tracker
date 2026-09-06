const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

function getDbOptions() {
    const rawUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
    if (rawUrl) {
        try {
            const parsed = new URL(rawUrl);
            return {
                host: parsed.hostname,
                user: parsed.username,
                password: decodeURIComponent(parsed.password),
                database: parsed.pathname.replace(/^\//, ''),
                port: parsed.port ? parseInt(parsed.port, 10) : 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            };
        } catch (err) {
            console.error('URL parse failed, falling back to raw string:', err.message);
            return rawUrl;
        }
    }
    return {
        host: process.env.DB_HOST || process.env.MYSQL_HOST,
        user: process.env.DB_USER || process.env.MYSQL_USER,
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
        port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

const pool = mysql.createPool(getDbOptions());
const promisePool = pool.promise();

// Test the connection and initialize tables
promisePool.getConnection()
    .then(async (connection) => {
        console.log('Successfully connected to the database.');
        connection.release();
        await initTables();
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

async function initTables() {
    try {
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Ensure email column exists
        try {
            await promisePool.execute('SELECT email FROM users LIMIT 1');
        } catch (e) {
            console.log('Adding missing email column to users table...');
            await promisePool.execute('ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE AFTER username');
        }

        // Ensure role column exists
        try {
            await promisePool.execute('SELECT role FROM users LIMIT 1');
        } catch (e) {
            console.log('Adding missing role column to users table...');
            await promisePool.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' AFTER email");
        }

        // Elevate purusothaman user to admin
        await promisePool.execute("UPDATE users SET role = 'admin' WHERE username = 'purusothaman' OR id = 1");

        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                description VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS budgets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category VARCHAR(50) NOT NULL,
                limit_amount DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('Database tables initialized successfully.');
    } catch (err) {
        console.error('Error initializing database tables:', err.message);
    }
}

module.exports = promisePool;
