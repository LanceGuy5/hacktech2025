// src/controllers/hospitalController.js
import * as repo from '../repositories/hospitalRepo.js';

export async function getNearby(req, res, next) {
  try {
    // 1️⃣ Validate & parse query parameters
    const lat      = parseFloat(req.query.lat);
    const lng      = parseFloat(req.query.lng);
    const distance = parseFloat(req.query.distance) || 10; // default 10 km
    const beds     = parseInt(req.query.beds, 10) || 0;
    const limit    = parseInt(req.query.limit, 10) || 50;

    // 2️⃣ Call the repository
    const hospitals = await repo.findNearby({ lat, lng, maxDistanceKm: distance, minBeds: beds, limit });

    // 3️⃣ Send JSON response
    res.json({ data: hospitals });
  } catch (err) {
    // 4️⃣ Delegate errors to Express error middleware
    next(err);
  }
}
