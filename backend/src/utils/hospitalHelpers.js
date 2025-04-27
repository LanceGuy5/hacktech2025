import { GoogleWorker } from "../../models/google.js";
import { DBWorker } from "../../models/database.js";

/**
 * Fetches nearby hospitals and enhances them with database information
 */
export async function fetchNearbyHospitals(lat, lng) {
  // pull google singleton
  const google = new GoogleWorker({ apiKey: process.env.GOOGLE_API_KEY });
  if (!google) {
    throw new Error('Google instance not initialized!');
  }

  console.log(`[DEBUG] Starting hospital lookup for lat=${lat}, lng=${lng}`);
  
  // 1. Get nearby hospitals from Google API
  const googleHospitals = await google.nearbyRequest(lat, lng, {});
  
  console.log(`[DEBUG] Google API returned ${googleHospitals.length || 0} hospitals`);
  
  // 2. Get database instance
  const db = new DBWorker();
  
  // Track matching stats for debugging
  let matchCount = 0;
  let missingNameCount = 0;
  let noMatchCount = 0;
  
  // 3. Enhance each Google result with database information
  const enhancedHospitals = await Promise.all(googleHospitals.map(async (hospital, index) => {
    // Extract hospital name from Google result
    const hospitalName = hospital.displayName?.text;

    // extract coordinates from google result
    const lat = hospital.location?.latitude;
    const lng = hospital.location?.longitude;
    
    console.log(`[DEBUG] [${index}] Processing: ${hospitalName || 'UNNAMED'}`);
    
    if (!hospitalName) {
      missingNameCount++;
      console.log(`[DEBUG] [${index}] Skipping lookup - no hospital name available`);
      return hospital; // Return unmodified if no name available
    }
    
    // Query internal database for matching hospital
    console.log(`[DEBUG] [${index}] Looking up: "${hospitalName}" in database`);
    // get matching hospital from database using name and coordinates
    const dbHospital = await db.getHospitalMatch(hospitalName, lat, lng);
    
    // Combine data from both sources
    if (dbHospital) {
      matchCount++;
      console.log(`[DEBUG] [${index}] ✅ MATCH FOUND: ${dbHospital.name} (ID: ${dbHospital.hospital_id})`);
      console.log(`[DEBUG] [${index}] Match details: ${dbHospital.total_beds} beds, ED: ${dbHospital.has_ed ? 'Yes' : 'No'}, Trauma: ${dbHospital.is_trauma_center ? 'Yes' : 'No'}`);
      
      return {
        ...hospital,
        internal_data: {
          hospital_id: dbHospital.hospital_id,
          total_beds: dbHospital.total_beds,
          has_ed: dbHospital.has_ed,
          is_trauma_center: dbHospital.is_trauma_center,
          trauma_level: dbHospital.trauma_level,
          name: dbHospital.name,
          latitude: dbHospital.latitude,
          longitude: dbHospital.longitude,
          address: dbHospital.address,
          city: dbHospital.city,
          state: dbHospital.state,
          ct_scanners: dbHospital.ct_scanners,
          mri_units: dbHospital.mri_units,
          pet_ct_units: dbHospital.pet_ct_units,
          ultrasound_units: dbHospital.ultrasound_units,
          burn_care_beds: dbHospital.burn_care_beds,
          icu_med_surg_beds: dbHospital.icu_med_surg_beds,
          icu_neonatal_beds: dbHospital.icu_neonatal_beds,
          icu_pediatric_beds: dbHospital.icu_pediatric_beds,
          total_beds_load: dbHospital.total_beds_load,
          icu_med_surg_beds_load: dbHospital.icu_med_surg_beds_load,
          icu_neonatal_beds_load: dbHospital.icu_neonatal_beds_load,
          icu_pediatric_beds_load: dbHospital.icu_pediatric_beds_load,
          burn_care_beds_load: dbHospital.burn_care_beds_load
        }
      };
    }
    
    // Return original data if no matching record in database
    noMatchCount++;
    console.log(`[DEBUG] [${index}] ❌ NO MATCH FOUND for "${hospitalName}"`);
    return hospital;
  }));
  
  console.log(`[DEBUG] Summary: ${googleHospitals.length} total, ${matchCount} matched, ${noMatchCount} no match, ${missingNameCount} missing name`);
  
  return {
    places: enhancedHospitals,
    debug: {
      total: googleHospitals.length,
      matched: matchCount,
      noMatch: noMatchCount,
      missingName: missingNameCount
    }
  };
}

/**
 * Ranks hospitals based on patient needs and hospital capacity
 */
export function rankHospitals(hospitals, patientNeeds) {
  // Copy the hospitals array to avoid modifying the original
  const rankedHospitals = [...hospitals];
  
  // Calculate scores for each hospital based on patient needs
  rankedHospitals.forEach(hospital => {
    let score = 0;
    const data = hospital.internal_data;
    
    // Skip scoring if no internal data available
    if (!data) {
      hospital.score = 0;
      hospital.estimated_wait = null;
      return;
    }
    
    // Base score on availability
    const bedLoad = data.total_beds_load || 0;
    score += 100 - bedLoad; // Higher score for less load
    
    // Check for specific needs
    if (patientNeeds) {
      // Trauma cases
      if (patientNeeds.isTrauma && data.is_trauma_center) {
        score += 50;
        // Add bonus for appropriate trauma level
        if (patientNeeds.traumaSeverity === 'severe' && data.trauma_level <= 2) {
          score += 30;
        }
      }
      
      // Need for specific equipment
      if (patientNeeds.needsMRI && data.mri_units > 0) {
        score += 20 * (1 - (data.mri_units_load || 0.5));
      }
      
      if (patientNeeds.needsCTScan && data.ct_scanners > 0) {
        score += 20 * (1 - (data.ct_scanners_load || 0.5));
      }
      
      // Special care needs
      if (patientNeeds.needsICU && data.icu_med_surg_beds > 0) {
        score += 30 * (1 - (data.icu_med_surg_beds_load || 0.5));
      }
      
      if (patientNeeds.needsBurnUnit && data.burn_care_beds > 0) {
        score += 40 * (1 - (data.burn_care_beds_load || 0.5));
      }
      
      // Pediatric needs
      if (patientNeeds.isPediatric && data.icu_pediatric_beds > 0) {
        score += 30 * (1 - (data.icu_pediatric_beds_load || 0.5));
      }
    }
    
    // Calculate estimated wait time (simplified example)
    const estimatedWait = Math.max(5, bedLoad * 30); // minutes
    
    hospital.score = Math.round(score);
    hospital.estimated_wait = estimatedWait;
  });
  
  // Sort by score (highest first)
  return rankedHospitals.sort((a, b) => (b.score || 0) - (a.score || 0));
}
