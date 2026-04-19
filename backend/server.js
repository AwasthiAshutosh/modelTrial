const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

app.use(cors());
// MOVED: Only apply json parsing to routes that ARE NOT the proxy
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        next();
    } else {
        express.json()(req, res, next);
    }
});
app.use(morgan('dev'));

// Health check
// Universal API Gateway Proxy to ML Service
app.use('/api', createProxyMiddleware({
    target: ML_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Strip /api prefix when forwarding
    },
    proxyTimeout: 300000, // 5 minute timeout 
    timeout: 300000,
    // Safely handle proxy failures (e.g. ML service offline) without crashing Express
    onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
        res.status(502).json({ error: 'ML Service is currently unavailable. Please try again later.' });
    },
    // CRITICAL: Flush SSE responses immediately instead of buffering.
    // Without this, EventSource streams from FastAPI are held by the proxy
    // and the frontend hangs forever on "Designing your room..."
    onProxyRes: (proxyRes, req, res) => {
        if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['connection'] = 'keep-alive';
            proxyRes.headers['x-accel-buffering'] = 'no';
        }
    },
}));

app.listen(PORT, () => {
    console.log(`Backend gateway running on port ${PORT}`);
});
