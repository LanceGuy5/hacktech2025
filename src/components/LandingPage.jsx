import React, { useState, useEffect } from 'react'
import './LandingPage.css'
import TextSelection from './TextSelection'
import { useNavigate, useLocation } from 'react-router-dom'

function LandingPage() {
  const [currentPage, setCurrentPage] = useState('landing')
  const [showImagePopup, setShowImagePopup] = useState(false)
  const [showRecordingComponent, setShowRecordingComponent] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check location state when component mounts to see if we need to return to a specific page
  useEffect(() => {
    if (location.state?.returnTo === 'textSelection') {
      setCurrentPage('text')
    }
  }, [location.state])
  
  const handleMapNavigation = () => {
    // Navigate to map with state indicating we came from text selection
    navigate('/map', { state: { from: 'textSelection' } })
  }
  
  // Handle headaches button click
  const handleHeadachesButtonClick = () => {
    setCurrentPage('text')
    setShowImagePopup(false)
    setShowRecordingComponent(false)
  }
  
  // Handle chest pain button click
  const handleChestPainClick = () => {
    setCurrentPage('text')
    setShowImagePopup(false)
    setShowRecordingComponent(false)
  }
  
  const renderPage = () => {
    switch(currentPage) {
      case 'text':
        return <TextSelection 
          onBack={() => setCurrentPage('landing')} 
          onNavigateToMap={handleMapNavigation}
          initialShowImageOptions={showImagePopup}
          initialShowRecording={showRecordingComponent}
        />
      default:
        return (
          <div className="landing-page">
            <h3>What is your medical issue?</h3>
            <div className="button-container">
              <button 
                className="issue-btn text-button"
                onClick={() => setCurrentPage('text')}
              >
                Text
              </button>
              <button 
                className="issue-btn image-button" 
                onClick={handleHeadachesButtonClick}
              >
                Headaches
              </button>
              <button 
                className="issue-btn speech-button"
                onClick={handleChestPainClick}
              >
                Chest Pain
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {renderPage()}
    </>
  )
}

export default LandingPage
