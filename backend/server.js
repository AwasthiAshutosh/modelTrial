const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const FormData = require('form-data');
const upload = require('./middleware/upload');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Gateway is running', ml_service: ML_SERVICE_URL });
});

// Main generation route
app.post('/api/generate', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { style } = req.body;
        
        // Prepare data for ML service
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        formData.append('style', style || 'modern');

        // Forward to FastAPI
        const response = await axios.post(`${ML_SERVICE_URL}/generate`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 300000 // 5-minute timeout for ML processing
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error forwarding to ML service:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Failed to communicate with ML service', details: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Backend gateway running on port ${PORT}`);
});
