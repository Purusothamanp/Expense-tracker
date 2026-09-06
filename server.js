const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend without aggressive browser caching
app.use(express.static(path.join(__dirname, '/'), { etag: false, maxAge: 0 }));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));

app.get('/api/debug-env', (req, res) => {
    res.json(Object.keys(process.env).filter(k => k.includes('DB') || k.includes('MYSQL') || k.includes('URL')));
});

// Fallback to index.html for single page app behavior
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
