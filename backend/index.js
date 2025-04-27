// index.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import register_routes from './routes/register_routes.js';  // Updated path
import { pool } from './src/db/dbPoolCreation.js';         // Keep this path
import dotenv from 'dotenv';
dotenv.config();

const app = express();

console.log('Running in development mode');
app.use(express.json());

// pool.getConnection()
//   .then(conn => {
//     console.log('✅ Connected to MySQL');
//     conn.release();
//   })
//   .catch(err => {
//     console.error('❌ MySQL connection failed:', err);
//     process.exit(1);  // quit if you can’t talk to your DB
//   });

register_routes(app);
console.log('✅ Routes registered');

app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
  })
);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
