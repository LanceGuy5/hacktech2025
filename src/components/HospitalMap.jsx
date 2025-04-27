import React, { useState, useCallback, useRef, useEffect } from 'react'
import './HospitalMap.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import { getLocation } from '../utils/utils'

// Map container style
const mapContainerStyle = {
  width: '400px',
  height: '300px',
  borderRadius: '8px'
}

function HospitalMap() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userLoc, setUserLoc] = useState({ lat: 0, lng: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const mapRef = useRef(null)

  const [hospitals, setHospitals] = useState([]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY, // safely restricted key
    libraries: ['places'], // optional if you use autocomplete later
  });

  const getLocations = async () => {
    setIsLoading(true);
    try {
      const { latitude, longitude } = await getLocation();
      if (!latitude || !longitude) {
        console.error('Unable to get location');
        setIsLoading(false);
        return;
      }
      setUserLoc({ lat: latitude, lng: longitude });
      const response = await fetch(`/api/getNearbyHospitals?lat=${latitude}&lng=${longitude}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      if (!response.ok) {
        console.error('Error fetching locations:', response.statusText)
        setIsLoading(false);
        return;
      }
      let data = await response.json();
      data = data.map((hospital, index) => ({
        id: index,
        name: hospital.displayName.text,
        position: {
          lat: hospital.location.latitude,
          lng: hospital.location.longitude
        },
        status: hospital.businessStatus,
        // website: hospital.websiteUri,
      }));
      console.log(data);
      setHospitals(data);
      setIsConnected(true);
    } catch (error) {
      console.error('Error fetching locations:', error)
      setHospitals([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleBack = () => {
    // Check if we have state information about where we came from
    if (location.state?.from === 'textSelection') {
      // Navigate back to the root and let LandingPage know to show TextSelection
      navigate('/', { state: { returnTo: 'textSelection' } })
    } else {
      // If no specific source, just go back to main page
      navigate('/')
    }
  }

  // Save the map reference when the map loads
  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  // Handle marker click to show info window
  const handleMarkerClick = (hospital) => {
    setSelectedHospital(hospital)
  }

  // Handle showing a hospital on the map
  const handleViewHospital = (hospitalId) => {
    const hospital = hospitals.find(h => h.id === hospitalId)
    if (hospital && mapRef.current) {
      mapRef.current.panTo(hospital.position)
      mapRef.current.setZoom(15)
      setSelectedHospital(hospital)
    }
  }

  if (!isLoaded) {
    return (
      <div className='hospital-map'>
        <h2>Loading Google Maps...</h2>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className='hospital-map'>
        <h2>Error Loading Google Maps</h2>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='hospital-map'>
        <h2>Loading hospitals...</h2>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className='hospital-map'>
        <h2>Hospital Map</h2>
        <button onClick={() => getLocations()}>Find hospitals near me</button>
      </div>
    );
  }

  return (
    <div className='map-container'>
      {/* Google Map */}
      <div className="google-map-container">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLoc}
          zoom={13}
          onLoad={onMapLoad}
        >
          {/* Render hospital markers */}
          {hospitals.map(hospital => (
            <Marker
              key={hospital.id}
              position={{ lat: hospital.position.lat, lng: hospital.position.lng }}
              onClick={() => handleMarkerClick(hospital)}
            />
          ))}

          {/* Info window for selected hospital */}
          {selectedHospital && (
            <InfoWindow
              position={selectedHospital.position}
              onCloseClick={() => setSelectedHospital(null)}
            >
              <div className="info-window">
                <h3>{selectedHospital.name}</h3>
                <p>Tap for directions</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      <div className='map-options'>
        <div className='hospital-option' onClick={() => handleViewHospital(1)}>Memorial Hospital</div>
        <div className='hospital-option' onClick={() => handleViewHospital(2)}>City Medical Center</div>
        <div className='hospital-option' onClick={() => handleViewHospital(3)}>Community Healthcare</div>

        <div className='button-container'>
          <button className='back-btn' onClick={handleBack}>Back</button>
          <button className='map-btn view-btn'>View</button>
          <button className='map-btn direct-btn'>Direct</button>
        </div>
      </div>
    </div >
  )
}

export default HospitalMap;
