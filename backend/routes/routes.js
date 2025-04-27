import { GoogleWorker } from "../models/google.js";
import { OpenAIWorker } from "../models/openai.js";
import { DBWorker } from "../models/database.js";

function getHelloWorld(req, res) {
  res.send('Hello World');
}

async function postSymptoms(req, res) {
  // pull symptoms from request
  const { symptoms } = req.body;
  // image exists through middleware -> pull individually through request
  const photo = req.file;

  // need at least one of these to proceed
  if (!symptoms && !photo) {
    return res.status(400).json({ error: 'Either symptom image or description is required!' });
  }

  // pull openai singleton
  const openai = new OpenAIWorker({ apiKey: process.env.OPENAI_API_KEY });
  if (!openai) {
    return res.status(500).json({ error: 'OpenAI instance not initialized!' });
  }

  // send info to OpenAI based on what we have
  // TODO for now these just print, but we should send the response back to the client
  try {
    if (symptoms && photo) {
      const textResponse = await openai.sendTextWithImage(symptoms, photo);
      return res.status(200).json({ result: textResponse });
    } else if (symptoms) {
      const symptomsResponse = await openai.sendText(symptoms);
      return res.status(200).json({ result: symptomsResponse });
    } else if (photo) {
      const imageResponse = await openai.sendImage(photo);
      return res.status(200).json({ result: imageResponse });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Error processing request!' });
  }
}

async function getNearbyHospitals(req, res) {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required!' });
  }

  // pull google singleton
  const google = new GoogleWorker({ apiKey: process.env.GOOGLE_API_KEY });
  if (!google) {
    return res.status(500).json({ error: 'Google instance not initialized!' });
  }

  try {
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
      
      console.log(`[DEBUG] [${index}] Processing: ${hospitalName || 'UNNAMED'}`);
      
      if (!hospitalName) {
        missingNameCount++;
        console.log(`[DEBUG] [${index}] Skipping lookup - no hospital name available`);
        return hospital; // Return unmodified if no name available
      }
      
      // Query internal database for matching hospital
      console.log(`[DEBUG] [${index}] Looking up: "${hospitalName}" in database`);
      // Potential Future Improvement:
      // - Use coordinates or state instead of just name, in case of multiple hospitals with same name
      const dbHospital = await db.getHospitalByName(hospitalName);
      
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
            // Include any other fields you want to expose
          }
        };
      }
      
      // Return original data if no matching record in database
      noMatchCount++;
      console.log(`[DEBUG] [${index}] ❌ NO MATCH FOUND for "${hospitalName}"`);
      return hospital;
    }));
    
    console.log(`[DEBUG] Summary: ${googleHospitals.length} total, ${matchCount} matched, ${noMatchCount} no match, ${missingNameCount} missing name`);
    
    return res.status(200).json({
      places: enhancedHospitals,
      debug: {
        total: googleHospitals.length,
        matched: matchCount,
        noMatch: noMatchCount,
        missingName: missingNameCount
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] ERROR in getNearbyHospitals:', error);
    return res.status(500).json({ error: 'Error fetching nearby hospitals: ' + error.message });
  }
}

// You might want to add a route for getting hospital details by ID
async function getHospitalById(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Hospital ID is required!' });
  }

  try {
    const db = new DBWorker();
    const hospital = await db.getHospitalById(id);

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found!' });
    }

    return res.status(200).json(hospital);
  } catch (error) {
    console.error('Error fetching hospital details:', error);
    return res.status(500).json({ error: 'Error fetching hospital details: ' + error.message });
  }
}

export {
  getHelloWorld,
  postSymptoms,
  getNearbyHospitals,
  getHospitalById
}