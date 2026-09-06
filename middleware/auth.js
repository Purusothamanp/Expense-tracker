const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user actually exists in database
            const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [decoded.id]);
            if (!users || users.length === 0) {
                return res.status(401).json({ message: 'User session invalid or user no longer exists.' });
            }

            // Set user ID on request object
            req.user = { id: decoded.id };

            return next();
        } catch (error) {
            console.error('Auth check error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
