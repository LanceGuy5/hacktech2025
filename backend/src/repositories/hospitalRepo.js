// src/repositories/hospitalRepo.js
import { pool } from '../db/index.js';

/**
 * Find up to `limit` hospitals with >= minBeds,
 * within maxDistanceKm of (lat, lng), sorted by bed count.
 */
export async function findNearby({ lat, lng, maxDistanceKm, minBeds = 0, limit = 50 }) {
  const sql = `
    SELECT hospital_id, name, lat, lng, hospbd
    FROM AHA_Hospitals
    WHERE hospbd >= ?
      AND ST_Distance_Sphere(
            POINT(lng, lat),
            POINT(?, ?)
          ) <= ?
    ORDER BY hospbd DESC
    LIMIT ?
  `;
  const maxMeters = maxDistanceKm * 1000;
  const [rows] = await pool.query(sql, [minBeds, lng, lat, maxMeters, limit]);
  return rows;
}
