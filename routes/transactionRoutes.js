const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get all transactions for a user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const [transactions] = await db.execute(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC',
            [req.user.id]
        );
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/transactions
// @desc    Add a transaction
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { date, description, amount, category, payment_method, notes } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO transactions (user_id, date, description, amount, category, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, date, description, amount, category, payment_method, notes || '']
        );

        res.status(201).json({
            id: result.insertId,
            user_id: req.user.id,
            date, description, amount, category, payment_method, notes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/transactions/:id
// @desc    Update a transaction
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const { date, description, amount, category, payment_method, notes } = req.body;
        const transactionId = req.params.id;

        // Check if transaction exists and belongs to user
        const [existing] = await db.execute('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transactionId, req.user.id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Transaction not found or not authorized' });
        }

        await db.execute(
            'UPDATE transactions SET date = ?, description = ?, amount = ?, category = ?, payment_method = ?, notes = ? WHERE id = ?',
            [date, description, amount, category, payment_method, notes || '', transactionId]
        );

        res.json({ id: transactionId, user_id: req.user.id, date, description, amount, category, payment_method, notes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const transactionId = req.params.id;

        // Check if transaction exists and belongs to user
        const [existing] = await db.execute('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [transactionId, req.user.id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Transaction not found or not authorized' });
        }

        await db.execute('DELETE FROM transactions WHERE id = ?', [transactionId]);

        res.json({ message: 'Transaction removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
