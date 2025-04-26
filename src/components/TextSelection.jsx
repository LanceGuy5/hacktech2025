import React from 'react'
import './TextSelection.css'

function TextSelection({ onBack, onNavigateToMap }) {
  return (
    <div className="text-selection">
      <h1 className='text-selection-title'>Text Selection</h1>
      <div className="content">
        <p className='text-selection-description'>Select your medical issue:</p>
        <div className="symptom-options">
          <div className="symptom-option" onClick={onNavigateToMap}>Chest Pain</div>
          <div className="symptom-option">Fever</div>
          <div className="symptom-option">Headache</div>
          <div className="symptom-option">Describe Symptom</div>
        </div>
      </div>
      <button className="back-button" onClick={onBack}>
        Back to Options
      </button>
    </div>
  )
}

export default TextSelection
