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
    const hospitals = await google.nearbyRequest(lat, lng, {
      radius: 1000,
      includedTypes: ["hospital"],
      maxResultCount: 10,
      fieldMask: "places.displayName,places.location,places.businessStatus",
    });
    return res.status(200).json(hospitals);
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