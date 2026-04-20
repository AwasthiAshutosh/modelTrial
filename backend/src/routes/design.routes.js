const express = require('express');
const { db } = require('../db/init');
const router = express.Router();

// Save a completed generation design to the database
router.post('/save', (req, res) => {
    const { userId, generatedImage, style, detectedObjects, stylePredictions, metadata } = req.body;

    if (!userId || !generatedImage || !style) {
        return res.status(400).json({ error: 'Missing required configuration' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO designs (user_id, original_image, generated_image, style, detected_objects, style_predictions, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        // Use a dummy 'original_image' string for now, since ml-service handles the file directly
        const result = stmt.run(
            userId,
            'uploaded_to_ml_service',
            generatedImage,
            style,
            JSON.stringify(detectedObjects || []),
            JSON.stringify(stylePredictions || []),
            JSON.stringify(metadata || {})
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'Design saved successfully' });
    } catch (error) {
        console.error('Error saving design:', error);
        res.status(500).json({ error: 'Failed to save design' });
    }
});

// Fetch design history for a specific user
router.get('/history/:userId', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM designs WHERE user_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(req.params.userId);
        
        // Parse the JSON fields back to objects before returning
        const history = rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            generated_image: row.generated_image,
            style: row.style,
            detected_objects: JSON.parse(row.detected_objects || '[]'),
            style_predictions: JSON.parse(row.style_predictions || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
            created_at: row.created_at
        }));
        
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
