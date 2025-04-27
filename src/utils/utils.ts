
export async function getLocation(): Promise<{ latitude: number; longitude: number; error?: string }> {
  if (!navigator.geolocation) {
    return { latitude: 0, longitude: 0, error: 'Geolocation not supported' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        resolve({ latitude: lat, longitude: lon });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            resolve({ latitude: 0, longitude: 0, error: 'User rejected geolocation.' });
            break;
          case error.POSITION_UNAVAILABLE:
            resolve({ latitude: 0, longitude: 0, error: 'Position unavailable.' });
            break;
          case error.TIMEOUT:
            resolve({ latitude: 0, longitude: 0, error: 'A timeout error occurred.' });
            break;
          default:
            resolve({ latitude: 0, longitude: 0, error: 'An unknown error occurred.' });
        }
      }
    );
  });
}

export function formatAssistantResponse(rawResult: any) {
  try {
    let cleaned = rawResult;

    if (typeof cleaned === "string") {
      // remove leading/trailing backticks and optional 'json' word
      cleaned = cleaned.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
      }
      cleaned = cleaned.trim();
      cleaned = JSON.parse(cleaned);
    }

    return {
      raw: cleaned.raw || "I'm unable to provide specific advice based on the provided input.",
      severity: typeof cleaned.severity === "number" ? cleaned.severity : null,
    };
  } catch (error) {
    console.warn("Could not parse assistant result as JSON:", error);

    return {
      raw: typeof rawResult === "string" ? rawResult : "Unknown error occurred.",
      severity: null,
    };
  }
}
