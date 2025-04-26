// src/routes/hospitalRoutes.js
import express from 'express';
import { getNearby } from '../controllers/hospitalController.js';

const router = express.Router();

// GET /api/hospitals/nearby?lat=...&lng=...&distance=...&beds=...&limit=...
router.get('/nearby', getNearby);

export default router;
