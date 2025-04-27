import { pool } from "../src/db/dbPoolCreation.js";

let instance = null;

export class DBWorker {
  constructor({ dbConfig = null } = {}) {
    if (instance) {
      return instance;
    }
    
    // You could pass custom DB config here if needed
    this.pool = pool;
    instance = this;
  }

  static getInstance() {
    if (!instance) {
      throw new Error("DBWorker instance not created yet. Use 'new DBWorker()' first.");
    }
    return instance;
  }

  static destroyInstance() {
    instance = null;
  }

  /**
   * Find nearby hospitals based on location and criteria
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} options - Search options
   * @param {number} [options.maxDistanceKm=10] - Maximum distance in kilometers
   * @param {number} [options.minBeds=0] - Minimum number of beds
   * @param {number} [options.limit=50] - Maximum number of results
   * @returns {Promise<Array>} - Array of hospital objects
   */
  async findNearbyHospitals(lat, lng, options = {}) {
    const {
      maxDistanceKm = 10,
      minBeds = 0,
      limit = 50
    } = options;

    const sql = `
      SELECT hospital_id, name, latitude, longitude, total_beds, 
             address, city, state, zip_code,
             has_ed, is_trauma_center, trauma_level
      FROM aha_hospitals
      WHERE total_beds >= ?
        AND ST_Distance_Sphere(
              POINT(longitude, latitude),
              POINT(?, ?)
            ) <= ?
      ORDER BY total_beds DESC
      LIMIT ?
    `;
    
    const maxMeters = maxDistanceKm * 1000;
    const [rows] = await this.pool.query(sql, [minBeds, lng, lat, maxMeters, limit]);
    
    return rows;
  }
  
  /**
   * Get hospital details by ID
   * @param {string} hospitalId - Hospital ID
   * @returns {Promise<Object|null>} - Hospital object or null if not found
   */
  async getHospitalById(hospitalId) {
    const sql = `
      SELECT hospital_id, name, latitude, longitude, total_beds, 
             address, city, state, zip_code,
             has_ed, is_trauma_center, trauma_level,
             ct_scanners, ct_multislice_lt64, ct_multislice_gte64, mri_units, 
             pet_ct_units, spect_units, ultrasound_units,
             burn_care_beds, icu_med_surg_beds, icu_neonatal_beds, icu_pediatric_beds
      FROM aha_hospitals
      WHERE hospital_id = ?
    `;
    
    const [rows] = await this.pool.query(sql, [hospitalId]);
    return rows.length ? rows[0] : null;
  }
  /**
   * Find hospitals by name using fuzzy matching
   * @param {string} name - Hospital name to search for
   * @param {Object} options - Search options
   * @param {number} [options.limit=1] - Maximum number of results
   * @returns {Promise<Object|null>} - Best matching hospital or null if none found
   */
  async getHospitalByName(name, options = {}) {
    const { limit = 1 } = options;
    
    // Using LIKE with prepared statements to prevent SQL injection
    const sql = `
      SELECT hospital_id, name, latitude, longitude, total_beds, 
             address, city, state, zip_code,
             has_ed, is_trauma_center, trauma_level
      FROM aha_hospitals
      WHERE name LIKE ?
      ORDER BY CASE 
               WHEN name = ? THEN 0  -- Exact match gets highest priority
               WHEN name LIKE ? THEN 1  -- Starts with the term
               ELSE 2  -- Contains the term
               END,
               LENGTH(name) ASC  -- Shorter names ranked higher when match quality is equal
      LIMIT ?
    `;
    
    const [rows] = await this.pool.query(sql, [
      `%${name}%`,       // LIKE pattern for contains
      name,              // Exact match
      `${name}%`,        // Starts with pattern
      limit
    ]);
    
    // Return null if no matches, otherwise return the top match or all results
    if (rows.length === 0) return null;
    return limit === 1 ? rows[0] : rows;
  }
}

