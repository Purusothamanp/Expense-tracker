const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { protect, requireAdmin } = require('../middleware/auth');

// Generate JWT for Admin
const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'smartspend_jwt_secret_key_2026';
    return jwt.sign({ id }, secret, { expiresIn: '30d' });
};

// @route   POST /api/admin/login
// @desc    Admin Portal Login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter admin email/username and password.' });
        }

        // Search user by email OR username
        const [users] = await db.execute('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid Admin credentials.' });
        }

        const user = users[0];

        // Verify Admin role
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied: This user account does not have Admin privileges.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Admin credentials.' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user.id)
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error during admin login', error: error.message });
    }
});

// Apply protection & admin check to remaining admin routes
router.use(protect);
router.use(requireAdmin);

// @route   GET /api/admin/stats
// @desc    Get system overview stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
    try {
        const [[{ total_users }]] = await db.execute('SELECT COUNT(*) AS total_users FROM users');
        const [[{ total_transactions }]] = await db.execute('SELECT COUNT(*) AS total_transactions FROM transactions');
        const [[{ total_volume }]] = await db.execute('SELECT COALESCE(SUM(amount), 0) AS total_volume FROM transactions');
        const [[{ total_budgets }]] = await db.execute('SELECT COUNT(*) AS total_budgets FROM budgets');

        res.json({
            totalUsers: total_users,
            totalTransactions: total_transactions,
            totalVolume: parseFloat(total_volume),
            totalBudgets: total_budgets
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server error fetching admin stats', error: error.message });
    }
});

// @route   GET /api/admin/users
// @desc    Get all registered users with activity stats
// @access  Private/Admin
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                COALESCE(u.role, 'user') AS role, 
                u.created_at,
                COUNT(t.id) AS transaction_count,
                COALESCE(SUM(t.amount), 0) AS total_spent
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id
            GROUP BY u.id, u.username, u.email, u.role, u.created_at
            ORDER BY u.id ASC
        `);
        
        res.json(users);
    } catch (error) {
        console.error('Admin fetch users error:', error);
        res.status(500).json({ message: 'Server error fetching users', error: error.message });
    }
});

// @route   GET /api/admin/transactions
// @desc    Get all system-wide transactions across all users
// @access  Private/Admin
router.get('/transactions', async (req, res) => {
    try {
        const [transactions] = await db.execute(`
            SELECT 
                t.id,
                t.user_id,
                u.username,
                u.email,
                t.date,
                t.description,
                t.amount,
                t.category,
                t.payment_method,
                t.created_at
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.date DESC, t.id DESC
        `);
        
        res.json(transactions);
    } catch (error) {
        console.error('Admin fetch transactions error:', error);
        res.status(500).json({ message: 'Server error fetching system transactions', error: error.message });
    }
});

// @route   PUT /api/admin/users/:id
// @desc    Modify user details (username, email, role, optional password)
// @access  Private/Admin
router.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const { username, email, role, password } = req.body;

        if (!username || !email || !role) {
            return res.status(400).json({ message: 'Username, email and role are required.' });
        }

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role.' });
        }

        // Prevent self-demotion if single admin
        if (userId === req.user.id && role === 'user') {
            const [[{ admin_count }]] = await db.execute("SELECT COUNT(*) AS admin_count FROM users WHERE role = 'admin'");
            if (admin_count <= 1) {
                return res.status(400).json({ message: 'Cannot demote the only admin user.' });
            }
        }

        // Check for email conflict
        const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'Email address is already in use by another user.' });
        }

        // Check for username conflict
        const [existingUsername] = await db.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ message: 'Username is already taken by another user.' });
        }

        if (password && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.execute('UPDATE users SET username = ?, email = ?, role = ?, password = ? WHERE id = ?', [username, email, role, hashedPassword, userId]);
        } else {
            await db.execute('UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?', [username, email, role, userId]);
        }

        res.json({ message: `User "${username}" details updated successfully.` });
    } catch (error) {
        console.error('Admin edit user error:', error);
        res.status(500).json({ message: 'Server error editing user details', error: error.message });
    }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Toggle or update a user's role
// @access  Private/Admin
router.put('/users/:id/role', async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Role must be "user" or "admin".' });
        }

        // Prevent self-demotion if single admin
        if (parseInt(userId, 10) === req.user.id && role === 'user') {
            const [[{ admin_count }]] = await db.execute("SELECT COUNT(*) AS admin_count FROM users WHERE role = 'admin'");
            if (admin_count <= 1) {
                return res.status(400).json({ message: 'Cannot demote the only admin user.' });
            }
        }

        await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

        res.json({ message: `User role updated successfully to ${role}` });
    } catch (error) {
        console.error('Admin update role error:', error);
        res.status(500).json({ message: 'Server error updating user role', error: error.message });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user account and cascading data
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);

        if (userId === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own admin account.' });
        }

        const [existing] = await db.execute('SELECT id, username FROM users WHERE id = ?', [userId]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await db.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ message: `User "${existing[0].username}" deleted successfully.` });
    } catch (error) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ message: 'Server error deleting user', error: error.message });
    }
});

module.exports = router;
