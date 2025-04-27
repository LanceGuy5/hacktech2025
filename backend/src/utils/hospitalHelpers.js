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
          has_ct: dbHospital.has_ct,
          has_mri: dbHospital.has_mri,
          has_pet_ct: dbHospital.has_pet_ct,
          has_ultrasound: dbHospital.has_ultrasound,
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
    
    // Base score on bed availability
    const totalBeds = data.total_beds || 1; // Avoid division by zero
    const bedsInUse = data.total_beds_load || 0;
    const availableBeds = totalBeds - bedsInUse;
    const bedAvailabilityRatio = availableBeds / totalBeds;
    
    // Scale to 0-100 points based on availability percentage
    score += 100 * Math.max(0, bedAvailabilityRatio);
    
    // Check for specific needs
    if (patientNeeds) {
      // Trauma cases
      if (patientNeeds.isTrauma && data.is_trauma_center) {
        score += 50;
        
        // Adjust score based on recommended trauma level
        if (patientNeeds.recommendedTraumaLevel && data.trauma_level) {
          // Perfect match
          if (data.trauma_level === patientNeeds.recommendedTraumaLevel) {
            score += 50;
          }
          // Better than recommended (lower number = higher capability)
          else if (data.trauma_level < patientNeeds.recommendedTraumaLevel) {
            score += 40;
          }
          // One level below recommended
          else if (data.trauma_level === patientNeeds.recommendedTraumaLevel + 1) {
            score += 20;
          }
          // Two levels below recommended 
          else if (data.trauma_level === patientNeeds.recommendedTraumaLevel + 2) {
            score += 10;
          }
          // More than two levels below recommended - no bonus
        }
      }
      
      // Need for specific equipment (now using boolean flags)
      if (patientNeeds.needsMRI && data.has_mri) {
        score += 20; 
      }
      
      if (patientNeeds.needsCTScan && data.has_ct) {
        score += 20;
      }

      if (patientNeeds.needsUltrasound && data.has_ultrasound) {
        score += 20;
      }

      if (patientNeeds.needsPetCT && data.has_pet_ct) {
        score += 20;
      }

      // Special care needs
      if (patientNeeds.needsSurgicalICU && data.icu_med_surg_beds > 0) {
        const availableICUBeds = data.icu_med_surg_beds - (data.icu_med_surg_beds_load || 0);
        const availabilityRatio = availableICUBeds / data.icu_med_surg_beds;
        score += 30 * Math.max(0, availabilityRatio);
      }
      
      // Pediatric needs
      if (patientNeeds.needsPediatricICU && data.icu_pediatric_beds > 0) {
        const availablePedBeds = data.icu_pediatric_beds - (data.icu_pediatric_beds_load || 0);
        const availabilityRatio = availablePedBeds / data.icu_pediatric_beds;
        score += 30 * Math.max(0, availabilityRatio);
      }

      // Neonatal needs
      if (patientNeeds.needsNeonatalICU && data.icu_neonatal_beds > 0) {
        const availableNeonatalBeds = data.icu_neonatal_beds - (data.icu_neonatal_beds_load || 0);
        const availabilityRatio = availableNeonatalBeds / data.icu_neonatal_beds;
        score += 30 * Math.max(0, availabilityRatio);
      }
      
    }
    
    // Calculate estimated wait time (simplified example)
    // more sophisticated model would not be linear
    const estimatedWait = Math.max(5, bedAvailabilityRatio * 60); // minutes
    
    hospital.score = Math.round(score);
    hospital.estimated_wait = estimatedWait;
  });
  
  // Sort by score (highest first)
  return rankedHospitals.sort((a, b) => (b.score || 0) - (a.score || 0));
}
