import fetch from "node-fetch";

let instance = null;

export class GoogleWorker {
  constructor({ apiKey }) {
    if (instance) {
      return instance;
    }
    if (!apiKey) {
      throw new Error("GoogleWorker: apiKey is required");
    }
    this.apiKey = apiKey;
    instance = this;
  }

  static getInstance() {
    if (!instance) {
      throw new Error("GoogleWorker instance not created yet. Use 'new GoogleWorker({ apiKey })' first.");
    }
    return instance;
  }

  static destroyInstance() {
    instance = null;
  }

  async nearbyRequest(lat, lng, options = {}) {
    const {
      // Max radius is 50km (in API docs)
      radius = 50000, // meters
      includedPrimaryTypes = ["hospital"],
      maxResultCount = 10,
      languageCode = "en",
      regionCode = "US",
      fieldMask = "places.displayName,places.location,places.websiteUri",
    } = options;

    const body = {
      includedTypes: includedPrimaryTypes,
      maxResultCount,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius
        }
      },
      languageCode,
      regionCode
    };

    // 👇 Add fieldMask as query param to the URL
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 200) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // @ts-ignore
    if (data.error) {
      // @ts-ignore
      throw new Error(`Google Places API error: ${data.error.message}`);
    }

    // @ts-ignore
    return data.places || [];
  }

}
