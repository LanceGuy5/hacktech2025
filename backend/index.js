import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import register_routes from './routes/register_routes.js';

import dotenv from 'dotenv';
dotenv.config();

const app = express();

console.log('Running in development mode');

// establish /api routes 
register_routes(app);

// proxy non-API requests to the frontend dev server
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
