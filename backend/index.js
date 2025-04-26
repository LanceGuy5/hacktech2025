// index.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import register_routes from './routes/register_routes.js';
import hospitalRoutes from './src/routes/hospitalRoutes.js';   // <- your SQL-backed routes
import { pool } from './src/db/index.js';                     // <- ensure pool is created
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// 1️⃣ Log environment
console.log('Running in development mode');

// 2️⃣ JSON body parsing (must come before any route that reads req.body)
app.use(express.json());

// 3️⃣ Test DB connection at startup (optional, but good feedback)
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err);
    process.exit(1);  // quit if you can’t talk to your DB
  });

// 4️⃣ Mount your existing API routes
register_routes(app);

// 5️⃣ Mount your new SQL‐powered hospital routes
//    these live in src/routes/hospitalRoutes.js and use your controllers/repos
app.use('/api/hospitals', hospitalRoutes);

// 6️⃣ Proxy everything else to the front-end dev server
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
  })
);

// 7️⃣ Catch-all error handler (must go after all app.use/route calls)
app.use((err, req, res, next) => {
  console.error(err);             // log for debugging
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 8️⃣ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
