
export async function getLocation() {
  if (!navigator.geolocation) {
    return { error: 'Geolocation not supported' };
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
            resolve({ error: 'User rejected geolocation.' });
            break;
          case error.POSITION_UNAVAILABLE:
            resolve({ error: 'Position unavailable.' });
            break;
          case error.TIMEOUT:
            resolve({ error: 'A timeout error occurred.' });
            break;
          default:
            resolve({ error: 'An unknown error occurred.' });
        }
      }
    );
  });
}
