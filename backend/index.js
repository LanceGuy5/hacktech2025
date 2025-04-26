import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

console.log('Running in development mode');

// Proxy frontend requests to Vite dev server
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
