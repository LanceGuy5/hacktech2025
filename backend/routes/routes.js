import { OpenAIWorker } from "../models/openai.js";

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

export {
  getHelloWorld,
  postSymptoms,
}