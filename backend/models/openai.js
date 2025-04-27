import OpenAI from "openai";
import { PROMPTS } from "./prompts.js";
import { Readable } from "stream";
import fs from "fs";

// singleton instance of OpenAI
let instance = null;

export class OpenAIWorker {
  constructor({ apiKey }) {
    if (instance) {
      return instance;
    }
    this.apiKey = apiKey;
    this.model = "gpt-4o"; // TODO - determine which model to use
    this.openai = new OpenAI({
      apiKey: this.apiKey,
    });

    instance = this;
  }

  static getInstance() {
    if (!instance) {
      throw new Error("OpenAIWorker instance not created yet. Use 'new OpenAIWorker({ apiKey })' first.");
    }
    return instance;
  }

  static destroyInstance() {
    instance = null;
  }

  // for sending just an image to OpenAI model
  sendImage = async function (image, conversationHistory = []) {
    const b64Img = image.buffer.toString("base64");

    // Convert conversation history
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content || ""
    }));

    // Add current user message
    messages.push({
      role: "user",
      content: [
        { type: "text", text: PROMPTS.IMAGE },
        {
          type: "image_url",
          image_url: {
            url: `data:${image.mimetype};base64,${b64Img}`,
          },
        },
      ],
    });

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  }

  // for sending just a text description to OpenAI model
  sendText = async function (text, conversationHistory = []) {
    // Ensure conversationHistory is an array
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    // Convert our conversation history to OpenAI format
    const messages = history.map(msg => ({
      role: msg.role || "user",
      content: msg.content || ""
    }));

    // Add the current user prompt with the symptoms template
    messages.push({
      role: "user",
      content: [
        { type: "text", text: PROMPTS.SYMPTOM(text) }
      ]
    });

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  }

  // for sending both a text description and an image to OpenAI model
  sendTextWithImage = async function (text, image, conversationHistory = []) {
    const b64Img = image.buffer.toString("base64");

    // Convert conversation history
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content || ""
    }));

    // Add current user message
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: PROMPTS.SYMPTOM_IMAGE(text),
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${image.mimetype};base64,${b64Img}`,
          },
        },
      ],
    });

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  };

  async generatePatientNeeds(conversation, imageDescriptions = []) {
    const prompt = PROMPTS.GENERATE_PATIENT_NEEDS(conversation, imageDescriptions);

    const response = await this.openai.chat.completions.create({
      // TODO - determine which model to use
      model: this.model,
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.2, // Lower for more consistent structured data
    });

    try {
      // Get the raw content from the response
      let content = response.choices[0].message.content;

      // Debug the raw response
      console.log("DEBUG - Raw OpenAI response:", content);

      // Clean the response by removing markdown code blocks
      if (content.includes("```")) {
        // Remove markdown code blocks (```json and ```)
        content = content.replace(/```json\n|\```/g, "").trim();
      }

      // Debug the cleaned content
      console.log("DEBUG - Cleaned content for parsing:", content);

      // Parse the JSON response
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing response:', error);
      // If debugging, also log the raw response that failed to parse
      console.error('Raw response that failed to parse:',
        response.choices[0]?.message?.content || 'No response content');
      throw new Error('Failed to generate valid patient needs data');
    }
  }

  // for transcribing audio using Whisper
  transcribeAudio = async function (audio) {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audio.path),
        model: 'whisper-1',
        response_format: 'text'
      });

      return response.text;
    } catch (error) {
      console.error("Error in Whisper transcription:", error);
      throw new Error("Failed to transcribe audio.");
    }
  }
}

