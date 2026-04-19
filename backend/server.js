const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
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

// Main generation route: streamed proxy directly to ML Service
app.post('/api/generate', createProxyMiddleware({
    target: ML_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/generate': '/generate', // rewrites /api/generate proxyReq to /generate
    },
    proxyTimeout: 300000, // 5 minute timeout 
    timeout: 300000,
    onProxyReq: (proxyReq, req, res) => {
        // Direct stream, avoids hitting Express RAM limits
    }
}));

app.listen(PORT, () => {
    console.log(`Backend gateway running on port ${PORT}`);
});
