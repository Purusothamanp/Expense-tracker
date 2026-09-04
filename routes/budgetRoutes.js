const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @route   GET /api/budgets
// @desc    Get all budgets for a user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const [budgets] = await db.execute(
            'SELECT * FROM budgets WHERE user_id = ?',
            [req.user.id]
        );
        res.json(budgets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/budgets
// @desc    Update or create budgets (batch update)
// @access  Private
router.put('/', protect, async (req, res) => {
    // Expecting req.body to be an object: { "Food": 5000, "Transport": 3000, ... }
    try {
        const budgets = req.body;
        const userId = req.user.id;

        // Simple approach: delete existing and insert new
        await db.execute('DELETE FROM budgets WHERE user_id = ?', [userId]);

        for (const [category, limitAmount] of Object.entries(budgets)) {
            await db.execute(
                'INSERT INTO budgets (user_id, category, limit_amount) VALUES (?, ?, ?)',
                [userId, category, limitAmount]
            );
        }

        res.json({ message: 'Budgets updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
