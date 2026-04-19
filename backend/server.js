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
// Universal API Gateway Proxy to ML Service
app.use('/api', createProxyMiddleware({
    target: ML_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Strip /api prefix when forwarding
    },
    proxyTimeout: 300000, // 5 minute timeout 
    timeout: 300000
}));

app.listen(PORT, () => {
    console.log(`Backend gateway running on port ${PORT}`);
});
