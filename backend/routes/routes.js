import { GoogleWorker } from "../models/google.js";
import { OpenAIWorker } from "../models/openai.js";
import { DBWorker } from "../models/database.js";
import { fetchNearbyHospitals, rankHospitals } from "../src/utils/hospitalHelpers.js";

function getHelloWorld(req, res) {
  res.send('Hello World');
}

async function postSymptoms(req, res) {
  // pull symptoms from request
  const { symptoms } = req.body;
  // image exists through middleware -> pull individually through request
  const photo = req.file;
  
  // Parse conversation history
  let conversationHistory = [];
  if (req.body.conversationHistory) {
    try {
      conversationHistory = JSON.parse(req.body.conversationHistory);
    } catch (e) {
      console.error('Error parsing conversation history:', e);
      // Continue with empty history if parsing fails
    }
  }

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
      console.log('Both symptoms and photo provided');
      const textResponse = await openai.sendTextWithImage(symptoms, photo, conversationHistory);
      return res.status(200).json({ result: textResponse });
    } else if (symptoms) {
      const symptomsResponse = await openai.sendText(symptoms, conversationHistory);
      return res.status(200).json({ result: symptomsResponse });
    } else if (photo) {
      const imageResponse = await openai.sendImage(photo, conversationHistory);
      return res.status(200).json({ result: imageResponse });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Error processing request!' });
  }
}

async function getNearbyHospitals(req, res) {
  const { lat, lng, patientNeeds } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required!' });
  }

  try {
    // Fetch nearby hospitals with enhanced data
    const results = await fetchNearbyHospitals(lat, lng);

    // If patient needs are provided, rank the hospitals
    if (patientNeeds) {
      // Parse the patient needs from the query string
      const needs = typeof patientNeeds === 'string' ? JSON.parse(patientNeeds) : patientNeeds;

      // Rank hospitals based on patient needs
      const rankedHospitals = rankHospitals(results.places, needs);

      return res.status(200).json({
        places: rankedHospitals,
        debug: results.debug
      });
    }

    // If no patient needs provided, return unranked results
    return res.status(200).json(results);

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

async function generatePatientNeeds(req, res) {
  const { conversation, imageDescriptions = [] } = req.body;
  
  if (!conversation) {
    return res.status(400).json({ error: 'Conversation is required!' });
  }

  // pull openai singleton
  const openai = new OpenAIWorker({ apiKey: process.env.OPENAI_API_KEY });
  if (!openai) {
    return res.status(500).json({ error: 'OpenAI instance not initialized!' });
  }

  try {
    // Generate patient needs based on conversation and image descriptions
    const patientNeeds = await openai.generatePatientNeeds(conversation, imageDescriptions);
    return res.status(200).json({ patientNeeds });
  } catch (error) {
    console.error('Error generating patient needs:', error);
    return res.status(500).json({ error: 'Error generating patient needs: ' + error.message });
  }
}

export {
  getHelloWorld,
  postSymptoms,
  getNearbyHospitals,
  getHospitalById,
  generatePatientNeeds
}