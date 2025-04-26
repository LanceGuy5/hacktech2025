import React from 'react'
import './SpeechSelection.css'

function SpeechSelection({ onBack }) {
  return (
    <div className="speech-selection">
      <h1>Speech Selection</h1>
      <div className="content">
        <p className='speech-selection-description'>Describe your medical issue using voice:</p>
        <div className="voice-controls">
          <button className="record-button">Start Recording</button>
          <div className="recording-status">Not recording</div>
        </div>
      </div>
      <button className="back-button" onClick={onBack}>
        Back to Options
      </button>
    </div>
  )
}

export default SpeechSelection
