const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 8766;

// Enable CORS for all routes - allow both ports 3000 and 3001
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));

// Proxy requests to AnkiConnect
app.use('/anki', createProxyMiddleware({
  target: 'http://127.0.0.1:8765',
  changeOrigin: true,
  pathRewrite: {
    '^/anki': '/'
  },
  onProxyRes: function(proxyRes, req, res) {
    // Add CORS headers to the proxied response
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || 'http://localhost:3001';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
}));

app.listen(PORT, () => {
  console.log(`Anki proxy server running at http://localhost:${PORT}`);
});
