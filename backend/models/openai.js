import OpenAI from "openai";
import fs from "fs";

// singleton instance of OpenAI
let instance = null;

class OpenAIWorker {
  constructor({ apiKey }) {
    if (instance) {
      return instance;
    }
    this.apiKey = apiKey;
    this.model = "MODEL"; // TODO - determine which model to use
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
  sendImage = async function (image) {
    const imageBuffer = fs.readFileSync("your_image.png");
    const base64Image = imageBuffer.toString("base64");
  
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "file", file: {} }, // TODO - populate this with the image once we know how it is loaded
          ],
        },
      ],
      max_tokens: 300,
    });
    console.log(response.choices[0].message.content);
  }

  // for sending just a text description to OpenAI model
  sendText = async function (text) {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze a paragraph describing the symptoms of a user and come up with a list of potential causes." },
            { type: "text", text: text },
          ],
        },
      ],
      max_tokens: 300,
    });
    console.log(response.choices[0].message.content);
  }

  // for sending both a text description and an image to OpenAI model
  sendTextWithImage = async function (text, image) {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze a paragraph describing the symptoms of a user and come up with a list of potential causes." },
            { type: "text", text: text },
            { type: "file", file: image }, // TODO - populate this with the image once we know how it is loaded
          ],
        },
      ],
      max_tokens: 300,
    });
    console.log(response.choices[0].message.content);
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

