const jwt = require('jsonwebtoken');
const { db } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_only';

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: invalid user' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    }
};

module.exports = { authenticate, JWT_SECRET };
