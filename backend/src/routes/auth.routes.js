const express = require('express');
const router = express.Router();
const { db } = require('../db/init');

// Signup
router.post('/signup', (req, res) => {
    const { name, email, password } = req.body;
    try {
        // In production, hash the password with bcrypt
        const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        const info = stmt.run(name, email, password);
        res.status(201).json({ id: info.lastInsertRowid, name, email });
    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email);

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Account
router.post('/delete', (req, res) => {
    const { userId, password } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(userId);

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Delete user's designs first
        db.prepare('DELETE FROM designs WHERE user_id = ?').run(userId);
        // Delete user
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
