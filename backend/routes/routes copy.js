import { GoogleWorker } from "../models/google.js";
import { OpenAIWorker } from "../models/openai.js";
import { DBWorker } from "../models/database.js";

function getHelloWorld(req, res) {
  res.send('Hello World');
}

function postSymptoms(req, res) {
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
      openai.sendTextWithImage(symptoms, photo);
    } else if (symptoms) {
      openai.sendText(symptoms);
    } else if (photo) {
      openai.sendImage(photo);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Error processing request!' });
  }
  return res.status(200).json({ message: 'Request processed successfully!' });
}

async function getNearbyHospitals(req, res) {
  const { lat, lng, distance, beds, limit } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required!' });
  }

  try {
    // Use Google Places API for general nearby hospitals
    const google = new GoogleWorker({ apiKey: process.env.GOOGLE_API_KEY });
    if (!google) {
      return res.status(500).json({ error: 'Google instance not initialized!' });
    }

    // Use Database for detailed hospital information with capabilities
    const db = new DBWorker();
    if (!db) {
      return res.status(500).json({ error: 'Database instance not initialized!' });
    }

    // Parse query parameters
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedDistance = parseFloat(distance) || 10; // default 10 km
    const parsedBeds = parseInt(beds, 10) || 0;
    const parsedLimit = parseInt(limit, 10) || 10;

    // Get hospitals from our database with detailed information
    const dbHospitals = await db.findNearbyHospitals(parsedLat, parsedLng, {
      maxDistanceKm: parsedDistance,
      minBeds: parsedBeds,
      limit: parsedLimit
    });

    console.log(`Found ${dbHospitals.length} hospitals from database`);
    
    return res.status(200).json({
      source: "database",
      count: dbHospitals.length,
      hospitals: dbHospitals
    });
  } catch (error) {
    console.error('Error fetching nearby hospitals:', error);
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