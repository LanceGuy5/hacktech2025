import React from 'react'
import './ImageSelection.css'

function ImageSelection({ onBack }) {
  return (
    <div className="image-selection">
      <h1>Image Selection</h1>
      <div className="content">
        {/* Image upload functionality will go here */}
        <p>Upload an image of your medical issue</p>
        <input type="file" accept="image/*" />
      </div>
      <button className="back-button" onClick={onBack}>
        Back to Options
      </button>
    </div>
  )
}

export default ImageSelection
