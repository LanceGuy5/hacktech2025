import React, { useState, useEffect } from 'react'
import './LandingPage.css'
import ImageSelection from './ImageSelection'
import TextSelection from './TextSelection'
import SpeechSelection from './SpeechSelection'
import { useNavigate, useLocation } from 'react-router-dom'

function LandingPage() {
  const [currentPage, setCurrentPage] = useState('landing')
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
  
  const renderPage = () => {
    switch(currentPage) {
      case 'image':
        return <ImageSelection onBack={() => setCurrentPage('landing')} />
      case 'text':
        return <TextSelection onBack={() => setCurrentPage('landing')} onNavigateToMap={handleMapNavigation} />
      case 'speech':
        return <SpeechSelection onBack={() => setCurrentPage('landing')} />
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
                onClick={() => setCurrentPage('image')}
              >
                Image
              </button>
              <button 
                className="issue-btn speech-button"
                onClick={() => setCurrentPage('speech')}
              >
                Speech
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
