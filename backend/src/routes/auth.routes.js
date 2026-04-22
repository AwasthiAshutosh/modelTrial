const express = require('express');
const router = express.Router();
const { db } = require('../db/init');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);


// Signup
router.post('/signup', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        // Hash the password with bcrypt
        const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);
        const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        const info = stmt.run(name, email, hashedPassword);
        const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ id: info.lastInsertRowid, name, email, token });
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

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ id: user.id, name: user.name, email: user.email, token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Account
router.post('/delete', authenticate, (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(userId);

        if (!user || !bcrypt.compareSync(password, user.password)) { 
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
