import React, { useState, useCallback, useRef } from 'react'
import './HospitalMap.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'

// For real use, get this from an environment variable
const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY" // Replace with your actual API key

// Default map center (can be adjusted)
const defaultCenter = {
  lat: 34.0522, // Los Angeles
  lng: -118.2437
}

// Map container style
const mapContainerStyle = {
  width: '400px',
  height: '300px',
  borderRadius: '8px'
}

// Example hospital locations - you would replace these with data from Places API
const hospitals = [
  { id: 1, name: "Memorial Hospital", position: { lat: 34.052, lng: -118.243 } },
  { id: 2, name: "City Medical Center", position: { lat: 34.055, lng: -118.248 } },
  { id: 3, name: "Community Healthcare", position: { lat: 34.058, lng: -118.238 } }
]

function HospitalMap() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedHospital, setSelectedHospital] = useState(null)
  const mapRef = useRef(null)

  // Load the Google Maps JavaScript API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  })

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

  // Render map error
  if (loadError) return <div>Error loading maps</div>

  // Render loading state
  if (!isLoaded) return <div>Loading maps...</div>

  return (
    <div className='map-container'>
      {/* Google Map */}
      <div className="google-map-container">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={13}
          onLoad={onMapLoad}
        >
          {/* Render hospital markers */}
          {hospitals.map(hospital => (
            <Marker
              key={hospital.id}
              position={hospital.position}
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
    </div>
  )
}

export default HospitalMap;
